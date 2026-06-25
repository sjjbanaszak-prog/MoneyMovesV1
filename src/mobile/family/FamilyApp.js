import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import './family-theme.css';

import { FamilyDataProvider } from './FamilyDataContext';
import FamilyHub          from './pages/FamilyHub';
import FamilyMembers      from './pages/FamilyMembers';
import AddChild           from './pages/AddChild';
import ChildDetail        from './pages/ChildDetail';
import FamilyAllowances   from './pages/FamilyAllowances';

/**
 * FamilyApp
 * Route structure:
 *   /mobile/family                    → FamilyHub (overview)
 *   /mobile/family/members            → FamilyMembers (manage household)
 *   /mobile/family/add-child          → AddChild (add / edit child)
 *   /mobile/family/child/:id          → ChildDetail (per-child detail)
 *   /mobile/family/allowances         → FamilyAllowances (combined allowance dashboard)
 */
export default function FamilyApp() {
  return (
    <FamilyDataProvider>
      <Routes>
        <Route index                        element={<FamilyHub />} />
        <Route path="members"               element={<FamilyMembers />} />
        <Route path="add-child"             element={<AddChild />} />
        <Route path="child/:id"             element={<ChildDetail />} />
        <Route path="allowances"            element={<FamilyAllowances />} />
        <Route path="*"                     element={<Navigate to="/mobile/family" replace />} />
      </Routes>
    </FamilyDataProvider>
  );
}
