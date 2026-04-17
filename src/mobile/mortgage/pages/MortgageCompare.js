import React, { useState } from 'react';
import MortgageLayout from '../MortgageLayout';
import { useMortgageData } from '../MortgageDataContext';
import { calculateMonthlyPayment } from '../../../modules/utils/mortgageUtils';
import PremiumGate from '../../components/PremiumGate';

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcFixedExpiry(m) {
  if (m.fixedRateEndDate) return new Date(m.fixedRateEndDate);
  if (m.fixedRateStartDate && m.fixedTermYears) {
    const d = new Date(m.fixedRateStartDate);
    d.setFullYear(d.getFullYear() + m.fixedTermYears);
    return d;
  }
  return null;
}

function monthsUntil(date) {
  if (!date) return null;
  const now = new Date();
  const diff = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
  return Math.max(0, diff);
}

function fmtMonth(date) {
  if (!date) return '–';
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function fmtGBP(n) {
  return '£' + Math.round(n).toLocaleString('en-GB');
}

// ── Readiness Score Calculation ───────────────────────────────────────────────

function calcReadinessScore(m, monthsLeft, marketRate) {
  if (!m) return { score: 0, badge: 'No Data', badgeColor: '#bbcabf', factors: [] };

  // Factor 1: Fixed term timing (40 pts)
  let timingPts = 0;
  let timingLabel = '–';
  if (monthsLeft === null) {
    timingPts = 20; timingLabel = 'On variable rate';
  } else if (monthsLeft > 18) {
    timingPts = 5;  timingLabel = `${monthsLeft} months remaining`;
  } else if (monthsLeft > 12) {
    timingPts = 15; timingLabel = `${monthsLeft} months remaining`;
  } else if (monthsLeft > 6) {
    timingPts = 30; timingLabel = `${monthsLeft} months remaining`;
  } else if (monthsLeft > 3) {
    timingPts = 40; timingLabel = `${monthsLeft} months remaining`;
  } else if (monthsLeft > 0) {
    timingPts = 35; timingLabel = `${monthsLeft} months remaining`;
  } else {
    timingPts = 20; timingLabel = 'Fixed term expired';
  }

  // Factor 2: LTV (25 pts)
  const ltv = m.propertyValue > 0
    ? (m.outstandingBalance / m.propertyValue) * 100
    : null;
  let ltvPts = 0;
  let ltvLabel = '–';
  if (ltv !== null) {
    ltvLabel = `${ltv.toFixed(1)}% LTV`;
    if (ltv < 60)       { ltvPts = 25; }
    else if (ltv < 70)  { ltvPts = 20; }
    else if (ltv < 75)  { ltvPts = 15; }
    else if (ltv < 85)  { ltvPts = 8;  }
    else                { ltvPts = 3;  }
  }

  // Factor 3: Rate differential — SVR vs market rate (20 pts)
  const svrRate = parseFloat(m.defaultRate || 0);
  const diff = svrRate > 0 ? svrRate - marketRate : 0;
  let diffPts = 0;
  let diffLabel = '–';
  if (svrRate > 0) {
    diffLabel = `${diff.toFixed(2)}% gap (${svrRate}% SVR vs ${marketRate}% market)`;
    if (diff > 3)       { diffPts = 20; }
    else if (diff > 2)  { diffPts = 15; }
    else if (diff > 1)  { diffPts = 10; }
    else if (diff > 0.5){ diffPts = 5;  }
    else                { diffPts = 0;  }
  }

  // Factor 4: Equity percentage (15 pts)
  const equity = m.propertyValue > 0
    ? ((m.propertyValue - m.outstandingBalance) / m.propertyValue) * 100
    : null;
  let equityPts = 0;
  let equityLabel = '–';
  if (equity !== null) {
    equityLabel = `${equity.toFixed(1)}% equity`;
    if (equity > 50)      { equityPts = 15; }
    else if (equity > 35) { equityPts = 12; }
    else if (equity > 25) { equityPts = 9;  }
    else if (equity > 15) { equityPts = 6;  }
    else                  { equityPts = 3;  }
  }

  const score = timingPts + ltvPts + diffPts + equityPts;

  let badge, badgeColor;
  if (score >= 75)      { badge = 'Prime Window';    badgeColor = '#4edea3'; }
  else if (score >= 55) { badge = 'Good Timing';     badgeColor = '#4edea3'; }
  else if (score >= 35) { badge = 'Start Planning';  badgeColor = '#ffb95f'; }
  else                  { badge = 'Too Early';        badgeColor = '#adc6ff'; }

  const factors = [
    { label: 'Fixed Term Timing', pts: timingPts, max: 40, detail: timingLabel },
    { label: 'Loan-to-Value',     pts: ltvPts,    max: 25, detail: ltvLabel    },
    { label: 'Rate Differential', pts: diffPts,   max: 20, detail: diffLabel   },
    { label: 'Equity Built',      pts: equityPts, max: 15, detail: equityLabel },
  ];

  return { score, badge, badgeColor, factors };
}

// ── Readiness Info Modal ──────────────────────────────────────────────────────

function ReadinessInfoModal({ factors, score, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: '#171f33', borderRadius: '24px 24px 0 0',
        padding: '0 0 40px',
        maxHeight: '85dvh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 9999, background: 'rgba(173,198,255,0.2)' }} />
        </div>

        <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: '#bbcabf', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>How it's calculated</p>
            <h2 style={{ margin: '4px 0 0', fontFamily: 'Manrope,sans-serif', fontWeight: 900, fontSize: 22, color: '#dae2fd' }}>Readiness Score</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: 20 }}>close</span>
          </button>
        </div>

        <p style={{ margin: '12px 20px 20px', fontSize: 13, color: '#bbcabf', lineHeight: 1.6 }}>
          Your score out of 100 is calculated from four factors based on your mortgage data. A higher score means market conditions and your financial position are more favourable for remortgaging now.
        </p>

        {/* Factor breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 20px' }}>
          {factors.map((f, i) => {
            const pct = (f.pts / f.max) * 100;
            return (
              <div key={i} style={{ background: '#222a3d', borderRadius: 16, padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#dae2fd' }}>{f.label}</p>
                  <span style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 900, fontSize: 15, color: '#4edea3' }}>
                    {f.pts}<span style={{ fontSize: 11, color: '#bbcabf', fontWeight: 400 }}>/{f.max}</span>
                  </span>
                </div>
                <div style={{ width: '100%', height: 6, background: '#131b2e', borderRadius: 9999, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#4edea3', borderRadius: 9999, transition: 'width 0.4s ease' }} />
                </div>
                <p style={{ margin: 0, fontSize: 11, color: '#bbcabf' }}>{f.detail}</p>
              </div>
            );
          })}
        </div>

        {/* Score bands */}
        <div style={{ margin: '20px 20px 0', background: '#222a3d', borderRadius: 16, padding: '16px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#bbcabf', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Score Bands</p>
          {[
            { range: '75 – 100', label: 'Prime Window',   color: '#4edea3' },
            { range: '55 – 74',  label: 'Good Timing',    color: '#4edea3' },
            { range: '35 – 54',  label: 'Start Planning', color: '#ffb95f' },
            { range: '0 – 34',   label: 'Too Early',      color: '#adc6ff' },
          ].map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 3 ? '1px solid rgba(173,198,255,0.06)' : 'none' }}>
              <span style={{ fontSize: 13, color: '#bbcabf' }}>{b.range}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: b.color, background: `${b.color}18`, padding: '2px 10px', borderRadius: 9999 }}>{b.label}</span>
            </div>
          ))}
        </div>

        <p style={{ margin: '16px 20px 0', fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          Note: This score is indicative only and does not account for personal credit history, income, or lender-specific criteria.
        </p>
      </div>
    </>
  );
}

