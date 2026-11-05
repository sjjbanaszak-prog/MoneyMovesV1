import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useDemoMode } from '../../contexts/DemoModeContext';

const MortgageDataContext = createContext(null);

export function MortgageDataProvider({ children }) {
  const { isDemoMode, demoData } = useDemoMode();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser]           = useState(null);
  const [mortgages, setMortgages] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  // Load data whenever user or demo mode changes — mirrors PensionDataContext
  useEffect(() => {
    if (!user) return;

    async function load() {
      setIsLoading(true);
      if (isDemoMode) {
        setMortgages(demoData?.mortgages || []);
        setLastUpdated(null);
      } else {
        try {
          const snap = await getDoc(doc(db, 'mortgagePots', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            setMortgages(data.mortgages || []);
            setLastUpdated(data.lastUpdated || null);
          } else {
            setMortgages([]);
            setLastUpdated(null);
          }
        } catch (e) {
          console.error('MortgageDataContext: failed to load', e);
          setMortgages([]);
          setLastUpdated(null);
        }
      }
      setIsLoading(false);
    }

    load();
  }, [user, isDemoMode, demoData]);

  /**
   * Update arbitrary fields on a mortgage by index.
   * In live mode, persists to Firestore.
   */
  const MORTGAGE_ALLOWED_FIELDS = [
    'name', 'lender', 'type', 'postcode', 'propertyValue', 'propertyValueHistory', 'purchasePrice',
    'mortgageAmount', 'outstandingBalance', 'interestRate', 'defaultRate', 'monthlyPayment',
    'fees', 'termYears', 'startDate', 'fixedRateStartDate', 'fixedRateEndDate', 'fixedTermYears',
    'notes', 'paymentHistory', 'switchHistory',
  ];

  const updateMortgage = useCallback((idx, fields) => {
    const safeFields = Object.fromEntries(
      Object.entries(fields).filter(([key]) => MORTGAGE_ALLOWED_FIELDS.includes(key))
    );
    setMortgages(prev => {
      const updated = prev.map((m, i) => (i === idx ? { ...m, ...safeFields } : m));
      if (!isDemoMode && user) {
        const now = new Date().toISOString();
        setDoc(doc(db, 'mortgagePots', user.uid), { mortgages: updated, lastUpdated: now }, { merge: true })
          .then(() => setLastUpdated(now))
          .catch(e => console.error('MortgageDataContext: failed to save update', e));
      }
      return updated;
    });
  }, [isDemoMode, user]);

  /**
   * Add a new mortgage entry.
   * In live mode, persists to Firestore.
   */
  async function addMortgage(newMortgage) {
    const updated = [...mortgages, newMortgage];
    setMortgages(updated);
    if (!isDemoMode && user) {
      try {
        const now = new Date().toISOString();
        await setDoc(
          doc(db, 'mortgagePots', user.uid),
          { mortgages: updated, lastUpdated: now },
          { merge: true }
        );
        setLastUpdated(now);
      } catch (e) {
        console.error('MortgageDataContext: failed to save new mortgage', e);
        setMortgages(mortgages);
      }
    }
  }

  /**
   * Complete a mortgage switch — archives old provider details, updates active fields,
   * records a switch marker in payment history, and persists to Firestore.
   */
  async function switchMortgage(idx, { switchDate, redemption, completion, cashReleasedToClient }) {
    const old = mortgages[idx];
    if (!old) throw new Error('Mortgage not found');

    const switchRecord = {
      switchDate,
      previousLender:        old.lender,
      previousRate:          old.interestRate,
      previousDefaultRate:   old.defaultRate,
      previousBalance:       old.outstandingBalance,
      previousTermYears:     old.termYears,
      previousStartDate:     old.startDate,
      previousMonthlyPayment: old.monthlyPayment,
      redemption,
      completion,
      cashReleasedToClient,
    };

    const switchMarker = {
      date:        switchDate,
      amount:      0,
      description: `Switch: ${old.lender} → ${completion.newLender}`,
      type:        'switch',
    };

    // Product/arrangement fees can be rolled into the new mortgage balance.
    const newBalance = (completion.newMortgageAdvance || 0) + (completion.feesAddedToLoan || 0);

    const updated = {
      ...old,
      lender:              completion.newLender,
      interestRate:        completion.newInterestRate,
      defaultRate:         completion.newDefaultRate || old.defaultRate,
      termYears:           completion.newTermYears,
      outstandingBalance:  newBalance,
      mortgageAmount:      newBalance,
      monthlyPayment:      completion.newMonthlyPayment,
      fees:                completion.feesAddedToLoan || 0,
      startDate:           switchDate,
      fixedRateStartDate:  switchDate,
      fixedTermYears:      completion.newFixedTermYears || null,
      fixedRateEndDate:    completion.newFixedRateEndDate || null,
      switchHistory:       [...(old.switchHistory || []), switchRecord],
      paymentHistory:      [...(old.paymentHistory || []), switchMarker],
    };

    const next = mortgages.map((m, i) => (i === idx ? updated : m));
    setMortgages(next);

    if (!isDemoMode && user) {
      const now = new Date().toISOString();
      await setDoc(
        doc(db, 'mortgagePots', user.uid),
        { mortgages: next, lastUpdated: now },
        { merge: true }
      );
      setLastUpdated(now);
    }
  }

  return (
    <MortgageDataContext.Provider value={{ mortgages, updateMortgage, addMortgage, switchMortgage, isDemoMode, lastUpdated, isLoading }}>
      {children}
    </MortgageDataContext.Provider>
  );
}

export function useMortgageData() {
  return useContext(MortgageDataContext);
}
