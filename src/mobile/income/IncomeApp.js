import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { IncomeDataProvider, useIncomeData } from './IncomeDataContext';

import IncomeOverview     from './pages/IncomeOverview';
import IncomeCalculator   from './pages/IncomeCalculator';
import AddIncome          from './pages/AddIncome';
import EmployerDetail     from './pages/EmployerDetail';
import AddIncomeHistory   from './pages/AddIncomeHistory';

// The Overview is only available to users who've saved income entries;
// everyone else lands on the Calculator.
function IncomeIndex() {
  const { isLoading, hasSavedIncomes } = useIncomeData();
  if (isLoading) return null;
  return hasSavedIncomes ? <IncomeOverview /> : <Navigate to="/mobile/income/calculator" replace />;
}

/**
 * IncomeApp
 * Route structure:
 *   /mobile/income                              → IncomeOverview (or Calculator if no saved incomes)
 *   /mobile/income/calculator                   → IncomeCalculator (default from the nav menu)
 *   /mobile/income/add                          → AddIncome
 *   /mobile/income/employer/:idx                → EmployerDetail
 *   /mobile/income/employer/:idx/add-history    → AddIncomeHistory
 */
export default function IncomeApp() {
  return (
    <IncomeDataProvider>
      <Routes>
        <Route index                                       element={<IncomeIndex />} />
        <Route path="calculator"                           element={<IncomeCalculator />} />
        <Route path="add"                                  element={<AddIncome />} />
        <Route path="employer/:idx"                        element={<EmployerDetail />} />
        <Route path="employer/:idx/add-history"            element={<AddIncomeHistory />} />
        <Route path="*"                                    element={<Navigate to="/mobile/income" replace />} />
      </Routes>
    </IncomeDataProvider>
  );
}
