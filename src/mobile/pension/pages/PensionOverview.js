import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemoMode } from '../../../contexts/DemoModeContext';
import { usePensionData, parseDate } from '../PensionDataContext';
import PensionLayout from '../PensionLayout';

// ---- helpers ----
function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}
function fmtPct(n) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

// Derive a consistent colour index from a string
function providerColorIndex(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const COLORS = ['#4edea3', '#adc6ff', '#ffb95f', '#f472b6', '#a78bfa', '#38bdf8'];
  return COLORS[Math.abs(h) % COLORS.length];
}
function providerInitials(name = '') {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
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
      {/* track */}
      <div style={{
        width: '28px',
        height: '16px',
        borderRadius: '8px',
        background: isDemoMode ? '#4edea3' : 'rgba(173,198,255,0.2)',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: isDemoMode ? '#003824' : '#64748b',
          position: 'absolute',
          top: '2px',
          left: isDemoMode ? '14px' : '2px',
          transition: 'left 0.2s, background 0.2s',
        }} />
      </div>
      <span style={{
        fontSize: '11px',
        fontWeight: 700,
        color: isDemoMode ? '#4edea3' : '#64748b',
        whiteSpace: 'nowrap',
        fontFamily: 'Inter, sans-serif',
      }}>
        Demo
      </span>
    </button>
  );
}

