import React from 'react';
import UniversalNavbar from '../components/UniversalNavbar';

/**
 * PensionLayout — wraps the 5 main pension tab screens.
 * Renders children above a fixed bottom nav bar.
 */
export default function PensionLayout({ children }) {
  return (
    <div className="mobile-screen" style={{ paddingBottom: '80px' }}>
      {children}
      <UniversalNavbar />
    </div>
  );
}
