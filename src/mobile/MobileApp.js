import React, { useLayoutEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './mobile.css';
import MobileDashboard    from './pages/MobileDashboard';
import PensionApp         from './pension/PensionApp';
import SavingsApp         from './savings/SavingsApp';
import MortgageApp        from './mortgage/MortgageApp';
import IncomeApp          from './income/IncomeApp';
import MobileSettingsPage  from './settings/MobileSettingsPage';
import EditProfilePage     from './settings/EditProfilePage';
import ReportProblemPage   from './settings/ReportProblemPage';
import MobileUpgradePage   from './upgrade/MobileUpgradePage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  return null;
}

/**
 * MobileApp
 * Root of the mobile experience. Handles all /mobile/* routes.
 *
 * Route structure:
 *   /mobile           → redirect to /mobile/pension
 *   /mobile/pension/* → PensionApp (all pension routes)
 *   /mobile/savings/* → SavingsApp (all savings routes)
 *
 * To add a new mobile section:
 *   1. Create src/mobile/<section>/<Section>App.js
 *   2. Import it here
 *   3. Add <Route path="<section>/*" element={<SectionApp />} />
 */
export default function MobileApp() {
  return (
    <>
    <ScrollToTop />
    <Routes>
      {/* Default landing → dashboard */}
      <Route index element={<Navigate to="/mobile/dashboard" replace />} />

      {/* Dashboard */}
      <Route path="dashboard" element={<MobileDashboard />} />

      {/* Pension section — owns all /mobile/pension/* routes */}
      <Route path="pension/*" element={<PensionApp />} />

      {/* Savings section — owns all /mobile/savings/* routes */}
      <Route path="savings/*" element={<SavingsApp />} />

      {/* Mortgage section — owns all /mobile/mortgage/* routes */}
      <Route path="mortgage/*" element={<MortgageApp />} />

      {/* Income section — owns all /mobile/income/* routes */}
      <Route path="income/*" element={<IncomeApp />} />

      {/* Settings & Upgrade */}
      <Route path="settings"                  element={<MobileSettingsPage />} />
      <Route path="settings/edit-profile"    element={<EditProfilePage />} />
      <Route path="settings/report-problem"  element={<ReportProblemPage />} />
      <Route path="upgrade"                  element={<MobileUpgradePage />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/mobile/pension" replace />} />
    </Routes>
    </>
  );
}
