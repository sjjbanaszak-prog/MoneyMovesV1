import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const UserPlanContext = createContext();

export function useUserPlan() {
  const context = useContext(UserPlanContext);
  if (!context) {
    throw new Error('useUserPlan must be used within a UserPlanProvider');
  }
  return context;
}

export function UserPlanProvider({ children }) {
  const { currentUser } = useAuth();
  const [plan, setPlan] = useState('free');
  const [planLoading, setPlanLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setPlan('free');
      setPlanLoading(false);
      return;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setPlan(snap.data().plan || 'free');
      } else {
        setPlan('free');
      }
      setPlanLoading(false);
    }, () => {
      setPlan('free');
      setPlanLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  const value = {
    plan,
    isPremium: plan === 'premium',
    planLoading,
  };

  return (
    <UserPlanContext.Provider value={value}>
      {children}
    </UserPlanContext.Provider>
  );
}
