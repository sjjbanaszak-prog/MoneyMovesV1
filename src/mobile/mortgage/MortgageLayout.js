import React from 'react';
import UniversalNavbar from '../components/UniversalNavbar';

export default function MortgageLayout({ children }) {
  return (
    <div className="mobile-screen" style={{ paddingBottom: '80px' }}>
      {children}
      <UniversalNavbar />
    </div>
  );
}
