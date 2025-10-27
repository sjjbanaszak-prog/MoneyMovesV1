import React, { createContext, useContext, useState, useEffect } from 'react';
import { demoData } from '../data/demoData';

const DemoModeContext = createContext();

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}

export function DemoModeProvider({ children }) {
  // Check localStorage for saved mode preference
  const [isDemoMode, setIsDemoMode] = useState(() => {
    const saved = localStorage.getItem('moneyMovesDemoMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Save mode preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('moneyMovesDemoMode', JSON.stringify(isDemoMode));
  }, [isDemoMode]);

  const toggleDemoMode = () => {
    setIsDemoMode(prev => !prev);
  };

  const value = {
    isDemoMode,
    toggleDemoMode,
    demoData: isDemoMode ? demoData : null,
  };

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}
