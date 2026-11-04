import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// ── Savings account transaction helpers ─────────────────────────────────────────
// Used by the account detail page: the transaction list, the Savings History chart
// and the Deposits / Growth / Total cards.

export function parseAmount(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  return parseFloat(String(value).replace(/[£$€\s,]/g, '')) || 0;
}

// Interest, Premium Bond prizes and dividends are returns on the money saved,
// not deposits, so they count towards growth everywhere.
export function isReturnDescription(desc) {
  return /interest|dividend|prize/i.test(String(desc || ''));
}

export function parseDate(str, dateFormat) {
  if (!str) return null;
  const d = dateFormat
    ? dayjs(String(str), dateFormat, true)
    : dayjs(String(str));
  return d.isValid() ? d.toDate() : null;
}

// Pull all transactions from rawData + manualTransactions, sorted descending by date.
// Respects deletedRawIndices and rawOverrides set via the All Transactions page.
export function getAllTransactions(account) {
  const {
    rawData = [], mapping = {}, dateFormat,
    deletedRawIndices = [], rawOverrides = {},
  } = account;
  const dateCol   = mapping.date;
  const descCol   = mapping.description;
  const creditCol = mapping.credit;
  const debitCol  = mapping.debit;
  const amountCol = mapping.amount;
  const balCol    = mapping.balance;

  const deletedSet = new Set(deletedRawIndices);

  const rawTxs = rawData
    .map((row, rawIdx) => {
      if (deletedSet.has(rawIdx)) return null;

      const override = rawOverrides[rawIdx];
      if (override) {
        const date = parseDate(override.date);
        if (!date) return null;
        return {
          date,
          dateRaw: override.date,
          desc:    override.description || '',
          credit:  override.direction === 'credit' ? override.amount : 0,
          debit:   override.direction === 'debit'  ? override.amount : 0,
          balance: null,
          isReturn: isReturnDescription(override.description),
        };
      }

      const dateRaw = row[dateCol];
      const date    = parseDate(dateRaw, dateFormat);
      const desc    = row[descCol] || '';

      let credit = 0, debit = 0;
      if (creditCol && row[creditCol] != null && row[creditCol] !== '') {
        credit = parseAmount(row[creditCol]);
      }
      if (debitCol && row[debitCol] != null && row[debitCol] !== '') {
        debit = parseAmount(row[debitCol]);
      }
      if (!credit && !debit && amountCol) {
        const amt = parseAmount(row[amountCol]);
        if (amt >= 0) credit = amt;
        else debit = Math.abs(amt);
      }

      const balance = balCol ? parseAmount(row[balCol]) : null;
      return { date, dateRaw, desc, credit, debit, balance, isReturn: isReturnDescription(desc) };
    })
    .filter(Boolean);

  const manualTxs = (account.manualTransactions || []).map(tx => ({
    date:    tx.date ? new Date(tx.date) : null,
    dateRaw: tx.date,
    desc:    tx.description || tx.type || 'Transaction',
    credit:  tx.direction === 'credit' ? tx.amount : 0,
    debit:   tx.direction === 'debit'  ? tx.amount : 0,
    balance: tx.balanceAfter != null ? tx.balanceAfter : null,
    notes:   tx.notes || null,
    isManual: true,
    isReturn: tx.type === 'interest' || isReturnDescription(tx.description),
  })).filter(tx => tx.date);

  return [...rawTxs, ...manualTxs].sort((a, b) => b.date - a.date);
}

// Monthly deposits and growth for the selected FY (from 6 April `fyStartYear`) or
// calendar year. Shared by the Savings History chart and the summary cards beneath
// it, so the cards always add up to what the bars show.
export function computeMonthlyHistory(account, mode, fyStartYear, calendarYear) {
  const currentFYStart = fyStartYear;
  const nowYear        = calendarYear;

  // Buckets include calMonth/calYear for growth lookup and debit tracking
  let buckets;
  if (mode === 'cy') {
    buckets = Array.from({ length: 12 }, (_, i) => ({
      label: new Date(nowYear, i, 1).toLocaleString('en-GB', { month: 'short' }),
      amount: 0, debit: 0, returns: 0, calMonth: i, calYear: nowYear,
    }));
  } else {
    buckets = Array.from({ length: 12 }, (_, i) => {
      const calMonth = (3 + i) % 12;
      const calYear  = calMonth >= 3 ? currentFYStart : currentFYStart + 1;
      return {
        label: new Date(calYear, calMonth, 1).toLocaleString('en-GB', { month: 'short' }),
        amount: 0, debit: 0, returns: 0, calMonth, calYear,
      };
    });
  }

  // Fill deposits, withdrawals and returns (interest / prizes / dividends) from all
  // transactions, honouring deleted and edited statement rows
  getAllTransactions(account).forEach(tx => {
    const d = tx.date;
    if (!d) return;
    let bi;
    if (mode === 'cy') {
      if (d.getFullYear() !== nowYear) return;
      bi = d.getMonth();
    } else {
      const dM = d.getMonth() + 1, dD = d.getDate(), dY = d.getFullYear();
      const txFY = (dM > 4 || (dM === 4 && dD >= 6)) ? dY : dY - 1;
      if (txFY !== currentFYStart) return;
      bi = (d.getMonth() - 3 + 12) % 12;
    }
    if (tx.isReturn) {
      buckets[bi].returns += (tx.credit || 0) - (tx.debit || 0);
    } else {
      buckets[bi].amount += tx.credit || 0;
      buckets[bi].debit  += tx.debit  || 0;
    }
  });

  // Growth = balance change minus money paid in/out, using balance history snapshots
  // (so it includes interest, prizes, dividends and market moves). Without snapshots
  // for a month, fall back to that month's interest / prizes / dividends.
  const bHistory = (account.balanceHistory || [])
    .map(bh => ({ date: new Date(bh.date), value: bh.value }))
    .filter(bh => !isNaN(bh.date.getTime()))
    .sort((a, b) => a.date - b.date);

  const growth = buckets.map(({ calMonth, calYear, amount: credits, debit: debits, returns }) => {
    const fallback = returns !== 0 ? returns : null;
    if (bHistory.length < 2) return fallback;
    const monthStart = new Date(calYear, calMonth, 1);
    const monthEnd   = new Date(calYear, calMonth + 1, 0, 23, 59, 59);
    const inMonth    = bHistory.filter(bh => bh.date >= monthStart && bh.date <= monthEnd);
    if (!inMonth.length) return fallback;
    const endValue = inMonth[inMonth.length - 1].value;
    const before   = bHistory.filter(bh => bh.date < monthStart);
    if (!before.length) return fallback;
    return endValue - before[before.length - 1].value - (credits - debits);
  });

  return { monthlyData: buckets, monthlyGrowth: growth };
}
