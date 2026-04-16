import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../firebase';
import IncomeLayout from '../IncomeLayout';
import { useIncomeData } from '../IncomeDataContext';
import { calculateIncomeTax } from '../../../modules/utils/incomeTaxUtils';

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}
function fmtFull(n) {
  return '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtK(n) {
  if (Math.abs(n) >= 1000000) return `£${(n / 1000000).toFixed(1)}m`;
  if (Math.abs(n) >= 1000) return `£${Math.round(n / 1000)}k`;
  return `£${Math.round(n)}`;
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

const PENSION_SCHEMES = [
  { value: 'salary_sacrifice',    label: 'Salary Sacrifice' },
  { value: 'net_pay',             label: 'Net Pay' },
  { value: 'qualifying_earnings', label: 'Qualifying Earnings (Auto-enrolment)' },
  { value: 'relief_at_source',    label: 'Relief at Source' },
];

const STUDENT_LOAN_PLANS = [
  { value: 'plan1',        label: 'Plan 1 (Before Sept 2012)' },
  { value: 'plan2',        label: 'Plan 2 (Sept 2012 – July 2023)' },
  { value: 'plan4',        label: 'Plan 4 (Scotland)' },
  { value: 'plan5',        label: 'Plan 5 (After Aug 2023)' },
  { value: 'postgraduate', label: 'Postgraduate Loan' },
];

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: '46px', height: '26px', borderRadius: '13px',
        background: value ? '#4edea3' : '#2d3449',
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: '3px',
        left: value ? '23px' : '3px',
        width: '20px', height: '20px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

// ── % / £ mode pill toggle ────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }) {
  return (
    <div style={{ display: 'flex', background: '#060e20', borderRadius: '10px', padding: '3px', gap: '2px' }}>
      {['%', '£'].map(m => (
        <button
          key={m}
          onClick={() => onChange(m === '%' ? 'percentage' : 'amount')}
          style={{
            background: (m === '%' ? mode === 'percentage' : mode === 'amount') ? '#4edea3' : 'transparent',
            color: (m === '%' ? mode === 'percentage' : mode === 'amount') ? '#003824' : '#bbcabf',
            border: 'none', borderRadius: '7px', padding: '5px 12px',
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

// ── Deduction bar row ─────────────────────────────────────────────────────────

function DeductionRow({ label, value, pct, color }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#bbcabf' }}>{label}</span>
        <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#dae2fd' }}>{fmtFull(value)}</span>
      </div>
      <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(173,198,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

// ── Sankey Diagram ────────────────────────────────────────────────────────────

// ── Main Component ────────────────────────────────────────────────────────────

export default function IncomeCalculator() {
  const { incomes } = useIncomeData();
  const [step, setStep]     = useState(0);
  const [period, setPeriod] = useState('annual'); // 'weekly' | 'monthly' | 'annual'

  // Seed from first employer if available
  const seedSalary = incomes.length > 0 ? (incomes[0].annualSalary || 45000) : 45000;

  // ── Input state ───────────────────────────────────────────────────────────

  const [annualIncome,    setAnnualIncome]    = useState(String(seedSalary));
  const [hasBonus,        setHasBonus]        = useState(false);
  const [bonus,           setBonus]           = useState('');

  const [pensionEnabled,  setPensionEnabled]  = useState(true);
  // Shared mode toggle for both pension amount and employer match
  const [pensionMode,     setPensionMode]     = useState('percentage'); // 'percentage' | 'amount'
  const [pensionAmount,   setPensionAmount]   = useState('5');
  const [pensionScheme,   setPensionScheme]   = useState('salary_sacrifice');
  const [hasEmployerMatch,setHasEmployerMatch]= useState(true);
  const [employerMatch,   setEmployerMatch]   = useState('3');

  const [taxYear,         setTaxYear]         = useState('2026/27');
  const [taxCode,         setTaxCode]         = useState('1257L');
  const [isScotland,      setIsScotland]      = useState(false);

  const [hasStudentLoan,  setHasStudentLoan]  = useState(false);
  const [studentLoanPlan, setStudentLoanPlan] = useState('plan2');

  // ── Save / load parameters ────────────────────────────────────────────────

  const [user,       setUser]       = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'

  // Track auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  // Load saved params once user is known
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'incomePots', user.uid)).then(snap => {
      if (!snap.exists()) return;
      const p = snap.data().calculatorParams;
      if (!p) return;
      if (p.annualIncome    != null) setAnnualIncome(String(p.annualIncome));
      if (p.hasBonus        != null) setHasBonus(p.hasBonus);
      if (p.bonus           != null) setBonus(String(p.bonus));
      if (p.pensionEnabled  != null) setPensionEnabled(p.pensionEnabled);
      if (p.pensionMode     != null) setPensionMode(p.pensionMode);
      if (p.pensionAmount   != null) setPensionAmount(String(p.pensionAmount));
      if (p.pensionScheme   != null) setPensionScheme(p.pensionScheme);
      if (p.hasEmployerMatch!= null) setHasEmployerMatch(p.hasEmployerMatch);
      if (p.employerMatch   != null) setEmployerMatch(String(p.employerMatch));
      if (p.taxYear         != null) setTaxYear(p.taxYear);
      if (p.taxCode         != null) setTaxCode(p.taxCode);
      if (p.isScotland      != null) setIsScotland(p.isScotland);
      if (p.hasStudentLoan  != null) setHasStudentLoan(p.hasStudentLoan);
      if (p.studentLoanPlan != null) setStudentLoanPlan(p.studentLoanPlan);
    }).catch(() => {});
  }, [user]);

  const saveParams = useCallback(async () => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      await setDoc(doc(db, 'incomePots', user.uid), {
        calculatorParams: {
          annualIncome, hasBonus, bonus,
          pensionEnabled, pensionMode, pensionAmount, pensionScheme,
          hasEmployerMatch, employerMatch,
          taxYear,
          taxCode, isScotland,
          hasStudentLoan, studentLoanPlan,
        },
      }, { merge: true });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 2500);
    }
  }, [
    user,
    annualIncome, hasBonus, bonus,
    pensionEnabled, pensionMode, pensionAmount, pensionScheme,
    hasEmployerMatch, employerMatch,
    taxYear,
    taxCode, isScotland,
    hasStudentLoan, studentLoanPlan,
  ]);

  // ── Derived calculation inputs ────────────────────────────────────────────

  const calcInputs = useMemo(() => {
    const income = parseFloat(annualIncome) || 0;

    // Employer match: convert £ → % if in amount mode
    let employerMatchPct = parseFloat(employerMatch) || 0;
    if (pensionMode === 'amount' && income > 0) {
      employerMatchPct = (employerMatchPct / income) * 100;
    }

    return {
      annualIncome:        income,
      bonusAmount:         parseFloat(bonus) || 0,
      hasBonusCommission:  hasBonus,
      taxYear:             taxYear,
      taxCode:             taxCode || '1257L',
      pensionContribution: pensionEnabled ? (parseFloat(pensionAmount) || 0) : 0,
      pensionType:         pensionMode,
      pensionScheme:       pensionScheme,
      employerMatch:       pensionEnabled && hasEmployerMatch ? employerMatchPct : 0,
      hasEmployerMatch:    pensionEnabled && hasEmployerMatch,
      hasStudentLoan,
      studentLoanPlan,
      hasBenefits:         false,
      benefitsList:        [],
    };
  }, [
    annualIncome, hasBonus, bonus,
    pensionEnabled, pensionMode, pensionAmount, pensionScheme,
    hasEmployerMatch, employerMatch,
    taxYear, taxCode, hasStudentLoan, studentLoanPlan,
  ]);

  const results = useMemo(() => calculateIncomeTax(calcInputs), [calcInputs]);

  const income = parseFloat(annualIncome) || 0;
  const canCalculate = income > 0;

  // ─────────────────────────────────────────────────────────────────────────
  // Step 0 — Inputs
  // ─────────────────────────────────────────────────────────────────────────

  if (step === 0) {
    const pensionSuffix = pensionMode === 'percentage' ? '%' : '£';
    const pensionPrefix = pensionMode === 'percentage' ? null : '£';

    return (
      <IncomeLayout>
        <div style={{ padding: '0 0 32px' }}>

          {/* Header */}
          <div style={{ padding: '24px 20px 16px' }}>
            <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Income</p>
            <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
              Calculator
            </h1>
          </div>

          <div style={{ padding: '0 16px' }}>

            {/* ── Monthly Earnings card ── */}
            <div style={{ ...cardStyle, borderLeft: '4px solid #4edea3' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#4edea3', fontSize: '20px' }}>payments</span>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>Monthly Earnings</p>
                </div>
              </div>

              {/* Annual Income */}
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Gross Annual Salary</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#4edea3', fontWeight: 700, fontFamily: 'Manrope, sans-serif', fontSize: '18px', pointerEvents: 'none' }}>£</span>
                  <input
                    type="number"
                    value={annualIncome}
                    onChange={e => setAnnualIncome(e.target.value)}
                    placeholder="45000"
                    style={{ ...inputStyle, paddingLeft: '34px', fontSize: '20px', fontFamily: 'Manrope, sans-serif' }}
                  />
                </div>
                {income > 0 && (
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>
                    {fmtFull(income / 12)} per month gross
                  </p>
                )}
              </div>

              {/* Bonus toggle */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasBonus ? '12px' : 0 }}>
                  <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>I receive bonus / commission</p>
                  <Toggle value={hasBonus} onChange={setHasBonus} />
                </div>
                {hasBonus && (
                  <div style={{ marginTop: '12px', position: 'relative' }}>
                    <label style={labelStyle}>Annual Bonus Amount</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#bbcabf', fontWeight: 700, fontFamily: 'Manrope, sans-serif', pointerEvents: 'none' }}>£</span>
                      <input
                        type="number"
                        value={bonus}
                        onChange={e => setBonus(e.target.value)}
                        placeholder="0"
                        style={{ ...inputStyle, paddingLeft: '30px' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Pension Strategy card ── */}
            <div style={{ ...cardStyle }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: pensionEnabled ? '18px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#ffb95f', fontSize: '20px' }}>savings</span>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>Pension Strategy</p>
                </div>
                <Toggle value={pensionEnabled} onChange={setPensionEnabled} />
              </div>

              {pensionEnabled && (
                <>
                  {/* % / £ mode toggle — applies to both fields */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Input mode</p>
                    <ModeToggle mode={pensionMode} onChange={setPensionMode} />
                  </div>

                  {/* Pension Amount */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Pension Amount</label>
                    <div style={{ position: 'relative' }}>
                      {pensionMode === 'amount' && (
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#ffb95f', fontWeight: 700, fontFamily: 'Manrope, sans-serif', pointerEvents: 'none' }}>£</span>
                      )}
                      <input
                        type="number"
                        value={pensionAmount}
                        onChange={e => setPensionAmount(e.target.value)}
                        placeholder={pensionMode === 'percentage' ? '5' : '2250'}
                        style={{ ...inputStyle, paddingLeft: pensionMode === 'amount' ? '30px' : '16px', paddingRight: pensionMode === 'percentage' ? '40px' : '16px' }}
                      />
                      {pensionMode === 'percentage' && (
                        <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#ffb95f', fontWeight: 700, fontFamily: 'Manrope, sans-serif', pointerEvents: 'none' }}>%</span>
                      )}
                    </div>
                    {income > 0 && (parseFloat(pensionAmount) || 0) > 0 && (
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>
                        {pensionMode === 'percentage'
                          ? `${fmt(income * (parseFloat(pensionAmount) || 0) / 100)} / year employee contribution`
                          : `${((parseFloat(pensionAmount) || 0) / income * 100).toFixed(1)}% of salary`}
                      </p>
                    )}
                  </div>

                  {/* Pension Scheme */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Pension Scheme Type</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={pensionScheme}
                        onChange={e => setPensionScheme(e.target.value)}
                        style={{ ...inputStyle, appearance: 'none', paddingRight: '36px', cursor: 'pointer' }}
                      >
                        {PENSION_SCHEMES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px', pointerEvents: 'none' }}>expand_more</span>
                    </div>
                  </div>

                  {/* Employer Match */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasEmployerMatch ? '12px' : 0 }}>
                      <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>Employer pension match</p>
                      <Toggle value={hasEmployerMatch} onChange={setHasEmployerMatch} />
                    </div>
                    {hasEmployerMatch && (
                      <div style={{ marginTop: '12px' }}>
                        <label style={labelStyle}>Employer Match Amount</label>
                        <div style={{ position: 'relative' }}>
                          {pensionMode === 'amount' && (
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#4edea3', fontWeight: 700, fontFamily: 'Manrope, sans-serif', pointerEvents: 'none' }}>£</span>
                          )}
                          <input
                            type="number"
                            value={employerMatch}
                            onChange={e => setEmployerMatch(e.target.value)}
                            placeholder={pensionMode === 'percentage' ? '3' : '1350'}
                            style={{ ...inputStyle, paddingLeft: pensionMode === 'amount' ? '30px' : '16px', paddingRight: pensionMode === 'percentage' ? '40px' : '16px' }}
                          />
                          {pensionMode === 'percentage' && (
                            <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#4edea3', fontWeight: 700, fontFamily: 'Manrope, sans-serif', pointerEvents: 'none' }}>%</span>
                          )}
                        </div>
                        {income > 0 && (parseFloat(employerMatch) || 0) > 0 && (
                          <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>
                            {pensionMode === 'percentage'
                              ? `${fmt(income * (parseFloat(employerMatch) || 0) / 100)} / year employer contribution`
                              : `${((parseFloat(employerMatch) || 0) / income * 100).toFixed(1)}% of salary`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ── Student Loan card ── */}
            <div style={{ ...cardStyle }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasStudentLoan ? '16px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '20px' }}>school</span>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>Student Loan</p>
                </div>
                <Toggle value={hasStudentLoan} onChange={setHasStudentLoan} />
              </div>
              {hasStudentLoan && (
                <div style={{ position: 'relative' }}>
                  <label style={labelStyle}>Repayment Plan</label>
                  <select
                    value={studentLoanPlan}
                    onChange={e => setStudentLoanPlan(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', paddingRight: '36px', cursor: 'pointer' }}
                  >
                    {STUDENT_LOAN_PLANS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px', pointerEvents: 'none' }}>expand_more</span>
                </div>
              )}
            </div>

            {/* ── Tax Profile card ── */}
            <div style={{ ...cardStyle, borderTop: '4px solid #0566d9' }}>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '12px', color: '#adc6ff', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>
                Taxation Profile
              </p>

              {/* Tax Year */}
              <div style={{ marginBottom: '14px', position: 'relative' }}>
                <label style={labelStyle}>Tax Year</label>
                <select
                  value={taxYear}
                  onChange={e => setTaxYear(e.target.value)}
                  style={{ ...inputStyle, appearance: 'none', paddingRight: '36px', cursor: 'pointer' }}
                >
                  {['2022/23','2023/24','2024/25','2025/26','2026/27'].map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px', pointerEvents: 'none' }}>expand_more</span>
              </div>

              {/* Tax Code */}
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Tax Code</label>
                <input
                  type="text"
                  value={taxCode}
                  onChange={e => setTaxCode(e.target.value.toUpperCase())}
                  placeholder="1257L"
                  style={{ ...inputStyle }}
                />
                <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>
                  1257L is the standard code for {taxYear} (£12,570 personal allowance)
                </p>
              </div>

              {/* Region toggle */}
              <div>
                <label style={labelStyle}>Region</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ label: 'UK Mainland', val: false }, { label: 'Scotland', val: true }].map(r => (
                    <button
                      key={r.label}
                      onClick={() => setIsScotland(r.val)}
                      style={{
                        flex: 1, padding: '10px 12px',
                        background: isScotland === r.val ? 'rgba(5,102,217,0.2)' : '#060e20',
                        border: isScotland === r.val ? '1px solid rgba(173,198,255,0.35)' : '1px solid transparent',
                        borderRadius: '10px', cursor: 'pointer',
                        color: isScotland === r.val ? '#adc6ff' : '#64748b',
                        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
                        transition: 'all 0.15s',
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                {isScotland && (
                  <p style={{ fontSize: '11px', color: '#ffb95f', margin: '6px 0 0' }}>
                    Scottish rate bands coming soon — UK rates applied for now
                  </p>
                )}
              </div>
            </div>

            {/* ── CTA ── */}
            <button
              onClick={() => canCalculate && setStep(1)}
              disabled={!canCalculate}
              style={{
                width: '100%',
                background: canCalculate ? '#4edea3' : '#1a2438',
                color: canCalculate ? '#003824' : '#3d5068',
                border: 'none', borderRadius: '14px', padding: '16px',
                fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px',
                cursor: canCalculate ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginBottom: '12px', transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>analytics</span>
              Calculate Forecast
            </button>

            <button
              onClick={() => {
                setAnnualIncome(String(seedSalary));
                setHasBonus(false); setBonus('');
                setPensionEnabled(true); setPensionMode('percentage');
                setPensionAmount('5'); setPensionScheme('salary_sacrifice');
                setHasEmployerMatch(true); setEmployerMatch('3');
                setTaxCode('1257L'); setIsScotland(false);
                setHasStudentLoan(false); setStudentLoanPlan('plan2');
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
      </IncomeLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1 — Results
  // ─────────────────────────────────────────────────────────────────────────

  const r = results;
  const gross = r.grossIncome;

  // Period scaling
  const PERIODS = [
    { key: 'weekly',  label: 'Weekly',  divisor: 52 },
    { key: 'monthly', label: 'Monthly', divisor: 12 },
    { key: 'annual',  label: 'Annual',  divisor: 1  },
  ];
  const activePeriod = PERIODS.find(p => p.key === period);
  const { divisor } = activePeriod;

  function scale(annualVal) { return annualVal / divisor; }
  function fmtS(annualVal) { return fmtFull(scale(annualVal)); }

  return (
    <IncomeLayout>
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

          {/* ── Period toggle ── */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                className={`tab-btn${period === p.key ? ' active' : ''}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* ── Hero gradient card ── */}
          <div style={{
            background: 'linear-gradient(135deg, #4edea3 0%, #10b981 100%)',
            borderRadius: '20px', padding: '28px 24px', marginBottom: '14px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: '-24px', top: '-24px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', right: '40px', bottom: '-30px', width: '80px', height: '80px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />

            <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(0,56,36,0.65)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px', fontFamily: 'Inter, sans-serif' }}>Income Forecast</p>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '28px', color: '#003824', margin: '0 0 20px' }}>Take-Home Pay</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'rgba(0,56,36,0.7)', margin: '0 0 4px' }}>{activePeriod.label} Take-Home</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '28px', color: '#003824', margin: 0, lineHeight: 1 }}>
                  {fmt(scale(r.takeHomePay))}
                </p>
              </div>
              <div style={{ background: 'rgba(0,56,36,0.1)', borderRadius: '14px', padding: '14px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(0,56,36,0.6)', margin: '0 0 4px' }}>Gross {activePeriod.label}</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '18px', color: '#003824', margin: '0 0 10px' }}>
                  {fmt(scale(r.grossIncome))}
                </p>
                <p style={{ fontSize: '10px', color: 'rgba(0,56,36,0.6)', margin: '0 0 2px' }}>Effective Tax Rate</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#003824', margin: 0 }}>
                  {r.effectiveTaxRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* ── Deduction breakdown ── */}
          <div className="animate-in stagger-1 section-card" style={{ marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 16px' }}>
              Deductions Breakdown
            </h3>

            <DeductionRow
              label="Income Tax"
              value={scale(r.incomeTax)}
              pct={gross > 0 ? (r.incomeTax / gross) * 100 : 0}
              color="#ff6b6b"
            />
            <DeductionRow
              label="National Insurance"
              value={scale(r.nationalInsurance)}
              pct={gross > 0 ? (r.nationalInsurance / gross) * 100 : 0}
              color="#adc6ff"
            />
            {r.studentLoanRepayment > 0 && (
              <DeductionRow
                label="Student Loan"
                value={scale(r.studentLoanRepayment)}
                pct={gross > 0 ? (r.studentLoanRepayment / gross) * 100 : 0}
                color="#f472b6"
              />
            )}
            {r.employeePension > 0 && (
              <DeductionRow
                label="Employee Pension"
                value={scale(r.employeePension)}
                pct={gross > 0 ? (r.employeePension / gross) * 100 : 0}
                color="#ffb95f"
              />
            )}

            <div style={{ borderTop: '1px solid rgba(173,198,255,0.08)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Total Deductions</p>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>{fmtS(r.totalDeductions)}</p>
            </div>
          </div>

          {/* ── Pension summary ── */}
          {(r.employeePension > 0 || r.employerPension > 0) && (
            <div className="animate-in stagger-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div style={{ background: '#222a3d', borderRadius: '16px', padding: '16px', borderLeft: '4px solid #ffb95f' }}>
                <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 8px' }}>Your Contribution</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: '#ffb95f', margin: '0 0 4px' }}>{fmt(scale(r.employeePension))}</p>
              </div>
              <div style={{ background: '#222a3d', borderRadius: '16px', padding: '16px', borderLeft: '4px solid #4edea3' }}>
                <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 8px' }}>Employer Adds</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: '#4edea3', margin: 0 }}>{fmt(scale(r.employerPension))}</p>
              </div>

              {r.totalPensionContribution > 0 && (
                <div style={{ gridColumn: '1 / -1', background: 'rgba(78,222,163,0.06)', border: '1px solid rgba(78,222,163,0.15)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0 }}>Total Pension Pot Growth</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#4edea3', margin: 0 }}>{fmt(scale(r.totalPensionContribution))}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Income summary tiles ── */}
          <div className="animate-in stagger-3 section-card" style={{ marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 14px' }}>
              Income Summary
            </h3>
            {[
              { label: `Gross Income`,          value: fmtS(r.grossIncome),           color: '#dae2fd' },
              { label: 'Personal Allowance',    value: fmt(scale(r.personalAllowance)), color: '#4edea3' },
              { label: `Taxable Income`,        value: fmtS(r.taxableIncome),          color: '#adc6ff' },
              { label: 'Income Tax',            value: fmtS(r.incomeTax),              color: '#ff6b6b' },
              { label: 'National Insurance',    value: fmtS(r.nationalInsurance),      color: '#adc6ff' },
              ...(r.studentLoanRepayment > 0 ? [{ label: 'Student Loan Repayment', value: fmtS(r.studentLoanRepayment), color: '#f472b6' }] : []),
              ...(r.employeePension > 0        ? [{ label: 'Employee Pension',      value: fmtS(r.employeePension),      color: '#ffb95f' }] : []),
              { label: `Take-Home Pay`,         value: fmtS(r.takeHomePay),            color: '#4edea3' },
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

          {/* ── Recalculate ── */}
          <button
            onClick={() => setStep(0)}
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

          <button
            onClick={saveParams}
            disabled={saveStatus === 'saving' || !user}
            style={{
              width: '100%', marginTop: '10px',
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
    </IncomeLayout>
  );
}
