import React from 'react';
import MobileNavDrawer from '../components/MobileNavDrawer';
import UniversalNavbar from '../components/UniversalNavbar';

export default function IncomeLayout({ children }) {
  return (
    <div className="mobile-screen" style={{ paddingTop: '50px', paddingBottom: '80px' }}>
      <MobileNavDrawer />
      {children}
      <UniversalNavbar />
    </div>
  );
}
