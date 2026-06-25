import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import MobileNavDrawer from '../components/MobileNavDrawer';

const TABS = [
  { path: '/mobile/family',            label: 'Hub',        icon: 'home'        },
  { path: '/mobile/family/members',    label: 'Members',    icon: 'group'       },
  { path: '/mobile/family/allowances', label: 'Allowances', icon: 'donut_large' },
];

function FamilyNavbar() {
  const { pathname } = useLocation();

  function isActive(tabPath) {
    if (tabPath === '/mobile/family') return pathname === tabPath || pathname === '/mobile/family/';
    return pathname.startsWith(tabPath);
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#111827',
      borderTop: '1px solid rgba(173,198,255,0.08)',
      display: 'flex',
      padding: '8px 8px 12px',
      zIndex: 80,
      gap: '4px',
    }}>
      {TABS.map(tab => {
        const active = isActive(tab.path);
        return (
          <Link key={tab.path} to={tab.path} style={{ flex: 1, textDecoration: 'none' }}>
            <button className={`nav-btn${active ? ' active' : ''}`} style={{ width: '100%' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{tab.icon}</span>
              <span className="label">{tab.label}</span>
            </button>
          </Link>
        );
      })}
    </nav>
  );
}

export default function FamilyLayout({ children }) {
  return (
    <div className="mobile-screen" style={{ paddingTop: '50px', paddingBottom: '80px' }}>
      <MobileNavDrawer />
      {children}
      <FamilyNavbar />
    </div>
  );
}
