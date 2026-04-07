import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MortgageLayout from '../MortgageLayout';
import { useMortgageData } from '../MortgageDataContext';

// ── Calculation helpers ───────────────────────────────────────────────────────

function calcRemainingMonths(mortgage) {
  const total = (mortgage.termYears || 25) * 12;
  if (!mortgage.startDate) return total;
  const start = new Date(mortgage.startDate);
  const now = new Date();
  const elapsed =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  return Math.max(12, total - elapsed);
}

function pmt(balance, annualRate, termMonths) {
  if (!annualRate || !termMonths) return balance / (termMonths || 1);
  const r = annualRate / 100 / 12;
  return (balance * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

// rateChangeMonth: how many months from now until the initial deal expires (Infinity = no change)
// annualRateAfter: the SVR/revert rate applied from rateChangeMonth onwards
function runAmortization(balance, annualRate, termMonths, extraMonthly, oneOffAmt, oneOffMonthIdx,
                         rateChangeMonth = Infinity, annualRateAfter = null) {
  let r   = annualRate / 100 / 12;
  let std = pmt(balance, annualRate, termMonths);
  let bal = balance;
  let totalInterest = 0;
  let month = 0;
  let rateChanged = false;
  const yearlySnapshots = [{ year: 0, balance: Math.round(bal) }];
  const yearlyTable = [];
  let yInt = 0, yPrinc = 0;

  while (bal > 0.01 && month < termMonths + 300) {
    // Switch to reversion rate at the end of the fixed/deal period
    if (!rateChanged && annualRateAfter != null && month >= rateChangeMonth) {
      r = annualRateAfter / 100 / 12;
      const remainingTerm = Math.max(1, termMonths - month);
      std = pmt(bal, annualRateAfter, remainingTerm);
      rateChanged = true;
    }

    const interest = bal * r;
    let payment = std + extraMonthly;
    if (month === oneOffMonthIdx && oneOffAmt > 0) payment += oneOffAmt;
    payment = Math.min(payment, bal + interest);
    const principal = payment - interest;
    totalInterest += interest;
    yInt += interest;
    yPrinc += principal;
    bal = Math.max(0, bal - principal);
    month++;

    if (month % 12 === 0) {
      const yr = month / 12;
      yearlySnapshots.push({ year: yr, balance: Math.round(bal) });
      yearlyTable.push({
        year: yr,
        balance: Math.round(bal),
        principalPaid: Math.round(yPrinc),
        interestPaid: Math.round(yInt),
      });
      yInt = 0;
      yPrinc = 0;
    }
    if (bal <= 0.01) break;
  }

  // Capture partial final year
  if (yPrinc > 0 || yInt > 0) {
    const yr = Math.ceil(month / 12);
    yearlySnapshots.push({ year: yr, balance: 0 });
    yearlyTable.push({
      year: yr, balance: 0,
      principalPaid: Math.round(yPrinc),
      interestPaid: Math.round(yInt),
    });
  }

  return {
    months: month,
    totalInterest: Math.round(totalInterest),
    totalPaid: Math.round(balance + totalInterest),
    yearlySnapshots,
    yearlyTable,
  };
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtCcy(n) {
  return `£${Math.round(n).toLocaleString('en-GB')}`;
}

function fmtK(n) {
  if (n >= 1000000) return `£${(n / 1000000).toFixed(1)}m`;
  if (n >= 1000) return `£${Math.round(n / 1000)}k`;
  return `£${Math.round(n)}`;
}

function fmtMonths(m) {
  const y = Math.floor(m / 12), mo = m % 12;
  if (y === 0) return `${mo} month${mo !== 1 ? 's' : ''}`;
  if (mo === 0) return `${y} year${y !== 1 ? 's' : ''}`;
  return `${y} yr${y !== 1 ? 's' : ''} ${mo} mo`;
}

function fmtDate(date) {
  return date.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
}

function propertyIcon(type) {
  if (!type || type === 'Residential') return 'home';
  if (type === 'Buy-to-Let') return 'apartment';
  return 'other_houses';
}

// ── Balance Projection Chart ──────────────────────────────────────────────────

function BalanceChart({ baseline, overpaid }) {
  const W = 320, H = 120;
  const maxYears = Math.ceil(baseline.months / 12);
  if (maxYears < 2) return null;

  const bMap = {}, oMap = {};
  baseline.yearlySnapshots.forEach(s => { bMap[s.year] = s.balance; });
  overpaid.yearlySnapshots.forEach(s => { oMap[s.year] = s.balance; });
  const payoffYear = Math.min(Math.ceil(overpaid.months / 12), maxYears);

  const bSeries = [], oSeries = [];
  for (let y = 0; y <= maxYears; y++) {
    bSeries.push(bMap[y] !== undefined ? bMap[y] : 0);
    oSeries.push(y <= payoffYear ? (oMap[y] !== undefined ? oMap[y] : 0) : 0);
  }

  const n = bSeries.length;
  const maxVal = Math.max(...bSeries, 1);
  const toX = i => (i / (n - 1)) * W;
  const toY = v => H - (v / maxVal) * (H - 14) - 7;

  const bPts = bSeries.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' L ');
  const oPts = oSeries.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' L ');

  const fpX = toX(payoffYear);
  const fpY = toY(0);
  const tipLeft = fpX > W - 70;

  // X-axis: every 5 years, up to maxYears
  const xTicks = [];
  for (let y = 0; y <= maxYears; y += 5) xTicks.push(y);
  if (xTicks[xTicks.length - 1] !== maxYears) xTicks.push(maxYears);

  return (
    <>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="calcAreaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4edea3" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#4edea3" stopOpacity="0" />
          </linearGradient>
          {/* Subtle grid */}
          <pattern id="gridPat" width="64" height="30" patternUnits="userSpaceOnUse">
            <path d="M 64 0 L 0 0 0 30" fill="none" stroke="rgba(60,74,66,0.3)" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Grid */}
        <rect width={W} height={H} fill="url(#gridPat)" opacity="0.5" />

        {/* Area fill under overpaid line */}
        <path
          d={`M ${toX(0)},${H} L ${oPts} L ${toX(payoffYear)},${H} Z`}
          fill="url(#calcAreaGrad)"
        />
        {/* Baseline (grey dashed) */}
        <path d={`M ${bPts}`} fill="none" stroke="rgba(134,148,138,0.5)" strokeWidth="2" strokeDasharray="5 3" />
        {/* Overpaid (green solid) */}
        <path d={`M ${oPts}`} fill="none" stroke="#4edea3" strokeWidth="2.5" strokeLinecap="round" />
        {/* Freedom point */}
        <circle cx={fpX} cy={fpY} r={5} fill="#4edea3" />
      </svg>

      {/* X-axis labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingRight: '2px' }}>
        {xTicks.map(y => (
          <span key={y} style={{ fontSize: '9px', color: '#475569', fontWeight: 600, textTransform: 'uppercase' }}>
            Yr {y}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '2px', background: 'rgba(173,198,255,0.4)', borderRadius: '1px' }} />
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>Original</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '2px', background: '#4edea3', borderRadius: '1px' }} />
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>Overpaid</span>
        </div>
      </div>
    </>
  );
}

// ── Shared input / card styles ────────────────────────────────────────────────

const inputStyle = {
  width: '100%',
  background: '#060e20',
  border: 'none',
  borderRadius: '12px',
  padding: '14px 16px',
  color: '#dae2fd',
  fontFamily: 'Inter, sans-serif',
  fontSize: '16px',
  fontWeight: 700,
  outline: 'none',
  boxSizing: 'border-box',
};

const cardStyle = {
  background: '#171f33',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '14px',
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function MortgageCalculator() {
  const navigate = useNavigate();
  const { mortgages } = useMortgageData();

  const [step, setStep] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [activeMode, setActiveMode] = useState(0); // 0 = Overpayment, 1 = Switch

  // Auto-select when there is exactly one mortgage
  React.useEffect(() => {
    if (mortgages.length === 1) setSelectedIdx(0);
  }, [mortgages]);

  // Step 1 state
  const [overpayAmt, setOverpayAmt]     = useState('');
  const [overpayFreq, setOverpayFreq]   = useState('monthly');
  const [oneOffEnabled, setOneOffEnabled] = useState(false);
  const [oneOffAmt, setOneOffAmt]       = useState('');
  const [oneOffDate, setOneOffDate]     = useState('');

  const selectedMortgage = selectedIdx !== null ? mortgages[selectedIdx] : null;

  // Core calculations (runs whenever inputs change)
  const calc = useMemo(() => {
    if (!selectedMortgage) return null;

    const balance   = selectedMortgage.outstandingBalance || 0;
    const rate      = selectedMortgage.interestRate || 0;
    const remaining = calcRemainingMonths(selectedMortgage);

    // Rate reversion: if there's a fixed deal expiry and a default (SVR) rate, model the switch
    const defaultRate = selectedMortgage.defaultRate
      ? parseFloat(selectedMortgage.defaultRate)
      : null;
    // Resolve the fixed deal end date from whichever field is present:
    //   - AddMortgage saves fixedRateEndDate directly
    //   - Demo / legacy data stores fixedRateStartDate + fixedTermYears
    const resolvedFixedEnd = selectedMortgage.fixedRateEndDate ||
      (selectedMortgage.fixedRateStartDate && selectedMortgage.fixedTermYears
        ? (() => {
            const d = new Date(selectedMortgage.fixedRateStartDate);
            d.setFullYear(d.getFullYear() + selectedMortgage.fixedTermYears);
            return d.toISOString().slice(0, 10);
          })()
        : null);

    const rateChangeMonth = defaultRate && resolvedFixedEnd
      ? (() => {
          const now = new Date();
          const end = new Date(resolvedFixedEnd);
          const m = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
          return Math.max(0, m);
        })()
      : Infinity;

    const rawAmt = parseFloat(overpayAmt) || 0;
    const extraMonthly = overpayFreq === 'annually' ? rawAmt / 12 : rawAmt;

    const oneOff = oneOffEnabled ? (parseFloat(oneOffAmt) || 0) : 0;
    const oneOffMonthIdx = oneOffEnabled && oneOffDate
      ? Math.max(0, (() => {
          const from = new Date();
          const to   = new Date(oneOffDate);
          return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
        })())
      : -1;

    const baseline = runAmortization(balance, rate, remaining, 0, 0, -1, rateChangeMonth, defaultRate);
    const overpaid = runAmortization(balance, rate, remaining, extraMonthly, oneOff, oneOffMonthIdx, rateChangeMonth, defaultRate);

    const monthsSaved    = Math.max(0, baseline.months - overpaid.months);
    const interestSaved  = Math.max(0, baseline.totalInterest - overpaid.totalInterest);

    const now     = new Date();
    const origEnd = new Date(now.getFullYear(), now.getMonth() + baseline.months);
    const newEnd  = new Date(now.getFullYear(), now.getMonth() + overpaid.months);

    // Yearly table with cumulative savings
    let cumSavings = 0;
    const tableRows = [];
    const maxRows = Math.min(overpaid.yearlyTable.length, 10);
    for (let i = 0; i < maxRows; i++) {
      const opRow   = overpaid.yearlyTable[i];
      const baseRow = baseline.yearlyTable[i];
      const saving  = baseRow ? Math.max(0, baseRow.interestPaid - opRow.interestPaid) : 0;
      cumSavings   += saving;
      tableRows.push({ ...opRow, cumulativeSavings: Math.round(cumSavings) });
    }

    // Smart tip: how much would £50 more save?
    const tipResult = runAmortization(balance, rate, remaining, extraMonthly + 50, oneOff, oneOffMonthIdx, rateChangeMonth, defaultRate);
    const tipMonthsSaved = Math.max(0, overpaid.months - tipResult.months);

    return {
      baseline, overpaid,
      monthsSaved, interestSaved,
      origEnd, newEnd,
      tableRows, tipMonthsSaved,
      hasOverpayment: extraMonthly > 0 || oneOff > 0,
      remaining,
      rateChangeMonth,
      defaultRate,
    };
  }, [selectedMortgage, overpayAmt, overpayFreq, oneOffEnabled, oneOffAmt, oneOffDate]);

  // ─────────────────────────────────────────────────────────────────────────
  // Step 0 — Select Property
  // ─────────────────────────────────────────────────────────────────────────

  if (step === 0) {
    const canContinue = selectedIdx !== null && activeMode === 0;

    return (
      <MortgageLayout>
        <div style={{ padding: '0 0 32px' }}>

          <div style={{ padding: '24px 20px 16px' }}>
            <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Mortgages</p>
            <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
              Calculator
            </h1>
          </div>

          {/* Mode tabs */}
          <div style={{ padding: '0 16px 16px', display: 'flex', gap: '8px' }}>
            {['Overpayment', 'Switch'].map((label, i) => (
              <button
                key={label}
                className={`tab-btn${activeMode === i ? ' active' : ''}`}
                onClick={() => setActiveMode(i)}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              {activeMode === 0
                ? 'Choose a mortgage to model your overpayment strategy.'
                : 'Choose a mortgage to model your product switch strategy.'}
            </p>
          </div>

          <div style={{ padding: '0 16px' }}>
            {mortgages.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
                <span className="material-symbols-outlined" style={{ color: '#64748b', fontSize: '40px', display: 'block', marginBottom: '12px' }}>home_work</span>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>No mortgages added yet. Add one from the Overview tab.</p>
              </div>
            ) : mortgages.map((m, i) => {
              const sel = selectedIdx === i;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                    background: sel ? '#222a3d' : '#171f33',
                    borderRadius: '16px', padding: '20px', marginBottom: '12px',
                    border: sel ? '2px solid #4edea3' : '2px solid transparent',
                    boxShadow: sel ? '0 4px 20px rgba(78,222,163,0.12)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: sel ? '#10b981' : '#2d3449', borderRadius: '10px', padding: '8px', display: 'flex' }}>
                        <span className="material-symbols-outlined" style={{ color: sel ? '#003824' : '#adc6ff', fontSize: '20px' }}>
                          {propertyIcon(m.type)}
                        </span>
                      </div>
                      <div>
                        <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 2px' }}>{m.name}</p>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {m.type || 'Residential'} · {m.lender}
                        </p>
                      </div>
                    </div>
                    {sel && (
                      <span className="material-symbols-outlined" style={{ color: '#4edea3', fontSize: '22px' }}>check_circle</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outstanding Balance</p>
                      <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '22px', color: sel ? '#4edea3' : '#dae2fd', margin: 0 }}>
                        {fmtCcy(m.outstandingBalance || 0)}
                      </p>
                    </div>
                    <div style={{ background: '#060e20', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '16px' }}>account_balance</span>
                      <span style={{ fontSize: '11px', color: '#dae2fd', fontWeight: 700 }}>{m.lender}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ padding: '4px 16px 0' }}>
            <button
              onClick={() => canContinue && setStep(1)}
              disabled={!canContinue}
              style={{
                width: '100%',
                background: canContinue ? '#4edea3' : '#1a2438',
                color: canContinue ? '#003824' : '#3d5068',
                border: 'none', borderRadius: '14px', padding: '16px',
                fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px',
                cursor: canContinue ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              Select and Continue
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_forward</span>
            </button>
          </div>

        </div>
      </MortgageLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1 — Overpayment Strategy
  // ─────────────────────────────────────────────────────────────────────────

  if (step === 1) {
    const m = selectedMortgage;
    const remaining = m ? calcRemainingMonths(m) : 0;

    return (
      <MortgageLayout>
        <div style={{ padding: '0 0 32px' }}>

          <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setStep(0)}
              style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '20px' }}>arrow_back</span>
            </button>
            <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>Select Mortgage</p>
          </div>


          <div style={{ padding: '16px 16px 0' }}>

            {/* Active property summary */}
            <div style={{ background: '#222a3d', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px', borderLeft: '4px solid #4edea3', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-16px', top: '-16px', width: '80px', height: '80px', background: 'rgba(78,222,163,0.05)', borderRadius: '50%' }} />
              <p style={{ fontSize: '11px', color: '#4edea3', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Active Property Selection</p>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: '0 0 12px' }}>{m?.name}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Loan</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>{fmtCcy(m?.outstandingBalance || 0)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rate / Term</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>
                    {m?.interestRate || 0}%
                    {m?.defaultRate && (
                      <span style={{ color: '#ffb95f' }}> → {m.defaultRate}%</span>
                    )}
                    {' '}/ {Math.round(remaining / 12)}yr
                  </p>
                  {m?.defaultRate && (() => {
                    const end = m.fixedRateEndDate ||
                      (m.fixedRateStartDate && m.fixedTermYears
                        ? (() => { const d = new Date(m.fixedRateStartDate); d.setFullYear(d.getFullYear() + m.fixedTermYears); return d.toISOString(); })()
                        : null);
                    return end
                      ? <p style={{ fontSize: '10px', color: '#ffb95f', margin: '3px 0 0' }}>
                          Deal expires {new Date(end).toLocaleString('en-GB', { month: 'short', year: 'numeric' })}
                        </p>
                      : null;
                  })()}
                </div>
              </div>
            </div>

            {/* Regular overpayment */}
            <div style={{ ...cardStyle }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>Regular Overpayment</p>
                <div style={{ display: 'flex', background: '#060e20', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                  {['monthly', 'annually'].map(f => (
                    <button
                      key={f}
                      onClick={() => setOverpayFreq(f)}
                      style={{
                        background: overpayFreq === f ? '#4edea3' : 'transparent',
                        color: overpayFreq === f ? '#003824' : '#bbcabf',
                        border: 'none', borderRadius: '8px', padding: '5px 10px',
                        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '11px',
                        textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount input */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <span style={{
                  position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                  color: '#bbcabf', fontWeight: 700, fontFamily: 'Manrope, sans-serif', fontSize: '20px',
                  pointerEvents: 'none',
                }}>£</span>
                <input
                  type="number"
                  value={overpayAmt}
                  onChange={e => setOverpayAmt(e.target.value)}
                  placeholder="0.00"
                  style={{ ...inputStyle, paddingLeft: '34px', fontSize: '22px', fontFamily: 'Manrope, sans-serif' }}
                />
              </div>

              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                {overpayFreq === 'monthly'
                  ? `${fmtCcy((parseFloat(overpayAmt) || 0) * 12)} per year in total overpayments`
                  : `${fmtCcy(Math.round((parseFloat(overpayAmt) || 0) / 12))} per month equivalent`}
              </p>

              {/* Payment timing */}
              <div style={{ marginTop: '16px' }}>
                <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px', fontWeight: 600 }}>Payment Timing</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      placeholder="Day"
                      min="1"
                      max="28"
                      defaultValue="1"
                      style={{ ...inputStyle, fontSize: '15px', paddingRight: '44px' }}
                    />
                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Day</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <select
                      defaultValue="0"
                      style={{ ...inputStyle, fontSize: '14px', appearance: 'none', paddingRight: '36px', cursor: 'pointer' }}
                    >
                      <option value="0">Monthly</option>
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((mo, i) => (
                        <option key={i} value={i + 1}>{mo}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px', pointerEvents: 'none' }}>expand_more</span>
                  </div>
                </div>
              </div>
            </div>

            {/* One-off payment */}
            <div style={{ ...cardStyle }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: oneOffEnabled ? '16px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#ffb95f', fontSize: '20px' }}>calendar_today</span>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>One-off Payment</p>
                </div>
                {/* Toggle */}
                <div
                  onClick={() => setOneOffEnabled(v => !v)}
                  style={{
                    width: '46px', height: '26px', borderRadius: '13px',
                    background: oneOffEnabled ? '#4edea3' : '#2d3449',
                    position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '3px',
                    left: oneOffEnabled ? '23px' : '3px',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }} />
                </div>
              </div>

              {oneOffEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', fontWeight: 600 }}>Amount</p>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#bbcabf', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>£</span>
                      <input
                        type="number"
                        value={oneOffAmt}
                        onChange={e => setOneOffAmt(e.target.value)}
                        placeholder="0"
                        style={{ ...inputStyle, paddingLeft: '28px', fontSize: '16px', padding: '12px 12px 12px 28px' }}
                      />
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', fontWeight: 600 }}>Target Date</p>
                    <input
                      type="date"
                      value={oneOffDate}
                      onChange={e => setOneOffDate(e.target.value)}
                      style={{ ...inputStyle, fontSize: '13px', padding: '12px' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Smart tip */}
            {calc && calc.tipMonthsSaved > 0 && (
              <div style={{
                background: 'rgba(255,185,95,0.05)',
                border: '1px solid rgba(255,185,95,0.2)',
                borderRadius: '14px', padding: '16px',
                marginBottom: '16px',
                display: 'flex', gap: '14px', alignItems: 'flex-start',
              }}>
                <div style={{ background: '#e29100', borderRadius: '10px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: '#472a00', fontSize: '22px' }}>tips_and_updates</span>
                </div>
                <div>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '13px', color: '#ffb95f', margin: '0 0 4px' }}>Smart Optimisation Tip</p>
                  <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0, lineHeight: '1.6' }}>
                    Increasing your monthly overpayment by just{' '}
                    <span style={{ color: '#dae2fd', fontWeight: 700 }}>£50</span> more would reduce your term by an additional{' '}
                    <span style={{ color: '#dae2fd', fontWeight: 700 }}>{fmtMonths(calc.tipMonthsSaved)}</span> based on current rates.
                  </p>
                </div>
              </div>
            )}

            {/* CTAs */}
            <button
              onClick={() => setStep(2)}
              disabled={!calc?.hasOverpayment}
              style={{
                width: '100%',
                background: calc?.hasOverpayment ? '#4edea3' : '#1a2438',
                color: calc?.hasOverpayment ? '#003824' : '#3d5068',
                border: 'none', borderRadius: '14px', padding: '16px',
                fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px',
                cursor: calc?.hasOverpayment ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginBottom: '12px', transition: 'all 0.2s',
              }}
            >
              Calculate Savings
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>trending_up</span>
            </button>

            <button
              onClick={() => { setOverpayAmt(''); setOneOffEnabled(false); setOneOffAmt(''); setOneOffDate(''); setOverpayFreq('monthly'); }}
              style={{
                width: '100%', background: 'transparent',
                border: '1px solid rgba(173,198,255,0.12)',
                borderRadius: '14px', padding: '14px', color: '#64748b',
                fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
              }}
            >
              Reset Form
            </button>

          </div>
        </div>
      </MortgageLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2 — Results
  // ─────────────────────────────────────────────────────────────────────────

  if (!calc) { setStep(1); return null; }

  const { baseline, overpaid, monthsSaved, interestSaved, origEnd, newEnd, tableRows,
          rateChangeMonth, defaultRate: calcDefaultRate } = calc;

  // Derive what the results page should show about the rate model
  const m = selectedMortgage;
  const hasReversion = calcDefaultRate != null && rateChangeMonth < Infinity;
  const missingSVRData = (m?.defaultRate || m?.interestRate) && !hasReversion;

  return (
    <MortgageLayout>
      <div style={{ padding: '0 0 32px' }}>

        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setStep(1)}
            style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '20px' }}>arrow_back</span>
          </button>
          <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>Calculator</p>
        </div>

        <div style={{ padding: '0 16px', marginTop: '8px' }}>

          {/* Rate model banner */}
          {hasReversion ? (
            <div style={{
              background: 'rgba(78,222,163,0.06)', border: '1px solid rgba(78,222,163,0.15)',
              borderRadius: '12px', padding: '10px 14px', marginBottom: '14px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span className="material-symbols-outlined" style={{ color: '#4edea3', fontSize: '18px', flexShrink: 0 }}>check_circle</span>
              <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0, lineHeight: 1.5 }}>
                Modelled at <span style={{ color: '#dae2fd', fontWeight: 700 }}>{m?.interestRate}%</span> for {rateChangeMonth} months,
                then <span style={{ color: '#ffb95f', fontWeight: 700 }}>{calcDefaultRate}% SVR</span> for the remainder
              </p>
            </div>
          ) : missingSVRData ? (
            <div style={{
              background: 'rgba(255,185,95,0.06)', border: '1px solid rgba(255,185,95,0.2)',
              borderRadius: '12px', padding: '10px 14px', marginBottom: '14px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span className="material-symbols-outlined" style={{ color: '#ffb95f', fontSize: '18px', flexShrink: 0 }}>warning</span>
              <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0, lineHeight: 1.5 }}>
                Modelled at a single rate of <span style={{ color: '#dae2fd', fontWeight: 700 }}>{m?.interestRate}%</span>.
                {' '}Add a <span style={{ color: '#ffb95f', fontWeight: 700 }}>Fixed Rate End Date</span> to your mortgage to model the SVR switch.
              </p>
            </div>
          ) : null}

          {/* Hero gradient card */}
          <div style={{
            background: 'linear-gradient(135deg, #4edea3 0%, #10b981 100%)',
            borderRadius: '20px', padding: '28px 24px', marginBottom: '16px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: '-24px', top: '-24px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', right: '40px', bottom: '-30px', width: '80px', height: '80px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />

            <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(0,56,36,0.65)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px', fontFamily: 'Inter, sans-serif' }}>Projection Results</p>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '28px', color: '#003824', margin: '0 0 20px' }}>Mortgage Freedom</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'stretch' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'rgba(0,56,36,0.7)', margin: '0 0 4px' }}>Interest Saved</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '28px', color: '#003824', margin: '0 0 14px', lineHeight: 1 }}>
                  {fmtCcy(interestSaved)}
                </p>
                <div style={{ background: 'rgba(0,56,36,0.1)', borderRadius: '10px', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#003824', fontSize: '16px' }}>timer</span>
                  <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '12px', color: '#003824' }}>
                    {fmtMonths(monthsSaved)} saved
                  </span>
                </div>
              </div>

              <div style={{ background: 'rgba(0,56,36,0.1)', borderRadius: '14px', padding: '14px' }}>
                <div style={{ paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid rgba(0,56,36,0.12)' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(0,56,36,0.6)', margin: '0 0 2px' }}>Original End Date</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#003824', margin: 0 }}>{fmtDate(origEnd)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(0,56,36,0.6)', margin: '0 0 2px' }}>New End Date</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '16px', color: '#003824', margin: 0 }}>{fmtDate(newEnd)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Balance projection chart */}
          <div className="animate-in stagger-1 section-card" style={{ margin: '0 0 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>
                Balance Projection
              </h3>
            </div>
            <BalanceChart baseline={baseline} overpaid={overpaid} />
          </div>

          {/* Impact breakdown — two cards side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div style={{ background: '#222a3d', borderRadius: '16px', padding: '16px', borderLeft: '4px solid #0566d9' }}>
              <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 12px', lineHeight: 1.2 }}>Total Interest Comparison</p>
              <div style={{ marginBottom: '8px' }}>
                <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase' }}>Was</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>{fmtK(baseline.totalInterest)}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#4edea3', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase' }}>Now</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: '#4edea3', margin: 0 }}>{fmtK(overpaid.totalInterest)}</p>
              </div>
            </div>

            <div style={{ background: '#222a3d', borderRadius: '16px', padding: '16px', borderLeft: '4px solid #e29100' }}>
              <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 12px', lineHeight: 1.2 }}>Total Lifetime Paid</p>
              <div style={{ marginBottom: '8px' }}>
                <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase' }}>Was</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>{fmtK(baseline.totalPaid)}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#ffb95f', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase' }}>Now</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: '#ffb95f', margin: 0 }}>{fmtK(overpaid.totalPaid)}</p>
              </div>
            </div>
          </div>

          {/* Yearly trajectory table */}
          <div className="animate-in stagger-2 section-card" style={{ margin: '0 0 14px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>
                Yearly Trajectory
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>First {tableRows.length} yrs</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'rgba(45,52,73,0.5)' }}>
                    {['Year', 'Balance', 'Principal', 'Interest', 'Saved'].map(h => (
                      <th key={h} style={{
                        padding: '10px 12px', textAlign: 'left',
                        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '10px',
                        color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(60,74,66,0.12)' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'Manrope, sans-serif', fontWeight: 700, color: '#dae2fd', whiteSpace: 'nowrap' }}>Yr {row.year}</td>
                      <td style={{ padding: '10px 12px', color: '#bbcabf', whiteSpace: 'nowrap' }}>{fmtK(row.balance)}</td>
                      <td style={{ padding: '10px 12px', color: '#bbcabf', whiteSpace: 'nowrap' }}>{fmtK(row.principalPaid)}</td>
                      <td style={{ padding: '10px 12px', color: '#bbcabf', whiteSpace: 'nowrap' }}>{fmtK(row.interestPaid)}</td>
                      <td style={{ padding: '10px 12px', color: '#4edea3', fontWeight: 700, whiteSpace: 'nowrap' }}>+{fmtK(row.cumulativeSavings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CTAs */}
          <button
            onClick={() => setStep(1)}
            style={{
              width: '100%', background: 'transparent',
              border: '1px solid rgba(173,198,255,0.15)',
              borderRadius: '14px', padding: '14px', color: '#dae2fd',
              fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '15px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>tune</span>
            Adjust Parameters
          </button>

        </div>
      </div>
    </MortgageLayout>
  );
}
