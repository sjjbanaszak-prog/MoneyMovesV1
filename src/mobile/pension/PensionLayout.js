import React from 'react';
import UniversalNavbar from '../components/UniversalNavbar';
import MobileNavDrawer from '../components/MobileNavDrawer';

/**
 * PensionLayout — wraps the 5 main pension tab screens.
 * Renders children above a fixed bottom nav bar with a top nav drawer.
 */
export default function PensionLayout({ children }) {
  return (
    <div className="mobile-screen" style={{ paddingTop: '50px', paddingBottom: '80px' }}>
      <MobileNavDrawer />
      {children}
      <UniversalNavbar />
    </div>
  );
}
