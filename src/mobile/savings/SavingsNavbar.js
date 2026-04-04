import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { path: '/mobile/savings',           label: 'Overview', icon: 'savings'    },
  { path: '/mobile/savings/insights',  label: 'Insights', icon: 'bar_chart'  },
  { path: '/mobile/savings/ai',        label: 'AI',       icon: 'psychology' },
];

export default function SavingsNavbar() {
  const { pathname } = useLocation();

  function isActive(tabPath) {
    if (tabPath === '/mobile/savings') {
      return pathname === '/mobile/savings' || pathname === '/mobile/savings/';
    }
    return pathname.startsWith(tabPath);
  }

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#111827',
      borderTop: '1px solid rgba(173,198,255,0.08)',
      display: 'flex',
      padding: '8px 8px 12px',
      zIndex: 100,
      gap: '4px',
    }}>
      {TABS.map(tab => (
        <Link key={tab.path} to={tab.path} style={{ flex: 1, textDecoration: 'none' }}>
          <button className={`nav-btn${isActive(tab.path) ? ' active' : ''}`} style={{ width: '100%' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{tab.icon}</span>
            <span className="label">{tab.label}</span>
          </button>
        </Link>
      ))}
    </nav>
  );
}
