import { useEffect, useRef } from 'react';
import {
  collection, addDoc, getDocs, getDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoMode } from '../../contexts/DemoModeContext';
import { useSavingsData } from '../savings/SavingsDataContext';
import { usePensionData } from '../pension/PensionDataContext';
import { evaluateRules } from './notificationRules';

const SESSION_KEY = 'mm_notif_engine_ran';

export default function NotificationEngine() {
  const { currentUser }                                        = useAuth();
  const { isDemoMode }                                         = useDemoMode();
  const { metrics: savingsMetrics, isLoading: savingsLoading } = useSavingsData();
  const { metrics: pensionMetrics, isLoading: pensionLoading } = usePensionData();

  const realRan = useRef(false);

  // ── Real engine: evaluate rules against live data ────────────────────────
  useEffect(() => {
    if (isDemoMode) return;
    if (realRan.current) return;
    if (!currentUser) return;
    if (savingsLoading || pensionLoading) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    realRan.current = true;
    sessionStorage.setItem(SESSION_KEY, '1');
    runRealEngine(currentUser.uid, savingsMetrics, pensionMetrics);
  }, [currentUser, isDemoMode, savingsMetrics, pensionMetrics, savingsLoading, pensionLoading]);

  // Reset real engine when leaving demo mode so it re-evaluates
  useEffect(() => {
    if (!isDemoMode) {
      realRan.current = false;
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [isDemoMode]);

  return null;
}

// ── Real engine ───────────────────────────────────────────────────────────────

async function runRealEngine(uid, savingsMetrics, pensionMetrics) {
  try {
    const mortgageSnap = await getDoc(doc(db, 'mortgagePots', uid));
    const mortgages = mortgageSnap.exists() ? (mortgageSnap.data().mortgages || []) : [];

    const householdSnap = await getDoc(doc(db, 'households', uid));
    const children = householdSnap.exists() ? (householdSnap.data().children || []) : [];

    const candidates = evaluateRules({ savingsMetrics, pensionMetrics, mortgages, children });

    if (!candidates.length) {
      sessionStorage.setItem(SESSION_KEY, '1');
      return;
    }

    const colRef = collection(db, 'notifications', uid, 'items');
    const existing = await getDocs(colRef);
    const existingKeys = new Set(existing.docs.map(d => d.data().key));

    const toCreate = candidates.filter(c => !existingKeys.has(c.key));
    await Promise.all(
      toCreate.map(n => addDoc(colRef, { ...n, read: false, createdAt: serverTimestamp() })),
    );

    sessionStorage.setItem(SESSION_KEY, '1');
  } catch (e) {
    console.error('NotificationEngine real run:', e);
  }
}
