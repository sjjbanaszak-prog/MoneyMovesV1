import React, { useMemo, useState } from 'react';
import MortgageLayout from '../MortgageLayout';
import { useMortgageData } from '../MortgageDataContext';
import PremiumGate from '../../components/PremiumGate';

function fmtShort(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }
function fmtPct(n, dp = 1) { return `${(n || 0).toFixed(dp)}%`; }

function colorToRgb(hex) {
  const MAP = {
    '#4edea3': '78,222,163',
    '#adc6ff': '173,198,255',
    '#ffb95f': '255,185,95',
    '#ff8a80': '255,138,128',
  };
  return MAP[hex] || '173,198,255';
}

function parseISO(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function monthsDiff(d1, d2) {
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

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
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 9999, background: 'rgba(173,198,255,0.2)' }} />
        </div>
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
          Your mortgage health score out of 100 is calculated from five factors covering LTV position, payment consistency, rate security, capital progress, and property appreciation.
        </p>
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
          Score is based on your recorded mortgage data and may not reflect all accounts or recent changes.
        </p>
      </div>
    </>
  );
}

export default function MortgageAIAnalysis() {
  const { mortgages } = useMortgageData();
  const now = new Date();
  const [showHealthInfo, setShowHealthInfo] = useState(false);

  // ── Aggregate metrics ──────────────────────────────────────────────────────
  const aggregates = useMemo(() => {
    if (!mortgages.length) return {
      totalEquity: 0, totalBalance: 0, totalPropertyValue: 0,
      totalPurchasePrice: 0, totalOriginalMortgage: 0,
      blendedLTV: 0, totalMonthly: 0,
    };
    const totalBalance          = mortgages.reduce((s, m) => s + (m.outstandingBalance || 0), 0);
    const totalPropertyValue    = mortgages.reduce((s, m) => s + (m.propertyValue || 0), 0);
    const totalPurchasePrice    = mortgages.reduce((s, m) => s + (m.purchasePrice || 0), 0);
    const totalOriginalMortgage = mortgages.reduce((s, m) => s + (m.mortgageAmount || 0), 0);
    const totalEquity           = totalPropertyValue - totalBalance;
    const blendedLTV            = totalPropertyValue > 0 ? (totalBalance / totalPropertyValue) * 100 : 0;
    const totalMonthly          = mortgages.reduce((s, m) => s + (m.monthlyPayment || 0), 0);
    return { totalEquity, totalBalance, totalPropertyValue, totalPurchasePrice, totalOriginalMortgage, blendedLTV, totalMonthly };
  }, [mortgages]);

  // ── Fixed-rate expiry data per mortgage ────────────────────────────────────
  const rateExpiries = useMemo(() => {
    return mortgages.map((m, idx) => {
      const start = parseISO(m.fixedRateStartDate);
      if (!start) return { idx, name: m.name, lender: m.lender, monthsRemaining: null };
      const expiryDate = new Date(start);
      expiryDate.setFullYear(expiryDate.getFullYear() + (m.fixedTermYears || 0));
      const monthsRemaining = monthsDiff(now, expiryDate);
      return {
        idx,
        name: m.name,
        lender: m.lender,
        monthsRemaining,
        expiryDate,
        currentRate: m.interestRate,
        defaultRate: m.defaultRate,
        outstandingBalance: m.outstandingBalance,
      };
    });
  }, [mortgages, now]);

  // ── Health Score (5 factors, 100 pts) ──────────────────────────────────────
  const { healthScore, healthLabel, healthColor, healthFactors } = useMemo(() => {
    if (!mortgages.length) return { healthScore: 0, healthLabel: 'No Data', healthColor: '#64748b', healthFactors: [] };

    // F1: LTV Position — 25 pts
    const ltv = aggregates.blendedLTV;
    let f1 = 0;
    if (ltv < 60)      f1 = 25;
    else if (ltv < 70) f1 = 20;
    else if (ltv < 75) f1 = 15;
    else if (ltv < 80) f1 = 10;
    else if (ltv < 90) f1 = 5;

    // F2: Payment Consistency — distinct months with payments in last 12 months — 20 pts
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const activeMonthKeys = new Set();
    mortgages.forEach(m => {
      (m.paymentHistory || []).forEach(p => {
        const d = parseISO(p.date);
        if (d && d >= twelveMonthsAgo) activeMonthKeys.add(`${d.getFullYear()}-${d.getMonth()}`);
      });
    });
    const activeMonths = activeMonthKeys.size;
    let f2 = 0;
    if (activeMonths >= 10)     f2 = 20;
    else if (activeMonths >= 7) f2 = 15;
    else if (activeMonths >= 4) f2 = 8;
    else if (activeMonths >= 1) f2 = 4;

    // F3: Rate Security — minimum months remaining on any fixed rate — 20 pts
    const validExpiries = rateExpiries.filter(r => r.monthsRemaining !== null);
    const minMonths = validExpiries.length
      ? validExpiries.reduce((min, r) => Math.min(min, r.monthsRemaining), Infinity)
      : null;
    let f3 = 10; // neutral if no date data
    if (minMonths !== null) {
      if (minMonths > 24)      f3 = 20;
      else if (minMonths > 12) f3 = 15;
      else if (minMonths > 6)  f3 = 8;
      else if (minMonths > 0)  f3 = 3;
      else                     f3 = 0; // on SVR
    }

    // F4: Capital Progress — 20 pts
    const { totalOriginalMortgage, totalBalance } = aggregates;
    const capitalPaid = totalOriginalMortgage - totalBalance;
    const capitalPct = totalOriginalMortgage > 0 ? (capitalPaid / totalOriginalMortgage) * 100 : 0;
    let f4 = 0;
    if (capitalPct > 35)      f4 = 20;
    else if (capitalPct > 20) f4 = 15;
    else if (capitalPct > 10) f4 = 10;
    else if (capitalPct > 5)  f4 = 5;
    else                      f4 = 2;

    // F5: Property Appreciation — 15 pts
    const { totalPropertyValue, totalPurchasePrice } = aggregates;
    const appreciationPct = totalPurchasePrice > 0
      ? ((totalPropertyValue - totalPurchasePrice) / totalPurchasePrice) * 100 : 0;
    let f5 = 0;
    if (appreciationPct > 20)      f5 = 15;
    else if (appreciationPct > 10) f5 = 10;
    else if (appreciationPct > 5)  f5 = 6;
    else if (appreciationPct > 0)  f5 = 3;

    const score = Math.min(100, f1 + f2 + f3 + f4 + f5);
    let label, color;
    if (score >= 85)      { label = 'Excellent';       color = '#4edea3'; }
    else if (score >= 70) { label = 'Strong';          color = '#4edea3'; }
    else if (score >= 50) { label = 'Developing';      color = '#ffb95f'; }
    else if (score >= 30) { label = 'Needs Attention'; color = '#ffb95f'; }
    else                  { label = 'Critical';        color = '#ff8a80'; }

    const appPct = totalPurchasePrice > 0 ? ((totalPropertyValue - totalPurchasePrice) / totalPurchasePrice) * 100 : 0;
    const factors = [
      { label: 'LTV Position',          pts: f1, max: 25, detail: `Blended LTV is ${ltv.toFixed(1)}%. Lower LTV means more equity and access to better remortgage rates.` },
      { label: 'Payment Consistency',   pts: f2, max: 20, detail: `${activeMonths} month${activeMonths !== 1 ? 's' : ''} with recorded payments in the last 12 months. Regular payments build a strong credit profile.` },
      { label: 'Rate Security',         pts: f3, max: 20, detail: minMonths === null ? 'No fixed-rate expiry date recorded — add a start date and term to track rate security.' : minMonths <= 0 ? 'At least one mortgage has moved to the standard variable rate (SVR).' : `Shortest fixed-rate period has ${minMonths} months remaining. Longer security scores higher.` },
      { label: 'Capital Progress',      pts: f4, max: 20, detail: `${capitalPct.toFixed(1)}% of the original mortgage balance has been repaid. Greater capital reduction reduces interest exposure.` },
      { label: 'Property Appreciation', pts: f5, max: 15, detail: `Property value has ${appPct >= 0 ? 'grown' : 'fallen'} by ${Math.abs(appPct).toFixed(1)}% since purchase. Appreciation builds equity and improves your LTV over time.` },
    ];

    return { healthScore: score, healthLabel: label, healthColor: color, healthFactors: factors };
  }, [mortgages, aggregates, rateExpiries]);

  // ── Recommendations ────────────────────────────────────────────────────────
  const recommendations = useMemo(() => {
    const recs = [];
    if (!mortgages.length) return recs;

    const { totalPropertyValue, totalBalance, totalOriginalMortgage, blendedLTV } = aggregates;

    // 1. Imminent fixed rate expiry (≤ 3 months)
    const imminent = rateExpiries.filter(r => r.monthsRemaining !== null && r.monthsRemaining >= 0 && r.monthsRemaining <= 3);
    imminent.forEach(r => {
      const svrIncrease = (r.defaultRate != null && r.currentRate != null)
        ? ((r.defaultRate - r.currentRate) / 100) * (r.outstandingBalance || 0) / 12
        : null;
      recs.push({
        icon: 'alarm',
        color: '#ff8a80',
        title: `Rate Expiry Imminent — ${r.name}`,
        body: `Your fixed rate of ${r.currentRate}% with ${r.lender} expires in ${Math.max(0, r.monthsRemaining)} month${r.monthsRemaining !== 1 ? 's' : ''}. Without action, the rate reverts to the SVR of ${r.defaultRate}%${svrIncrease ? `, adding approximately ${fmtShort(svrIncrease)}/month to your payments` : ''}. Contact a mortgage broker now — most lenders allow you to lock in a new deal up to 6 months in advance.`,
        tag: 'Urgent',
        tagColor: '#ff8a80',
      });
    });

    // 2. Rate expiring in 3–6 months
    const approaching = rateExpiries.filter(r => r.monthsRemaining !== null && r.monthsRemaining > 3 && r.monthsRemaining <= 6);
    approaching.forEach(r => {
      recs.push({
        icon: 'schedule',
        color: '#ffb95f',
        title: `Remortgage Window — ${r.name}`,
        body: `Your fixed rate of ${r.currentRate}% with ${r.lender} expires in ${r.monthsRemaining} months. You're now within the 6-month window where lenders will let you secure a new rate without penalty. Starting your remortgage search now gives you the widest choice of competitive deals.`,
        tag: 'Plan Ahead',
        tagColor: '#ffb95f',
      });
    });

    // 3. Mortgages that appear to be on SVR (past fixed term end)
    const onSVR = rateExpiries.filter(r => r.monthsRemaining !== null && r.monthsRemaining < 0);
    onSVR.forEach(r => {
      const svrIncrease = (r.defaultRate != null && r.currentRate != null)
        ? ((r.defaultRate - r.currentRate) / 100) * (r.outstandingBalance || 0) / 12
        : null;
      if (svrIncrease != null && svrIncrease > 30) {
        recs.push({
          icon: 'money_off',
          color: '#ff8a80',
          title: `Potentially on SVR — ${r.name}`,
          body: `The fixed rate period for this mortgage appears to have ended. If you've reverted to the SVR of ${r.defaultRate}%, you may be paying an estimated ${fmtShort(svrIncrease)} more per month than on a competitive fixed deal. Remortgaging now could lock in significant savings.`,
          tag: 'Overpaying',
          tagColor: '#ff8a80',
        });
      }
    });

    // 4. LTV threshold opportunity — within 5% of a key band
    const LTV_THRESHOLDS = [60, 75, 80];
    LTV_THRESHOLDS.forEach(threshold => {
      if (blendedLTV > threshold && blendedLTV <= threshold + 5) {
        const balanceAtThreshold = (threshold / 100) * totalPropertyValue;
        const overpaymentNeeded = totalBalance - balanceAtThreshold;
        if (overpaymentNeeded > 0 && overpaymentNeeded < 30000) {
          recs.push({
            icon: 'moving',
            color: '#4edea3',
            title: `${threshold}% LTV Band Within Reach`,
            body: `Your blended LTV is ${fmtPct(blendedLTV)} — just ${fmtShort(overpaymentNeeded)} above the ${threshold}% LTV threshold. Crossing this band unlocks better remortgage rates. An overpayment of this amount at your next renewal could meaningfully reduce your long-term interest cost.`,
            tag: 'Rate Opportunity',
            tagColor: '#4edea3',
          });
        }
      }
    });

    // 5. High LTV warning (> 80%, no imminent expiry already flagged)
    if (blendedLTV > 80 && !imminent.length) {
      recs.push({
        icon: 'warning',
        color: '#ff8a80',
        title: 'High LTV — Limited Remortgage Options',
        body: `Your blended LTV of ${fmtPct(blendedLTV)} means you're likely paying a premium rate. The most competitive fixed deals are typically reserved for borrowers below 75–80% LTV. Building equity — through overpayments or continued property appreciation — will open up better options at remortgage.`,
        tag: 'Review',
        tagColor: '#ff8a80',
      });
    }

    // 6. Strong equity position (LTV < 65%)
    if (blendedLTV > 0 && blendedLTV < 65 && !imminent.length) {
      const annualSavings = totalBalance * 0.005; // ~0.5% rate improvement estimate
      recs.push({
        icon: 'verified',
        color: '#4edea3',
        title: 'Strong Equity — Best Rates Available',
        body: `At ${fmtPct(blendedLTV)} LTV you qualify for the most competitive rates on the market. Ensure you're capturing this at your next remortgage — even a 0.5% rate reduction on ${fmtShort(totalBalance)} could save approximately ${fmtShort(annualSavings / 12)}/month (${fmtShort(annualSavings)}/year).`,
        tag: 'Advantage',
        tagColor: '#4edea3',
      });
    }

    // 7. Capital repayment milestone
    const capitalPaid = (totalOriginalMortgage || 0) - (totalBalance || 0);
    const capitalPct = totalOriginalMortgage > 0 ? (capitalPaid / totalOriginalMortgage) * 100 : 0;
    [25, 50, 75].forEach(milestone => {
      if (capitalPct >= milestone && capitalPct < milestone + 10) {
        recs.push({
          icon: 'emoji_events',
          color: '#4edea3',
          title: `${milestone}% Capital Repaid`,
          body: `You've repaid over ${milestone}% of your original mortgage principal — ${fmtShort(capitalPaid)} of ${fmtShort(totalOriginalMortgage)}. This reflects a ${capitalPct > 40 ? 'strong' : 'solid'} equity position and gives you greater leverage when negotiating your next deal.`,
          tag: 'Milestone',
          tagColor: '#4edea3',
        });
      }
    });

    // 8. Property appreciation opportunity
    const { totalPurchasePrice } = aggregates;
    const appreciationPct = totalPurchasePrice > 0
      ? ((totalPropertyValue - totalPurchasePrice) / totalPurchasePrice) * 100 : 0;
    if (appreciationPct > 15) {
      const gainValue = totalPropertyValue - totalPurchasePrice;
      recs.push({
        icon: 'home',
        color: '#adc6ff',
        title: 'Property Value Growth',
        body: `Your portfolio has appreciated by ${fmtPct(appreciationPct)} (${fmtShort(gainValue)}) since purchase. This growth has improved your LTV position independently of capital repayments. Consider requesting an updated property valuation at your next remortgage to take full advantage.`,
        tag: 'Equity Growth',
        tagColor: '#adc6ff',
      });
    }

    // 9. Overpayment suggestion (not near imminent expiry, LTV manageable)
    if (!imminent.length && blendedLTV < 80 && blendedLTV > 0) {
      recs.push({
        icon: 'payments',
        color: '#adc6ff',
        title: 'Consider Monthly Overpayments',
        body: `Most UK mortgages allow overpayments of up to 10% of the outstanding balance per year, penalty-free. Even an extra £200/month reduces your interest bill and shortens your term. Use the Calculator tab to model the exact impact on your mortgage.`,
        tag: 'Optimise',
        tagColor: '#adc6ff',
      });
    }

    return recs;
  }, [mortgages, aggregates, rateExpiries]);

  return (
    <MortgageLayout>
      <PremiumGate
        featureName="Mortgage AI Analysis"
        description="AI-powered analysis of your mortgage strategy with personalised recommendations."
      >
      <div style={{ padding: '0 0 16px' }}>

        {/* Header */}
        <div style={{ padding: '24px 20px 16px' }}>
          <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Mortgages</p>
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
              Based on your mortgage data, our AI has identified actionable steps that could reduce your interest costs and improve your position at remortgage.
            </p>
          </div>
        </div>

        {/* Metrics Bento */}
        <div className="animate-in stagger-2" style={{ margin: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="metric-card">
            <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>
              Total Equity
            </p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '20px', color: '#4edea3', margin: '0 0 2px' }}>
              {fmtShort(aggregates.totalEquity)}
            </p>
            <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0 }}>across all properties</p>
          </div>
          <div className="metric-card">
            <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>
              Blended LTV
            </p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '20px', color: '#dae2fd', margin: '0 0 2px' }}>
              {fmtPct(aggregates.blendedLTV)}
            </p>
            <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0 }}>loan-to-value ratio</p>
          </div>
          <div className="metric-card">
            <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>
              Monthly Payments
            </p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '20px', color: '#ffb95f', margin: '0 0 2px' }}>
              {fmtShort(aggregates.totalMonthly)}
            </p>
            <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0 }}>total per month</p>
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
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px 0' }}>
              {mortgages.length === 0 ? 'Add a mortgage to see your analysis.' : 'No recommendations at this time.'}
            </p>
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
    </MortgageLayout>
  );
}
