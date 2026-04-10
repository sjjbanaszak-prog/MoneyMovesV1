import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { auth, db } from '../../firebase';
import { useDemoMode } from '../../contexts/DemoModeContext';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(customParseFormat);

const SavingsDataContext = createContext(null);

export function useSavingsData() {
  const ctx = useContext(SavingsDataContext);
  if (!ctx) throw new Error('useSavingsData must be used within SavingsDataProvider');
  return ctx;
}

// ---- Helpers ----

function parseAmount(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  return parseFloat(String(value).replace(/[£$€\s,]/g, '')) || 0;
}

function getTaxYearStart(dateStr) {
  if (!dateStr) return null;
  let d;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(dateStr))) {
    const [day, month, year] = String(dateStr).split('/').map(Number);
    d = new Date(year, month - 1, day);
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return null;
  const year  = d.getFullYear();
  const month = d.getMonth() + 1;
  const day   = d.getDate();
  if (month < 4 || (month === 4 && day < 6)) return year - 1;
  return year;
}

function isIsaType(accountType = '') {
  const t = accountType.toLowerCase();
  return t.includes('isa') || t.includes('lisa');
}

/**
 * Derive the current balance for an account.
 * Mirrors SavingsMetricCards.js exactly:
 *  1. Sort rows ascending by date
 *  2. Take the last (most recent) row's balance column value
 *  3. If no balance column, compute a running sum of the amount column
 * Falls back to pre-computed currentBalance when present (demo data).
 */
function deriveCurrentBalance(account) {
  if (account.currentBalance != null) return account.currentBalance;
  const { rawData = [], mapping = {}, dateFormat } = account;
  if (!rawData.length) return 0;

  // Sort ascending by date — same as SavingsMetricCards.js
  const sorted = [...rawData]
    .filter(row => row && mapping.date && row[mapping.date])
    .sort((a, b) => {
      const dA = dateFormat ? dayjs(String(a[mapping.date]), dateFormat, true) : dayjs(String(a[mapping.date]));
      const dB = dateFormat ? dayjs(String(b[mapping.date]), dateFormat, true) : dayjs(String(b[mapping.date]));
      return dA.diff(dB);
    });

  if (!sorted.length) return 0;

  const lastRow = sorted[sorted.length - 1];

  if (mapping.balance) {
    const val = parseAmount(lastRow[mapping.balance]);
    if (val !== 0) return val;
    // last row may legitimately be zero; scan backwards for most recent non-zero
    for (let i = sorted.length - 2; i >= 0; i--) {
      const v = parseAmount(sorted[i][mapping.balance]);
      if (v !== 0) return v;
    }
  }

  // No balance column — running sum of amount column (matches SavingsMetricCards fallback)
  if (mapping.amount) {
    let running = 0;
    sorted.forEach(row => { running += parseAmount(row[mapping.amount]); });
    return running;
  }

  return 0;
}

/**
 * Compute net deposits for a single account (credits minus debits, excluding
 * interest, dividends, and transfers). Mirrors computeNetDeposits in SavingsAccountDetail.js.
 */
function computeAccountNetDeposits(account) {
  const { rawData = [], mapping = {} } = account;
  const descCol   = mapping.description;
  const creditCol = mapping.credit;
  const debitCol  = mapping.debit;
  const amountCol = mapping.amount;

  let totalCredits = 0;
  let totalDebits  = 0;

  rawData.forEach(row => {
    const desc = String(row[descCol] || '').toLowerCase();
    if (desc.includes('interest') || desc.includes('dividend') || desc.includes('transfer')) return;

    if (creditCol && row[creditCol] != null && row[creditCol] !== '') {
      totalCredits += parseAmount(row[creditCol]);
    }
    if (debitCol && row[debitCol] != null && row[debitCol] !== '') {
      totalDebits += parseAmount(row[debitCol]);
    }
    if (!creditCol && !debitCol && amountCol) {
      const amt = parseAmount(row[amountCol]);
      if (amt > 0) totalCredits += amt;
      else totalDebits += Math.abs(amt);
    }
  });

  (account.manualTransactions || []).forEach(tx => {
    if (tx.direction === 'credit' && tx.type !== 'interest' && tx.type !== 'transfer_in') {
      totalCredits += tx.amount;
    } else if (tx.direction === 'debit' && tx.type !== 'transfer_out') {
      totalDebits += tx.amount;
    }
  });

  return totalCredits - totalDebits;
}

/**
 * Get credit transactions for an account using its column mapping.
 * Handles both separate credit/debit columns and a single signed amount column.
 */
