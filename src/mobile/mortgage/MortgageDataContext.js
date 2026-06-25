import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useDemoMode } from '../../contexts/DemoModeContext';

// Generate monthly payment history entries backwards from a given date
function genPayments(monthlyAmount, label, fromDate, count) {
  const payments = [];
  const d = new Date(fromDate);
  for (let i = 0; i < count; i++) {
    payments.push({
      date: d.toISOString().slice(0, 10),
      amount: monthlyAmount,
      description: label,
    });
    d.setMonth(d.getMonth() - 1);
  }
  return payments;
}

const DEMO_MORTGAGES = [
  {
    name: '12 Oak Street',
    type: 'Residential',
    lender: 'Halifax',
    purchasePrice:      315000,  // bought Mar 2019; ~22% appreciation to current £385k
    propertyValue:      385000,
    mortgageAmount:     268000,  // ~85% LTV at purchase
    outstandingBalance: 210000,
    monthlyPayment: 1240,
    startDate: '2019-03-01',
    termYears: 30,
    fixedRateStartDate: '2024-05-01',
    fixedTermYears: 3,
    interestRate: 4.25,
    defaultRate: 7.49,
    paymentHistory: genPayments(1240, 'Monthly Payment', '2026-03-01', 18),
  },
  {
    name: '4 Maple Avenue',
    type: 'Buy-to-Let',
    lender: 'Nationwide',
    purchasePrice:      225000,  // bought Jul 2021; ~13% appreciation to current £255k
    propertyValue:      255000,
    mortgageAmount:     169000,  // ~75% LTV at purchase (typical BTL)
    outstandingBalance: 140000,
    monthlyPayment: 820,
    startDate: '2021-07-01',
    termYears: 25,
    fixedRateStartDate: '2024-01-01',
    fixedTermYears: 2,
    interestRate: 5.10,
    defaultRate: 8.24,
    paymentHistory: genPayments(820, 'Monthly Payment', '2026-03-01', 18),
  },
];

const MortgageDataContext = createContext(null);

export function MortgageDataProvider({ children }) {
  const { isDemoMode } = useDemoMode();
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
      if (isDemoMode) {
        setMortgages(DEMO_MORTGAGES);
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
    }

    load();
  }, [user, isDemoMode]);

  /**
   * Update arbitrary fields on a mortgage by index.
   * In live mode, persists to Firestore.
   */
  const MORTGAGE_ALLOWED_FIELDS = [
    'name', 'lender', 'type', 'postcode', 'propertyValue', 'propertyValueHistory', 'purchasePrice',
    'mortgageAmount', 'outstandingBalance', 'interestRate', 'monthlyPayment',
    'termYears', 'startDate', 'fixedRateEndDate', 'notes', 'paymentHistory',
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

  return (
    <MortgageDataContext.Provider value={{ mortgages, updateMortgage, addMortgage, isDemoMode, lastUpdated }}>
      {children}
    </MortgageDataContext.Provider>
  );
}

export function useMortgageData() {
  return useContext(MortgageDataContext);
}
