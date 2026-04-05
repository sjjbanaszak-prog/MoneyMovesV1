import React, { useMemo } from 'react';
import PensionLayout from '../PensionLayout';
import { usePensionData, parseDate, getTaxYearStart } from '../PensionDataContext';

function fmtShort(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }

function colorToRgb(hex) {
  const MAP = {
    '#4edea3': '78,222,163',
    '#adc6ff': '173,198,255',
    '#ffb95f': '255,185,95',
    '#ff8a80': '255,138,128',
  };
  return MAP[hex] || '173,198,255';
}

const ANNUAL_ALLOWANCE = 60000;

// HMRC annual allowance by tax year start
function allowanceForYear(fyStart) {
  return fyStart >= 2023 ? 60000 : 40000;
}

export default function PensionAIAnalysis() {
  const { entries, metrics, userProfile } = usePensionData();

  const now = new Date();

  const twelveMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    return d;
  }, []);

  const sixMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d;
  }, []);

  // ── Allowance calculations ──────────────────────────────────────────────
  const remainingAllowance = Math.max(0, ANNUAL_ALLOWANCE - (metrics.currentFYTotal || 0));

  // Carry forward: remaining unused allowance from the 3 prior tax years,
  // accounting for (a) intermediate years that consumed prior carry forward,
  // and (b) the current year having already drawn down some carry forward.
  // Returns { total, expiringThisYear } where expiringThisYear is the amount
  // from the oldest year (currentFYStart - 3) that will be permanently lost on 5 April.
  const carryForwardData = useMemo(() => {
    const currentFYStart = getTaxYearStart(now);

    // Build total contributions per FY from all providers' paymentHistory
    const contribsByYear = {};
    entries.forEach(e => {
      (e.paymentHistory || []).forEach(p => {
        const d = parseDate(p.date);
        if (!d) return;
        const fy = getTaxYearStart(d);
        if (fy !== null) contribsByYear[fy] = (contribsByYear[fy] || 0) + (p.amount || 0);
      });
    });

    const priorYears = [currentFYStart - 3, currentFYStart - 2, currentFYStart - 1];

    // Step 1: unused allowance for each prior year (before any cross-year consumption)
    const unused = priorYears.map(yr =>
      Math.max(0, allowanceForYear(yr) - (contribsByYear[yr] || 0))
    );

    // Step 2: for each prior year that exceeded its own allowance, consume FIFO
    // from older prior years (HMRC rule: oldest unused allowance used first)
    for (let i = 0; i < 3; i++) {
      let excess = Math.max(0, (contribsByYear[priorYears[i]] || 0) - allowanceForYear(priorYears[i]));
      for (let j = 0; j < i && excess > 0; j++) {
        const consume = Math.min(unused[j], excess);
        unused[j] -= consume;
        excess -= consume;
      }
    }

    // Step 3: subtract what the current year has already consumed from the pool
    let currentExcess = Math.max(0, (contribsByYear[currentFYStart] || 0) - allowanceForYear(currentFYStart));
    for (let j = 0; j < 3 && currentExcess > 0; j++) {
      const consume = Math.min(unused[j], currentExcess);
      unused[j] -= consume;
      currentExcess -= consume;
    }

    return {
      total: Math.max(0, unused.reduce((sum, u) => sum + u, 0)),
      expiringThisYear: Math.max(0, unused[0]), // from currentFYStart - 3
    };
  }, [entries, now]);

  // Days remaining in the current tax year (until April 5)
  const daysUntilYearEnd = useMemo(() => {
    const currentFYStart = getTaxYearStart(now);
    const yearEnd = new Date(currentFYStart + 1, 3, 5, 23, 59, 59); // April 5 end-of-day
    return Math.max(0, Math.ceil((yearEnd - now) / (1000 * 60 * 60 * 24)));
  }, [now]);

  // ── Health Score (5 factors, 100 pts total) ─────────────────────────────
  const { healthScore, healthLabel, healthColor } = useMemo(() => {
    // Factor 1: Contribution Activity — 25 pts
    // Count distinct calendar months with a contribution in the past 12 months
    const activeMonthKeys = new Set();
    entries.forEach(e => {
      (e.paymentHistory || []).forEach(p => {
        const d = parseDate(p.date);
        if (d && d >= twelveMonthsAgo) {
          activeMonthKeys.add(`${d.getFullYear()}-${d.getMonth()}`);
        }
      });
    });
    const activeMonths = activeMonthKeys.size;
    let f1 = 0;
    if (activeMonths >= 10) f1 = 25;
    else if (activeMonths >= 7) f1 = 18;
    else if (activeMonths >= 4) f1 = 12;
    else if (activeMonths >= 1) f1 = 6;

    // Factor 2: Annual Allowance Utilisation — 20 pts
    const utilisationPct = (metrics.currentFYTotal || 0) / ANNUAL_ALLOWANCE;
    let f2 = 0;
    if (utilisationPct >= 0.75) f2 = 20;
    else if (utilisationPct >= 0.5) f2 = 15;
    else if (utilisationPct >= 0.25) f2 = 10;
    else if (utilisationPct > 0) f2 = 5;

    // Factor 3: Pot Growth Rate — 20 pts
    const growthPct = metrics.growthPct || 0;
    let f3 = 0;
    if (growthPct > 20) f3 = 20;
    else if (growthPct >= 10) f3 = 15;
    else if (growthPct >= 5) f3 = 10;
    else if (growthPct >= 0) f3 = 5;

    // Factor 4: Retirement Trajectory — 20 pts
    // Project pot at retirement using 6% compound growth + ongoing annual contributions
    const yearsToRetirement = Math.max(0, (userProfile.retirementAge || 65) - (userProfile.currentAge || 38));
    const annualContrib = metrics.currentFYTotal || 0;
    const RATE = 0.06;
    const fvPot = (metrics.totalValue || 0) * Math.pow(1 + RATE, yearsToRetirement);
    const fvContribs = yearsToRetirement > 0
      ? annualContrib * ((Math.pow(1 + RATE, yearsToRetirement) - 1) / RATE)
      : 0;
    const projectedPot = fvPot + fvContribs;
    const BENCHMARK = 746000; // PLSA Comfortable: ~£37,300/yr × 20yr retirement
    const trajectoryRatio = projectedPot / BENCHMARK;
    let f4 = 0;
    if (trajectoryRatio >= 1) f4 = 20;
    else if (trajectoryRatio >= 0.75) f4 = 15;
    else if (trajectoryRatio >= 0.5) f4 = 10;
    else if (trajectoryRatio >= 0.25) f4 = 5;

    // Factor 5: Provider Concentration Risk — 15 pts
    let f5 = 8; // neutral for single provider
    if (entries.length > 1 && (metrics.totalValue || 0) > 0) {
      const maxShare = Math.max(...entries.map(e => (e.currentValue || 0) / metrics.totalValue));
      if (maxShare <= 0.6) f5 = 15;
      else if (maxShare <= 0.8) f5 = 10;
      else f5 = 5;
    }

    const score = Math.min(100, f1 + f2 + f3 + f4 + f5);
    let label, color;
    if (score >= 85) { label = 'Excellent'; color = '#4edea3'; }
    else if (score >= 70) { label = 'Strong'; color = '#4edea3'; }
    else if (score >= 50) { label = 'Developing'; color = '#ffb95f'; }
    else if (score >= 30) { label = 'Needs Attention'; color = '#ffb95f'; }
    else { label = 'Critical'; color = '#ff8a80'; }

    return { healthScore: score, healthLabel: label, healthColor: color };
  }, [entries, metrics, userProfile, twelveMonthsAgo]);

  // ── Recommendations ─────────────────────────────────────────────────────
  const recommendations = useMemo(() => {
    const recs = [];
    const currentFYTotal = metrics.currentFYTotal || 0;
    const allowanceMaxed = currentFYTotal >= ANNUAL_ALLOWANCE;

    // 1. Inactive providers — consolidation
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

    // 2. Carry forward opportunity (only when allowance maxed AND carry forward exists)
    if (allowanceMaxed && carryForwardData.total > 0) {
      recs.push({
        icon: 'account_balance',
        color: '#ffb95f',
        title: 'Carry Forward Available',
        body: `You've used your full £60,000 allowance this year. Based on your contribution history, you have an estimated ${fmtShort(carryForwardData.total)} of unused allowance from the previous 3 tax years that can be carried forward. You may be able to contribute above the standard limit — speak to an adviser to confirm your carry forward position before acting.`,
        tag: 'Tax Efficiency',
        tagColor: '#ffb95f',
      });
    }

    // 3. Allowance remaining — deadline replaces standard rec when <31 days to year end
    if (!allowanceMaxed && remainingAllowance > 0) {
      if (daysUntilYearEnd <= 30) {
        recs.push({
          icon: 'event_busy',
          color: '#ff8a80',
          title: 'Tax Year Deadline Approaching',
          body: `You have ${fmtShort(remainingAllowance)} of allowance remaining with just ${daysUntilYearEnd} day${daysUntilYearEnd !== 1 ? 's' : ''} until 5 April. Any unused allowance cannot be carried forward to next year — a contribution now could meaningfully reduce your tax bill.`,
          tag: 'Deadline',
          tagColor: '#ff8a80',
        });
      } else {
        recs.push({
          icon: 'account_balance',
          color: '#ffb95f',
          title: 'Annual Allowance Available',
          body: `You still have ${fmtShort(remainingAllowance)} of your annual pension allowance remaining this tax year. Making additional contributions before 5 April could reduce your tax liability.`,
          tag: 'Tax Efficiency',
          tagColor: '#ffb95f',
        });
      }
    }

    // 4. Carry forward expiry warning — only when <31 days to year end
    // Shows total carry forward available and specifically calls out the oldest year's
    // amount that will be permanently lost when the tax year rolls over.
    if (daysUntilYearEnd <= 30) {
      const currentFYStart = getTaxYearStart(now);
      const expiringYear = currentFYStart - 3;
      const expiringLabel = `FY ${String(expiringYear).slice(-2)}/${String(expiringYear + 1).slice(-2)}`;
      if (carryForwardData.total > 0 || carryForwardData.expiringThisYear > 0) {
        let body = carryForwardData.total > 0
          ? `You have an estimated ${fmtShort(carryForwardData.total)} of carry forward available from your previous 3 tax years.`
          : `Your carry forward pool from previous years has been fully consumed by contributions already made.`;
        if (carryForwardData.expiringThisYear > 0) {
          body += ` ${fmtShort(carryForwardData.expiringThisYear)} from ${expiringLabel} will be permanently lost on 5 April — once the new tax year starts this allowance can no longer be used.`;
        }
        recs.push({
          icon: 'timer',
          color: '#ff8a80',
          title: 'Carry Forward Expiring Soon',
          body,
          tag: 'Deadline',
          tagColor: '#ff8a80',
        });
      }
    }

    // 5. Contribution gap — no contributions this tax year
    if (currentFYTotal === 0 && entries.length > 0) {
      recs.push({
        icon: 'warning',
        color: '#ff8a80',
        title: 'No Contributions This Year',
        body: `You haven't made any pension contributions this tax year. Even a small lump sum before 5 April qualifies for tax relief — an £800 personal contribution becomes £1,000 in your pot at the basic rate.`,
        tag: 'Action Required',
        tagColor: '#ff8a80',
      });
    }

    // 6. Multiple small pots — fee drag
    const smallPots = entries.filter(e => (e.currentValue || 0) < 5000);
    if (smallPots.length >= 3) {
      const smallTotal = smallPots.reduce((s, e) => s + (e.currentValue || 0), 0);
      recs.push({
        icon: 'savings',
        color: '#4edea3',
        title: 'Small Pots Causing Fee Drag',
        body: `You have ${smallPots.length} pots each worth less than £5,000 (${fmtShort(smallTotal)} combined). Small pots often carry fixed annual fees that erode a larger percentage of their value. Consolidating into a single low-cost SIPP could meaningfully reduce fee drag over time.`,
        tag: 'Consolidation',
        tagColor: '#4edea3',
      });
    }

    // 7. Retirement trajectory warning
    const yearsToRetirement = Math.max(0, (userProfile.retirementAge || 65) - (userProfile.currentAge || 38));
    const RATE = 0.06;
    const fvPot = (metrics.totalValue || 0) * Math.pow(1 + RATE, yearsToRetirement);
    const fvContribs = yearsToRetirement > 0
      ? currentFYTotal * ((Math.pow(1 + RATE, yearsToRetirement) - 1) / RATE)
      : 0;
    const projectedPot = fvPot + fvContribs;
    const BENCHMARK = 746000;
    if (projectedPot < BENCHMARK * 0.5 && (metrics.totalValue || 0) > 0) {
      recs.push({
        icon: 'trending_down',
        color: '#ff8a80',
        title: 'Retirement Trajectory Concern',
        body: `Based on your current pot of ${fmtShort(metrics.totalValue)} and ${yearsToRetirement} years until retirement, you're projected to reach approximately ${fmtShort(projectedPot)} — below the PLSA Comfortable retirement benchmark of ${fmtShort(BENCHMARK)}. Increasing contributions now has the greatest compound impact.`,
        tag: 'Planning',
        tagColor: '#ff8a80',
      });
    }

    // 8. Low growth alert
    if ((metrics.growthPct || 0) < 3 && (metrics.totalDeposits || 0) > 1000) {
      recs.push({
        icon: 'bar_chart',
        color: '#adc6ff',
        title: 'Low Growth — Review Fund Allocation',
        body: `Your pots have grown by less than 3% overall against contributions made. This may indicate a conservative fund allocation. If you're more than 10 years from retirement, a higher-growth fund could significantly improve your long-term outcome.`,
        tag: 'Performance',
        tagColor: '#adc6ff',
      });
    }

    // 9. Increase monthly contributions (only when well below allowance limit)
    if (currentFYTotal < 55000) {
      recs.push({
        icon: 'trending_up',
        color: '#adc6ff',
        title: 'Increase Monthly Contributions',
        body: `Increasing your contributions by £200/month could add an estimated £${Math.round(200 * 200).toLocaleString('en-GB')}+ to your retirement pot by age ${userProfile.retirementAge || 65}, depending on investment returns.`,
        tag: 'Growth',
        tagColor: '#adc6ff',
      });
    }

    return recs;
  }, [entries, metrics, userProfile, sixMonthsAgo, remainingAllowance, carryForwardData, daysUntilYearEnd, now]);

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
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '20px', color: healthColor, margin: '0 0 2px' }}>
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
              className={`animate-in stagger-${Math.min(i + 3, 8)} section-card`}
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
