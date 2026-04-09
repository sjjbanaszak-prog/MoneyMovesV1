import React, { useMemo, useState } from 'react';
import PensionLayout from '../PensionLayout';
import { usePensionData, parseDate, getTaxYearStart, taxYearLabel } from '../PensionDataContext';

const COLOR_PALETTE = ['#4edea3', '#adc6ff', '#ffb95f', '#f472b6', '#a78bfa', '#38bdf8'];

function fmtK(n) {
  if (!n) return '£0';
  if (n >= 1000000) return `£${(n / 1000000).toFixed(1)}m`;
  if (n >= 1000) return `£${Math.round(n / 1000)}k`;
  return `£${Math.round(n)}`;
}

// SVG donut chart
function DonutChart({ providers, totalValue }) {
  const total = providers.reduce((s, p) => s + p.value, 0) || 1;
  const cx = 80, cy = 80, r = 60, strokeWidth = 18;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const segments = providers.map(p => {
    const dash = (p.value / total) * circumference;
    const seg = { ...p, dash, offset };
    offset += dash;
    return seg;
  });

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(173,198,255,0.08)" strokeWidth={strokeWidth} />
      {segments.map((s, i) => (
        <circle
          key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth={strokeWidth}
          strokeDasharray={`${s.dash} ${circumference - s.dash}`}
          strokeDashoffset={circumference / 4 - s.offset}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#dae2fd" fontFamily="Manrope,sans-serif" fontWeight="900" fontSize="16">
        {fmtK(totalValue)}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#bbcabf" fontFamily="Inter,sans-serif" fontSize="10">
        total
      </text>
    </svg>
  );
}

// Dual-line SVG chart: total value (green) + cumulative contributions (blue)
function DualLineChart({ valueSeries, contribSeries, labels }) {
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

  const allVals = [...valueSeries, ...contribSeries].filter(v => v > 0);
  const maxVal = Math.max(...allVals, 1);

  const toX = i => (i / (n - 1)) * W;
  const toY = v => H - (v / maxVal) * (H - 12) - 6;

  function buildPaths(series) {
    const start = series.findIndex(v => v > 0);
    if (start < 0 || series.length - start < 2) return { line: null, area: null };
    const slice = series.slice(start);
    const pts = slice.map((v, i) => `${toX(start + i)},${toY(v)}`).join(' L ');
    return {
      line: `M ${pts}`,
      area: `M ${toX(start)},${H} L ${pts} L ${toX(start + slice.length - 1)},${H} Z`,
    };
  }

  const vPaths = buildPaths(valueSeries);
  const cPaths = buildPaths(contribSeries);

  // X axis labels: first, middle, last
  const labelIndices = [0, Math.floor((n - 1) / 2), n - 1];

  const hi = hoveredIdx;
  // Clamp tooltip left so it doesn't overflow the card edges
  const tooltipLeftPct = hi !== null ? Math.min(Math.max((hi / (n - 1)) * 100, 8), 92) : null;

  return (
    <>
      <div style={{ position: 'relative' }}>
        {/* Hover tooltip */}
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
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#dae2fd', margin: '0 0 6px', fontFamily: 'Manrope, sans-serif' }}>
              {labels[hi]}
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '10px', color: '#4edea3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 2px' }}>Value</p>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#4edea3', margin: 0 }}>{fmtK(valueSeries[hi])}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 2px' }}>Contrib</p>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#adc6ff', margin: 0 }}>{fmtK(contribSeries[hi])}</p>
              </div>
            </div>
          </div>
        )}

        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', overflow: 'visible' }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="vGradIns" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4edea3" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#4edea3" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cGradIns" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#adc6ff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#adc6ff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {cPaths.area && <path d={cPaths.area} fill="url(#cGradIns)" />}
          {vPaths.area && <path d={vPaths.area} fill="url(#vGradIns)" />}
          {cPaths.line && <path d={cPaths.line} fill="none" stroke="#adc6ff" strokeWidth="1.5" />}
          {vPaths.line && <path d={vPaths.line} fill="none" stroke="#4edea3" strokeWidth="2" className="chart-glow" />}

          {/* Vertical crosshair */}
          {hi !== null && (
            <line
              x1={toX(hi)} y1={0} x2={toX(hi)} y2={H}
              stroke="rgba(173,198,255,0.25)" strokeWidth="1" strokeDasharray="3,3"
            />
          )}

          {/* Dots at hovered data points */}
          {hi !== null && valueSeries[hi] > 0 && (
            <circle cx={toX(hi)} cy={toY(valueSeries[hi])} r="4" fill="#0b1326" stroke="#4edea3" strokeWidth="2" />
          )}
          {hi !== null && contribSeries[hi] > 0 && (
            <circle cx={toX(hi)} cy={toY(contribSeries[hi])} r="4" fill="#0b1326" stroke="#adc6ff" strokeWidth="2" />
          )}

          {/* Invisible hit strips — one per data point */}
          {Array.from({ length: n }, (_, i) => {
            const x     = toX(i);
            const prev  = i > 0     ? toX(i - 1) : x;
            const next  = i < n - 1 ? toX(i + 1) : x;
            const left  = (x + prev) / 2;
            const right = (x + next) / 2;
            return (
              <rect
                key={i}
                x={left} y={0}
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
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '2px', background: '#4edea3', borderRadius: '1px' }} />
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>Total value</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '2px', background: '#adc6ff', borderRadius: '1px' }} />
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>Contributions</span>
        </div>
      </div>
    </>
  );
}

