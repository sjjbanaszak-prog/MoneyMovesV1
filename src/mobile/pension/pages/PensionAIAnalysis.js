import React, { useMemo, useState } from 'react';
import PensionLayout from '../PensionLayout';
import { usePensionData, parseDate, getTaxYearStart } from '../PensionDataContext';
import PremiumGate from '../../components/PremiumGate';

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

function HealthScoreInfoSheet({ open, onClose, factors, healthScore, healthColor }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: '#171f33',
        borderRadius: '24px 24px 0 0',
        padding: '0 0 40px',
        maxHeight: '85dvh',
        overflowY: 'auto',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 9999, background: 'rgba(173,198,255,0.2)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: '#bbcabf', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>How it's calculated</p>
            <h2 style={{ margin: '4px 0 0', fontFamily: 'Manrope,sans-serif', fontWeight: 900, fontSize: 22, color: '#dae2fd' }}>Health Score</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 900, fontSize: 28, color: healthColor }}>{healthScore}</span>
            <button onClick={onClose} style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: 20 }}>close</span>
            </button>
          </div>
        </div>

        <p style={{ margin: '12px 20px 20px', fontSize: 13, color: '#bbcabf', lineHeight: 1.6 }}>
          Your pension health score out of 100 is calculated from five factors covering contribution behaviour, tax efficiency, growth, retirement trajectory, and diversification.
        </p>

        {/* Factor breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 20px' }}>
          {factors.map((f, i) => (
            <div key={i} style={{ background: '#222a3d', borderRadius: 16, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#dae2fd' }}>{f.label}</p>
                <span style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 900, fontSize: 15, color: '#4edea3' }}>
                  {f.pts}<span style={{ fontSize: 11, color: '#bbcabf', fontWeight: 400 }}>/{f.max}</span>
                </span>
              </div>
              <div style={{ width: '100%', height: 6, background: '#131b2e', borderRadius: 9999, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ width: `${(f.pts / f.max) * 100}%`, height: '100%', background: '#4edea3', borderRadius: 9999, transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#bbcabf' }}>{f.detail}</p>
            </div>
          ))}
        </div>

        {/* Score bands */}
        <div style={{ margin: '20px 20px 0', background: '#222a3d', borderRadius: 16, padding: '16px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#bbcabf', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Score Bands</p>
          {[
            { range: '85 – 100', label: 'Excellent',       color: '#4edea3' },
            { range: '70 – 84',  label: 'Strong',          color: '#4edea3' },
            { range: '50 – 69',  label: 'Developing',      color: '#ffb95f' },
            { range: '30 – 49',  label: 'Needs Attention', color: '#ffb95f' },
            { range: '0 – 29',   label: 'Critical',        color: '#ff8a80' },
          ].map((b, i, arr) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(173,198,255,0.06)' : 'none' }}>
              <span style={{ fontSize: 13, color: '#bbcabf' }}>{b.range}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: b.color, background: `${b.color}18`, padding: '2px 10px', borderRadius: 9999 }}>{b.label}</span>
            </div>
          ))}
        </div>

        <p style={{ margin: '16px 20px 0', fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          Score is based on your uploaded pension data and may not reflect all accounts or recent changes.
        </p>
      </div>
    </>
  );
}

// HMRC annual allowance by tax year start
function allowanceForYear(fyStart) {
  return fyStart >= 2023 ? 60000 : 40000;
}

