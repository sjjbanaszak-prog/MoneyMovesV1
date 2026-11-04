import React from 'react';
import MobileNavDrawer from '../components/MobileNavDrawer';
import UniversalNavbar from '../components/UniversalNavbar';
import { useIncomeData } from './IncomeDataContext';

export default function IncomeLayout({ children }) {
  // Overview is only available once the user has saved an income entry
  const { isLoading, hasSavedIncomes } = useIncomeData();
  const disabledSegments = !isLoading && !hasSavedIncomes ? [''] : [];

  return (
    <div className="mobile-screen" style={{ paddingTop: '50px', paddingBottom: '80px' }}>
      <MobileNavDrawer />
      {children}
      <UniversalNavbar disabledSegments={disabledSegments} />
    </div>
  );
}
