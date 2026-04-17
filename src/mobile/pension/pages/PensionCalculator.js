import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../firebase';
import PensionLayout from '../PensionLayout';
import { usePensionData } from '../PensionDataContext';
import { calculateIncomeTax } from '../../../modules/utils/incomeTaxUtils';

// ── Projection engine ─────────────────────────────────────────────────────────

function calcProjection({ currentAge, retirementAge, monthlyContrib, returnRate, currentPot }) {
  const years = retirementAge - currentAge;
  if (years <= 0) return 0;
  const monthlyRate = returnRate / 100 / 12;
  const months = years * 12;
  const fvPot = currentPot * Math.pow(1 + monthlyRate, months);
  const fvContribs = monthlyRate > 0
    ? monthlyContrib * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
    : monthlyContrib * months;
  return Math.round(fvPot + fvContribs);
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n) {
  return '£' + Math.max(0, Math.round(n || 0)).toLocaleString('en-GB');
}
function fmtFull(n) {
  return '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Shared styles ─────────────────────────────────────────────────────────────

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

const labelStyle = {
  fontSize: '11px',
  color: '#64748b',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  display: 'block',
  marginBottom: '8px',
};

// ── Breakdown bar row ─────────────────────────────────────────────────────────

function BreakdownBar({ label, value, pct, color }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#bbcabf' }}>{label}</span>
        <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#dae2fd' }}>{fmtFull(value)}</span>
      </div>
      <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(173,198,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

// ── Slider row ────────────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, step = 1, display, onChange }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#dae2fd', fontFamily: 'Inter, sans-serif' }}>{display}</span>
      </div>
      <input
        type="range"
        className="range-input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PensionCalculator() {
  const { metrics, isLoading, userProfile, updateUserProfile } = usePensionData();
  const [step, setStep] = useState(0);

  const potSeeded     = useRef(false);
  const agesSeeded    = useRef(false);
  const hasInteracted = useRef(false);
  const pendingAges   = useRef(null);

  const [currentAge,    setCurrentAge]    = useState(38);
  const [retirementAge, setRetirementAge] = useState(65);
  const [returnRate,    setReturnRate]    = useState(7);
  const [currentPot,    setCurrentPot]    = useState('0');

  // Income Calculator link
  const [user,               setUser]               = useState(null);
  const [incomeMonthlyContrib, setIncomeMonthlyContrib] = useState(0);
  const [hasIncomeData,      setHasIncomeData]      = useState(false);
  const [monthlyContrib,     setMonthlyContrib]     = useState(''); // editable manual field
  const contribSeeded = useRef(false);
  const [saveStatus,         setSaveStatus]         = useState(null); // null | 'saving' | 'saved' | 'error'

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'incomePots', user.uid)).then(snap => {
      if (!snap.exists()) return;
      const p = snap.data().calculatorParams;
      if (!p) return;
      // Reconstruct income calc inputs from saved params
      const income = parseFloat(p.annualIncome) || 0;
      if (income <= 0) return;
      let employerMatchPct = parseFloat(p.employerMatch) || 0;
      if (p.pensionMode === 'amount' && income > 0) {
        employerMatchPct = (employerMatchPct / income) * 100;
      }
      const calcInputs = {
        annualIncome:        income,
        bonusAmount:         parseFloat(p.bonus) || 0,
        hasBonusCommission:  p.hasBonus || false,
        taxYear:             p.taxYear || '2026/27',
        taxCode:             p.taxCode || '1257L',
        pensionContribution: p.pensionEnabled ? (parseFloat(p.pensionAmount) || 0) : 0,
        pensionType:         p.pensionMode || 'percentage',
        pensionScheme:       p.pensionScheme || 'salary_sacrifice',
        employerMatch:       p.pensionEnabled && p.hasEmployerMatch ? employerMatchPct : 0,
        hasEmployerMatch:    p.pensionEnabled && p.hasEmployerMatch,
        hasStudentLoan:      p.hasStudentLoan || false,
        studentLoanPlan:     p.studentLoanPlan || 'plan2',
        hasBenefits:         false,
        benefitsList:        [],
      };
      const result = calculateIncomeTax(calcInputs);
      const monthly = result.totalPensionContribution / 12;
      setIncomeMonthlyContrib(monthly);
      setHasIncomeData(monthly > 0);
      // Pre-seed the editable field only if the user hasn't manually set a value yet
      if (!contribSeeded.current && monthly > 0) {
        setMonthlyContrib(String(Math.round(monthly * 100) / 100));
        contribSeeded.current = true;
      }
    }).catch(() => {});
  }, [user]);

  // Load saved calculator params (takes precedence over metric/profile seeding)
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'pensionScenarios', user.uid)).then(snap => {
      if (!snap.exists()) return;
      const p = snap.data().calculatorParams;
      if (!p) return;
      if (p.currentAge    != null) { setCurrentAge(p.currentAge);    agesSeeded.current = true; }
      if (p.retirementAge != null) { setRetirementAge(p.retirementAge); }
      if (p.returnRate    != null) setReturnRate(p.returnRate);
      if (p.monthlyContrib != null) { setMonthlyContrib(String(p.monthlyContrib)); contribSeeded.current = true; }
      // currentPot is always seeded from live metrics — never restored from saved params
    }).catch(() => {});
  }, [user]);

  const saveParams = useCallback(async () => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      await setDoc(doc(db, 'pensionScenarios', user.uid), {
        calculatorParams: { currentAge, retirementAge, returnRate, monthlyContrib: parseFloat(monthlyContrib) || 0 },
      }, { merge: true });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 2500);
    }
  }, [user, currentAge, retirementAge, returnRate]);

  // Seed currentPot from real data once it loads
  useEffect(() => {
    if (!potSeeded.current && metrics.totalValue > 0) {
      setCurrentPot(String(Math.round(metrics.totalValue)));
      potSeeded.current = true;
    }
  }, [metrics.totalValue]);

  // Seed ages from userProfile once loading finishes
  useEffect(() => {
    if (!isLoading && !agesSeeded.current) {
      setCurrentAge(userProfile.currentAge);
      setRetirementAge(userProfile.retirementAge);
      agesSeeded.current = true;
    }
  }, [isLoading, userProfile]);

  // Debounced save of age changes to Firebase
  useEffect(() => {
    if (!hasInteracted.current) return;
    pendingAges.current = { currentAge, retirementAge };
    const timer = setTimeout(() => {
      updateUserProfile({ currentAge, retirementAge });
      pendingAges.current = null;
    }, 800);
    return () => clearTimeout(timer);
  }, [currentAge, retirementAge]); // eslint-disable-line

  // Flush any pending save when navigating away before debounce fires
  useEffect(() => {
    return () => {
      if (pendingAges.current) updateUserProfile(pendingAges.current);
    };
  }, []); // eslint-disable-line

  const potVal    = parseFloat(currentPot) || 0;
  const contribVal = parseFloat(monthlyContrib) || 0;
  const years     = retirementAge - currentAge;

  const projected = useMemo(
    () => calcProjection({ currentAge, retirementAge, monthlyContrib: contribVal, returnRate, currentPot: potVal }),
    [currentAge, retirementAge, contribVal, returnRate, potVal]
  );

  const totalContributions = useMemo(
    () => years > 0 ? contribVal * years * 12 : 0,
    [contribVal, years]
  );

  const totalInvested = potVal + totalContributions;
  const totalGrowth   = Math.max(0, projected - totalInvested);

  // ─────────────────────────────────────────────────────────────────────────
  // Step 0 — Inputs
  // ─────────────────────────────────────────────────────────────────────────

  if (step === 0) {
    return (
      <PensionLayout>
        <div style={{ padding: '0 0 32px' }}>

          {/* Header */}
          <div style={{ padding: '24px 20px 16px' }}>
            <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Pensions</p>
            <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
              Calculator
            </h1>
          </div>

          <div style={{ padding: '0 16px' }}>

            {/* ── Pot & Ages card ── */}
            <div style={{ ...cardStyle, borderLeft: '4px solid #4edea3' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <span className="material-symbols-outlined" style={{ color: '#4edea3', fontSize: '20px' }}>account_balance</span>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>Your Pension Pot</p>
              </div>

              {/* Current Pot */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Current Pot Value</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#4edea3', fontWeight: 700, fontFamily: 'Manrope, sans-serif', fontSize: '18px', pointerEvents: 'none' }}>£</span>
                  <input
                    type="number"
                    value={currentPot}
                    onChange={e => setCurrentPot(e.target.value)}
                    placeholder="0"
                    style={{ ...inputStyle, paddingLeft: '34px', fontSize: '20px', fontFamily: 'Manrope, sans-serif' }}
                  />
                </div>
                {potVal > 0 && (
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0', fontStyle: metrics.totalValue > 0 ? 'italic' : 'normal' }}>
                    {metrics.totalValue > 0 ? 'Seeded from your pension accounts' : 'Enter your current total pot value'}
                  </p>
                )}
              </div>

              {/* Ages */}
              <SliderRow
                label="Current Age"
                value={currentAge}
                min={18} max={70}
                display={`${currentAge} yrs`}
                onChange={v => { hasInteracted.current = true; setCurrentAge(v); }}
              />
              <div style={{ marginBottom: 0 }}>
                <SliderRow
                  label="Retirement Age"
                  value={retirementAge}
                  min={currentAge + 1} max={80}
                  display={`${retirementAge} yrs`}
                  onChange={v => { hasInteracted.current = true; setRetirementAge(v); }}
                />
                <p style={{ fontSize: '11px', color: '#64748b', margin: '-10px 0 0' }}>
                  {years > 0 ? `${years} years until retirement` : 'Adjust ages above'}
                </p>
              </div>
            </div>

            {/* ── Contributions card ── */}
            <div style={{ ...cardStyle, borderLeft: '4px solid #ffb95f' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span className="material-symbols-outlined" style={{ color: '#ffb95f', fontSize: '20px' }}>savings</span>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>Monthly Contributions</p>
              </div>

              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <span style={{
                  position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                  color: '#ffb95f',
                  fontWeight: 700, fontFamily: 'Manrope, sans-serif', fontSize: '18px',
                  pointerEvents: 'none',
                }}>£</span>
                <input
                  type="number"
                  value={monthlyContrib}
                  onChange={e => { setMonthlyContrib(e.target.value); contribSeeded.current = true; }}
                  placeholder="0"
                  style={{
                    ...inputStyle,
                    paddingLeft: '34px',
                    fontSize: '20px',
                    fontFamily: 'Manrope, sans-serif',
                  }}
                />
              </div>

              {contribVal > 0 && (
                <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 6px' }}>
                  {fmt(contribVal * 12)} per year · {fmt(totalContributions)} total over {years} yrs
                </p>
              )}

              {hasIncomeData && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: 0, fontStyle: 'italic' }}>
                    Income Calculator: {fmt(incomeMonthlyContrib)}/mo
                  </p>
                  {Math.round(contribVal) !== Math.round(incomeMonthlyContrib) && (
                    <button
                      onClick={() => setMonthlyContrib(String(Math.round(incomeMonthlyContrib * 100) / 100))}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        fontSize: '11px', color: '#ffb95f', fontWeight: 600,
                        cursor: 'pointer', textDecoration: 'underline',
                      }}
                    >
                      Use this
                    </button>
                  )}
                </div>
              )}

              {!hasIncomeData && (
                <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>
                  Enter your total monthly pension contributions (employee + employer)
                </p>
              )}
            </div>

            {/* ── Growth assumptions card ── */}
            <div style={{ ...cardStyle, borderTop: '4px solid #adc6ff' }}>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '12px', color: '#adc6ff', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 20px' }}>
                Growth Assumptions
              </p>

              <SliderRow
                label="Expected Annual Return"
                value={returnRate}
                min={1} max={15} step={0.5}
                display={`${returnRate}% p.a.`}
                onChange={setReturnRate}
              />
              <p style={{ fontSize: '11px', color: '#64748b', margin: '-10px 0 0' }}>
                {returnRate <= 4 ? 'Conservative — lower-risk portfolio' : returnRate <= 7 ? 'Moderate — balanced portfolio' : 'Optimistic — higher-risk portfolio'}
              </p>
            </div>

            {/* ── CTA ── */}
            <button
              onClick={() => setStep(1)}
              style={{
                width: '100%',
                background: '#ffb95f',
                color: '#3a1a00',
                border: 'none', borderRadius: '14px', padding: '16px',
                fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginBottom: '12px', transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>analytics</span>
              Calculate Projection
            </button>

            <button
              onClick={() => {
                setCurrentPot(metrics.totalValue > 0 ? String(Math.round(metrics.totalValue)) : '0');
                setReturnRate(7);
              }}
              style={{
                width: '100%', background: 'transparent',
                border: '1px solid rgba(173,198,255,0.12)',
                borderRadius: '14px', padding: '14px', color: '#64748b',
                fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
              }}
            >
              Reset
            </button>

          </div>
        </div>
      </PensionLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1 — Results
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <PensionLayout>
      <div style={{ padding: '0 0 32px' }}>

        {/* Back nav */}
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setStep(0)}
            style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '20px' }}>arrow_back</span>
          </button>
          <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>Calculator</p>
        </div>

        <div style={{ padding: '12px 16px 0' }}>

          {/* ── Hero gradient card ── */}
          <div style={{
            background: 'linear-gradient(135deg, #ffb95f 0%, #f97316 100%)',
            borderRadius: '20px', padding: '28px 24px', marginBottom: '14px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: '-24px', top: '-24px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', right: '40px', bottom: '-30px', width: '80px', height: '80px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />

            <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(58,26,0,0.65)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px', fontFamily: 'Inter, sans-serif' }}>Pension Forecast</p>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '28px', color: '#3a1a00', margin: '0 0 20px' }}>Projected Pot</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'rgba(58,26,0,0.7)', margin: '0 0 4px' }}>At Age {retirementAge}</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '28px', color: '#3a1a00', margin: 0, lineHeight: 1 }}>
                  {fmt(projected)}
                </p>
              </div>
              <div style={{ background: 'rgba(58,26,0,0.1)', borderRadius: '14px', padding: '14px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(58,26,0,0.6)', margin: '0 0 4px' }}>{years} Years Away</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '18px', color: '#3a1a00', margin: '0 0 10px' }}>
                  {fmt(contribVal * 12)} / yr
                </p>
                <p style={{ fontSize: '10px', color: 'rgba(58,26,0,0.6)', margin: '0 0 2px' }}>Growth Share</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#3a1a00', margin: 0 }}>
                  {projected > 0 ? `${((totalGrowth / projected) * 100).toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Breakdown card ── */}
          <div className="animate-in stagger-1 section-card" style={{ marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 16px' }}>
              Pot Breakdown
            </h3>

            <BreakdownBar
              label="Current Pot"
              value={potVal}
              pct={projected > 0 ? (potVal / projected) * 100 : 0}
              color="#adc6ff"
            />
            <BreakdownBar
              label="Future Contributions"
              value={totalContributions}
              pct={projected > 0 ? (totalContributions / projected) * 100 : 0}
              color="#4edea3"
            />
            <BreakdownBar
              label="Investment Growth"
              value={totalGrowth}
              pct={projected > 0 ? (totalGrowth / projected) * 100 : 0}
              color="#ffb95f"
            />

            <div style={{ borderTop: '1px solid rgba(173,198,255,0.08)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Projected Total</p>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>{fmtFull(projected)}</p>
            </div>
          </div>

          {/* ── Summary tiles ── */}
          <div className="animate-in stagger-2 section-card" style={{ marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 14px' }}>
              Projection Summary
            </h3>
            {[
              { label: 'Current Pot',            value: fmt(potVal),             color: '#adc6ff' },
              { label: 'Monthly Contribution',   value: fmt(contribVal),         color: '#ffb95f' },
              { label: 'Annual Contribution',    value: fmt(contribVal * 12),    color: '#ffb95f' },
              { label: 'Total Contributions',    value: fmt(totalContributions), color: '#4edea3' },
              { label: 'Investment Growth',      value: fmt(totalGrowth),        color: '#ffb95f' },
              { label: 'Return Rate',            value: `${returnRate}% p.a.`,   color: '#adc6ff' },
              { label: 'Years to Retirement',   value: `${years} yrs`,          color: '#bbcabf' },
              { label: 'Projected Pot',          value: fmt(projected),          color: '#ffb95f' },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: i < arr.length - 1 ? '10px' : 0,
                  marginBottom: i < arr.length - 1 ? '10px' : 0,
                  borderBottom: i < arr.length - 1 ? '1px solid rgba(173,198,255,0.06)' : 'none',
                }}
              >
                <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>{row.label}</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: row.color, margin: 0 }}>{row.value}</p>
              </div>
            ))}
          </div>

          {/* ── Adjust parameters ── */}
          <button
            onClick={() => setStep(0)}
            style={{
              width: '100%', background: 'transparent',
              border: '1px solid rgba(173,198,255,0.15)',
              borderRadius: '14px', padding: '14px', color: '#dae2fd',
              fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '15px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginBottom: '10px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>tune</span>
            Adjust Parameters
          </button>

          <button
            onClick={saveParams}
            disabled={saveStatus === 'saving' || !user}
            style={{
              width: '100%',
              background: saveStatus === 'saved' ? 'rgba(78,222,163,0.15)' : saveStatus === 'error' ? 'rgba(255,107,107,0.15)' : 'rgba(173,198,255,0.08)',
              border: `1px solid ${saveStatus === 'saved' ? '#4edea3' : saveStatus === 'error' ? '#ff6b6b' : 'rgba(173,198,255,0.2)'}`,
              borderRadius: '14px', padding: '14px', color: saveStatus === 'saved' ? '#4edea3' : saveStatus === 'error' ? '#ff6b6b' : '#adc6ff',
              fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '15px',
              cursor: saveStatus === 'saving' || !user ? 'default' : 'pointer',
              opacity: saveStatus === 'saving' || !user ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {saveStatus === 'saving' ? 'sync' : saveStatus === 'saved' ? 'check_circle' : saveStatus === 'error' ? 'error' : 'save'}
            </span>
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Parameters Saved' : saveStatus === 'error' ? 'Save Failed' : 'Save Parameters'}
          </button>

        </div>
      </div>
    </PensionLayout>
  );
}