export default function PensionAIAnalysis() {
  const { entries, metrics, userProfile } = usePensionData();
  const [showHealthInfo, setShowHealthInfo] = useState(false);

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
  // Returns { total, expiringThisYear, genuineExcess } where genuineExcess is
  // the amount by which this year's contributions exceed the annual allowance AND
  // all available carry forward — i.e. a real HMRC annual allowance charge situation.
  const carryForwardData = useMemo(() => {
    const currentFYStart = getTaxYearStart(now);

    // Build total contributions per FY from paymentHistory.
    // Then cross-check against entry.deposits (the authoritative total per pension):
    // if deposits > sum(paymentHistory), attribute the gap to the most recent FY
    // present in that entry's history (or current FY if no history exists), so
    // contributions that weren't individually recorded are still counted.
    const contribsByYear = {};
    entries.forEach(e => {
      let historyTotal = 0;
      let mostRecentFY = null;
      (e.paymentHistory || []).forEach(p => {
        const d = parseDate(p.date);
        if (!d) return;
        const fy = getTaxYearStart(d);
        if (fy !== null) {
          contribsByYear[fy] = (contribsByYear[fy] || 0) + (p.amount || 0);
          historyTotal += p.amount || 0;
          if (mostRecentFY === null || fy > mostRecentFY) mostRecentFY = fy;
        }
      });
      // If entry.deposits exceeds what paymentHistory accounts for, the difference
      // represents contributions not in the history — attribute to the most recent
      // known FY for this entry (or current FY if no history at all).
      const depositTotal = e.deposits || 0;
      const untracked = depositTotal - historyTotal;
      if (untracked > 0.01) {
        const targetFY = mostRecentFY !== null ? mostRecentFY : currentFYStart;
        contribsByYear[targetFY] = (contribsByYear[targetFY] || 0) + untracked;
      }
    });

    // Build an unused-allowance pool going 6 years back.
    // We need 6 years because a window year (currentFYStart-1) can consume carry
    // forward from up to 3 years before it (currentFYStart-4), and those source
    // years are outside the current 3-year window but must be tracked.
    const poolStart = currentFYStart - 6;
    const unusedPool = {};
    for (let yr = poolStart; yr <= currentFYStart - 1; yr++) {
      unusedPool[yr] = Math.max(0, allowanceForYear(yr) - (contribsByYear[yr] || 0));
    }

    // For each year in the pool (oldest to newest), if it had excess contributions,
    // consume carry forward FIFO from the 3 years prior to it.
    for (let yr = poolStart + 1; yr <= currentFYStart - 1; yr++) {
      let excess = Math.max(0, (contribsByYear[yr] || 0) - allowanceForYear(yr));
      for (let src = yr - 3; src < yr && excess > 0; src++) {
        if (unusedPool[src] !== undefined) {
          const consume = Math.min(unusedPool[src], excess);
          unusedPool[src] -= consume;
          excess -= consume;
        }
      }
    }

    // Apply any current year excess — consumes from the window years FIFO
    let currentExcess = Math.max(0, (contribsByYear[currentFYStart] || 0) - allowanceForYear(currentFYStart));
    for (let src = currentFYStart - 3; src < currentFYStart && currentExcess > 0; src++) {
      if (unusedPool[src] !== undefined) {
        const consume = Math.min(unusedPool[src], currentExcess);
        unusedPool[src] -= consume;
        currentExcess -= consume;
      }
    }

    // Carry forward available for the current year = sum of the 3 window years
    const windowYears = [currentFYStart - 3, currentFYStart - 2, currentFYStart - 1];
    const total = Math.max(0, windowYears.reduce((sum, yr) => sum + (unusedPool[yr] || 0), 0));
    // expiringThisYear = oldest window year — permanently lost when the new tax year starts
    const expiringThisYear = Math.max(0, unusedPool[currentFYStart - 3] || 0);
    // genuineExcess = carry forward ran out before covering the current year's excess.
    // Whatever currentExcess remains after the FIFO loop is a real annual allowance breach.
    const genuineExcess = Math.max(0, currentExcess);

    return { total, expiringThisYear, genuineExcess };
  }, [entries, now]);

  // Days remaining in the current tax year (until April 5)
  const daysUntilYearEnd = useMemo(() => {
    const currentFYStart = getTaxYearStart(now);
    const yearEnd = new Date(currentFYStart + 1, 3, 5, 23, 59, 59); // April 5 end-of-day
    return Math.max(0, Math.ceil((yearEnd - now) / (1000 * 60 * 60 * 24)));
  }, [now]);

  // ── Health Score (5 factors, 100 pts total) ─────────────────────────────
  const { healthScore, healthLabel, healthColor, healthFactors } = useMemo(() => {
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
    const maxShare = (entries.length > 1 && (metrics.totalValue || 0) > 0)
      ? Math.max(...entries.map(e => (e.currentValue || 0) / metrics.totalValue))
      : null;
    let f5 = 8; // neutral for single provider
    if (maxShare !== null) {
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

    const factors = [
      {
        label: 'Contribution Activity', pts: f1, max: 25,
        detail: `${activeMonths} active month${activeMonths !== 1 ? 's' : ''} in the past 12`,
      },
      {
        label: 'Allowance Utilisation', pts: f2, max: 20,
        detail: `${Math.round(utilisationPct * 100)}% of £60,000 annual allowance used this tax year`,
      },
      {
        label: 'Pot Growth Rate', pts: f3, max: 20,
        detail: `${(metrics.growthPct || 0).toFixed(1)}% overall growth vs total contributions`,
      },
      {
        label: 'Retirement Trajectory', pts: f4, max: 20,
        detail: `Projected to reach ${Math.round(trajectoryRatio * 100)}% of the £746k PLSA Comfortable benchmark`,
      },
      {
        label: 'Concentration Risk', pts: f5, max: 15,
        detail: maxShare === null
          ? 'Single provider — neutral score applied'
          : `Largest provider holds ${Math.round(maxShare * 100)}% of total pension value`,
      },
    ];

    return { healthScore: score, healthLabel: label, healthColor: color, healthFactors: factors };
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

    // 2. Annual allowance breach — genuine excess beyond carry forward (urgent HMRC alert)
    if (carryForwardData.genuineExcess > 0) {
      recs.push({
        icon: 'gpp_bad',
        color: '#ff8a80',
        title: 'Annual Allowance Exceeded',
        body: `Your pension contributions this year exceed your annual allowance and all available carry forward by an estimated ${fmtShort(carryForwardData.genuineExcess)}. HMRC requires this to be reported via Self Assessment. An annual allowance charge is likely due — contact a tax specialist urgently to assess the liability and notify HMRC before your tax return deadline.`,
        tag: 'Tax Alert',
        tagColor: '#ff8a80',
      });
    }

    // 4. Carry forward opportunity (only when allowance maxed AND carry forward exists, no genuine breach)
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
          body: `You have ${fmtShort(remainingAllowance)} of allowance remaining with just ${daysUntilYearEnd} day${daysUntilYearEnd !== 1 ? 's' : ''} until 5 April. A contribution now could reduce your tax bill. Any unused current year allowance can be carried forward for up to 3 future tax years.`,
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

    // 4. Carry forward expiry warning — shown when <31 days to year end AND no genuine breach
    // (if allowance exceeded, that rec already covers urgency — expiry info is redundant)
    if (daysUntilYearEnd <= 30 && carryForwardData.genuineExcess === 0) {
      const currentFYStart = getTaxYearStart(now);
      const expiringYear = currentFYStart - 3;
      const expiringLabel = `FY ${String(expiringYear).slice(-2)}/${String(expiringYear + 1).slice(-2)}`;
      let body;
      if (carryForwardData.total > 0) {
        body = `You have an estimated ${fmtShort(carryForwardData.total)} of carry forward available from the previous 3 tax years.`;
        if (carryForwardData.expiringThisYear > 0) {
          body += ` Of this, ${fmtShort(carryForwardData.expiringThisYear)} from ${expiringLabel} will be permanently lost on 5 April — once the new tax year starts, only the most recent 3 years can be used.`;
        } else {
          body += ` Your ${expiringLabel} carry forward has already been fully used — the remaining balance comes from more recent years and is not at risk.`;
        }
      } else {
        body = `Your carry forward from all 3 prior tax years has been fully consumed. Your current year's unused allowance of ${fmtShort(remainingAllowance)} will itself become carry forward available from next year.`;
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

    // 9. Increase monthly contributions — only shown when the extrapolated annual
    // contribution pace is materially below the allowance limit. Requires >= 1.5
    // months elapsed in the tax year so early lump sums don't skew the extrapolation.
    // Falls back to currentFYTotal directly if too early to extrapolate reliably.
    const taxYearStart = new Date(getTaxYearStart(now), 3, 6);
    const monthsElapsed = (now - taxYearStart) / (1000 * 60 * 60 * 24 * 30.4375);
    const annualisedRate = monthsElapsed >= 1.5
      ? (currentFYTotal / monthsElapsed) * 12
      : currentFYTotal;
    if (currentFYTotal > 0 && remainingAllowance > 5000 && annualisedRate < ANNUAL_ALLOWANCE) {
      const monthlyRate = RATE / 12;
      const totalMonths = yearsToRetirement * 12;
      const projectedIncrease = totalMonths > 0
        ? Math.round(200 * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate))
        : 0;
      recs.push({
        icon: 'trending_up',
        color: '#adc6ff',
        title: 'Increase Monthly Contributions',
        body: `Increasing your contributions by £200/month could add an estimated ${fmtShort(projectedIncrease)} to your retirement pot by age ${userProfile.retirementAge || 65}, assuming 6% annual growth.`,
        tag: 'Growth',
        tagColor: '#adc6ff',
      });
    }

    return recs;
  }, [entries, metrics, userProfile, sixMonthsAgo, remainingAllowance, carryForwardData, daysUntilYearEnd, now]);

  return (
    <PensionLayout>
      <PremiumGate
        featureName="Pension AI Analysis"
        description="AI-powered recommendations tailored to your pension data and retirement goals."
      >
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
          borderRadius: '16px',
          borderTop: '4px solid rgba(78,222,163,0.6)',
          background: 'linear-gradient(135deg, rgba(78,222,163,0.18) 0%, #1a2744 100%)',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', bottom: '-8px', right: '-8px', opacity: 0.1, pointerEvents: 'none', lineHeight: 1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '140px', color: '#ffffff' }}>psychology</span>
          </div>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', background: 'rgba(78,222,163,0.05)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
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
              {metrics.growthPct >= 0 ? '+' : ''}{(metrics.growthPct || 0).toFixed(2)}%
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
          <div className="metric-card" style={{ position: 'relative' }}>
            <button
              onClick={() => setShowHealthInfo(true)}
              style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: 16 }}>info</span>
            </button>
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
      </PremiumGate>

      <HealthScoreInfoSheet
        open={showHealthInfo}
        onClose={() => setShowHealthInfo(false)}
        factors={healthFactors}
        healthScore={healthScore}
        healthColor={healthColor}
      />
    </PensionLayout>
  );
}