// ── Readiness Score Dial ──────────────────────────────────────────────────────

function ReadinessDial({ score, badge, badgeColor, expiryLabel, onInfoClick }) {
  const r = 80;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  const dialColor = badgeColor === '#ffb95f' ? '#ffb95f' : badgeColor === '#adc6ff' ? '#adc6ff' : '#4edea3';
  const glowColor = dialColor === '#4edea3' ? 'rgba(78,222,163,0.5)' : dialColor === '#ffb95f' ? 'rgba(255,185,95,0.4)' : 'rgba(173,198,255,0.4)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Info button top-right */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          onClick={onInfoClick}
          style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: 18 }}>info</span>
        </button>
      </div>

      <div style={{ position: 'relative', width: 192, height: 192 }}>
        <svg width="192" height="192" viewBox="0 0 192 192">
          <circle cx="96" cy="96" r={r} fill="transparent" stroke="rgba(173,198,255,0.12)" strokeWidth="12" />
          <circle
            cx="96" cy="96" r={r} fill="transparent"
            stroke={dialColor} strokeWidth="12"
            strokeDasharray={`${filled} ${circumference - filled}`}
            strokeDashoffset={circumference / 4}
            style={{ filter: `drop-shadow(0 0 8px ${glowColor})`, transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 36, fontFamily: 'Manrope,sans-serif', fontWeight: 900, color: '#dae2fd' }}>{score}</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbcabf' }}>Readiness</span>
        </div>
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: `${badgeColor}18`, padding: '4px 12px',
          borderRadius: 9999, color: badgeColor,
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>bolt</span>
          {badge}
        </div>
        <p style={{ marginTop: 8, fontSize: 13, color: '#bbcabf', fontWeight: 500 }}>
          Fixed term expires {expiryLabel}
        </p>
      </div>
    </div>
  );
}

