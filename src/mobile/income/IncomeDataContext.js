import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useDemoMode } from '../../contexts/DemoModeContext';

const IncomeDataContext = createContext(null);

export function useIncomeData() {
  const ctx = useContext(IncomeDataContext);
  if (!ctx) throw new Error('useIncomeData must be used within IncomeDataProvider');
  return ctx;
}

const DEMO_INCOMES = [
  {
    employer:       'Accenture',
    employmentType: 'Full-time',
    annualSalary:   65000,
    annualBonus:    8000,
    bonusEntries:   [{ label: 'Annual Performance Bonus', amount: 8000 }],
    startDate:      '2022-03-01',
    salaryHistory: [
      { year: 2022, employmentType: 'Full-time', salary: 52000, bonus: 0,    bonusEntries: [] },
      { year: 2023, employmentType: 'Full-time', salary: 56000, bonus: 4500, bonusEntries: [{ label: 'Annual Performance Bonus', amount: 4500 }] },
      { year: 2024, employmentType: 'Full-time', salary: 60000, bonus: 6000, bonusEntries: [{ label: 'Annual Performance Bonus', amount: 6000 }] },
      { year: 2025, employmentType: 'Full-time', salary: 63000, bonus: 7500, bonusEntries: [{ label: 'Annual Performance Bonus', amount: 5500 }, { label: 'Project Completion Bonus', amount: 2000 }] },
    ],
  },
  {
    employer:       'Side Consulting Ltd',
    employmentType: 'Contract',
    annualSalary:   18000,
    annualBonus:    0,
    bonusEntries:   [],
    startDate:      '2023-09-01',
    salaryHistory: [
      { year: 2023, employmentType: 'Contract', salary: 5500,  bonus: 0, bonusEntries: [] },
      { year: 2024, employmentType: 'Contract', salary: 14500, bonus: 0, bonusEntries: [] },
      { year: 2025, employmentType: 'Contract', salary: 16500, bonus: 0, bonusEntries: [] },
    ],
  },
];

function computeMetrics(incomes) {
  if (!incomes || incomes.length === 0) {
    return { totalIncome: 0, totalBase: 0, totalBonuses: 0, bonusPct: 0, baseBarPct: 0 };
  }
  const totalBase    = incomes.reduce((s, e) => s + (e.annualSalary || 0), 0);
  const totalBonuses = incomes.reduce((s, e) => s + (e.annualBonus  || 0), 0);
  const totalIncome  = totalBase + totalBonuses;
  const bonusPct     = totalBase > 0 ? (totalBonuses / totalBase) * 100 : 0;
  const baseBarPct   = totalIncome > 0 ? Math.round((totalBase / totalIncome) * 100) : 100;
  return { totalIncome, totalBase, totalBonuses, bonusPct, baseBarPct };
}

export function IncomeDataProvider({ children }) {
  const { isDemoMode, demoData } = useDemoMode();
  const [user,        setUser]        = useState(null);
  const [incomes,     setIncomes]     = useState([]);
  const [isLoading,   setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      try {
        if (isDemoMode) {
          setIncomes(DEMO_INCOMES);
          setLastUpdated(null);
        } else {
          const snap = await getDoc(doc(db, 'incomePots', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            setIncomes(data.incomes || []);
            setLastUpdated(data.lastUpdated || null);
          } else {
            setIncomes([]);
            setLastUpdated(null);
          }
        }
      } catch (e) {
        console.error('IncomeDataContext: failed to load', e);
        setIncomes([]);
        setLastUpdated(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, isDemoMode, demoData]);

  async function addIncome(newIncome) {
    const updated = [...incomes, newIncome];
    setIncomes(updated);
    if (!isDemoMode && user) {
      try {
        const now = new Date().toISOString();
        await setDoc(
          doc(db, 'incomePots', user.uid),
          { incomes: updated, lastUpdated: now },
          { merge: true }
        );
        setLastUpdated(now);
      } catch (e) {
        console.error('IncomeDataContext: failed to save', e);
        setIncomes(incomes);
      }
    }
  }

  async function updateIncome(index, partial) {
    const updated = incomes.map((inc, i) => i === index ? { ...inc, ...partial } : inc);
    setIncomes(updated);
    if (!isDemoMode && user) {
      try {
        const now = new Date().toISOString();
        await setDoc(
          doc(db, 'incomePots', user.uid),
          { incomes: updated, lastUpdated: now },
          { merge: true }
        );
        setLastUpdated(now);
      } catch (e) {
        console.error('IncomeDataContext: failed to update', e);
        setIncomes(incomes);
      }
    }
  }

  const metrics = computeMetrics(incomes);

  return (
    <IncomeDataContext.Provider value={{ incomes, metrics, isLoading, isDemoMode, lastUpdated, addIncome, updateIncome }}>
      {children}
    </IncomeDataContext.Provider>
  );
}