// ---- Main Component ----
export default function PensionOverview() {
  const navigate = useNavigate();
  const { entries, metrics, isLoading } = usePensionData();
  const ANNUAL_ALLOWANCE = 60000;

  // Sort providers by most recent contribution descending, keeping original index for routing
  const sortedEntries = React.useMemo(() => {
    return entries
      .map((entry, originalIdx) => ({ entry, originalIdx }))
      .sort((a, b) => {
        const aDateStr = a.entry.lastPayment || (a.entry.paymentHistory?.length ? a.entry.paymentHistory[a.entry.paymentHistory.length - 1].date : null);
        const bDateStr = b.entry.lastPayment || (b.entry.paymentHistory?.length ? b.entry.paymentHistory[b.entry.paymentHistory.length - 1].date : null);
        const da = parseDate(aDateStr);
        const db = parseDate(bDateStr);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db - da; // most recent first
      });
  }, [entries]);

  const { totalValue, totalDeposits, growth, growthPct, currentFYTotal } = metrics;
  const depositBarPct = totalValue > 0 ? Math.round((totalDeposits / totalValue) * 100) : 0;
  const allowancePct = Math.min(100, Math.round((currentFYTotal / ANNUAL_ALLOWANCE) * 100));

  // Allowance bar colour: green < 70%, amber < 90%, red >= 90%
  const allowanceColor = allowancePct >= 90 ? '#ff6b6b' : allowancePct >= 70 ? '#ffb95f' : '#4edea3';

  return (
    <PensionLayout>
      <div style={{ padding: '0 0 16px' }}>

        {/* Header */}
        <div style={{
          padding: '24px 20px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Pensions</p>
            <h1 style={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 900,
              fontSize: '26px',
              color: '#dae2fd',
              margin: 0,
            }}>
              Overview
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DemoToggle />
            <button style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(173,198,255,0.08)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#adc6ff',
              cursor: 'pointer',
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
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div className="hero-gradient" style={{ position: 'absolute', inset: 0, zIndex: 0, borderRadius: '20px' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Total Pension Value
              </p>

              {/* Balance + growth pill inline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '36px', color: '#dae2fd', margin: 0, lineHeight: 1 }}>
                  {isLoading ? '–' : fmt(totalValue)}
                </h2>
                {!isLoading && totalValue > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: growth >= 0 ? 'rgba(78,222,163,0.15)' : 'rgba(255,107,107,0.15)', border: `1px solid ${growth >= 0 ? 'rgba(78,222,163,0.25)' : 'rgba(255,107,107,0.25)'}`, borderRadius: '20px', padding: '4px 10px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '13px', color: growth >= 0 ? '#4edea3' : '#ff6b6b' }}>
                      {growth >= 0 ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: growth >= 0 ? '#4edea3' : '#ff6b6b' }}>
                      {Math.abs(growthPct).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Deposited / Growth split bar */}
              {!isLoading && totalValue > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Deposited</span>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Growth</span>
                  </div>
                  <div style={{ display: 'flex', height: '5px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(173,198,255,0.1)' }}>
                    <div style={{ width: `${depositBarPct}%`, background: 'linear-gradient(90deg, #adc6ff, #7aa5ff)', transition: 'width 0.6s ease' }} />
                    <div style={{ flex: 1, background: 'linear-gradient(90deg, #4edea3, #22c87a)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#adc6ff' }}>{fmt(totalDeposits)}</span>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#4edea3' }}>{fmt(growth)}</span>
                  </div>
                </div>
              )}

              <p style={{ fontSize: '12px', color: '#bbcabf', margin: '10px 0 0' }}>
                {isLoading
                  ? 'Loading...'
                  : entries.length === 0
                    ? 'No pension data yet'
                    : `${entries.length} provider${entries.length !== 1 ? 's' : ''} · updated today`}
              </p>
            </div>
          </div>
        </div>


        {/* Annual Pension Allowance */}
        {!isLoading && currentFYTotal > 0 && (
          <div className="animate-in stagger-2 section-card" style={{ margin: '0 16px 16px', borderLeft: `3px solid ${allowanceColor}` }}>
            {/* Title row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#dae2fd', margin: 0 }}>Annual Pension Allowance</p>
              <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: allowanceColor }}>
                {allowancePct}%
              </span>
            </div>
            {/* Amount display */}
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '22px', color: '#dae2fd', margin: '0 0 12px', lineHeight: 1 }}>
              {fmt(currentFYTotal)}{' '}
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>/ {fmt(ANNUAL_ALLOWANCE)}</span>
            </p>
            {/* Progress bar */}
            <div style={{ background: 'rgba(173,198,255,0.08)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
              <div style={{
                width: `${allowancePct}%`,
                height: '100%',
                borderRadius: '4px',
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

        {/* Pension Providers */}
        <div className="animate-in stagger-3" style={{ margin: '0 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>
              Pension Providers
            </h3>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontSize: '14px' }}>
              Loading providers...
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', background: '#171f33', borderRadius: '16px', color: '#64748b', fontSize: '14px' }}>
              No pension accounts found. Add data on the desktop Pension Pots page.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sortedEntries.map(({ entry, originalIdx }) => {
                const idx      = originalIdx; // used in Link URL
                const color    = providerColorIndex(entry.provider);
                const initials = providerInitials(entry.provider);
                // Determine status: active if last payment within 6 months
                const lastPmt = parseDate(entry.lastPayment);
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                const isActive = lastPmt ? lastPmt > sixMonthsAgo : false;

                // YTD growth for this entry
                const entryGrowth = (entry.currentValue || 0) - (entry.deposits || 0);
                const entryGrowthPct = entry.deposits > 0 ? (entryGrowth / entry.deposits) * 100 : 0;

                return (
                  <Link key={idx} to={`/mobile/pension/provider/${idx}`} style={{ textDecoration: 'none' }}>
                    <div className="provider-row" style={{ cursor: 'pointer' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        background: '#171f33',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '14px',
                        border: '1px solid rgba(60,74,66,0.15)',
                        flexShrink: 0,
                        fontFamily: 'Manrope, sans-serif',
                        fontWeight: 900,
                        fontSize: '13px',
                        color,
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <h4 style={{ fontWeight: 700, fontSize: '15px', color: '#dae2fd', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                            {entry.provider}
                          </h4>
                          <span className={isActive ? 'badge-active' : 'badge-inactive'}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0 }}>{entry.accountType || 'Pension'}</p>
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: '14px', flexShrink: 0 }}>
                        <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 2px' }}>
                          {fmt(entry.currentValue)}
                        </p>
                        <p style={{ fontSize: '11px', color: entryGrowthPct >= 0 ? '#4edea3' : '#ff6b6b', margin: 0 }}>
                          {fmtPct(entryGrowthPct)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Teaser Card */}
        <div className="animate-in stagger-4" style={{
          margin: '0 16px 24px',
          position: 'relative',
          overflow: 'hidden',
          padding: '28px 24px',
          borderRadius: '20px',
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
              Optimize Your Future
            </h3>
            <p style={{ fontSize: '13px', color: '#bbcabf', lineHeight: 1.6, maxWidth: '280px', margin: '0 0 16px' }}>
              Our AI has identified potential opportunities to improve your pension strategy.
            </p>
            <Link to="/mobile/pension/ai" style={{ textDecoration: 'none', display: 'block' }}>
              <button className="primary-btn" style={{ marginTop: '6px' }}>See Deeper Insights</button>
            </Link>
          </div>
        </div>

      </div>

      {/* FAB — Add Pension */}
      <button
        onClick={() => navigate('/mobile/pension/add')}
        style={{
          position: 'fixed',
          bottom: '88px',
          right: '20px',
          background: '#4edea3',
          color: '#003824',
          border: 'none',
          borderRadius: '16px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          fontSize: '15px',
          cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(78,222,163,0.35)',
          zIndex: 50,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
        Add Pension
      </button>

    </PensionLayout>
  );
}
