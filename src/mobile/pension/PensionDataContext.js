import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useDemoMode } from '../../contexts/DemoModeContext';

const PensionDataContext = createContext(null);

export function usePensionData() {
  const ctx = useContext(PensionDataContext);
  if (!ctx) throw new Error('usePensionData must be used within PensionDataProvider');
  return ctx;
}

// ---- date helpers ----

/**
 * Parse a date string in DD/MM/YYYY or ISO format.
 * Returns a plain Date object, or null if invalid.
 */
export function parseDate(str) {
  if (!str) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/').map(Number);
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Get the UK tax year start year for a given Date or date string.
 * Tax year runs April 6 → April 5.
 * e.g. April 5 2024 → 2023 (FY 23/24); April 6 2024 → 2024 (FY 24/25)
 */
export function getTaxYearStart(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : parseDate(date);
  if (!d || isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-based
  const day = d.getDate();
  if (month < 4 || (month === 4 && day < 6)) return year - 1;
  return year;
}

/** Format a tax year start to a label, e.g. 2024 → "FY 24/25" */
export function taxYearLabel(startYear) {
  const y2 = String(startYear + 1).slice(-2);
  return `FY ${String(startYear).slice(-2)}/${y2}`;
}

/** Format DD/MM/YYYY or ISO → "15 Mar 2026" */
export function formatDate(str) {
  const d = parseDate(str);
  if (!d) return str || '-';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---- derived metrics ----

function computeMetrics(entries) {
  if (!entries || entries.length === 0) {
    return { totalValue: 0, totalDeposits: 0, growth: 0, growthPct: 0, currentFYTotal: 0 };
  }

  const totalValue   = entries.reduce((s, e) => s + (e.currentValue || 0), 0);
  const totalDeposits = entries.reduce((s, e) => s + (e.deposits || 0), 0);
  const growth       = totalValue - totalDeposits;
  const growthPct    = totalDeposits > 0 ? (growth / totalDeposits) * 100 : 0;

  // Current FY contributions (sum paymentHistory entries in the current tax year)
  const currentFYStart = getTaxYearStart(new Date());
  let currentFYTotal = 0;
  entries.forEach(entry => {
    (entry.paymentHistory || []).forEach(p => {
      if (getTaxYearStart(parseDate(p.date)) === currentFYStart) {
        currentFYTotal += p.amount || 0;
      }
    });
  });

  return { totalValue, totalDeposits, growth, growthPct, currentFYTotal };
}

// ---- provider --

export function PensionDataProvider({ children }) {
  const { isDemoMode, demoData } = useDemoMode();
  const [user, setUser]         = useState(null);
  const [entries, setEntries]   = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({ currentAge: 38, retirementAge: 65 });

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load data whenever user or demo mode changes
  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      try {
        if (isDemoMode && demoData) {
          setEntries(demoData.pensionPots?.entries || []);
          if (demoData.pensionPots?.currentAge || demoData.pensionPots?.retirementAge) {
            setUserProfile({
              currentAge: demoData.pensionPots.currentAge || 38,
              retirementAge: demoData.pensionPots.retirementAge || 65,
            });
          }
        } else {
          const snap = await getDoc(doc(db, 'pensionPots', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            setEntries(data.pensions || data.entries || []);
            setUserProfile({
              currentAge: data.currentAge || 38,
              retirementAge: data.retirementAge || 65,
            });
          } else {
            setEntries([]);
          }
        }
      } catch (e) {
        console.error('PensionDataContext: failed to load', e);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, isDemoMode, demoData]);

  const metrics = computeMetrics(entries);

  /**
   * Update arbitrary fields on an entry by index.
   * Persists to Firestore when not in demo mode.
   */
  async function updateEntry(idx, fields) {
    if (idx < 0 || idx >= entries.length) return;
    const updatedEntry = { ...entries[idx], ...fields };
    const updatedEntries = entries.map((e, i) => (i === idx ? updatedEntry : e));
    setEntries(updatedEntries);
    if (!isDemoMode && user) {
      try {
        await updateDoc(doc(db, 'pensionPots', user.uid), { pensions: updatedEntries });
      } catch (e) {
        console.error('PensionDataContext: failed to save entry update', e);
        setEntries(entries);
      }
    }
  }

  /**
   * Update the currentValue of an entry by index.
   * Appends a timestamped record to entry.valueHistory for growth tracking.
   * Persists to Firestore when not in demo mode.
   */
  async function updateEntryValue(idx, newValue) {
    if (idx < 0 || idx >= entries.length) return;

    const now = new Date().toISOString();
    const updatedEntry = {
      ...entries[idx],
      currentValue: newValue,
      valueHistory: [
        ...(entries[idx].valueHistory || []),
        { date: now, value: newValue },
      ],
    };

    const updatedEntries = entries.map((e, i) => (i === idx ? updatedEntry : e));
    setEntries(updatedEntries);

    if (!isDemoMode && user) {
      try {
        await updateDoc(doc(db, 'pensionPots', user.uid), { pensions: updatedEntries });
      } catch (e) {
        console.error('PensionDataContext: failed to save value update', e);
        setEntries(entries); // revert on error
      }
    }
  }

  /**
   * Add a brand-new pension entry to the list.
   * Persists to Firestore when not in demo mode.
   */
  async function addEntry(newEntry) {
    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);
    if (!isDemoMode && user) {
      try {
        await setDoc(
          doc(db, 'pensionPots', user.uid),
          { pensions: updatedEntries },
          { merge: true }
        );
      } catch (e) {
        console.error('PensionDataContext: failed to save new entry', e);
        setEntries(entries);
      }
    }
  }

  /**
   * Update userProfile fields (currentAge, retirementAge).
   * Persists to Firestore when not in demo mode.
   */
  async function updateUserProfile(fields) {
    const updated = { ...userProfile, ...fields };
    setUserProfile(updated);
    if (!isDemoMode && user) {
      try {
        await setDoc(
          doc(db, 'pensionPots', user.uid),
          { currentAge: updated.currentAge, retirementAge: updated.retirementAge },
          { merge: true }
        );
      } catch (e) {
        console.error('PensionDataContext: failed to save userProfile', e);
        setUserProfile(userProfile);
      }
    }
  }

  return (
    <PensionDataContext.Provider value={{ entries, metrics, isLoading, isDemoMode, updateEntryValue, updateEntry, addEntry, userProfile, updateUserProfile }}>
      {children}
    </PensionDataContext.Provider>
  );
}
