import React from 'react';
import UniversalNavbar from '../components/UniversalNavbar';
import MobileNavDrawer from '../components/MobileNavDrawer';

export default function MortgageLayout({ children }) {
  return (
    <div className="mobile-screen" style={{ paddingTop: '50px', paddingBottom: '80px' }}>
      <MobileNavDrawer />
      {children}
      <UniversalNavbar />
    </div>
  );
}