export default function PensionInsights() {
  const { entries, metrics } = usePensionData();
  const [timeframe, setTimeframe] = useState('12M');

  const providers = useMemo(() => {
    const total = metrics.totalValue || 0;
    return entries.map((entry, i) => ({
      name: entry.provider || '—',
      value: entry.currentValue || 0,
      color: COLOR_PALETTE[i % COLOR_PALETTE.length],
      pct: total > 0 ? Math.round(((entry.currentValue || 0) / total) * 100) : 0,
    }));
  }, [entries, metrics.totalValue]);

  // Dual-line chart: value history + cumulative contributions
  const dualChartData = useMemo(() => {
    const now = new Date();
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Find the overall earliest and latest months across all data sources
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

    // Generate a continuous monthly range from first to last (no gaps)
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

    // --- Contribution series (running cumulative sum) ---
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
    const contribSeries = months.map(m => {
      runningContrib += contribByMonth[m] || 0;
      return runningContrib;
    });

    // --- Value series (per-provider snapshots) ---
    // Sources (ascending priority): paymentHistory.balance → valueHistory → current value
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
      // Always anchor at current value for the current month
      allVH.push({ key: nowKey, value: entry.currentValue || 0, idx, priority: 2 });
    });

    // Sort so higher-priority entries for the same key+provider overwrite lower ones
    allVH.sort((a, b) => a.key.localeCompare(b.key) || a.priority - b.priority);

    const providerBalances = {};
    let vhPtr = 0;
    const valueSeries = months.map(m => {
      while (vhPtr < allVH.length && allVH[vhPtr].key <= m) {
        providerBalances[allVH[vhPtr].idx] = allVH[vhPtr].value;
        vhPtr++;
      }
      return Object.values(providerBalances).reduce((s, v) => s + v, 0);
    });

    // Labels: "Jan 25" style
    const labels = months.map(m => {
      const [y, mo] = m.split('-');
      return new Date(Number(y), Number(mo) - 1, 1)
        .toLocaleString('en-GB', { month: 'short', year: '2-digit' });
    });

    const firstValue  = valueSeries.find(v => v > 0) || 0;
    const lastValue   = valueSeries[valueSeries.length - 1] || 0;
    const firstContrib = contribSeries.find(v => v > 0) || 0;
    const lastContrib  = contribSeries[contribSeries.length - 1] || 0;

    return { valueSeries, contribSeries, labels, firstValue, lastValue, lastContrib };
  }, [entries]);

  // Slice dualChartData to the selected timeframe for display
  const displayData = useMemo(() => {
    if (!dualChartData) return null;
    if (timeframe === 'AT') return dualChartData;
    const n = dualChartData.labels.length;
    const count = Math.min(12, n);
    const slice = (arr) => arr.slice(n - count);
    return {
      ...dualChartData,
      valueSeries:  slice(dualChartData.valueSeries),
      contribSeries: slice(dualChartData.contribSeries),
      labels:        slice(dualChartData.labels),
    };
  }, [dualChartData, timeframe]);

  // Allowance utilisation grouped by UK tax year
  const allowanceYears = useMemo(() => {
    const yearTotals = {};
    entries.forEach(entry => {
      (entry.paymentHistory || []).forEach(p => {
        const fy = getTaxYearStart(p.date);
        if (fy === null) return;
        yearTotals[fy] = (yearTotals[fy] || 0) + (p.amount || 0);
      });
    });

    const COLORS = ['#4edea3', '#ffb95f', '#adc6ff'];
    return Object.keys(yearTotals)
      .map(Number)
      .sort((a, b) => b - a)
      .slice(0, 4)
      .map((fy, i) => {
        const limit = fy >= 2023 ? 60000 : 40000;
        const used  = yearTotals[fy] || 0;
        const pct   = Math.min(100, Math.round((used / limit) * 100));
        return {
          fy: taxYearLabel(fy),
          used,
          limit,
          pct,
          color: pct >= 100 ? '#ff6b6b' : COLORS[i % COLORS.length],
        };
      });
  }, [entries]);

  return (
    <PensionLayout>
      <div style={{ padding: '0 0 16px' }}>

        {/* Header */}
        <div style={{ padding: '24px 20px 16px' }}>
          <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Pensions</p>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
            Insights
          </h1>
        </div>

        {/* Allocation Donut */}
        <div className="animate-in stagger-1 section-card" style={{ margin: '0 16px 16px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: '0 0 16px' }}>
            Provider Allocation
          </h3>
          {providers.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px 0', margin: 0 }}>No data available</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ flexShrink: 0 }}>
                <DonutChart providers={providers} totalValue={metrics.totalValue} />
              </div>
              <div style={{ flex: 1 }}>
                {providers.map(p => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', color: '#dae2fd', fontWeight: 600, margin: '0 0 1px' }}>{p.name}</p>
                      <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0 }}>{p.pct}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Growth History — dual-line chart */}
        <div className="animate-in stagger-2 section-card" style={{ margin: '0 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>
              Growth History
            </h3>
            <div style={{ display: 'flex', background: 'rgba(173,198,255,0.08)', borderRadius: '20px', padding: '3px' }}>
              {['12M', 'AT'].map(tf => (
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
            <>
              <DualLineChart
                valueSeries={displayData.valueSeries}
                contribSeries={displayData.contribSeries}
                labels={displayData.labels}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', background: 'rgba(173,198,255,0.04)', borderRadius: '10px', padding: '12px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 3px' }}>Total contributed</p>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: '#adc6ff', margin: 0 }}>{fmtK(dualChartData.lastContrib)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 3px' }}>Current value</p>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: '#4edea3', margin: 0 }}>{fmtK(dualChartData.lastValue)}</p>
                </div>
              </div>
            </>
          ) : (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px 0', margin: 0 }}>
              No history data available
            </p>
          )}
        </div>

        {/* Allowance Utilisation */}
        <div className="animate-in stagger-3 section-card" style={{ margin: '0 16px 24px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: '0 0 16px' }}>
            Allowance Utilisation
          </h3>
          {allowanceYears.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '8px 0', margin: 0 }}>
              No contribution history found
            </p>
          ) : allowanceYears.map(yr => (
            <div key={yr.fy} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ fontSize: '13px', color: '#dae2fd', fontWeight: 600, margin: 0 }}>{yr.fy}</p>
                <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0 }}>
                  £{yr.used.toLocaleString('en-GB')} / £{yr.limit.toLocaleString('en-GB')}
                </p>
              </div>
              <div style={{ background: 'rgba(173,198,255,0.08)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                <div style={{
                  width: `${yr.pct}%`, height: '100%', borderRadius: '4px',
                  background: yr.color, transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

      </div>
    </PensionLayout>
  );
}
