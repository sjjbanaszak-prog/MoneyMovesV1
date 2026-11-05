import React, { useMemo, useState } from 'react';
import PensionLayout from '../PensionLayout';
import ContributionsCard from '../components/ContributionsCard';
import { usePensionData, parseDate, getTaxYearStart, taxYearLabel } from '../PensionDataContext';
import PremiumGate from '../../components/PremiumGate';
import AllowanceRow, { allowanceColor } from '../../components/AllowanceRow';
import DonutChart from '../../components/DonutChart';
import DualLineChart from '../../components/DualLineChart';

const COLOR_PALETTE = ['#4edea3', '#adc6ff', '#ffb95f', '#f472b6', '#a78bfa', '#38bdf8'];

function fmtShort(n) {
  const v = Math.round(n || 0);
  return (v < 0 ? '−' : '') + '£' + Math.abs(v).toLocaleString('en-GB');
}

export default function PensionInsights() {
  const { entries, metrics } = usePensionData();
  const [timeframe, setTimeframe] = useState('AT');
  const [showAllAllowance, setShowAllAllowance] = useState(false);

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

  // Slice dualChartData to the selected timeframe: 1Y = 12 months, 5Y = 60 months, AT = all.
  // The summary cards cover the same window: contributions paid in during it, growth
  // (change in value minus those contributions), and the total change in value.
  const displayData = useMemo(() => {
    if (!dualChartData) return null;
    const n = dualChartData.labels.length;
    const count = timeframe === 'AT' ? n : Math.min(timeframe === '5Y' ? 60 : 12, n);
    const slice = (arr) => arr.slice(n - count);

    // Baseline = the month before the window (or nothing, for All Time)
    const baseIdx      = n - count - 1;
    const startContrib = baseIdx >= 0 ? dualChartData.contribSeries[baseIdx] : 0;
    const startValue   = baseIdx >= 0 ? dualChartData.valueSeries[baseIdx]   : 0;
    const contributions = dualChartData.lastContrib - startContrib;
    const total         = dualChartData.lastValue - startValue;

    return {
      ...dualChartData,
      valueSeries:   slice(dualChartData.valueSeries),
      contribSeries: slice(dualChartData.contribSeries),
      labels:        slice(dualChartData.labels),
      summary: { contributions, growth: total - contributions, total },
    };
  }, [dualChartData, timeframe]);

  // Allowance utilisation grouped by UK tax year, with FIFO carry-forward calculation.
  const allAllowanceYears = useMemo(() => {
    const yearTotals = {};
    entries.forEach(entry => {
      (entry.paymentHistory || []).forEach(p => {
        const fy = getTaxYearStart(p.date);
        if (fy === null) return;
        yearTotals[fy] = (yearTotals[fy] || 0) + (p.amount || 0);
      });
    });

    const sortedFYs = Object.keys(yearTotals).map(Number).sort((a, b) => a - b);

    // Per-year carry-forward used, keyed by fy integer.
    // Must be computed oldest-first so intermediate-year consumption can be tracked.
    const cfUsed = {}; // { fy: [{ fromFY, amount }] }
    sortedFYs.forEach((fy, idx) => {
      const used      = yearTotals[fy];
      const allowance = fy >= 2023 ? 60000 : 40000;
      if (used <= allowance) { cfUsed[fy] = []; return; }

      let excess  = used - allowance;
      const sources = [];

      // FIFO: oldest eligible year first (up to 3 years back)
      for (let i = Math.min(3, idx); i >= 1 && excess > 0; i--) {
        const pastFY        = sortedFYs[idx - i];
        const pastAllowance = pastFY >= 2023 ? 60000 : 40000;
        let   pastUnused    = Math.max(0, pastAllowance - (yearTotals[pastFY] || 0));

        // Deduct what intermediate years already drew from this past year
        for (let j = idx - i + 1; j < idx; j++) {
          const intermFY = sortedFYs[j];
          (cfUsed[intermFY] || []).forEach(src => {
            if (src.fromFY === pastFY) pastUnused = Math.max(0, pastUnused - src.amount);
          });
        }

        const take = Math.min(excess, pastUnused);
        if (take > 0) { sources.push({ fromFY: pastFY, amount: take }); excess -= take; }
      }

      cfUsed[fy] = sources;
    });

    // How much each year provided to future years
    const cfProvided = {};
    sortedFYs.forEach(fy => { cfProvided[fy] = 0; });
    sortedFYs.forEach(fy => {
      (cfUsed[fy] || []).forEach(src => {
        cfProvided[src.fromFY] = (cfProvided[src.fromFY] || 0) + src.amount;
      });
    });

    return sortedFYs
      .slice()
      .sort((a, b) => b - a)
      .map((fy) => {
        const limit    = fy >= 2023 ? 60000 : 40000;
        const used     = yearTotals[fy] || 0;
        const pct      = Math.min(100, Math.round((used / limit) * 100));
        const sources  = cfUsed[fy] || [];
        const cfTotal  = sources.reduce((s, src) => s + src.amount, 0);
        return {
          fy:    taxYearLabel(fy),
          used,
          limit,
          pct,
          color: allowanceColor(pct),
          carryForwardUsed:     cfTotal,
          carryForwardProvided: cfProvided[fy] || 0,
          carryForwardSources:  sources.map(src => ({
            fromLabel: taxYearLabel(src.fromFY),
            amount:    src.amount,
          })),
        };
      });
  }, [entries]);

  const allowanceYears = allAllowanceYears.slice(0, 4);

  return (
    <PensionLayout>
      <PremiumGate
        featureName="Pension Insights"
        description="Deep-dive analytics on your pension growth, contributions, and projected retirement income."
      >
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
                <DonutChart items={providers} totalValue={metrics.totalValue} />
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
            <div style={{ display: 'flex', background: '#060e20', borderRadius: '8px', padding: '2px', gap: '2px' }}>
              {['1Y', '5Y', 'AT'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    background: timeframe === tf ? '#4edea3' : 'transparent',
                    color: timeframe === tf ? '#003824' : '#bbcabf',
                    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '11px',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    transition: 'all 0.15s',
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
              {/* Timeframe summary: contributions + growth = total change in value */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                {[
                  { label: 'Contributions', value: fmtShort(displayData.summary.contributions), color: '#adc6ff' },
                  {
                    label: 'Growth',
                    value: (displayData.summary.growth < 0 ? '−' : '+') + fmtShort(Math.abs(displayData.summary.growth)),
                    color: displayData.summary.growth < 0 ? '#ffb4ab' : '#4edea3',
                  },
                  { label: 'Total', value: fmtShort(displayData.summary.total), color: '#dae2fd' },
                ].map(c => (
                  <div key={c.label} style={{ padding: '10px 12px', background: 'rgba(173,198,255,0.04)', borderRadius: '10px', minWidth: 0, textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', color: '#bbcabf', margin: '0 0 3px', lineHeight: 1.3 }}>{c.label}</p>
                    <p style={{ fontWeight: 700, fontSize: '14px', color: c.color, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {c.value}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px 0', margin: 0 }}>
              No history data available
            </p>
          )}
        </div>

        {/* Allowance Utilisation */}
        <div className="animate-in stagger-3 section-card" style={{ margin: '0 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>
              Allowance Utilisation
            </h3>
            {allAllowanceYears.length > 4 && (
              <button
                onClick={() => setShowAllAllowance(true)}
                style={{ background: 'none', border: 'none', color: '#adc6ff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                View All
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
              </button>
            )}
          </div>
          {allowanceYears.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '8px 0', margin: 0 }}>
              No contribution history found
            </p>
          ) : allowanceYears.map(yr => (
            <AllowanceRow key={yr.fy} yr={yr} />
          ))}
        </div>

        {/* Contributions across all pensions — same card as each provider page */}
        <ContributionsCard
          entries={entries}
          className="animate-in stagger-4 section-card"
          style={{ margin: '0 16px 24px' }}
        />

        {/* Allowance Utilisation — full history modal */}
        {showAllAllowance && (
          <div
            onClick={() => setShowAllAllowance(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'flex-end',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxHeight: '80vh',
                background: '#111827',
                borderRadius: '20px 20px 0 0',
                border: '1px solid rgba(173,198,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Modal header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '20px 20px 16px',
                borderBottom: '1px solid rgba(173,198,255,0.08)',
                flexShrink: 0,
              }}>
                <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>
                  Allowance Utilisation
                </h3>
                <button
                  onClick={() => setShowAllAllowance(false)}
                  style={{ background: 'none', border: 'none', color: '#adc6ff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
                </button>
              </div>

              {/* Scrollable year list */}
              <div style={{ overflowY: 'auto', padding: '16px 20px 32px' }}>
                {allAllowanceYears.map(yr => (
                  <AllowanceRow key={yr.fy} yr={yr} />
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
      </PremiumGate>
    </PensionLayout>
  );
}
