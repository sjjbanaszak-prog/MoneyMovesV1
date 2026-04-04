import React, { useMemo } from 'react';
import PensionLayout from '../PensionLayout';
import { usePensionData, parseDate, getTaxYearStart } from '../PensionDataContext';

function fmtShort(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }

function colorToRgb(hex) {
  const MAP = {
    '#4edea3': '78,222,163',
    '#adc6ff': '173,198,255',
    '#ffb95f': '255,185,95',
  };
  return MAP[hex] || '173,198,255';
}

export default function PensionAIAnalysis() {
  const { entries, metrics } = usePensionData();

  const sixMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d;
  }, []);

  // Remaining annual allowance for current FY
  const annualLimit = 60000;
  const remainingAllowance = Math.max(0, annualLimit - (metrics.currentFYTotal || 0));

  // Dynamic recommendations based on real data
  const recommendations = useMemo(() => {
    const recs = [];

    // 1. Inactive providers — suggest review/consolidation
    const inactive = entries.filter(e => {
      const lastPmt = parseDate(e.lastPayment);
      return !lastPmt || lastPmt <= sixMonthsAgo;
    });

    if (inactive.length > 0) {
      const names = inactive.map(e => e.provider).join(', ');
      const totalValue = inactive.reduce((s, e) => s + (e.currentValue || 0), 0);
      recs.push({
        icon: 'merge',
        color: '#4edea3',
        title: `Review Inactive ${inactive.length > 1 ? 'Pensions' : 'Pension'}`,
        body: `${names} (${fmtShort(totalValue)} combined) ${inactive.length > 1 ? 'have' : 'has'} received no contributions recently. Consider reviewing or consolidating ${inactive.length > 1 ? 'these pots' : 'this pot'} to reduce fees and simplify your portfolio.`,
        tag: 'Consolidation',
        tagColor: '#4edea3',
      });
    }

    // 2. Carry-forward / unused allowance
    if (remainingAllowance > 0) {
      recs.push({
        icon: 'account_balance',
        color: '#ffb95f',
        title: 'Annual Allowance Available',
        body: `You still have ${fmtShort(remainingAllowance)} of your annual pension allowance remaining this tax year. Making additional contributions before 5 April could reduce your tax liability.`,
        tag: 'Tax Efficiency',
        tagColor: '#ffb95f',
      });
    }

    // 3. Contribution growth recommendation — always useful
    const currentFYTotal = metrics.currentFYTotal || 0;
    const monthlyEquiv = Math.round(currentFYTotal / 12);
    const boostedMonthly = monthlyEquiv + 200;
    recs.push({
      icon: 'trending_up',
      color: '#adc6ff',
      title: 'Increase Monthly Contributions',
      body: `Increasing your contributions by £200/month could add an estimated £${Math.round(200 * 200).toLocaleString('en-GB')}+ to your retirement pot by age 65, depending on investment returns.`,
      tag: 'Growth',
      tagColor: '#adc6ff',
    });

    return recs.slice(0, 3);
  }, [entries, metrics, sixMonthsAgo, remainingAllowance]);

  // Health score: simple formula
  const healthScore = useMemo(() => {
    let score = 60;
    const activeCount = entries.filter(e => {
      const lastPmt = parseDate(e.lastPayment);
      return lastPmt && lastPmt > sixMonthsAgo;
    }).length;
    if (activeCount >= 1) score += 10;
    if (metrics.growthPct > 10) score += 10;
    if ((metrics.currentFYTotal || 0) > 0) score += 10;
    if (entries.length > 1) score += 5;
    return Math.min(100, score);
  }, [entries, metrics, sixMonthsAgo]);

  const healthLabel = healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good, improvable' : 'needs attention';

  return (
    <PensionLayout>
      <div style={{ padding: '0 0 16px' }}>

        {/* Header */}
        <div style={{ padding: '24px 20px 16px' }}>
          <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Pensions</p>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
            AI Analysis
          </h1>
        </div>

        {/* Hero */}
        <div className="animate-in stagger-1" style={{
          margin: '0 16px 16px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(78,222,163,0.18) 0%, #1a2744 100%)',
          border: '1px solid rgba(78,222,163,0.2)',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', right: '-20px', top: '-20px',
            width: '100px', height: '100px',
            background: 'rgba(78,222,163,0.1)', borderRadius: '50%',
            filter: 'blur(35px)', pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'rgba(78,222,163,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '14px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '26px', color: '#4edea3' }}>psychology</span>
            </div>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '22px', color: '#dae2fd', margin: '0 0 8px' }}>
              {recommendations.length} {recommendations.length === 1 ? 'Opportunity' : 'Opportunities'} Found
            </h2>
            <p style={{ fontSize: '13px', color: '#bbcabf', lineHeight: 1.6, margin: 0 }}>
              Based on your pension data, our AI has identified actionable steps that could improve your retirement outcome.
            </p>
          </div>
        </div>

        {/* Metrics Bento */}
        <div className="animate-in stagger-2" style={{ margin: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="metric-card">
            <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>
              Total Value
            </p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '20px', color: '#4edea3', margin: '0 0 2px' }}>
              {fmtShort(metrics.totalValue)}
            </p>
            <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0 }}>across all providers</p>
          </div>
          <div className="metric-card">
            <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>
              Total Growth
            </p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '20px', color: '#dae2fd', margin: '0 0 2px' }}>
              {metrics.growthPct >= 0 ? '+' : ''}{(metrics.growthPct || 0).toFixed(1)}%
            </p>
            <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0 }}>vs total deposited</p>
          </div>
          <div className="metric-card">
            <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>
              Allowance Left
            </p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '20px', color: '#ffb95f', margin: '0 0 2px' }}>
              {fmtShort(remainingAllowance)}
            </p>
            <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0 }}>this tax year</p>
          </div>
          <div className="metric-card">
            <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>
              Health Score
            </p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '20px', color: '#4edea3', margin: '0 0 2px' }}>
              {healthScore}/100
            </p>
            <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0 }}>{healthLabel}</p>
          </div>
        </div>

        {/* Recommendations */}
        <div style={{ padding: '0 16px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: '0 0 12px' }}>
            Smart Recommendations
          </h3>
          {recommendations.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px 0' }}>No recommendations at this time</p>
          ) : recommendations.map((rec, i) => (
            <div
              key={i}
              className={`animate-in stagger-${i + 3} section-card`}
              style={{ marginBottom: '12px', borderLeft: `3px solid ${rec.color}` }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                  background: `rgba(${colorToRgb(rec.color)},0.1)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: rec.color }}>{rec.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', gap: '8px' }}>
                    <p style={{ fontWeight: 700, fontSize: '14px', color: '#dae2fd', margin: 0, flex: 1 }}>{rec.title}</p>
                    <span style={{
                      background: `rgba(${colorToRgb(rec.tagColor)},0.1)`,
                      color: rec.tagColor,
                      borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: 700,
                      flexShrink: 0, whiteSpace: 'nowrap',
                    }}>
                      {rec.tag}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#bbcabf', lineHeight: 1.55, margin: 0 }}>{rec.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </PensionLayout>
  );
}
