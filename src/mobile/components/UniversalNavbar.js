import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Universal bottom navbar shared across pension, mortgage, and savings sections.
 * Detects the active section from the URL and prefixes all tab paths accordingly,
 * so the same five tabs navigate to section-specific routes.
 *
 * Tab structure (per section):
 *   Overview    → /mobile/{section}
 *   Calculator  → /mobile/{section}/calculator
 *   Compare     → /mobile/{section}/comparisons
 *   Insights    → /mobile/{section}/insights
 *   AI          → /mobile/{section}/ai
 */

const TABS = [
  { segment: '',             label: 'Overview',   icon: 'account_balance_wallet' },
  { segment: '/calculator',  label: 'Calculator', icon: 'calculate'              },
  { segment: '/comparisons', label: 'Compare',    icon: 'balance'                },
  { segment: '/insights',    label: 'Insights',   icon: 'bar_chart'              },
  { segment: '/ai',          label: 'AI',         icon: 'psychology'             },
];

const SECTIONS = ['pension', 'mortgage', 'savings', 'income'];

// Sections whose tabs are display-only (not yet navigable)
const DISABLED_SECTIONS = ['income'];

export default function UniversalNavbar() {
  const { pathname } = useLocation();

  const section   = SECTIONS.find(s => pathname.startsWith(`/mobile/${s}`)) || 'pension';
  const base      = `/mobile/${section}`;
  const isDisabled = DISABLED_SECTIONS.includes(section);

  function isActive(segment) {
    const full = base + segment;
    if (segment === '') return pathname === base || pathname === `${base}/`;
    return pathname.startsWith(full);
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
      zIndex: 80,
      gap: '4px',
    }}>
      {TABS.map(tab => {
        const active = isActive(tab.segment);
        const btn = (
          <button
            className={`nav-btn${active ? ' active' : ''}`}
            style={{ width: '100%', cursor: isDisabled ? 'default' : 'pointer', opacity: isDisabled && !active ? 0.4 : 1 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
              {tab.icon}
            </span>
            <span className="label">{tab.label}</span>
          </button>
        );

        if (isDisabled) {
          return <div key={tab.segment} style={{ flex: 1 }}>{btn}</div>;
        }
        return (
          <Link key={tab.segment} to={base + tab.segment} style={{ flex: 1, textDecoration: 'none' }}>
            {btn}
          </Link>
        );
      })}
    </nav>
  );
}
