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

export default function MortgageInsights() {
  const { mortgages } = useMortgageData();
  const [hpiData, setHpiData] = useState(null); // { regional: [], national: [], regionName: '' }
  const [hpiLoading, setHpiLoading] = useState(false);

  useEffect(() => {
    const primary = mortgages.find(m => m.type === 'Residential') || mortgages[0];
    const postcode = primary?.postcode;
    if (!postcode) { setHpiData(null); return; }

    let cancelled = false;
    setHpiLoading(true);

    async function fetchHpi() {
      try {
        // Step 1: get region from postcodes.io
        const pc = postcode.replace(/\s/g, '');
        const pcRes = await fetch(`https://api.postcodes.io/postcodes/${pc}`);
        const pcJson = await pcRes.json();
        if (cancelled || pcJson.status !== 200) return;

        const eer = pcJson.result.european_electoral_region;
        const slug = eerToSlug(eer);
        const regionName = eer || 'England & Wales';

        // Step 2: fetch regional + national UKHPI in parallel
        const LR = 'https://landregistry.data.gov.uk/api/1/slice.json?dataset=ukhpi&measures/housePriceIndex=true&_pageSize=60&_sort=dimension/refPeriod';
        const enc = s => encodeURIComponent('http://landregistry.data.gov.uk/id/region/' + s);

        const [regRes, natRes] = await Promise.all([
          fetch(`${LR}&dimension/refRegion=${enc(slug)}`),
          fetch(`${LR}&dimension/refRegion=${enc('england-and-wales')}`),
        ]);
        const [regJson, natJson] = await Promise.all([regRes.json(), natRes.json()]);

        if (cancelled) return;
        const regional = regJson?.result?.items || [];
        const national = natJson?.result?.items || [];
        if (regional.length >= 2 && national.length >= 2) {
          setHpiData({ regional, national, regionName });
        }
      } catch (_) {
        // silently fall back to synthetic data
      } finally {
        if (!cancelled) setHpiLoading(false);
      }
    }

    fetchHpi();
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

    // Use real UKHPI data if available
    if (hpiData?.regional?.length >= 2 && hpiData?.national?.length >= 2) {
      const sortByPeriod = arr => [...arr].sort((a, b) => parsePeriod(a).localeCompare(parsePeriod(b)));
      const regional = sortByPeriod(hpiData.regional).slice(-24);
      const national = sortByPeriod(hpiData.national).slice(-24);

      const latestRegHpi = regional[regional.length - 1].housePriceIndex;
      const latestNatHpi = national[national.length - 1].housePriceIndex;

      // Both series anchored to currentValue at the latest point so the chart shows
      // how regional vs national trajectories diverged over the period.
      const valueSeries = regional.map(item =>
        Math.round(currentValue * (item.housePriceIndex / latestRegHpi))
      );
      const avgSeries = national.map(item =>
        Math.round(currentValue * (item.housePriceIndex / latestNatHpi))
      );
      const labels = regional.map(item => {
        const [y, mo] = parsePeriod(item).split('-');
        if (!y || !mo) return parsePeriod(item);
        const d = new Date(parseInt(y), parseInt(mo) - 1);
        return d.toLocaleString('en-GB', { month: 'short', year: '2-digit' });
      });

      const regGrowthPct = ((latestRegHpi / regional[0].housePriceIndex) - 1) * 100;
      const natGrowthPct = ((latestNatHpi / national[0].housePriceIndex) - 1) * 100;

      return {
        valueSeries,
        avgSeries,
        labels,
        currentValue,
        growth: valueSeries[valueSeries.length - 1] - valueSeries[0],
        name: primary.name,
        regionName: hpiData.regionName,
        regGrowthPct: Math.round(regGrowthPct * 10) / 10,
        natGrowthPct: Math.round(natGrowthPct * 10) / 10,
        isReal: true,
      };
    }

    // Fallback: synthesise using UK long-run average HPI (~5% pa)
    const months = 24;
    const propMonthlyGrowth = Math.pow(1.05, 1 / 12) - 1;
    const areaMonthlyGrowth = Math.pow(1.04, 1 / 12) - 1;
    const valueSeries = [], avgSeries = [], labels = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleString('en-GB', { month: 'short', year: '2-digit' }));
      valueSeries.push(Math.round(currentValue / Math.pow(1 + propMonthlyGrowth, i)));
      avgSeries.push(Math.round((currentValue * 0.93) / Math.pow(1 + areaMonthlyGrowth, i)));
    }
    return { valueSeries, avgSeries, labels, currentValue, growth: currentValue - valueSeries[0], name: primary.name, isReal: false };
  }, [mortgages, hpiData]);

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
            {hpiLoading ? (
              <span style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>Loading…</span>
            ) : propertyChartData?.isReal ? (
              <span style={{ fontSize: '10px', color: '#4edea3', background: 'rgba(78,222,163,0.1)', borderRadius: '6px', padding: '2px 8px', fontWeight: 700 }}>
                HM Land Registry
              </span>
            ) : (
              <span style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>Est. trend</span>
            )}
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
                avgLabel={propertyChartData.isReal ? 'National avg' : 'Area average'}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', background: 'rgba(173,198,255,0.04)', borderRadius: '10px', padding: '12px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 3px' }}>Current value</p>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: '#4edea3', margin: 0 }}>{fmtK(propertyChartData.currentValue)}</p>
                </div>
                {propertyChartData.isReal ? (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 3px' }}>Regional vs National (24m)</p>
                    <p style={{ fontWeight: 700, fontSize: '14px', color: propertyChartData.regGrowthPct >= propertyChartData.natGrowthPct ? '#4edea3' : '#ffb95f', margin: 0 }}>
                      {propertyChartData.regGrowthPct > 0 ? '+' : ''}{propertyChartData.regGrowthPct}% vs {propertyChartData.natGrowthPct > 0 ? '+' : ''}{propertyChartData.natGrowthPct}%
                    </p>
                  </div>
                ) : propertyChartData.growth > 0 ? (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 3px' }}>Est. 2yr gain</p>
                    <p style={{ fontWeight: 700, fontSize: '14px', color: '#adc6ff', margin: 0 }}>+{fmtK(propertyChartData.growth)}</p>
                  </div>
                ) : null}
              </div>
              <p style={{ fontSize: '10px', color: '#475569', margin: '10px 0 0', lineHeight: '1.5' }}>
                {propertyChartData.isReal
                  ? `Estimated values use HM Land Registry UKHPI monthly data for ${propertyChartData.regionName}. Green = regional trend, blue = England & Wales national average.`
                  : <>Estimated trend based on UK average HPI growth. Add a postcode in mortgage details to use real Land Registry data. <a href="https://www.gov.uk/search-house-prices" target="_blank" rel="noopener noreferrer" style={{ color: '#adc6ff', textDecoration: 'underline' }}>HM Land Registry</a>.</>
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
