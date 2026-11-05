import React, { useState } from 'react';

// Negative values put the minus before the £ (−£12k), never £-12k
function fmtK(n) {
  if (!n) return '£0';
  const sign = n < 0 ? '−' : '';
  const abs  = Math.abs(n);
  if (abs >= 1000) return `${sign}£${Math.round(abs / 1000).toLocaleString('en-GB')}k`;
  return `${sign}£${Math.round(abs)}`;
}

// Dual-line SVG chart: total value (green) + cumulative money paid in (blue).
// The hover shows both and their difference as Growth.
export default function DualLineChart({ valueSeries, contribSeries, labels, valueLabel = 'Total value', contribLabel = 'Contributions' }) {
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
  // Investment growth at the hovered month: total value minus contributions paid in
  const growth = hi !== null ? (valueSeries[hi] || 0) - (contribSeries[hi] || 0) : 0;
  const growthColor = growth < 0 ? '#ffb4ab' : '#4edea3';

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4edea3', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#bbcabf' }}>{valueLabel}</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#4edea3' }}>{fmtK(valueSeries[hi])}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#adc6ff', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#bbcabf' }}>{contribLabel}</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#adc6ff' }}>{fmtK(contribSeries[hi])}</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(173,198,255,0.1)', margin: '5px 0 4px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: growthColor, flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#bbcabf' }}>Growth</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: growthColor }}>
                {growth < 0 ? '−' : '+'}{fmtK(Math.abs(growth))}
              </span>
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
            <circle cx={toX(hi)} cy={toY(valueSeries[hi])} r="3.5" fill="#0b1326" stroke="#4edea3" strokeWidth="2" />
          )}
          {hi !== null && contribSeries[hi] > 0 && (
            <circle cx={toX(hi)} cy={toY(contribSeries[hi])} r="3.5" fill="#0b1326" stroke="#adc6ff" strokeWidth="2" />
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
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>{valueLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '2px', background: '#adc6ff', borderRadius: '1px' }} />
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>{contribLabel}</span>
        </div>
      </div>
    </>
  );
}
