import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUserPlan } from '../../contexts/UserPlanContext';
import UpgradeSheet from '../components/UpgradeSheet';

const TABS = [
  { path: '/mobile/pension',             label: 'Overview',   icon: 'account_balance_wallet', premium: false },
  { path: '/mobile/pension/calculator',  label: 'Calculator', icon: 'calculate',              premium: false },
  { path: '/mobile/pension/comparisons', label: 'Compare',    icon: 'balance',                premium: true,
    upgradeDescription: 'Compare your pension against peers and benchmarks to see how you stack up.' },
  { path: '/mobile/pension/insights',    label: 'Insights',   icon: 'bar_chart',              premium: true,
    upgradeDescription: 'Deep-dive analytics on your pension growth, contributions, and projected retirement income.' },
  { path: '/mobile/pension/ai',          label: 'AI',         icon: 'psychology',             premium: true,
    upgradeDescription: 'AI-powered recommendations tailored to your pension data and retirement goals.' },
];

export default function PensionNavbar() {
  const { pathname } = useLocation();
  const { isPremium } = useUserPlan();
  const [sheet, setSheet] = useState(null); // { featureName, description } | null

  function isActive(tabPath) {
    if (tabPath === '/mobile/pension') {
      return pathname === '/mobile/pension' || pathname === '/mobile/pension/';
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
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                  {tab.icon}
                </span>
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
        featureName={sheet ? `Pension ${sheet.featureName}` : ''}
        description={sheet?.description}
      />
    </>
  );
}
