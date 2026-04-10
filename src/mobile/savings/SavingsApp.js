import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import './savings-theme.css'; // pulls in mobile-theme.css (single source of truth)

import { SavingsDataProvider } from './SavingsDataContext';
import SavingsOverview       from './pages/SavingsOverview';
import SavingsAccountDetail  from './pages/SavingsAccountDetail';
import AddSavingsAccount     from './pages/AddSavingsAccount';
import AddTransaction        from './pages/AddTransaction';
import AllTransactions       from './pages/AllTransactions';

/**
 * SavingsApp
 * Route structure:
 *   /mobile/savings          → SavingsOverview
 *   /mobile/savings/calculator   → (coming soon — placeholder redirects to overview)
 *   /mobile/savings/comparisons → (coming soon — placeholder redirects to overview)
 *   /mobile/savings/insights    → (coming soon — placeholder redirects to overview)
 *   /mobile/savings/ai          → (coming soon — placeholder redirects to overview)
 */
export default function SavingsApp() {
  return (
    <SavingsDataProvider>
      <Routes>
        <Route index                   element={<SavingsOverview />} />
        <Route path="add"              element={<AddSavingsAccount />} />
        <Route path="account/:idx"     element={<SavingsAccountDetail />} />
        <Route path="account/:idx/add"          element={<AddTransaction />} />
        <Route path="account/:idx/transactions" element={<AllTransactions />} />
        <Route path="calculator"       element={<Navigate to="/mobile/savings" replace />} />
        <Route path="comparisons"      element={<Navigate to="/mobile/savings" replace />} />
        <Route path="insights"         element={<Navigate to="/mobile/savings" replace />} />
        <Route path="ai"               element={<Navigate to="/mobile/savings" replace />} />
        <Route path="*"                element={<Navigate to="/mobile/savings" replace />} />
      </Routes>
    </SavingsDataProvider>
  );
}
