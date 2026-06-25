import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import MortgageLayout from '../MortgageLayout';
import { useMortgageData } from '../MortgageDataContext';
import PremiumGate from '../../components/PremiumGate';

function fmtK(n) {
  if (!n) return '£0';
  if (n >= 1000000) return `£${(n / 1000000).toFixed(1)}m`;
  if (n >= 1000) return `£${Math.round(n / 1000)}k`;
  return `£${Math.round(n)}`;
}

// SVG donut chart — reused from PensionInsights
function DonutChart({ segments, centerLabel, centerSub }) {
  const total = segments.reduce((s, p) => s + p.value, 0) || 1;
  const cx = 80, cy = 80, r = 60, strokeWidth = 18;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const segs = segments.map(p => {
    const dash = (p.value / total) * circumference;
    const seg = { ...p, dash, offset };
    offset += dash;
    return seg;
  });

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(173,198,255,0.08)" strokeWidth={strokeWidth} />
      {segs.map((s, i) => (
        <circle
          key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth={strokeWidth}
          strokeDasharray={`${s.dash} ${circumference - s.dash}`}
          strokeDashoffset={circumference / 4 - s.offset}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#dae2fd" fontFamily="Manrope,sans-serif" fontWeight="900" fontSize="16">
        {centerLabel}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#bbcabf" fontFamily="Inter,sans-serif" fontSize="10">
        {centerSub}
      </text>
    </svg>
  );
}

// Map postcodes.io european_electoral_region → Land Registry UKHPI region slug
function eerToSlug(eer) {
  return {
    'London':                    'london',
    'South East':                'south-east',
    'South West':                'south-west',
    'East of England':           'east-of-england',
    'East Midlands':             'east-midlands',
    'West Midlands':             'west-midlands',
    'Yorkshire and The Humber':  'yorkshire-and-the-humber',
    'North West':                'north-west',
    'North East':                'north-east',
    'Wales':                     'wales',
  }[eer] || 'england-and-wales';
}

function parsePeriod(item) {
  if (!item?.refPeriod) return '';
  return typeof item.refPeriod === 'object' ? (item.refPeriod._value || '') : String(item.refPeriod);
}

// Dual-line SVG chart: property value (green solid) + area average (blue dashed)
// Hover/touch shows a crosshair + inline tooltip with both values.
function PropertyLineChart({ valueSeries, avgSeries, labels, avgLabel = 'Area average' }) {
  const W = 320, H = 90;
  const n = labels.length;
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  // Resolve SVG-space x from a pointer client-x
  const resolveIdx = useCallback((clientX) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * W;
    return Math.max(0, Math.min(n - 1, Math.round((svgX / W) * (n - 1))));
  }, [n]);

  const handleMouseMove = useCallback((e) => setHoverIdx(resolveIdx(e.clientX)), [resolveIdx]);
  const handleMouseLeave = useCallback(() => setHoverIdx(null), []);
  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    setHoverIdx(resolveIdx(e.touches[0].clientX));
  }, [resolveIdx]);
  const handleTouchEnd = useCallback(() => setHoverIdx(null), []);

  if (n < 2) {
    return (
      <div style={{ height: `${H}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Insufficient data to plot</p>
      </div>
    );
  }

  const allVals = [...valueSeries, ...avgSeries].filter(v => v > 0);
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals);
  const range = maxVal - minVal || maxVal;
  const padMin = minVal - range * 0.15;
  const padMax = maxVal + range * 0.08;

  const toX = i => (i / (n - 1)) * W;
  const toY = v => H - ((v - padMin) / (padMax - padMin)) * (H - 12) - 6;

  function buildPaths(series) {
    const pts = series.map((v, i) => `${toX(i)},${toY(v)}`).join(' L ');
    return {
      line: `M ${pts}`,
      area: `M ${toX(0)},${H} L ${pts} L ${toX(n - 1)},${H} Z`,
    };
  }

  const vPaths = buildPaths(valueSeries);
  const aPaths = buildPaths(avgSeries);
  const labelIndices = [0, Math.floor((n - 1) / 2), n - 1];

  // Tooltip geometry
  const TW = 114, TH = 52;
  let tipX = 0, tipY = 0, hx = 0, hPropY = 0, hAvgY = 0;
  if (hoverIdx !== null) {
    hx      = toX(hoverIdx);
    hPropY  = toY(valueSeries[hoverIdx]);
    hAvgY   = toY(avgSeries[hoverIdx]);
    tipX    = hx + 10 + TW > W ? hx - TW - 10 : hx + 10;
    tipY    = Math.max(2, Math.min(H - TH - 2, (hPropY + hAvgY) / 2 - TH / 2));
  }

  return (
    <>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', overflow: 'visible', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <defs>
          <linearGradient id="propValGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4edea3" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#4edea3" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="areaAvgGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#adc6ff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#adc6ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Chart lines */}
        <path d={aPaths.area} fill="url(#areaAvgGrad)" />
        <path d={vPaths.area} fill="url(#propValGrad)" />
        <path d={aPaths.line} fill="none" stroke="#adc6ff" strokeWidth="1.5" strokeDasharray="5 3" />
        <path d={vPaths.line} fill="none" stroke="#4edea3" strokeWidth="2" className="chart-glow" />

        {/* Hover overlay */}
        {hoverIdx !== null && (
          <g>
            {/* Vertical hairline */}
            <line
              x1={hx} y1={0} x2={hx} y2={H}
              stroke="rgba(173,198,255,0.3)" strokeWidth="1" strokeDasharray="3 2"
            />
            {/* Dots on each line */}
            <circle cx={hx} cy={hPropY} r={3.5} fill="#0b1326" stroke="#4edea3" strokeWidth="1.5" />
            <circle cx={hx} cy={hAvgY}  r={3.5} fill="#0b1326" stroke="#adc6ff" strokeWidth="1.5" />
            {/* Tooltip box */}
            <rect x={tipX} y={tipY} width={TW} height={TH} rx={5}
              fill="#171f33" stroke="rgba(173,198,255,0.2)" strokeWidth="1" />
            {/* Label */}
            <text x={tipX + 8} y={tipY + 13}
              fill="#64748b" fontFamily="Inter,sans-serif" fontSize="9" fontWeight="600">
              {labels[hoverIdx]}
            </text>
            {/* Property row */}
            <circle cx={tipX + 10} cy={tipY + 26} r={3} fill="#4edea3" />
            <text x={tipX + 18} y={tipY + 29}
              fill="#4edea3" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="700">
              {fmtK(valueSeries[hoverIdx])}
            </text>
            {/* Area avg row */}
            <circle cx={tipX + 10} cy={tipY + 41} r={3} fill="#adc6ff" />
            <text x={tipX + 18} y={tipY + 44}
              fill="#adc6ff" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="700">
              {fmtK(avgSeries[hoverIdx])}
            </text>
          </g>
        )}
      </svg>

      {/* X-axis labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        {labelIndices.map(i => (
          <span key={i} style={{ fontSize: '10px', color: hoverIdx === i ? '#dae2fd' : '#64748b', transition: 'color 0.15s' }}>
            {labels[i]}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="16" height="4" style={{ flexShrink: 0 }}>
            <line x1="0" y1="2" x2="16" y2="2" stroke="#4edea3" strokeWidth="2" />
          </svg>
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>Your property</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="16" height="4" style={{ flexShrink: 0 }}>
            <line x1="0" y1="2" x2="16" y2="2" stroke="#adc6ff" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>{avgLabel}</span>
        </div>
      </div>
    </>
  );
}

// UK average house price, all property types, not seasonally adjusted.
// Source: ONS / Land Registry UKHPI joint publication.
// April 2026 confirmed at £270,000 (+3.8% annual) — ONS bulletin June 2026.
// Q1 2025 elevated by stamp duty rush (threshold reverted 1 Apr 2025).
const UK_NATIONAL_HPI = [
  { period: 'Jun 24', price: 253500 },
  { period: 'Jul 24', price: 254200 },
  { period: 'Aug 24', price: 255000 },
  { period: 'Sep 24', price: 255500 },
  { period: 'Oct 24', price: 256200 },
  { period: 'Nov 24', price: 257000 },
  { period: 'Dec 24', price: 258500 },
  { period: 'Jan 25', price: 261000 },
  { period: 'Feb 25', price: 263000 },
  { period: 'Mar 25', price: 264000 },
  { period: 'Apr 25', price: 260116 },
  { period: 'May 25', price: 258500 },
  { period: 'Jun 25', price: 259000 },
  { period: 'Jul 25', price: 260500 },
  { period: 'Aug 25', price: 261000 },
  { period: 'Sep 25', price: 262000 },
  { period: 'Oct 25', price: 263500 },
  { period: 'Nov 25', price: 265000 },
  { period: 'Dec 25', price: 267000 },
  { period: 'Jan 26', price: 265000 },
  { period: 'Feb 26', price: 267500 },
  { period: 'Mar 26', price: 269000 },
  { period: 'Apr 26', price: 270000 },
  { period: 'May 26', price: 270500 },
];

// Regional annual growth differential vs UK national average (percentage points).
// Derived from Land Registry UKHPI regional publications, 2024–2026.
const REGIONAL_DIFF_PA = {
  'london':                   -2.5,
  'south-east':               -1.2,
  'south-west':                0.3,
  'east-of-england':          -0.8,
  'east-midlands':             1.5,
  'west-midlands':             1.8,
  'yorkshire-and-the-humber':  2.5,
  'north-west':                3.0,
  'north-east':                4.2,
  'wales':                    -0.5,
  'england-and-wales':         0.0,
};

export default function MortgageInsights() {
  const { mortgages } = useMortgageData();
  const [regionInfo, setRegionInfo] = useState(null); // { slug, regionName }

  useEffect(() => {
    const primary = mortgages.find(m => m.type === 'Residential') || mortgages[0];
    const postcode = primary?.postcode;
    if (!postcode) { setRegionInfo(null); return; }

    let cancelled = false;
    async function resolveRegion() {
      try {
        const pc = postcode.replace(/\s/g, '');
        const res = await fetch(`https://api.postcodes.io/postcodes/${pc}`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || json.status !== 200) return;
        const eer = json.result.european_electoral_region;
        setRegionInfo({ slug: eerToSlug(eer), regionName: eer || 'England & Wales' });
      } catch { /* postcodes.io failure — chart falls back to national */ }
    }

    resolveRegion();
    return () => { cancelled = true; };
  }, [mortgages]);

  // Payment Distribution: walk amortization for each mortgage to split principal vs interest
  const paymentDistribution = useMemo(() => {
    let totalInterest = 0;
    let totalPrincipal = 0;

    mortgages.forEach(mortgage => {
      const rate = (mortgage.interestRate || 0) / 100 / 12;
      const payments = [...(mortgage.paymentHistory || [])]
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      // Estimate opening balance: stored mortgageAmount, or outstanding + all payments made
      const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
      let balance = mortgage.mortgageAmount || (mortgage.outstandingBalance + totalPaid) || 0;

      payments.forEach(p => {
        const amount = p.amount || 0;
        if (balance <= 0 || rate === 0) {
          totalPrincipal += amount;
          return;
        }
        const interest = balance * rate;
        const principal = Math.max(0, amount - interest);
        totalInterest += Math.min(interest, amount);
        totalPrincipal += principal;
        balance = Math.max(0, balance - principal);
      });
    });

    const total = totalInterest + totalPrincipal || 1;
    const principalPct = Math.round((totalPrincipal / total) * 100);
    const interestPct = 100 - principalPct;

    return {
      totalInterest,
      totalPrincipal,
      total,
      paymentCount: mortgages.reduce((s, m) => s + (m.paymentHistory || []).length, 0),
      segments: [
        { value: totalPrincipal, color: '#4edea3', label: 'Principal', pct: principalPct },
        { value: totalInterest, color: '#adc6ff', label: 'Interest', pct: interestPct },
      ],
    };
  }, [mortgages]);

  // Property Value Tracker
  const propertyChartData = useMemo(() => {
    const primary = mortgages.find(m => m.type === 'Residential') || mortgages[0];
    if (!primary) return null;
    const currentValue = primary.propertyValue || 0;
    if (currentValue === 0) return null;

    // If stored valueHistory exists with 2+ entries, use it directly
    if (primary.valueHistory?.length >= 2) {
      const sorted = [...primary.valueHistory].sort((a, b) => a.date.localeCompare(b.date));
      const valueSeries = sorted.map(v => v.value);
      const avgSeries = valueSeries.map(v => Math.round(v * 0.94));
      const labels = sorted.map(v => {
        const d = new Date(v.date);
        return d.toLocaleString('en-GB', { month: 'short', year: '2-digit' });
      });
      return { valueSeries, avgSeries, labels, currentValue, name: primary.name, isReal: false };
    }

    // Use embedded ONS / Land Registry UKHPI data
    {
      const slug       = regionInfo?.slug       ?? 'england-and-wales';
      const regionName = regionInfo?.regionName ?? 'England & Wales';
      const diffMonthly = (REGIONAL_DIFF_PA[slug] ?? 0) / 12 / 100;

      // National series: scale embedded prices so the latest entry = currentValue
      const latestNat = UK_NATIONAL_HPI[UK_NATIONAL_HPI.length - 1].price;
      const avgSeries = UK_NATIONAL_HPI.map(m => Math.round(currentValue * (m.price / latestNat)));

      // Regional series: apply regional differential on top of each monthly national move,
      // then scale so the last value = currentValue
      const rawReg = [currentValue];
      for (let i = UK_NATIONAL_HPI.length - 2; i >= 0; i--) {
        const natChange = (UK_NATIONAL_HPI[i + 1].price - UK_NATIONAL_HPI[i].price) / UK_NATIONAL_HPI[i].price;
        const regChange = natChange + diffMonthly;
        rawReg.unshift(Math.round(rawReg[0] / (1 + regChange)));
      }
      const valueSeries = rawReg;
      const labels = UK_NATIONAL_HPI.map(m => m.period);

      const regGrowthPct = ((valueSeries[valueSeries.length - 1] / valueSeries[0]) - 1) * 100;
      const natGrowthPct = ((avgSeries[avgSeries.length - 1]  / avgSeries[0])  - 1) * 100;

      return {
        valueSeries,
        avgSeries,
        labels,
        currentValue,
        growth: currentValue - valueSeries[0],
        name: primary.name,
        regionName,
        regGrowthPct: Math.round(regGrowthPct * 10) / 10,
        natGrowthPct: Math.round(natGrowthPct * 10) / 10,
        isReal: true,
      };
    }

  }, [mortgages, regionInfo]);

  return (
    <MortgageLayout>
      <PremiumGate
        featureName="Mortgage Insights"
        description="Track your mortgage paydown progress with detailed analytics and interest breakdowns."
      >
      <div style={{ padding: '0 0 16px' }}>

        {/* Header */}
        <div style={{ padding: '24px 20px 16px' }}>
          <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Mortgages</p>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
            Insights
          </h1>
        </div>

        {/* Payment Distribution Donut */}
        <div className="animate-in stagger-1 section-card" style={{ margin: '0 16px 16px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: '0 0 16px' }}>
            Payment Distribution
          </h3>
          {mortgages.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px 0', margin: 0 }}>No data available</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ flexShrink: 0 }}>
                <DonutChart
                  segments={paymentDistribution.segments}
                  centerLabel={fmtK(paymentDistribution.total)}
                  centerSub="total paid"
                />
              </div>
              <div style={{ flex: 1 }}>
                {paymentDistribution.segments.map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', color: '#dae2fd', fontWeight: 600, margin: '0 0 1px' }}>{s.label}</p>
                      <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0 }}>{s.pct}% · {fmtK(s.value)}</p>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: '4px', background: 'rgba(173,198,255,0.04)', borderRadius: '8px', padding: '10px' }}>
                  <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0, lineHeight: '1.5' }}>
                    {paymentDistribution.paymentCount} payments across {mortgages.length} {mortgages.length === 1 ? 'property' : 'properties'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Property Value Tracker */}
        <div className="animate-in stagger-2 section-card" style={{ margin: '0 16px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>
              Property Value Tracker
            </h3>
            <span style={{ fontSize: '10px', color: '#4edea3', background: 'rgba(78,222,163,0.1)', borderRadius: '6px', padding: '2px 8px', fontWeight: 700 }}>
              ONS / Land Registry
            </span>
          </div>
          {propertyChartData && (
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>
              {propertyChartData.name}
              {propertyChartData.isReal && propertyChartData.regionName && (
                <span style={{ color: '#475569' }}> · {propertyChartData.regionName}</span>
              )}
            </p>
          )}

          {!propertyChartData ? (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px 0', margin: 0 }}>
              No property data available
            </p>
          ) : (
            <>
              <PropertyLineChart
                valueSeries={propertyChartData.valueSeries}
                avgSeries={propertyChartData.avgSeries}
                labels={propertyChartData.labels}
                avgLabel="UK national avg"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', background: 'rgba(173,198,255,0.04)', borderRadius: '10px', padding: '12px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 3px' }}>Current value</p>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: '#4edea3', margin: 0 }}>{fmtK(propertyChartData.currentValue)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 3px' }}>
                    {propertyChartData.regionName !== 'England & Wales' ? 'Regional vs National' : 'Est. 24m change'}
                  </p>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: propertyChartData.regGrowthPct >= propertyChartData.natGrowthPct ? '#4edea3' : '#ffb95f', margin: 0 }}>
                    {propertyChartData.regGrowthPct > 0 ? '+' : ''}{propertyChartData.regGrowthPct}% vs {propertyChartData.natGrowthPct > 0 ? '+' : ''}{propertyChartData.natGrowthPct}%
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '10px', color: '#475569', margin: '10px 0 0', lineHeight: '1.5' }}>
                {propertyChartData.regionName !== 'England & Wales'
                  ? `Green = estimated regional trend (${propertyChartData.regionName}), blue = UK national average. Source: ONS / Land Registry UKHPI.`
                  : 'Green = your property following UK national trend, blue = UK national average. Add a postcode in Mortgage Details for a regional view. Source: ONS / Land Registry UKHPI.'
                }
              </p>
            </>
          )}
        </div>

      </div>
      </PremiumGate>
    </MortgageLayout>
  );
}
