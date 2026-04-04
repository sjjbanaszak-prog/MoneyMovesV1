import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './mobile.css';
import PensionApp  from './pension/PensionApp';
import SavingsApp  from './savings/SavingsApp';
import MortgageApp from './mortgage/MortgageApp';

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
    <Routes>
      {/* Default landing → pension overview */}
      <Route index element={<Navigate to="/mobile/pension" replace />} />

      {/* Pension section — owns all /mobile/pension/* routes */}
      <Route path="pension/*" element={<PensionApp />} />

      {/* Savings section — owns all /mobile/savings/* routes */}
      <Route path="savings/*" element={<SavingsApp />} />

      {/* Mortgage section — owns all /mobile/mortgage/* routes */}
      <Route path="mortgage/*" element={<MortgageApp />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/mobile/pension" replace />} />
    </Routes>
  );
}
