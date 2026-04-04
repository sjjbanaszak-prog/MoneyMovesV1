import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import './mortgage-theme.css'; // pulls in mobile-theme.css (single source of truth)

import { MortgageDataProvider } from './MortgageDataContext';
import MortgageOverview      from './pages/MortgageOverview';
import MortgageDetail        from './pages/MortgageDetail';
import AllMortgagePayments   from './pages/AllMortgagePayments';
import AddMortgage           from './pages/AddMortgage';
import AddMortgagePayment    from './pages/AddMortgagePayment';
import MortgageInsights      from './pages/MortgageInsights';
import MortgageCalculator    from './pages/MortgageCalculator';
import MortgageCompare       from './pages/MortgageCompare';

/**
 * MortgageApp
 * Route structure:
 *   /mobile/mortgage                    → MortgageOverview
 *   /mobile/mortgage/:idx               → MortgageDetail (property drill-down)
 *   /mobile/mortgage/:idx/payments      → AllMortgagePayments (full history)
 *   /mobile/mortgage/calculator         → MortgageCalculator (overpayment modeller)
 *   /mobile/mortgage/ai                 → (coming soon — redirects to overview)
 */
export default function MortgageApp() {
  return (
    <MortgageDataProvider>
      <Routes>
        <Route index                       element={<MortgageOverview />} />
        <Route path="add"                  element={<AddMortgage />} />
        <Route path="compare"              element={<MortgageCompare />} />
        <Route path="comparisons"          element={<MortgageCompare />} />
        <Route path="insights"             element={<MortgageInsights />} />
        <Route path="calculator"           element={<MortgageCalculator />} />
        <Route path="ai"                   element={<Navigate to="/mobile/mortgage" replace />} />
        <Route path=":idx"                 element={<MortgageDetail />} />
        <Route path=":idx/payments"        element={<AllMortgagePayments />} />
        <Route path=":idx/add"             element={<AddMortgagePayment />} />
        <Route path="*"                    element={<Navigate to="/mobile/mortgage" replace />} />
      </Routes>
    </MortgageDataProvider>
  );
}
