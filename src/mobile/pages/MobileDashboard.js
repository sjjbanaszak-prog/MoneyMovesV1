import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MobileNavDrawer from '../components/MobileNavDrawer';
import { useDemoMode } from '../../contexts/DemoModeContext';
import { PensionDataProvider, usePensionData, parseDate } from '../pension/PensionDataContext';
import { MortgageDataProvider, useMortgageData } from '../mortgage/MortgageDataContext';
import { SavingsDataProvider, useSavingsData } from '../savings/SavingsDataContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n) {
  return '£' + Math.max(0, Math.round(n || 0)).toLocaleString('en-GB');
}

function fmtK(n) {
  if (!n) return '£0';
  if (n >= 1000000) return `£${(n / 1000000).toFixed(1)}m`;
  if (n >= 1000) return `£${Math.round(n / 1000)}k`;
  return `£${Math.round(n)}`;
}

// ── Demo toggle ───────────────────────────────────────────────────────────────

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

// ── Single-line SVG chart: net worth over time ────────────────────────────────

function NetWorthLineChart({ series, labels }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const W = 320, H = 90;
  const n = labels.length;

  if (n < 2) {
    return (
      <div style={{ height: `${H}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Insufficient data to plot</p>
      </div>
    );
  }

  const maxVal = Math.max(...series.filter(v => v > 0), 1);
  const toX = i => (i / (n - 1)) * W;
  const toY = v => H - (Math.max(0, v) / maxVal) * (H - 12) - 6;

  const start = series.findIndex(v => v > 0);
  const paths = (() => {
    if (start < 0 || series.length - start < 2) return { line: null, area: null };
    const slice = series.slice(start);
    const pts   = slice.map((v, i) => `${toX(start + i)},${toY(v)}`).join(' L ');
    return {
      line: `M ${pts}`,
      area: `M ${toX(start)},${H} L ${pts} L ${toX(start + slice.length - 1)},${H} Z`,
    };
  })();

  const labelIndices = [0, Math.floor((n - 1) / 2), n - 1];
  const hi = hoveredIdx;
  const tooltipLeftPct = hi !== null ? Math.min(Math.max((hi / (n - 1)) * 100, 8), 92) : null;

  return (
    <>
      <div style={{ position: 'relative' }}>
        {hi !== null && (
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: `${tooltipLeftPct}%`,
            transform: 'translateX(-50%)',
            background: '#1a2744',
            border: '1px solid rgba(173,198,255,0.15)',
            borderRadius: '10px',
            padding: '8px 12px',
            zIndex: 20,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#dae2fd', margin: '0 0 4px', fontFamily: 'Manrope, sans-serif' }}>
              {labels[hi]}
            </p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#4edea3', margin: 0 }}>{fmtK(series[hi])}</p>
          </div>
        )}

        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', overflow: 'visible' }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="nwGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4edea3" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4edea3" stopOpacity="0" />
            </linearGradient>
          </defs>

          {paths.area && <path d={paths.area} fill="url(#nwGrad)" />}
          {paths.line && <path d={paths.line} fill="none" stroke="#4edea3" strokeWidth="2" />}

          {hi !== null && (
            <line x1={toX(hi)} y1={0} x2={toX(hi)} y2={H}
              stroke="rgba(173,198,255,0.25)" strokeWidth="1" strokeDasharray="3,3" />
          )}
          {hi !== null && series[hi] > 0 && (
            <circle cx={toX(hi)} cy={toY(series[hi])} r="4" fill="#0b1326" stroke="#4edea3" strokeWidth="2" />
          )}

          {Array.from({ length: n }, (_, i) => {
            const x    = toX(i);
            const prev = i > 0     ? toX(i - 1) : x;
            const next = i < n - 1 ? toX(i + 1) : x;
            const left  = (x + prev) / 2;
            const right = (x + next) / 2;
            return (
              <rect key={i} x={left} y={0}
                width={Math.max(right - left, 1)} height={H}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
              />
            );
          })}
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        {labelIndices.map(i => (
          <span key={i} style={{ fontSize: '10px', color: '#64748b' }}>{labels[i]}</span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '2px', background: '#4edea3', borderRadius: '1px' }} />
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>Net Worth</span>
        </div>
      </div>
    </>
  );
}

// ── Asset row ─────────────────────────────────────────────────────────────────

function AssetRow({ icon, iconColor, title, subtitle, value, to }) {
  const inner = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px', background: '#131b2e', borderRadius: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: '#1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span className="material-symbols-outlined" style={{ color: iconColor || '#adc6ff', fontSize: '18px' }}>{icon}</span>
        </div>
        <div>
          <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#dae2fd', margin: 0 }}>{title}</p>
          <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '15px', color: '#dae2fd', margin: 0 }}>{value}</p>
        <span className="material-symbols-outlined" style={{ color: '#3c4a42', fontSize: '16px' }}>chevron_right</span>
      </div>
    </div>
  );
  if (to) return <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>;
  return inner;
}

// ── Insight tile ──────────────────────────────────────────────────────────────

function InsightTile({ icon, iconColor, label, value, barPct, barColor }) {
  return (
    <div style={{ background: '#131b2e', borderRadius: '20px', padding: '18px' }}>
      <span className="material-symbols-outlined" style={{ color: iconColor, fontSize: '20px', display: 'block', marginBottom: '8px' }}>{icon}</span>
      <p style={{ fontSize: '11px', color: '#bbcabf', fontWeight: 600, margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: '#dae2fd', margin: '0 0 10px' }}>{value}</p>
      <div style={{ height: '4px', borderRadius: '2px', background: '#2d3449', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.max(0, barPct || 0))}%`, height: '100%', background: barColor, borderRadius: '2px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

// ── Main dashboard content ────────────────────────────────────────────────────

function DashboardContent() {
  const { entries, metrics: pensionMetrics, isLoading: pensionLoading } = usePensionData();
  const { mortgages }               = useMortgageData();
  const { metrics: savingsMetrics } = useSavingsData();

  const [timeframe, setTimeframe] = useState('1Y');

  // ── Pension values (used in assets card) ──────────────────────────────────
  const { totalValue } = pensionMetrics;

  // ── Pension value history (base for net worth history chart) ───────────────
  const dualChartData = useMemo(() => {
    const now    = new Date();
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let firstKey = null;
    let lastKey  = nowKey;

    entries.forEach(entry => {
      (entry.paymentHistory || []).forEach(p => {
        const dt = parseDate(p.date);
        if (!dt) return;
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        if (!firstKey || key < firstKey) firstKey = key;
        if (key > lastKey) lastKey = key;
      });
      (entry.valueHistory || []).forEach(v => {
        const dt = new Date(v.date);
        if (isNaN(dt.getTime())) return;
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        if (!firstKey || key < firstKey) firstKey = key;
        if (key > lastKey) lastKey = key;
      });
    });

    if (!firstKey) return null;

    const months = [];
    const [sy, sm] = firstKey.split('-').map(Number);
    const [ey, em] = lastKey.split('-').map(Number);
    let y = sy, m = sm;
    while (y < ey || (y === ey && m <= em)) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }

    if (months.length < 2) return null;

    // Contribution series (cumulative)
    const contribByMonth = {};
    entries.forEach(entry => {
      (entry.paymentHistory || []).forEach(p => {
        const dt = parseDate(p.date);
        if (!dt) return;
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        contribByMonth[key] = (contribByMonth[key] || 0) + (p.amount || 0);
      });
    });

    let runningContrib = 0;
    const contribSeries = months.map(mo => {
      runningContrib += contribByMonth[mo] || 0;
      return runningContrib;
    });

    // Value series
    const allVH = [];
    entries.forEach((entry, idx) => {
      (entry.paymentHistory || []).forEach(p => {
        const dt = parseDate(p.date);
        if (!dt || p.balance == null) return;
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        allVH.push({ key, value: p.balance, idx, priority: 0 });
      });
      (entry.valueHistory || []).forEach(v => {
        const dt = new Date(v.date);
        if (isNaN(dt.getTime())) return;
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        allVH.push({ key, value: v.value, idx, priority: 1 });
      });
      allVH.push({ key: nowKey, value: entry.currentValue || 0, idx, priority: 2 });
    });

    allVH.sort((a, b) => a.key.localeCompare(b.key) || a.priority - b.priority);

    const providerBalances = {};
    let vhPtr = 0;
    const valueSeries = months.map(mo => {
      while (vhPtr < allVH.length && allVH[vhPtr].key <= mo) {
        providerBalances[allVH[vhPtr].idx] = allVH[vhPtr].value;
        vhPtr++;
      }
      return Object.values(providerBalances).reduce((s, v) => s + v, 0);
    });

    const labels = months.map(mo => {
      const [yr, mn] = mo.split('-');
      return new Date(Number(yr), Number(mn) - 1, 1)
        .toLocaleString('en-GB', { month: 'short', year: '2-digit' });
    });

    return { valueSeries, contribSeries, labels };
  }, [entries]);

  // ── Mortgage / net worth totals ────────────────────────────────────────────
  const savingsBalance = savingsMetrics.totalBalance || 0;

  const { totalPropertyValue, totalMortgageDebt } = useMemo(() => ({
    totalPropertyValue: mortgages.reduce((s, m) => s + (m.propertyValue      || 0), 0),
    totalMortgageDebt:  mortgages.reduce((s, m) => s + (m.outstandingBalance || 0), 0),
  }), [mortgages]);

  // Net worth history: pension value over time + static savings/property/mortgage offset
  const netWorthChartData = useMemo(() => {
    if (!dualChartData) return null;
    const offset = savingsBalance + totalPropertyValue - totalMortgageDebt;
    return {
      series: dualChartData.valueSeries.map(v => v + offset),
      labels: dualChartData.labels,
    };
  }, [dualChartData, savingsBalance, totalPropertyValue, totalMortgageDebt]);

  // Slice to selected timeframe: 1Y = 12 months, 5Y = 60 months, AT = all
  const displayData = useMemo(() => {
    if (!netWorthChartData) return null;
    if (timeframe === 'AT') return netWorthChartData;
    const n     = netWorthChartData.labels.length;
    const count = timeframe === '5Y' ? Math.min(60, n) : Math.min(12, n);
    const slice = arr => arr.slice(n - count);
    return {
      series: slice(netWorthChartData.series),
      labels: slice(netWorthChartData.labels),
    };
  }, [netWorthChartData, timeframe]);

  const totalAssets      = (totalValue || 0) + savingsBalance + totalPropertyValue;
  const totalLiabilities = totalMortgageDebt;
  const netWorth         = totalAssets - totalLiabilities;

  // ── Asset allocation bar segments ─────────────────────────────────────────
  const assetSegments = useMemo(() => [
    { value: totalPropertyValue, color: '#10b981' },
    { value: totalValue || 0,   color: '#4edea3' },
    { value: savingsBalance,    color: '#6ffbbe' },
  ].filter(s => s.value > 0), [totalPropertyValue, totalValue, savingsBalance]);

  const debtSegments = useMemo(() =>
    mortgages
      .map((m, i) => ({ value: m.outstandingBalance || 0, color: i === 0 ? '#ffb4ab' : '#ff6b6b' }))
      .filter(s => s.value > 0),
    [mortgages]
  );

  // ── Insight metrics ────────────────────────────────────────────────────────
  const equityPct = totalPropertyValue > 0
    ? Math.round(((totalPropertyValue - totalMortgageDebt) / totalPropertyValue) * 100)
    : 0;

  const assetCoverageRatio = totalLiabilities > 0 ? totalAssets / totalLiabilities : null;
  const pensionGrowthPct   = pensionMetrics.growthPct || 0;
  const savingsPct         = totalAssets > 0 ? (savingsBalance / totalAssets) * 100 : 0;

  // Net worth growth pill: first non-zero vs last in the full chart
  const { netWorthGrowth, netWorthGrowthPct } = useMemo(() => {
    if (!netWorthChartData) return { netWorthGrowth: 0, netWorthGrowthPct: 0 };
    const s     = netWorthChartData.series;
    const first = s.find(v => v > 0) || 0;
    const last  = s[s.length - 1] || 0;
    const change = last - first;
    const pct    = first > 0 ? (change / first) * 100 : 0;
    return { netWorthGrowth: change, netWorthGrowthPct: pct };
  }, [netWorthChartData]);

  // Assets-to-total bar percentage
  const totalForBar   = totalAssets + totalLiabilities;
  const assetsBarPct  = totalForBar > 0 ? Math.round((totalAssets / totalForBar) * 100) : 100;

  return (
    <div className="mobile-screen" style={{ paddingTop: '50px', paddingBottom: '40px' }}>
      <MobileNavDrawer />

      <div style={{ padding: '0 0 16px' }}>

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div style={{
          padding: '24px 20px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Finances</p>
            <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
              Overview
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DemoToggle />
          </div>
        </div>

        {/* ── Hero: Net Worth card ───────────────────────────────────────── */}
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
                Net Worth
              </p>

              {/* Value + growth pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '36px', color: '#dae2fd', margin: 0, lineHeight: 1 }}>
                  {pensionLoading ? '–' : fmt(netWorth)}
                </h2>
                {!pensionLoading && netWorth > 0 && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    background: netWorthGrowth >= 0 ? 'rgba(78,222,163,0.15)' : 'rgba(255,107,107,0.15)',
                    border: `1px solid ${netWorthGrowth >= 0 ? 'rgba(78,222,163,0.25)' : 'rgba(255,107,107,0.25)'}`,
                    borderRadius: '20px', padding: '4px 10px',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '13px', color: netWorthGrowth >= 0 ? '#4edea3' : '#ff6b6b' }}>
                      {netWorthGrowth >= 0 ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: netWorthGrowth >= 0 ? '#4edea3' : '#ff6b6b' }}>
                      {Math.abs(netWorthGrowthPct).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Assets / Liabilities split bar */}
              {!pensionLoading && totalAssets > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Assets</span>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Liabilities</span>
                  </div>
                  <div style={{ display: 'flex', height: '5px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(173,198,255,0.1)' }}>
                    <div style={{ width: `${assetsBarPct}%`, background: 'linear-gradient(90deg, #4edea3, #22c87a)', transition: 'width 0.6s ease' }} />
                    <div style={{ flex: 1, background: 'linear-gradient(90deg, #ffb4ab, #ff6b6b)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#4edea3' }}>{fmt(totalAssets)}</span>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#ffb4ab' }}>{fmt(totalLiabilities)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Net Worth History chart ────────────────────────────────────── */}
        <div className="animate-in stagger-2 section-card" style={{ margin: '0 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>
              Net Worth History
            </h3>
            <div style={{ display: 'flex', background: 'rgba(173,198,255,0.08)', borderRadius: '20px', padding: '3px' }}>
              {['1Y', '5Y', 'AT'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    background: timeframe === tf ? '#4edea3' : 'transparent',
                    color: timeframe === tf ? '#003824' : '#adc6ff',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {displayData ? (
            <NetWorthLineChart
              series={displayData.series}
              labels={displayData.labels}
            />
          ) : (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px 0', margin: 0 }}>
              No history data available
            </p>
          )}
        </div>

        {/* ── Assets Card ───────────────────────────────────────────────── */}
        <div style={{ background: '#171f33', borderRadius: '28px', padding: '24px', margin: '0 16px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(78,222,163,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ color: '#4edea3', fontSize: '18px' }}>trending_up</span>
              </div>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '17px', color: '#dae2fd', margin: 0 }}>Assets</p>
            </div>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '18px', color: '#4edea3', margin: 0 }}>
              {fmt(totalAssets)}
            </p>
          </div>

          {assetSegments.length > 0 && (
            <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: '#2d3449', marginBottom: '18px' }}>
              {assetSegments.map((seg, i) => (
                <div key={i} style={{ flex: seg.value, background: seg.color }} />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mortgages.map((m, i) => (
              <AssetRow
                key={i}
                icon="home"
                iconColor="#adc6ff"
                title={m.name}
                subtitle="Property Value"
                value={fmt(m.propertyValue || 0)}
                to={`/mobile/mortgage/${i}`}
              />
            ))}
            <AssetRow
              icon="account_balance"
              iconColor="#adc6ff"
              title="Pension"
              subtitle="Total Pot Value"
              value={fmt(totalValue || 0)}
              to="/mobile/pension"
            />
            <AssetRow
              icon="savings"
              iconColor="#adc6ff"
              title="Savings"
              subtitle="Cash & ISA"
              value={fmt(savingsBalance)}
              to="/mobile/savings"
            />
          </div>
        </div>

        {/* ── Liabilities Card ──────────────────────────────────────────── */}
        <div style={{ background: '#171f33', borderRadius: '28px', padding: '24px', margin: '0 16px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(255,180,171,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ color: '#ffb4ab', fontSize: '18px' }}>trending_down</span>
              </div>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '17px', color: '#dae2fd', margin: 0 }}>Liabilities</p>
            </div>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '18px', color: '#ffb4ab', margin: 0 }}>
              {fmt(totalLiabilities)}
            </p>
          </div>

          {debtSegments.length > 0 && (
            <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: '#2d3449', marginBottom: '18px' }}>
              {debtSegments.map((seg, i) => (
                <div key={i} style={{ flex: seg.value, background: seg.color }} />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mortgages.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px 0', margin: 0 }}>
                No liabilities tracked
              </p>
            ) : (
              mortgages.map((m, i) => (
                <Link key={i} to={`/mobile/mortgage/${i}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', background: '#131b2e', borderRadius: '16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: '#1e293b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span className="material-symbols-outlined" style={{ color: '#bbcabf', fontSize: '18px' }}>real_estate_agent</span>
                      </div>
                      <div>
                        <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#dae2fd', margin: 0 }}>
                          {m.name}
                        </p>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                          {[m.lender, m.interestRate != null && `${m.interestRate}%`, m.type].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '15px', color: '#ffb4ab', margin: 0 }}>
                        {fmt(m.outstandingBalance || 0)}
                      </p>
                      <span className="material-symbols-outlined" style={{ color: '#3c4a42', fontSize: '16px' }}>chevron_right</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* ── Insight Tiles ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '0 16px 8px' }}>
          <InsightTile
            icon="home_work"
            iconColor="#ffb95f"
            label="Property Equity"
            value={totalPropertyValue > 0 ? `${equityPct}%` : '—'}
            barPct={equityPct}
            barColor="#ffb95f"
          />
          <InsightTile
            icon="account_balance"
            iconColor="#4edea3"
            label="Pension Growth"
            value={pensionGrowthPct > 0 ? `+${pensionGrowthPct.toFixed(1)}%` : '—'}
            barPct={Math.min(100, pensionGrowthPct)}
            barColor="#4edea3"
          />
          <InsightTile
            icon="savings"
            iconColor="#adc6ff"
            label="Savings"
            value={fmt(savingsBalance)}
            barPct={savingsPct}
            barColor="#adc6ff"
          />
          <InsightTile
            icon="verified_user"
            iconColor="#4edea3"
            label="Asset Coverage"
            value={assetCoverageRatio != null ? `${assetCoverageRatio.toFixed(2)}x` : '—'}
            barPct={totalLiabilities > 0 ? Math.min(100, (totalAssets / (totalAssets + totalLiabilities)) * 100) : 100}
            barColor="#4edea3"
          />
        </div>

      </div>
    </div>
  );
}

// ── Root export — wraps all three data providers ──────────────────────────────

export default function MobileDashboard() {
  return (
    <PensionDataProvider>
      <MortgageDataProvider>
        <SavingsDataProvider>
          <DashboardContent />
        </SavingsDataProvider>
      </MortgageDataProvider>
    </PensionDataProvider>
  );
}
