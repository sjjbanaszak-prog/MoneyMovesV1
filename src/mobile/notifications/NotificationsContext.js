import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoMode } from '../../contexts/DemoModeContext';
import { DEMO_NOTIFICATIONS } from './demoNotifications';

const NotificationsContext = createContext(null);

// Give demo notifications stable fake IDs and timestamps for sorting
const DEMO_ITEMS = DEMO_NOTIFICATIONS.map((n, i) => ({
  ...n,
  id: `demo_${n.key}`,
  createdAt: { toDate: () => new Date(Date.now() - i * 60000) },
}));

export function NotificationsProvider({ children }) {
  const { currentUser }  = useAuth();
  const { isDemoMode }   = useDemoMode();
  const [notifications, setNotifications] = useState([]);
  const [demoReadState, setDemoReadState] = useState({});
  const [loading, setLoading]             = useState(true);

  // ── Real Firestore listener ───────────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'notifications', currentUser.uid, 'items'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error('NotificationsContext onSnapshot error:', err.code, err.message);
      setLoading(false);
    });
    return unsub;
  }, [currentUser, isDemoMode]);

  // ── Demo mode: reset read state when toggling ─────────────────────────────
  useEffect(() => {
    if (isDemoMode) setDemoReadState({});
  }, [isDemoMode]);

  // ── Resolved notification list ────────────────────────────────────────────
  const resolvedNotifications = isDemoMode
    ? DEMO_ITEMS.map(n => ({ ...n, read: demoReadState[n.id] ?? n.read }))
    : notifications;

  const unreadCount = resolvedNotifications.filter(n => !n.read).length;

  // ── Actions ───────────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (id) => {
    if (isDemoMode) {
      setDemoReadState(prev => ({ ...prev, [id]: true }));
      return;
    }
    if (!currentUser) return;
    await updateDoc(doc(db, 'notifications', currentUser.uid, 'items', id), { read: true });
  }, [isDemoMode, currentUser]);

  const markAllAsRead = useCallback(async () => {
    if (isDemoMode) {
      const all = {};
      DEMO_ITEMS.forEach(n => { all[n.id] = true; });
      setDemoReadState(all);
      return;
    }
    if (!currentUser) return;
    const unread = notifications.filter(n => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', currentUser.uid, 'items', n.id), { read: true });
    });
    await batch.commit();
  }, [isDemoMode, currentUser, notifications]);

  const [demoDismissed, setDemoDismissed] = useState(new Set());

  const dismiss = useCallback(async (id) => {
    if (isDemoMode) {
      setDemoDismissed(prev => new Set([...prev, id]));
      return;
    }
    if (!currentUser) return;
    await deleteDoc(doc(db, 'notifications', currentUser.uid, 'items', id));
  }, [isDemoMode, currentUser]);

  const visibleNotifications = isDemoMode
    ? resolvedNotifications.filter(n => !demoDismissed.has(n.id))
    : resolvedNotifications;

  return (
    <NotificationsContext.Provider value={{
      notifications: visibleNotifications,
      unreadCount:   visibleNotifications.filter(n => !n.read).length,
      loading,
      markAsRead,
      markAllAsRead,
      dismiss,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
