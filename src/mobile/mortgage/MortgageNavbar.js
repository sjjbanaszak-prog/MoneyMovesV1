import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUserPlan } from '../../contexts/UserPlanContext';
import UpgradeSheet from '../components/UpgradeSheet';

const TABS = [
  { path: '/mobile/mortgage',              label: 'Overview',   icon: 'account_balance_wallet', premium: false },
  { path: '/mobile/mortgage/calculator',   label: 'Calculator', icon: 'calculate',              premium: false },
  { path: '/mobile/mortgage/comparisons',  label: 'Compare',    icon: 'balance',                premium: true,
    upgradeDescription: 'Compare mortgage deals and model different rates to find your best remortgage strategy.' },
  { path: '/mobile/mortgage/insights',     label: 'Insights',   icon: 'bar_chart',              premium: true,
    upgradeDescription: 'Track your mortgage paydown progress with detailed analytics and interest breakdowns.' },
  { path: '/mobile/mortgage/ai',           label: 'AI',         icon: 'psychology',             premium: true,
    upgradeDescription: 'AI-powered analysis of your mortgage strategy with personalised recommendations.' },
];

export default function MortgageNavbar() {
  const { pathname } = useLocation();
  const { isPremium } = useUserPlan();
  const [sheet, setSheet] = useState(null);

  function isActive(tabPath) {
    if (tabPath === '/mobile/mortgage') {
      return pathname === '/mobile/mortgage' || pathname === '/mobile/mortgage/';
    }
    return pathname.startsWith(tabPath);
  }

  function handleTabClick(e, tab) {
    if (tab.premium && !isPremium) {
      e.preventDefault();
      setSheet({ featureName: tab.label, description: tab.upgradeDescription });
    }
  }

  return (
    <>
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
        {TABS.map(tab => {
          const locked = tab.premium && !isPremium;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              onClick={(e) => handleTabClick(e, tab)}
              style={{ flex: 1, textDecoration: 'none', position: 'relative' }}
            >
              <button className={`nav-btn${isActive(tab.path) ? ' active' : ''}`} style={{ width: '100%', opacity: locked ? 0.6 : 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{tab.icon}</span>
                <span className="label">{tab.label}</span>
                {locked && (
                  <span
                    className="material-symbols-outlined"
                    style={{
                      position: 'absolute', top: '2px', right: '6px',
                      fontSize: '11px', color: '#adc6ff',
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    lock
                  </span>
                )}
              </button>
            </Link>
          );
        })}
      </nav>

      <UpgradeSheet
        isOpen={!!sheet}
        onClose={() => setSheet(null)}
        featureName={sheet ? `Mortgage ${sheet.featureName}` : ''}
        description={sheet?.description}
      />
    </>
  );
}
