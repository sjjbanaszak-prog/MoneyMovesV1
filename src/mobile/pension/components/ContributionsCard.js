import React, { useMemo, useState } from 'react';
import { getTaxYearStart } from '../utils/pensionDates';
import { monthlyContributionHistory, periodContributionSummary } from '../utils/contributionHistory';

function fmtShort(n) { const v = Math.round(n || 0); return (v < 0 ? '−' : '') + '£' + Math.abs(v).toLocaleString('en-GB'); }

// Monthly bar chart of contributions (blue) and growth (green, or red below the
// zero line when negative) for the selected FY or CY.
function ContributionBarChart({ monthlyData, monthlyGrowth, color }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Bars above the zero line are contributions + positive growth; months where
  // growth was negative get a red bar below the line. Both share one scale, and the
  // zero line moves down only as far as the largest loss needs.
  const CHART_H = 52;
  const barTotals = monthlyData.map((b, i) => {
    const g = monthlyGrowth[i];
    return b.amount + (g !== null && g > 0 ? g : 0);
  });
  const maxPos = Math.max(...barTotals, 0);
  const maxNeg = Math.max(...monthlyGrowth.map(g => (g !== null && g < 0 ? -g : 0)), 0);
  const scale  = CHART_H / (Math.max(maxPos + maxNeg, 1));
  const posAreaH = maxNeg > 0 ? maxPos * scale : CHART_H;
  const negAreaH = CHART_H - posAreaH;
  const hasAnyGrowthData   = monthlyGrowth.some(g => g !== null);
  const hasNegativeGrowth  = maxNeg > 0;
  const accentColor = color || '#4edea3';

  const tooltipLeft    = hoveredIdx !== null ? Math.min(Math.max((hoveredIdx + 0.5) / 12 * 100, 14), 86) : 50;
  const hoveredBucket  = hoveredIdx !== null ? monthlyData[hoveredIdx] : null;
  const hoveredGrowth  = hoveredIdx !== null ? monthlyGrowth[hoveredIdx] : null;
  const showTooltip    = hoveredIdx !== null && (hoveredBucket.amount > 0 || hoveredGrowth !== null);
  const isHoveringBar  = hoveredIdx !== null && hoveredBucket.amount > 0;

  return (
    <div style={{ position: 'relative' }} onMouseLeave={() => setHoveredIdx(null)}>

      {/* Hover tooltip */}
      {showTooltip && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: `${tooltipLeft}%`,
          transform: 'translateX(-50%)',
          // Fixed width so the tooltip doesn't resize as values change month to month
          width: '160px',
          boxSizing: 'border-box',
          fontVariantNumeric: 'tabular-nums',
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
            {new Date(hoveredBucket.calYear, hoveredBucket.calMonth, 1).toLocaleString('en-GB', { month: 'short', year: '2-digit' })}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <span style={{ fontSize: '11px', color: '#adc6ff' }}>Contributed</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#dae2fd' }}>
                {fmtShort(hoveredBucket.amount)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <span style={{ fontSize: '11px', color: hoveredGrowth !== null ? (hoveredGrowth >= 0 ? '#4edea3' : '#ffb4ab') : '#64748b' }}>
                Growth
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: hoveredGrowth !== null ? (hoveredGrowth >= 0 ? '#4edea3' : '#ffb4ab') : '#64748b' }}>
                {hoveredGrowth !== null
                  ? (hoveredGrowth >= 0 ? '+' : '') + fmtShort(hoveredGrowth)
                  : '—'}
              </span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', gap: '16px',
              borderTop: '1px solid rgba(173,198,255,0.1)',
              paddingTop: '3px', marginTop: '1px',
            }}>
              <span style={{ fontSize: '11px', color: '#bbcabf' }}>Total</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#dae2fd' }}>
                {fmtShort((hoveredBucket.amount || 0) + (hoveredGrowth || 0))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Contribution bars */}
      <div style={{ display: 'flex', gap: '4px', height: `${CHART_H}px`, position: 'relative' }}>
        {monthlyData.map((b, i) => {
          const growthVal      = monthlyGrowth[i];
          const positiveGrowth = growthVal !== null ? Math.max(0, growthVal) : 0;
          const negativeGrowth = growthVal !== null ? Math.max(0, -growthVal) : 0;
          const barTotal       = b.amount + positiveGrowth;
          const barHeightPx    = barTotal > 0 ? Math.max(3, barTotal * scale) : (negativeGrowth > 0 ? 0 : 3);
          const negHeightPx    = negativeGrowth > 0 ? Math.max(3, negativeGrowth * scale) : 0;
          const hasSplit       = positiveGrowth > 0 && b.amount > 0;
          const growthFrac     = barTotal > 0 ? positiveGrowth / barTotal : 0;
          const hasData        = b.amount > 0 || growthVal !== null;
          const isHovered      = hoveredIdx === i && hasData;
          return (
            <div
              key={i}
              style={{
                flex: 1, height: `${CHART_H}px`, display: 'flex', flexDirection: 'column',
                cursor: hasData ? 'pointer' : 'default',
                opacity: isHoveringBar && hoveredIdx !== i ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={() => setHoveredIdx(i)}
            >
              {/* Above the zero line: contributions (blue) + positive growth (green) */}
              <div style={{ height: `${posAreaH}px`, display: 'flex', alignItems: 'flex-end' }}>
                {barHeightPx > 0 && (
                  <div style={{
                    width: '100%',
                    height: `${barHeightPx}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '3px 3px 2px 2px',
                    overflow: 'hidden',
                    outline: isHovered ? '1px solid rgba(173,198,255,0.25)' : 'none',
                    transition: 'height 0.4s ease',
                  }}>
                    {hasSplit ? (
                      <>
                        <div style={{ width: '100%', height: `${growthFrac * 100}%`, background: 'rgba(78,222,163,0.45)' }} />
                        <div style={{ width: '100%', flex: 1, background: 'rgba(173,198,255,0.45)' }} />
                      </>
                    ) : b.amount > 0 ? (
                      <div style={{ flex: 1, background: 'rgba(173,198,255,0.35)' }} />
                    ) : positiveGrowth > 0 ? (
                      <div style={{ flex: 1, background: 'rgba(78,222,163,0.45)' }} />
                    ) : (
                      <div style={{ flex: 1, background: 'rgba(173,198,255,0.06)' }} />
                    )}
                  </div>
                )}
              </div>
              {/* Below the zero line: negative growth (red) */}
              {negAreaH > 0 && (
                <div style={{ height: `${negAreaH}px` }}>
                  {negHeightPx > 0 && (
                    <div style={{
                      width: '100%',
                      height: `${negHeightPx}px`,
                      background: 'rgba(255,180,171,0.5)',
                      borderRadius: '2px 2px 3px 3px',
                      outline: isHovered ? '1px solid rgba(255,180,171,0.35)' : 'none',
                      transition: 'height 0.4s ease',
                    }} />
                  )}
                </div>
              )}
            </div>
          );
        })}
        {/* Zero line, only needed when some months dip below it */}
        {hasNegativeGrowth && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: `${posAreaH}px`,
            borderTop: '1px solid rgba(173,198,255,0.15)', pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Month labels */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        {monthlyData.map((b, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: '8px', color: hoveredIdx === i ? accentColor : '#64748b' }}>
              {b.label.slice(0, 1)}
            </span>
          </div>
        ))}
      </div>

      {/* Legend — only shown when growth data is available */}
      {hasAnyGrowthData && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', marginBottom: '2px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(173,198,255,0.45)' }} />
            <span style={{ fontSize: '11px', color: '#bbcabf' }}>Contributions</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Split green/red when the period includes negative growth */}
            <div style={{
              width: '10px', height: '10px', borderRadius: '2px',
              background: hasNegativeGrowth
                ? 'linear-gradient(135deg, rgba(78,222,163,0.45) 50%, rgba(255,180,171,0.5) 50%)'
                : 'rgba(78,222,163,0.45)',
            }} />
            <span style={{ fontSize: '11px', color: '#bbcabf' }}>Growth</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Contributions card: FY/CY toggle, monthly contributions & growth chart, and
 * Contributions / Growth / Total for the period. Pass one pension (`[entry]`) for a
 * provider page, or every pension for the all-pensions view on Insights.
 */
export default function ContributionsCard({ entries, color, title = 'Contributions', className = 'animate-in stagger-2 section-card', style = { marginBottom: '16px' } }) {
  const [periodType, setPeriodType] = useState('fy'); // 'fy' | 'cy'
  const currentFYStart = getTaxYearStart(new Date());
  const currentCY      = new Date().getFullYear();
  const selectedYear   = periodType === 'fy' ? currentFYStart : currentCY;

  const { monthlyData, monthlyGrowth } = useMemo(
    () => monthlyContributionHistory(entries, periodType, selectedYear),
    [entries, periodType, selectedYear],
  );
  const { contributions: periodTotal, growth: periodGrowth } = useMemo(
    () => periodContributionSummary(entries, periodType, selectedYear),
    [entries, periodType, selectedYear],
  );

  return (
    <div className={className} style={style}>
      {/* Header row: title + FY/CY toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
        <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0, flexShrink: 0 }}>
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* FY / CY pill toggle */}
          <div style={{ display: 'flex', background: '#060e20', borderRadius: '8px', padding: '2px', gap: '2px' }}>
            {['fy', 'cy'].map(t => (
              <button
                key={t}
                onClick={() => setPeriodType(t)}
                style={{
                  padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: periodType === t ? '#4edea3' : 'transparent',
                  color: periodType === t ? '#003824' : '#bbcabf',
                  fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '11px',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  transition: 'all 0.15s',
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

        <ContributionBarChart monthlyData={monthlyData} monthlyGrowth={monthlyGrowth} color={color} />
      {/* Period summary: contributions + growth = total change in value */}
      {(() => {
        const growthColor = periodGrowth === null ? '#64748b' : periodGrowth < 0 ? '#ffb4ab' : '#4edea3';
        const cards = [
          { label: 'Contributions', value: fmtShort(periodTotal), color: '#adc6ff' },
          {
            label: 'Growth',
            value: periodGrowth === null ? '—' : (periodGrowth < 0 ? '−' : '+') + fmtShort(Math.abs(periodGrowth)),
            color: growthColor,
          },
          {
            label: 'Total',
            value: periodGrowth === null ? '—' : fmtShort(periodTotal + periodGrowth),
            color: '#dae2fd',
          },
        ];
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
            {cards.map(c => (
              <div key={c.label} style={{ padding: '10px 12px', background: 'rgba(173,198,255,0.04)', borderRadius: '10px', minWidth: 0, textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#bbcabf', margin: '0 0 3px', lineHeight: 1.3 }}>
                  {c.label}
                </p>
                <p style={{ fontWeight: 700, fontSize: '14px', color: c.color, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {c.value}
                </p>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
