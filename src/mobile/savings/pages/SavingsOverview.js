import React from 'react';
import { useDemoMode } from '../../../contexts/DemoModeContext';
import { useSavingsData } from '../SavingsDataContext';
import SavingsLayout from '../SavingsLayout';

// ---- Helpers ----
function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}

// Map account type → display colour
const TYPE_COLORS = {
  isa:             '#4edea3',
  'cash isa':      '#4edea3',
  'stocks & shares isa': '#4edea3',
  'lifetime isa':  '#f472b6',
  lisa:            '#f472b6',
  'savings account': '#adc6ff',
  'easy access':   '#adc6ff',
  'current account': '#ffb95f',
  'fixed rate':    '#a78bfa',
};

function accountColor(accountType = '') {
  const key = accountType.toLowerCase();
  for (const [k, v] of Object.entries(TYPE_COLORS)) {
    if (key.includes(k)) return v;
  }
  return '#adc6ff';
}

function accountInitials(name = '') {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function accountTypeBadge(accountType = '') {
  const t = accountType.toLowerCase();
  if (t.includes('lisa') || t.includes('lifetime')) return 'LISA';
  if (t.includes('isa')) return 'ISA';
  if (t.includes('current')) return 'Current';
  if (t.includes('fixed')) return 'Fixed';
  return 'Savings';
}

// ---- Demo Toggle ----
function DemoToggle() {
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  return (
    <button
      onClick={toggleDemoMode}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        background: isDemoMode ? 'rgba(78,222,163,0.12)' : 'rgba(173,198,255,0.08)',
        border: isDemoMode ? '1px solid rgba(78,222,163,0.3)' : '1px solid rgba(173,198,255,0.12)',
        borderRadius: '20px',
        padding: '5px 10px 5px 7px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{
        width: '28px', height: '16px', borderRadius: '8px',
        background: isDemoMode ? '#4edea3' : 'rgba(173,198,255,0.2)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          width: '12px', height: '12px', borderRadius: '50%',
          background: isDemoMode ? '#003824' : '#64748b',
          position: 'absolute', top: '2px',
          left: isDemoMode ? '14px' : '2px',
          transition: 'left 0.2s, background 0.2s',
        }} />
      </div>
      <span style={{
        fontSize: '11px', fontWeight: 700,
        color: isDemoMode ? '#4edea3' : '#64748b',
        whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
      }}>
        Demo
      </span>
    </button>
  );
}

