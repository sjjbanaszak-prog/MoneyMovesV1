import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import './pension-theme.css';
import { PensionDataProvider } from './PensionDataContext';

import PensionOverview    from './pages/PensionOverview';
import PensionCalculator  from './pages/PensionCalculator';
import PensionComparisons from './pages/PensionComparisons';
import PensionInsights    from './pages/PensionInsights';
import PensionAIAnalysis  from './pages/PensionAIAnalysis';
import ProviderDetail     from './pages/ProviderDetail';
import AddContribution    from './pages/AddContribution';
import AllContributions   from './pages/AllContributions';
import AddPension         from './pages/AddPension';

/**
 * PensionApp
 * Route structure:
 *   /mobile/pension                            → PensionOverview
 *   /mobile/pension/calculator                 → PensionCalculator
 *   /mobile/pension/comparisons                → PensionComparisons
 *   /mobile/pension/insights                   → PensionInsights
 *   /mobile/pension/ai                         → PensionAIAnalysis
 *   /mobile/pension/provider/:idx              → ProviderDetail (dynamic — any provider)
 *   /mobile/pension/provider/:idx/add          → AddContribution
 *   /mobile/pension/provider/:idx/contributions → AllContributions
 */
export default function PensionApp() {
  return (
    <PensionDataProvider>
      <Routes>
        <Route index                                      element={<PensionOverview />} />
        <Route path="add"                                 element={<AddPension />} />
        <Route path="calculator"                          element={<PensionCalculator />} />
        <Route path="comparisons"                         element={<PensionComparisons />} />
        <Route path="insights"                            element={<PensionInsights />} />
        <Route path="ai"                                  element={<PensionAIAnalysis />} />
        <Route path="provider/:idx"                       element={<ProviderDetail />} />
        <Route path="provider/:idx/add"                   element={<AddContribution />} />
        <Route path="provider/:idx/contributions"         element={<AllContributions />} />
        {/* Legacy aegon routes — redirect to provider 0 */}
        <Route path="aegon"                               element={<Navigate to="/mobile/pension/provider/0" replace />} />
        <Route path="aegon/add"                           element={<Navigate to="/mobile/pension/provider/0/add" replace />} />
        <Route path="aegon/contributions"                 element={<Navigate to="/mobile/pension/provider/0/contributions" replace />} />
        <Route path="*"                                   element={<Navigate to="/mobile/pension" replace />} />
      </Routes>
    </PensionDataProvider>
  );
}