function getCreditTransactions(account) {
  const { rawData = [], mapping = {} } = account;
  const dateCol   = mapping.date;
  const descCol   = mapping.description;
  const creditCol = mapping.credit;
  const amountCol = mapping.amount;

  return rawData.reduce((acc, tx) => {
    const date   = tx[dateCol] || '';
    const desc   = tx[descCol] || '';
    let credit = 0;

    if (creditCol && tx[creditCol] != null && tx[creditCol] !== '') {
      credit = parseAmount(tx[creditCol]);
    } else if (amountCol) {
      const amt = parseAmount(tx[amountCol]);
      if (amt > 0) credit = amt;
    }

    if (credit > 0) acc.push({ date, desc, credit });
    return acc;
  }, []);
}

// ---- Compute derived metrics ----
function computeMetrics(accounts) {
  if (!accounts || accounts.length === 0) {
    return { totalBalance: 0, isaBalance: 0, nonIsaBalance: 0, currentFYIsaDeposits: 0, totalDeposited: 0, totalGrowth: 0, growthPct: 0, isaAllowance: 20000 };
  }

  const totalBalance = accounts.reduce((s, a) => s + deriveCurrentBalance(a), 0);

  const isaAccounts = accounts.filter(a => isIsaType(a.accountType));
  const isaBalance  = isaAccounts.reduce((s, a) => s + deriveCurrentBalance(a), 0);
  const nonIsaBalance = totalBalance - isaBalance;

  // Net deposits and growth — computed per account and summed, matching SavingsAccountDetail logic
  let totalDeposited = 0;
  let totalGrowth    = 0;
  accounts.forEach(account => {
    const balance    = deriveCurrentBalance(account);
    const netDep     = computeAccountNetDeposits(account);
    const growth     = balance - netDep;
    totalDeposited  += netDep;
    totalGrowth     += growth;
  });
  totalDeposited = Math.round(totalDeposited);
  totalGrowth    = Math.round(totalGrowth);
  const growthPct = totalDeposited > 0 ? (totalGrowth / totalDeposited) * 100 : 0;

  // ISA deposits in current UK tax year — mirrors SavingsMetricCards.js logic exactly
  const now = new Date();
  const currentYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const nowDay   = now.getDate();
  // UK tax year starts April 6 — before April 6 we're still in the previous year
  const taxYear  = (nowMonth > 4 || (nowMonth === 4 && nowDay >= 6)) ? currentYear : currentYear - 1;
  const taxYearStart = dayjs(`${taxYear}-04-06`);
  const taxYearEnd   = dayjs(`${taxYear + 1}-04-05`);

  let currentFYIsaDeposits = 0;
  isaAccounts.forEach(account => {
    const { rawData = [], mapping = {}, dateFormat } = account;
    rawData.forEach(row => {
      if (!mapping.date) return;
      const dateValue = row[mapping.date];
      if (!dateValue) return;

      const txDate = dateFormat
        ? dayjs(String(dateValue), dateFormat, true)
        : dayjs(String(dateValue));
      if (!txDate.isValid()) return;
      if (!txDate.isSameOrAfter(taxYearStart) || !txDate.isSameOrBefore(taxYearEnd)) return;

      const desc = mapping.description
        ? String(row[mapping.description] || '').toLowerCase()
        : '';

      const isInterest = desc.includes('interest') || desc.includes('int paid') ||
        desc.includes('int credit') || desc.includes('credit interest') ||
        desc.includes('gross interest') || desc.includes('int pmt') ||
        /\bint\b/.test(desc);
      const isDividend = desc.includes('dividend') || desc.includes('div paid') || desc.includes('div credit');
      const isTransfer = desc.includes('transfer');
      if (isInterest || isDividend || isTransfer) return;

      let credit = 0;
      if (mapping.credit) {
        credit = parseAmount(row[mapping.credit]);
      } else if (mapping.amount) {
        const amt = parseAmount(row[mapping.amount]);
        if (amt > 0) credit = amt;
      }
      if (credit > 0) currentFYIsaDeposits += credit;
    });

    // Also count manual transactions for this ISA account
    (account.manualTransactions || []).forEach(tx => {
      if (tx.direction !== 'credit') return;
      if (tx.type === 'interest' || tx.type === 'transfer_in') return;
      if (!tx.date) return;
      const txDate = dayjs(tx.date);
      if (!txDate.isValid()) return;
      if (!txDate.isSameOrAfter(taxYearStart) || !txDate.isSameOrBefore(taxYearEnd)) return;
      currentFYIsaDeposits += tx.amount;
    });
  });

  return {
    totalBalance: Math.round(totalBalance),
    isaBalance: Math.round(isaBalance),
    nonIsaBalance: Math.round(nonIsaBalance),
    totalDeposited,
    totalGrowth,
    growthPct,
    currentFYIsaDeposits: Math.round(currentFYIsaDeposits),
    isaAllowance: 20000,
  };
}