// ---- Main Component ----
export default function SavingsOverview() {
  const { accounts, metrics, isLoading } = useSavingsData();

  const { totalBalance, currentFYIsaDeposits, isaAllowance, totalDeposited, totalGrowth, growthPct } = metrics;
  const allowancePct   = Math.min(100, Math.round((currentFYIsaDeposits / isaAllowance) * 100));
  const allowanceColor = allowancePct >= 90 ? '#ff6b6b' : allowancePct >= 70 ? '#ffb95f' : '#4edea3';
  const depositBarPct  = totalBalance > 0 ? Math.round((totalDeposited / totalBalance) * 100) : 0;

  // Sort accounts: ISA first, then by balance descending
  const sortedAccounts = React.useMemo(() => {
    return [...accounts].sort((a, b) => {
      const aIsa = (a.accountType || '').toLowerCase().includes('isa') ? 1 : 0;
      const bIsa = (b.accountType || '').toLowerCase().includes('isa') ? 1 : 0;
      if (aIsa !== bIsa) return bIsa - aIsa;
      return (b.currentBalance || 0) - (a.currentBalance || 0);
    });
  }, [accounts]);

  return (
    <SavingsLayout>
      <div style={{ padding: '0 0 16px' }}>

        {/* Header */}
        <div style={{
          padding: '24px 20px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Savings</p>
            <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
              Overview
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DemoToggle />
            <button style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'rgba(173,198,255,0.08)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#adc6ff', cursor: 'pointer',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="animate-in stagger-1" style={{ margin: '0 16px 16px' }}>
          <div style={{
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #1a2744 0%, #0f1a30 100%)',
            border: '1px solid rgba(78,222,163,0.15)',
            padding: '24px', position: 'relative', overflow: 'hidden',
          }}>
            <div className="hero-gradient" style={{ position: 'absolute', inset: 0, zIndex: 0, borderRadius: '20px' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Total Savings Balance
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '36px', color: '#dae2fd', margin: 0, lineHeight: 1 }}>
                  {isLoading ? '–' : fmt(totalBalance)}
                </h2>
                {/* Growth badge — inline with balance */}
                {!isLoading && totalGrowth > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(78,222,163,0.15)', border: '1px solid rgba(78,222,163,0.25)', borderRadius: '20px', padding: '4px 10px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#4edea3' }}>arrow_upward</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#4edea3' }}>
                      {growthPct.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Deposits / Growth split bar */}
              {!isLoading && totalBalance > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Deposits</span>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Growth</span>
                  </div>
                  <div style={{ display: 'flex', height: '5px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(173,198,255,0.1)' }}>
                    <div style={{ width: `${depositBarPct}%`, background: 'linear-gradient(90deg, #adc6ff, #7aa5ff)', transition: 'width 0.6s ease' }} />
                    <div style={{ flex: 1, background: 'linear-gradient(90deg, #4edea3, #22c87a)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#adc6ff' }}>{fmt(totalDeposited)}</span>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#4edea3' }}>{fmt(totalGrowth)}</span>
                  </div>
                </div>
              )}

              <p style={{ fontSize: '12px', color: '#bbcabf', margin: '10px 0 0' }}>
                {isLoading
                  ? 'Loading...'
                  : accounts.length === 0
                    ? 'No savings data yet'
                    : `${accounts.length} account${accounts.length !== 1 ? 's' : ''} · updated today`}
              </p>
            </div>
          </div>
        </div>


        {/* ISA Allowance */}
        {!isLoading && currentFYIsaDeposits > 0 && (
          <div className="animate-in stagger-2 section-card" style={{ margin: '0 16px 16px', borderLeft: `3px solid ${allowanceColor}` }}>
            {/* Title row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#dae2fd', margin: 0 }}>Annual ISA Allowance</p>
              <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: allowanceColor }}>
                {allowancePct}%
              </span>
            </div>
            {/* Amount display */}
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '22px', color: '#dae2fd', margin: '0 0 12px', lineHeight: 1 }}>
              {fmt(currentFYIsaDeposits)}{' '}
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>/ {fmt(isaAllowance)}</span>
            </p>
            {/* Progress bar */}
            <div style={{ background: 'rgba(173,198,255,0.08)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
              <div style={{
                width: `${allowancePct}%`, height: '100%', borderRadius: '4px',
                background: allowancePct >= 90
                  ? 'linear-gradient(90deg,#ff6b6b,#ff4444)'
                  : allowancePct >= 70
                    ? 'linear-gradient(90deg,#ffb95f,#ff8c42)'
                    : 'linear-gradient(90deg,#4edea3,#22c87a)',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        )}

        {/* Accounts List */}
        <div className="animate-in stagger-3" style={{ margin: '0 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>
              Savings Accounts
            </h3>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontSize: '14px' }}>
              Loading accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', background: '#171f33', borderRadius: '16px', color: '#64748b', fontSize: '14px' }}>
              No savings accounts found. Add data on the desktop Savings Tracker page.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sortedAccounts.map((account, i) => {
                const color    = accountColor(account.accountType);
                const initials = accountInitials(account.bank || account.accountName);
                const badge    = accountTypeBadge(account.accountType);
                const pctOfTotal = metrics.totalBalance > 0
                  ? Math.round(((account.currentBalance || 0) / metrics.totalBalance) * 100)
                  : 0;

                return (
                  <div key={i} className="account-row">
                    {/* Logo / initials */}
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '10px',
                      background: '#171f33', border: '1px solid rgba(60,74,66,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginRight: '14px', flexShrink: 0,
                      fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '13px', color,
                    }}>
                      {initials}
                    </div>

                    {/* Name + bank */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <h4 style={{
                          fontWeight: 700, fontSize: '15px', color: '#dae2fd', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px',
                        }}>
                          {account.accountName}
                        </h4>
                        <span style={{
                          background: `rgba(${color === '#4edea3' ? '78,222,163' : color === '#ffb95f' ? '255,185,95' : color === '#f472b6' ? '244,114,182' : '173,198,255'},0.12)`,
                          color,
                          border: `1px solid ${color}40`,
                          borderRadius: '20px', padding: '3px 10px',
                          fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
                        }}>
                          {badge}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0 }}>
                        {account.bank || '—'}
                      </p>
                    </div>

                    {/* Balance */}
                    <div style={{ textAlign: 'right', marginLeft: '14px', flexShrink: 0 }}>
                      <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 2px' }}>
                        {fmt(account.currentBalance)}
                      </p>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                        {pctOfTotal}% of total
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Teaser Card */}
        <div className="animate-in stagger-4" style={{
          margin: '0 16px 24px',
          position: 'relative', overflow: 'hidden',
          padding: '28px 24px', borderRadius: '20px',
          border: '1px solid rgba(78,222,163,0.2)',
          background: 'linear-gradient(135deg, rgba(78,222,163,0.18) 0%, #222a3d 100%)',
        }}>
          <div style={{ position: 'absolute', right: '-30px', bottom: '-30px', width: '120px', height: '120px', background: 'rgba(78,222,163,0.1)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: '-30px', top: '-30px', width: '100px', height: '100px', background: 'rgba(173,198,255,0.08)', borderRadius: '50%', filter: 'blur(35px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(78,222,163,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#4edea3' }}>psychology</span>
            </div>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '20px', fontWeight: 900, color: '#dae2fd', margin: '0 0 8px' }}>
              Optimise Your Savings
            </h3>
            <p style={{ fontSize: '13px', color: '#bbcabf', lineHeight: 1.6, maxWidth: '280px', margin: '0 0 16px' }}>
              Our AI can identify ways to maximise your ISA allowance and grow your savings faster.
            </p>
            <button className="primary-btn" style={{ marginTop: '6px' }}>See Savings Insights</button>
          </div>
        </div>

      </div>
    </SavingsLayout>
  );
}
