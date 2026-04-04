import React, { useState, useMemo } from 'react';
import PensionLayout from '../PensionLayout';
import { usePensionData } from '../PensionDataContext';

const TABS = ['Scenarios', 'Benchmark'];

// Approximate UK average pension pot by age (ONS / industry data)
const AVG_POT_BY_AGE = [
  [22,  5000], [25, 12000], [30, 35000], [35, 72000],
  [38, 89000], [40, 107000], [45, 145000], [50, 190000],
  [55, 240000], [60, 290000], [65, 330000],
];

function avgPotForAge(age) {
  if (age <= AVG_POT_BY_AGE[0][0]) return AVG_POT_BY_AGE[0][1];
  if (age >= AVG_POT_BY_AGE[AVG_POT_BY_AGE.length - 1][0]) return AVG_POT_BY_AGE[AVG_POT_BY_AGE.length - 1][1];
  for (let i = 0; i < AVG_POT_BY_AGE.length - 1; i++) {
    const [a1, v1] = AVG_POT_BY_AGE[i];
    const [a2, v2] = AVG_POT_BY_AGE[i + 1];
    if (age >= a1 && age <= a2) {
      return Math.round(v1 + (v2 - v1) * ((age - a1) / (a2 - a1)));
    }
  }
  return 89000;
}

const SCENARIO_RATES = [
  { label: 'Conservative', rate: 5, description: 'Low-risk, bond-heavy allocation', color: '#adc6ff' },
  { label: 'Moderate',     rate: 7, description: 'Balanced equity/bond mix',        color: '#4edea3', highlighted: true },
  { label: 'Aggressive',   rate: 10, description: 'High-growth equity focus',        color: '#ffb95f' },
];

function colorToRgb(hex) {
  const MAP = {
    '#4edea3': '78,222,163',
    '#adc6ff': '173,198,255',
    '#ffb95f': '255,185,95',
    '#f472b6': '244,114,182',
    '#a78bfa': '167,139,250',
    '#38bdf8': '56,189,248',
  };
  return MAP[hex] || '173,198,255';
}

function fmtShort(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }

function projectValue(pot, ratePercent, years) {
  if (years <= 0) return pot;
  return Math.round(pot * Math.pow(1 + ratePercent / 100, years));
}

export default function PensionComparisons() {
  const [activeTab, setActiveTab] = useState(0);
  const { metrics, userProfile } = usePensionData();

  const currentAge = userProfile?.currentAge || 38;
  const yearsToRetirement = Math.max(1, (userProfile?.retirementAge || 65) - currentAge);

  const benchmarkTargets = useMemo(() => [
    { label: `Average UK pension saver (age ${currentAge})`, value: avgPotForAge(currentAge) },
    { label: 'On-track for comfortable retirement', value: 600000 },
    { label: 'On-track for moderate retirement', value: 300000 },
  ], [currentAge]);

  const scenarios = useMemo(() => {
    const totalValue = metrics.totalValue || 0;
    return SCENARIO_RATES.map(s => ({
      ...s,
      projected: fmtShort(projectValue(totalValue, s.rate, yearsToRetirement)),
    }));
  }, [metrics.totalValue, yearsToRetirement]);

  const totalValue = metrics.totalValue || 0;
  const fmtTotal = fmtShort(totalValue);

  return (
    <PensionLayout>
      <div style={{ padding: '0 0 16px' }}>

        {/* Header */}
        <div style={{ padding: '24px 20px 16px' }}>
          <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Pensions</p>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
            Comparisons
          </h1>
        </div>

        {/* Sub-tabs */}
        <div style={{ padding: '0 16px 16px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              className={`tab-btn${activeTab === i ? ' active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab: Scenarios */}
        {activeTab === 0 && (
          <div className="animate-in" style={{ padding: '0 16px' }}>
            <div className="section-card" style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0, lineHeight: 1.6 }}>
                Projected value of your <strong style={{ color: '#dae2fd' }}>{fmtTotal}</strong> pot over <strong style={{ color: '#dae2fd' }}>{yearsToRetirement} years</strong> at different return rates, with no additional contributions.
              </p>
            </div>
            {scenarios.map(s => (
              <div
                key={s.label}
                className="comparison-card"
                style={{
                  marginBottom: '12px',
                  border: s.highlighted ? '1px solid rgba(78,222,163,0.3)' : '1px solid rgba(173,198,255,0.06)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '15px', color: '#dae2fd', margin: '0 0 3px' }}>{s.label}</p>
                    <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0 }}>{s.description}</p>
                  </div>
                  <span style={{
                    background: `rgba(${colorToRgb(s.color)},0.1)`,
                    color: s.color,
                    borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 700,
                  }}>
                    {s.rate}%
                  </span>
                </div>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '24px', color: s.color, margin: 0 }}>
                  {s.projected}
                </p>
                <p style={{ fontSize: '12px', color: '#bbcabf', margin: '2px 0 0' }}>projected in {yearsToRetirement} years</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Benchmark */}
        {activeTab === 1 && (
          <div className="animate-in" style={{ padding: '0 16px' }}>
            <div className="section-card" style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#bbcabf', lineHeight: 1.6, margin: 0 }}>
                Your total pension value of <strong style={{ color: '#dae2fd' }}>{fmtTotal}</strong> compared against key benchmarks.
              </p>
            </div>
            {benchmarkTargets.map((b, i) => {
              const diff = totalValue - b.value;
              const positive = diff >= 0;
              const diffStr = (positive ? '+£' : '-£') + Math.abs(diff).toLocaleString('en-GB');
              return (
                <div key={i} className="section-card" style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '13px', color: '#bbcabf', margin: '0 0 10px', lineHeight: 1.5 }}>{b.label}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '18px', color: '#dae2fd', margin: 0 }}>
                      {fmtShort(b.value)}
                    </p>
                    <span style={{ color: positive ? '#4edea3' : '#ff6b6b', fontWeight: 700, fontSize: '14px' }}>
                      {diffStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </PensionLayout>
  );
}

