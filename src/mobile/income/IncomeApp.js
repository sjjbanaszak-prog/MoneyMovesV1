import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { IncomeDataProvider } from './IncomeDataContext';

import IncomeOverview     from './pages/IncomeOverview';
import IncomeCalculator   from './pages/IncomeCalculator';
import AddIncome          from './pages/AddIncome';
import EmployerDetail     from './pages/EmployerDetail';
import AddIncomeHistory   from './pages/AddIncomeHistory';

/**
 * IncomeApp
 * Route structure:
 *   /mobile/income                              → IncomeOverview
 *   /mobile/income/add                          → AddIncome
 *   /mobile/income/employer/:idx                → EmployerDetail
 *   /mobile/income/employer/:idx/add-history    → AddIncomeHistory
 */
export default function IncomeApp() {
  return (
    <IncomeDataProvider>
      <Routes>
        <Route index                                       element={<IncomeOverview />} />
        <Route path="calculator"                           element={<IncomeCalculator />} />
        <Route path="add"                                  element={<AddIncome />} />
        <Route path="employer/:idx"                        element={<EmployerDetail />} />
        <Route path="employer/:idx/add-history"            element={<AddIncomeHistory />} />
        <Route path="*"                                    element={<Navigate to="/mobile/income" replace />} />
      </Routes>
    </IncomeDataProvider>
  );
}