// ---- Provider ----
export function SavingsDataProvider({ children }) {
  const { isDemoMode, demoData } = useDemoMode();
  const [user, setUser]         = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load data
  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      try {
        if (isDemoMode && demoData) {
          const uploads  = demoData.savingsTracker?.uploads || [];
          const selected = demoData.savingsTracker?.selectedAccounts || uploads.map(u => u.accountName);
          setAccounts(uploads.filter(u => selected.includes(u.accountName)));
          setLastUpdated(null);
        } else {
          // SavingsTracker.js saves to the 'savingsTracker' collection
          const snap = await getDoc(doc(db, 'savingsTracker', user.uid));
          if (snap.exists()) {
            const data     = snap.data();
            const uploads  = data.uploads || [];
            const selected = data.selectedAccounts || uploads.map(u => u.accountName);
            setAccounts(uploads.filter(u => selected.includes(u.accountName)));
            setLastUpdated(data.lastUpdated || null);
          } else {
            setAccounts([]);
            setLastUpdated(null);
          }
        }
      } catch (e) {
        console.error('SavingsDataContext: failed to load', e);
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, isDemoMode, demoData]);

  async function addTransaction(idx, tx) {
    const account = accounts[idx];
    if (!account) return;

    const currentBal = account.currentBalance || 0;
    const newBalance = tx.balanceAfter != null
      ? tx.balanceAfter
      : tx.direction === 'credit'
        ? currentBal + tx.amount
        : Math.max(0, currentBal - tx.amount);

    const manualTransactions = [
      ...(account.manualTransactions || []),
      {
        date:        tx.date,
        description: tx.description,
        type:        tx.type,
        amount:      tx.amount,
        direction:   tx.direction,
        ...(tx.balanceAfter != null ? { balanceAfter: tx.balanceAfter } : {}),
        ...(tx.notes ? { notes: tx.notes } : {}),
      },
    ];

    await updateAccount(idx, { manualTransactions, currentBalance: newBalance });
  }

  async function addAccount(newAccount) {
    if (!user || isDemoMode) return;
    try {
      const snap = await getDoc(doc(db, 'savingsTracker', user.uid));
      const data = snap.exists() ? snap.data() : {};
      const uploads = [...(data.uploads || []), newAccount];
      const selectedAccounts = [...(data.selectedAccounts || (data.uploads || []).map(u => u.accountName)), newAccount.accountName];
      const now = new Date().toISOString();
      await setDoc(doc(db, 'savingsTracker', user.uid), { ...data, uploads, selectedAccounts, lastUpdated: now }, { merge: true });
      setAccounts(prev => [...prev, newAccount]);
      setLastUpdated(now);
    } catch (e) {
      console.error('SavingsDataContext: failed to add account', e);
      throw e;
    }
  }

  async function updateAccount(idx, partial) {
    const updated = accounts.map((a, i) => i === idx ? { ...a, ...partial } : a);
    setAccounts(updated);
    if (!isDemoMode && user) {
      try {
        const snap = await getDoc(doc(db, 'savingsTracker', user.uid));
        const data = snap.exists() ? snap.data() : {};
        const uploads = [...(data.uploads || [])];

        // accounts is filtered (selected only), so idx != uploads index when some accounts are deselected.
        // Match by accountName instead of position to ensure we update the right entry.
        const oldName = accounts[idx]?.accountName;
        const uploadIdx = uploads.findIndex(u => u.accountName === oldName);
        if (uploadIdx !== -1) {
          uploads[uploadIdx] = { ...uploads[uploadIdx], ...partial };
        }

        // If accountName changed, keep selectedAccounts in sync so the account
        // continues to match the filter on next load.
        let selectedAccounts = data.selectedAccounts;
        if (selectedAccounts && partial.accountName && partial.accountName !== oldName) {
          selectedAccounts = selectedAccounts.map(n => n === oldName ? partial.accountName : n);
        }

        const now = new Date().toISOString();
        const saveData = { ...data, uploads, lastUpdated: now };
        if (selectedAccounts !== undefined) saveData.selectedAccounts = selectedAccounts;

        await setDoc(doc(db, 'savingsTracker', user.uid), saveData, { merge: true });
        setLastUpdated(now);
      } catch (e) {
        console.error('SavingsDataContext: failed to update account', e);
        setAccounts(accounts);
      }
    }
  }

  // Enrich each account with a derived currentBalance for display
  const enrichedAccounts = accounts.map(a => ({
    ...a,
    currentBalance: deriveCurrentBalance(a),
  }));

  const metrics = computeMetrics(accounts);

  return (
    <SavingsDataContext.Provider value={{ accounts: enrichedAccounts, metrics, isLoading, isDemoMode, lastUpdated, addTransaction, addAccount, updateAccount }}>
      {children}
    </SavingsDataContext.Provider>
  );
}