// ── Progress Bar Row ──────────────────────────────────────────────────────────

function BarRow({ label, monthlyValue, lifetimeValue, tab, maxValue, color, barBg, tag }) {
  const width = maxValue > 0 ? Math.max(8, (monthlyValue / maxValue) * 100) : 0;
  const displayValue = tab === 'monthly' ? `${fmtGBP(monthlyValue)} /mo` : fmtGBP(lifetimeValue);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{displayValue}</span>
      </div>
      <div style={{ width: '100%', height: 12, background: '#131b2e', borderRadius: 9999, overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', background: barBg, borderRadius: 9999,
          boxShadow: color === '#4edea3' ? '0 0 12px rgba(78,222,163,0.4)' : undefined }} />
      </div>
      {tag && (
        <div style={{ marginTop: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4edea3', background: 'rgba(78,222,163,0.1)', padding: '2px 8px', borderRadius: 6 }}>
            {tag}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const MARKET_RATE_2YR = 3.85;

export default function MortgageCompare() {
  const { mortgages } = useMortgageData();
  const [tab, setTab]           = useState('monthly');
  const [ercOn, setErcOn]       = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const m = mortgages[0] || null;

  const fixedExpiry      = m ? calcFixedExpiry(m) : null;
  const expiryLabel      = fmtMonth(fixedExpiry);
  const monthsLeft       = monthsUntil(fixedExpiry);
  const monthsLeftLabel  = monthsLeft === null ? '–' : monthsLeft === 1 ? '1 month' : `${monthsLeft} months`;

  const { score, badge, badgeColor, factors } = calcReadinessScore(m, monthsLeft, MARKET_RATE_2YR);

  const currentRate    = m ? `${parseFloat(m.interestRate).toFixed(2)}%` : '–';
  const balance        = m ? (m.outstandingBalance || 0) : 0;
  const svrRate        = m ? parseFloat(m.defaultRate || 0) : 0;
  const originalLoan   = m ? (m.mortgageAmount || balance) : 0;
  const fullTermMonths = m ? (m.termYears || 0) * 12 : 0;

  const fixedMonthly  = m ? Math.round(m.monthlyPayment || 0) : 0;
  const varMonthly    = m && svrRate && fullTermMonths
    ? Math.round(calculateMonthlyPayment(originalLoan, svrRate, fullTermMonths)) : 0;
  const marketMonthly = m && fullTermMonths
    ? Math.round(calculateMonthlyPayment(originalLoan, MARKET_RATE_2YR, fullTermMonths)) : 0;

  const maxMonthly   = Math.max(fixedMonthly, varMonthly, marketMonthly, 1);
  const MONTHS_60    = 60;
  const fixedTotal   = fixedMonthly  * MONTHS_60;
  const varTotal     = varMonthly    * MONTHS_60;
  const marketTotal  = marketMonthly * MONTHS_60;
  const savingVsFixed = fixedMonthly - marketMonthly;
  const savingVsVar   = varMonthly   - marketMonthly;
  const saving5yr     = savingVsVar  * MONTHS_60;

  const s = {
    page:         { minHeight: '100dvh', background: '#0b1326', color: '#dae2fd', fontFamily: 'Inter,sans-serif' },
    card:         { background: '#171f33', borderRadius: 24, padding: '20px' },
    cardHigh:     { background: '#222a3d', borderRadius: 24, padding: '24px 20px' },
    sectionTitle: { fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 22, color: '#dae2fd', margin: 0 },
    label:        { fontSize: 11, color: '#bbcabf', margin: 0 },
    mono:         { fontFamily: 'Manrope,sans-serif', fontWeight: 900 },
  };

  return (
    <MortgageLayout>
      <PremiumGate
        featureName="Mortgage Compare"
        description="Compare mortgage deals and model different rates to find your best remortgage strategy."
      >
      <div style={s.page}>

        {/* ── Info Modal ───────────────────────────────────────────────── */}
        {showInfo && (
          <ReadinessInfoModal
            factors={factors}
            score={score}
            onClose={() => setShowInfo(false)}
          />
        )}

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div style={{ padding: '24px 20px 0' }}>
          <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Mortgages</p>
          <h1 style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: '0 0 10px' }}>
            Comparisons
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#bbcabf', lineHeight: 1.6 }}>
            You have <span style={{ color: '#4edea3', fontWeight: 700 }}>{monthsLeftLabel}</span> remaining on your fixed term.
            Market conditions are shifting—time to plan your next move.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button style={{
              background: '#4edea3', color: '#003824', padding: '10px 20px',
              borderRadius: 12, fontFamily: 'Manrope,sans-serif', fontWeight: 700,
              fontSize: 13, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(78,222,163,0.25)',
            }}>Start Shopping Now</button>
            <button style={{
              background: 'transparent', color: '#4edea3', padding: '10px 20px',
              borderRadius: 12, fontFamily: 'Manrope,sans-serif', fontWeight: 700,
              fontSize: 13, border: '1px solid rgba(78,222,163,0.35)', cursor: 'pointer',
            }}>View Eligibility</button>
          </div>
        </div>

        {/* ── Readiness Dial ───────────────────────────────────────────── */}
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ ...s.card, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ReadinessDial
              score={score}
              badge={badge}
              badgeColor={badgeColor}
              expiryLabel={expiryLabel}
              onInfoClick={() => setShowInfo(true)}
            />
          </div>
        </div>

        {/* ── Market Rate Tracker ──────────────────────────────────────── */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ ...s.card, borderLeft: '4px solid #0566d9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ ...s.sectionTitle, fontSize: 18 }}>Market Rate Tracker</h3>
                <p style={{ ...s.label, marginTop: 2 }}>Live benchmark vs. your current {currentRate} rate</p>
              </div>
              <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: 22 }}>query_stats</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#131b2e', borderRadius: 16, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(5,102,217,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: 20 }}>calendar_today</span>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#dae2fd' }}>2-Year Fixed</p>
                    <p style={{ ...s.label, marginTop: 2 }}>Avg. High Street</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, ...s.mono, fontSize: 20, color: '#4edea3' }}>3.85%</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#4edea3', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 10 }}>arrow_downward</span>-0.35%
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#131b2e', borderRadius: 16, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(226,145,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: '#ffb95f', fontSize: 20 }}>event_repeat</span>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#dae2fd' }}>5-Year Fixed</p>
                    <p style={{ ...s.label, marginTop: 2 }}>Stability Focus</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, ...s.mono, fontSize: 20, color: '#adc6ff' }}>4.12%</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#adc6ff', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 10 }}>trending_flat</span>No change
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Exit Strategy ────────────────────────────────────────────── */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ background: '#2d3449', borderRadius: 24, padding: '20px' }}>
            <h3 style={{ ...s.sectionTitle, fontSize: 18 }}>Exit Strategy</h3>
            <p style={{ ...s.label, marginTop: 4, marginBottom: 16 }}>Early Repayment Charges (ERC)</p>
            <div style={{ background: 'rgba(11,19,38,0.5)', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#dae2fd' }}>Factor in Fees</span>
                <div onClick={() => setErcOn(v => !v)} style={{ width: 40, height: 22, borderRadius: 9999, background: ercOn ? '#4edea3' : '#3c4a42', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 3, left: ercOn ? 'calc(100% - 19px)' : 3, width: 16, height: 16, borderRadius: 9999, background: ercOn ? '#003824' : '#bbcabf', transition: 'left 0.2s' }} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#bbcabf', lineHeight: 1.6 }}>
                Toggle to include the estimated £4,250 exit fee in your switch profitability analysis.
              </p>
            </div>
            <div style={{ borderTop: '1px solid rgba(60,74,66,0.3)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#bbcabf' }}>Est. ERC Fee</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ffb4ab' }}>{ercOn ? '£4,250.00' : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#bbcabf' }}>Break-even Point</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#dae2fd' }}>{ercOn ? '14 Months' : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Switch & Save Projection ──────────────────────────────────── */}
        <div style={{ padding: '16px 20px 24px' }}>
          <div style={s.cardHigh}>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#4edea3' }}>
                Scenario Modelling
              </span>
              <h3 style={{ ...s.sectionTitle, fontSize: 22, marginTop: 6 }}>
                The 'Switch &amp; Save' Projection
              </h3>
            </div>

            <div style={{ display: 'flex', background: '#131b2e', borderRadius: 12, padding: 4, marginBottom: 24, gap: 4 }}>
              {[['monthly', 'Monthly View'], ['lifetime', 'Lifetime Savings']].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700,
                  background: tab === key ? '#2d3449' : 'transparent',
                  color: tab === key ? '#4edea3' : '#bbcabf',
                  transition: 'all 0.2s',
                }}>{label}</button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <BarRow
                label="Current Path (Fixed Rate)"
                monthlyValue={fixedMonthly}
                lifetimeValue={fixedTotal}
                tab={tab} maxValue={maxMonthly}
                color="#dae2fd" barBg="#3c4a42"
              />
              {svrRate > 0 && (
                <BarRow
                  label="Current Path (Variable Rate)"
                  monthlyValue={varMonthly}
                  lifetimeValue={varTotal}
                  tab={tab} maxValue={maxMonthly}
                  color="#ffb95f" barBg="#ffb95f"
                />
              )}
              <BarRow
                label="New Market Strategy"
                monthlyValue={marketMonthly}
                lifetimeValue={marketTotal}
                tab={tab} maxValue={maxMonthly}
                color="#4edea3" barBg="#4edea3"
                tag={tab === 'monthly'
                  ? (savingVsFixed > 0 ? `SAVE ${fmtGBP(savingVsFixed)} EVERY MONTH vs. fixed` : undefined)
                  : (saving5yr > 0 ? `SAVE ${fmtGBP(saving5yr)} OVER 5 YEARS vs. variable` : undefined)
                }
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24 }}>
              <div style={{ background: '#131b2e', borderRadius: 16, padding: '16px' }}>
                <p style={{ margin: 0, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#bbcabf', fontWeight: 700 }}>5-Year Total Saved</p>
                <p style={{ margin: '6px 0 0', ...s.mono, fontSize: 24, color: '#dae2fd' }}>
                  {saving5yr > 0 ? fmtGBP(saving5yr) : '–'}
                </p>
              </div>
              <div style={{ background: '#131b2e', borderRadius: 16, padding: '16px', borderTop: '3px solid #4edea3' }}>
                <p style={{ margin: 0, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#4edea3', fontWeight: 700 }}>Equity Boost</p>
                <p style={{ margin: '6px 0 0', ...s.mono, fontSize: 24, color: '#4edea3' }}>+2.4%</p>
              </div>
            </div>

            <div style={{ background: '#171f33', borderRadius: 20, padding: '20px', marginTop: 16, border: '1px solid rgba(60,74,66,0.2)' }}>
              <div style={{ width: 44, height: 44, background: 'rgba(78,222,163,0.1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <span className="material-symbols-outlined" style={{ color: '#4edea3', fontSize: 26 }}>lightbulb</span>
              </div>
              <h4 style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 700, fontSize: 17, color: '#dae2fd', margin: '0 0 10px' }}>
                Architect's Verdict
              </h4>
              <p style={{ margin: 0, fontSize: 13, color: '#bbcabf', lineHeight: 1.7 }}>
                Switching now outweighs your current overpayment strategy by{' '}
                <span style={{ color: '#dae2fd', fontWeight: 700 }}>£3,200</span> over the next 24 months,
                even after accounting for the Early Repayment Charge. The interest rate spread is currently
                at a 14-month high—this is an asymmetric advantage.
              </p>
              <button style={{
                marginTop: 16, display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', color: '#4edea3', fontWeight: 700,
                fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'Inter,sans-serif',
              }}>
                Generate Full Comparison PDF
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

      </div>
      </PremiumGate>
    </MortgageLayout>
  );
}
