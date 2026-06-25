import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useDemoMode } from '../../contexts/DemoModeContext';

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_HOUSEHOLD = {
  partner: {
    name: 'Sarah',
    email: 'sarah.demo@moneymoves.co.uk',
    allowances: {
      isa:          { contributed: 14000 },
      pension:      { contributed: 18000 },
      lisa:         { contributed: 2500, eligible: true },
      premiumBonds: { balance: 38000 },
    },
  },
  primaryAllowances: {
    isa:          { contributed: 17500 },
    pension:      { contributed: 24000 },
    lisa:         { contributed: 0, eligible: false },
    premiumBonds: { balance: 42000 },
  },
  children: [
    {
      id: 'child_1',
      name: 'Olivia',
      dob: '2015-03-12',
      accounts: [
        { type: 'jisa',          provider: 'Vanguard',            balance: 12400, contributionsThisYear: 2400 },
        { type: 'junior_sipp',   provider: 'Hargreaves Lansdown', balance: 8200,  contributionsThisYear: 1440 },
        { type: 'premium_bonds', provider: 'NS&I',                balance: 5000,  contributionsThisYear: 0   },
      ],
    },
    {
      id: 'child_2',
      name: 'James',
      dob: '2019-09-08',
      accounts: [
        { type: 'jisa',          provider: 'Nationwide',          balance: 6800,  contributionsThisYear: 1500 },
        { type: 'premium_bonds', provider: 'NS&I',                balance: 2500,  contributionsThisYear: 0   },
      ],
    },
  ],
  childBenefit: { childCount: 2, claiming: true },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_HOUSEHOLD = {
  partner: null,
  primaryAllowances: {
    isa:          { contributed: 0 },
    pension:      { contributed: 0 },
    lisa:         { contributed: 0, eligible: false },
    premiumBonds: { balance: 0 },
  },
  children: [],
  childBenefit: { childCount: 0, claiming: false },
};

// ── Context ───────────────────────────────────────────────────────────────────

const FamilyDataContext = createContext(null);

export function useFamilyData() {
  const ctx = useContext(FamilyDataContext);
  if (!ctx) throw new Error('useFamilyData must be used within FamilyDataProvider');
  return ctx;
}

export function FamilyDataProvider({ children: reactChildren }) {
  const { isDemoMode } = useDemoMode();
  const [user, setUser]             = useState(null);
  const [household, setHousehold]   = useState(DEFAULT_HOUSEHOLD);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [saving, setSaving]         = useState(false);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  // Load
  useEffect(() => {
    if (!user) return;
    async function load() {
      if (isDemoMode) {
        setHousehold(DEMO_HOUSEHOLD);
        setLastUpdated(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'households', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setHousehold(data);
          setLastUpdated(data.updatedAt || null);
        } else {
          setHousehold(DEFAULT_HOUSEHOLD);
          setLastUpdated(null);
        }
      } catch (e) {
        console.error('FamilyDataContext load error:', e);
        setHousehold(DEFAULT_HOUSEHOLD);
        setLastUpdated(null);
      }
    }
    load();
  }, [user, isDemoMode]);

  // Save
  const save = useCallback(async (next) => {
    if (!user || isDemoMode) return;
    setSaving(true);
    try {
      const payload = { ...next, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'households', user.uid), payload);
      setLastUpdated(payload.updatedAt);
    } catch (e) {
      console.error('FamilyDataContext save error:', e);
    } finally {
      setSaving(false);
    }
  }, [user, isDemoMode]);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const setPartner = useCallback((partner) => {
    const next = { ...household, partner };
    setHousehold(next);
    save(next);
  }, [household, save]);

  const setPrimaryAllowances = useCallback((allowances) => {
    const next = { ...household, primaryAllowances: allowances };
    setHousehold(next);
    save(next);
  }, [household, save]);

  const addChild = useCallback((childData) => {
    const child = { id: uid(), ...childData, accounts: childData.accounts || [] };
    const next = { ...household, children: [...household.children, child] };
    setHousehold(next);
    save(next);
    return child.id;
  }, [household, save]);

  const updateChild = useCallback((id, updates) => {
    const next = {
      ...household,
      children: household.children.map(c => c.id === id ? { ...c, ...updates } : c),
    };
    setHousehold(next);
    save(next);
  }, [household, save]);

  const removeChild = useCallback((id) => {
    const next = { ...household, children: household.children.filter(c => c.id !== id) };
    setHousehold(next);
    save(next);
  }, [household, save]);

  const setChildBenefit = useCallback((childBenefit) => {
    const next = { ...household, childBenefit };
    setHousehold(next);
    save(next);
  }, [household, save]);

  return (
    <FamilyDataContext.Provider value={{
      household,
      lastUpdated,
      saving,
      setPartner,
      setPrimaryAllowances,
      addChild,
      updateChild,
      removeChild,
      setChildBenefit,
    }}>
      {reactChildren}
    </FamilyDataContext.Provider>
  );
}

// ── Utility: calculate age from dob string ────────────────────────────────────
export function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const now   = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

// ── Utility: total pot value for a child ─────────────────────────────────────
export function childTotalPot(child) {
  return (child.accounts || []).reduce((s, a) => s + (a.balance || 0), 0);
}

// ── Utility: current UK tax year label ───────────────────────────────────────
export function currentTaxYearLabel() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  const day   = now.getDate();
  const startYear = (month < 4 || (month === 4 && day < 6)) ? year - 1 : year;
  return `${startYear}/${String(startYear + 1).slice(-2)}`;
}
