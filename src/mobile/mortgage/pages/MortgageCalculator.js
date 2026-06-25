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

function balanceAtMonth(balance, annualRate, termMonths, targetMonth, rateChangeMonth = Infinity, rateAfter = null) {
  if (targetMonth <= 0) return balance;
  let r = annualRate / 100 / 12;
  let std = pmt(balance, annualRate, termMonths);
  let bal = balance;
  let rateChanged = false;
  for (let m = 0; m < targetMonth && bal > 0.01; m++) {
    if (!rateChanged && rateAfter != null && m >= rateChangeMonth) {
      r = rateAfter / 100 / 12;
      const rem = Math.max(1, termMonths - m);
      std = pmt(bal, rateAfter, rem);
      rateChanged = true;
    }
    const interest = bal * r;
    bal = Math.max(0, bal - (std - interest));
  }
  return bal;
}

function calcSwitchResult(mortgage, sw) {
  const balance = mortgage.outstandingBalance || 0;
  const rate = parseFloat(mortgage.interestRate) || 0;
  const remaining = calcRemainingMonths(mortgage);
  const defaultRate = mortgage.defaultRate ? parseFloat(mortgage.defaultRate) : null;

  const resolvedFixedEnd = mortgage.fixedRateEndDate ||
    (mortgage.fixedRateStartDate && mortgage.fixedTermYears
      ? (() => {
          const d = new Date(mortgage.fixedRateStartDate);
          d.setFullYear(d.getFullYear() + mortgage.fixedTermYears);
          return d.toISOString().slice(0, 10);
        })()
      : null);

  const rateChangeMonth = defaultRate && resolvedFixedEnd
    ? (() => {
        const now = new Date();
        const end = new Date(resolvedFixedEnd);
        return Math.max(0, (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()));
      })()
    : Infinity;

  const now = new Date();
  const switchDate = sw.newFixedStartDate
    ? new Date(sw.newFixedStartDate)
    : resolvedFixedEnd ? new Date(resolvedFixedEnd) : now;
  const switchMonth = Math.max(0,
    (switchDate.getFullYear() - now.getFullYear()) * 12 + (switchDate.getMonth() - now.getMonth())
  );

  const balAtSwitch = balanceAtMonth(balance, rate, remaining, switchMonth, rateChangeMonth, defaultRate);

  const newRate = parseFloat(sw.newRate) || rate;
  const newRevertRate = parseFloat(sw.newRevertRate) || defaultRate || rate;
  const remainingAfterSwitch = Math.max(12, remaining - switchMonth);
  const newTermMonths = sw.termResetEnabled && parseFloat(sw.newTermYears)
    ? Math.round(parseFloat(sw.newTermYears) * 12)
    : remainingAfterSwitch;

  let newFixedMonths;
  if (sw.newFixedStartDate && sw.newFixedEndDate) {
    const d1 = new Date(sw.newFixedStartDate);
    const d2 = new Date(sw.newFixedEndDate);
    newFixedMonths = Math.max(1, (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()));
  } else {
    newFixedMonths = 24;
  }

  const ercVal = parseFloat(sw.fees.ercValue) || 0;
  // ERC is always on the outstanding balance being repaid to the current lender
  const ercAmt = sw.fees.ercType === 'percentage' ? (ercVal / 100) * balAtSwitch : ercVal;
  const arrangementFee = parseFloat(sw.fees.arrangementFee) || 0;
  const valuationFee = parseFloat(sw.fees.valuationFee) || 0;
  const legalFee = parseFloat(sw.fees.legalFee) || 0;
  const brokerFee = parseFloat(sw.fees.brokerFee) || 0;
  const exitFee = parseFloat(sw.fees.exitFee) || 0;
  const cashback = parseFloat(sw.fees.cashback) || 0;
  const grossFees = ercAmt + arrangementFee + valuationFee + legalFee + brokerFee + exitFee;
  const totalFees = grossFees - cashback;
  // For remortgage, user may specify a slightly different new loan amount
  const newMortgageBase = (sw.switchType === 'remortgage' && parseFloat(sw.newMortgageAmount))
    ? parseFloat(sw.newMortgageAmount)
    : balAtSwitch;
  const newLoan = sw.fees.addToLoan ? newMortgageBase + Math.max(0, totalFees) : newMortgageBase;
  const upfrontCost = sw.fees.addToLoan
    ? Math.max(0, exitFee + brokerFee - cashback)
    : Math.max(0, totalFees);

  const hasTopUp = sw.switchType === 'new_property' && parseFloat(sw.topUpAmount) > 0;
  const topUpAmt = hasTopUp ? parseFloat(sw.topUpAmount) : 0;
  const topUpRate = hasTopUp ? (parseFloat(sw.topUpRate) || newRate) : 0;
  const topUpFixedMonths = hasTopUp ? (parseFloat(sw.topUpFixedTermYears) * 12 || newFixedMonths) : 0;
  const topUpRevertRate = hasTopUp ? (parseFloat(sw.topUpRevertRate) || newRevertRate) : 0;
  const topUpResult = hasTopUp
    ? runAmortization(topUpAmt, topUpRate, newTermMonths, 0, 0, -1, topUpFixedMonths, topUpRevertRate)
    : null;
  const topUpMonthly = hasTopUp ? pmt(topUpAmt, topUpRate, newTermMonths) : 0;

  const switched = runAmortization(newLoan, newRate, newTermMonths, 0, 0, -1, newFixedMonths, newRevertRate);
  const svrRate = defaultRate || rate;
  const stayOnSvr = runAmortization(balAtSwitch, svrRate, remainingAfterSwitch, 0, 0, -1);

  const newMonthlyFixed = Math.round(pmt(newLoan, newRate, newTermMonths) + topUpMonthly);
  const svrMonthly = Math.round(pmt(balAtSwitch, svrRate, remainingAfterSwitch));
  const monthlySaving = svrMonthly - newMonthlyFixed;

  const totalInterestSwitched = switched.totalInterest + (topUpResult ? topUpResult.totalInterest : 0);
  const totalInterestNoSwitch = stayOnSvr.totalInterest;
  const interestSavedGross = totalInterestNoSwitch - totalInterestSwitched;
  const netSaving = interestSavedGross - totalFees;

  let breakEvenMonth = null;
  if (upfrontCost > 0 && monthlySaving > 0) {
    breakEvenMonth = Math.ceil(upfrontCost / monthlySaving);
  }

  return {
    balAtSwitch: Math.round(balAtSwitch),
    ercAmt: Math.round(ercAmt),
    totalFees: Math.round(totalFees),
    upfrontCost: Math.round(upfrontCost),
    newLoan: Math.round(newLoan),
    cashback: Math.round(cashback),
    switchMonth,
    newFixedMonths,
    newMonthlyFixed,
    svrMonthly,
    monthlySaving,
    totalInterestSwitched: Math.round(totalInterestSwitched),
    totalInterestNoSwitch: Math.round(totalInterestNoSwitch),
    interestSavedGross: Math.round(interestSavedGross),
    netSaving: Math.round(netSaving),
    breakEvenMonth,
    switched,
    stayOnSvr,
    newRate,
    newRevertRate,
    newTermMonths,
    hasTopUp,
    topUpAmt,
    svrRate,
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

// ── Balance Projection Chart (Overpayment) ────────────────────────────────────

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
          <pattern id="gridPat" width="64" height="30" patternUnits="userSpaceOnUse">
            <path d="M 64 0 L 0 0 0 30" fill="none" stroke="rgba(60,74,66,0.3)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#gridPat)" opacity="0.5" />
        <path d={`M ${toX(0)},${H} L ${oPts} L ${toX(payoffYear)},${H} Z`} fill="url(#calcAreaGrad)" />
        <path d={`M ${bPts}`} fill="none" stroke="rgba(134,148,138,0.5)" strokeWidth="2" strokeDasharray="5 3" />
        <path d={`M ${oPts}`} fill="none" stroke="#4edea3" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={fpX} cy={toY(0)} r={5} fill="#4edea3" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingRight: '2px' }}>
        {xTicks.map(y => (
          <span key={y} style={{ fontSize: '9px', color: '#475569', fontWeight: 600, textTransform: 'uppercase' }}>Yr {y}</span>
        ))}
      </div>
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

// ── Deal Switch Chart ─────────────────────────────────────────────────────────

function SwitchChart({ switched, stayOnSvr }) {
  const W = 320, H = 120;
  const maxYears = Math.max(Math.ceil(switched.months / 12), Math.ceil(stayOnSvr.months / 12));
  if (maxYears < 2) return null;

  const sMap = {}, svMap = {};
  switched.yearlySnapshots.forEach(s => { sMap[s.year] = s.balance; });
  stayOnSvr.yearlySnapshots.forEach(s => { svMap[s.year] = s.balance; });

  const sSeries = [], svSeries = [];
  for (let y = 0; y <= maxYears; y++) {
    sSeries.push(sMap[y] !== undefined ? sMap[y] : 0);
    svSeries.push(svMap[y] !== undefined ? svMap[y] : 0);
  }

  const n = sSeries.length;
  const maxVal = Math.max(...sSeries, ...svSeries, 1);
  const toX = i => (i / (n - 1)) * W;
  const toY = v => H - (v / maxVal) * (H - 14) - 7;

  const sPts = sSeries.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' L ');
  const svPts = svSeries.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' L ');

  const xTicks = [];
  for (let y = 0; y <= maxYears; y += 5) xTicks.push(y);
  if (xTicks[xTicks.length - 1] !== maxYears) xTicks.push(maxYears);

  return (
    <>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="switchAreaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4edea3" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#4edea3" stopOpacity="0" />
          </linearGradient>
          <pattern id="swGridPat" width="64" height="30" patternUnits="userSpaceOnUse">
            <path d="M 64 0 L 0 0 0 30" fill="none" stroke="rgba(60,74,66,0.3)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#swGridPat)" opacity="0.5" />
        <path d={`M ${toX(0)},${H} L ${sPts} L ${toX(n - 1)},${H} Z`} fill="url(#switchAreaGrad)" />
        <path d={`M ${svPts}`} fill="none" stroke="rgba(134,148,138,0.45)" strokeWidth="2" strokeDasharray="5 3" />
        <path d={`M ${sPts}`} fill="none" stroke="#4edea3" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingRight: '2px' }}>
        {xTicks.map(y => (
          <span key={y} style={{ fontSize: '9px', color: '#475569', fontWeight: 600, textTransform: 'uppercase' }}>Yr {y}</span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '18px', height: '0', border: '1px dashed rgba(134,148,138,0.55)' }} />
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>Stay on SVR</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '2px', background: '#4edea3', borderRadius: '1px' }} />
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>New Deal</span>
        </div>
      </div>
    </>
  );
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

// ── Switch form sub-components (must be at module level to avoid focus loss) ──

function Toggle({ on, onToggle }) {
  return (
    <div onClick={onToggle} style={{ width: '46px', height: '26px', borderRadius: '13px', background: on ? '#4edea3' : '#2d3449', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', left: on ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
    </div>
  );
}

function FieldLabel({ children }) {
  return <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', fontWeight: 600 }}>{children}</p>;
}

function PoundInput({ label, value, onChange, placeholder = '0' }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#bbcabf', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>£</span>
        <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, paddingLeft: '28px', fontSize: '16px' }} />
      </div>
    </div>
  );
}

function PctInput({ label, value, onChange }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ position: 'relative' }}>
        <input type="number" step="0.01" value={value} onChange={e => onChange(e.target.value)} placeholder="0.00" style={{ ...inputStyle, paddingRight: '34px', fontSize: '16px' }} />
        <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700, fontSize: '14px' }}>%</span>
      </div>
    </div>
  );
}

const DEFAULT_SWITCH = {
  switchType: 'product_transfer',
  newFixedStartDate: '',
  newFixedEndDate: '',
  newRate: '',
  newRevertRate: '',
  newMortgageAmount: '',
  termResetEnabled: false,
  newTermYears: '',
  fees: {
    ercType: 'percentage',
    ercValue: '',
    arrangementFee: '',
    valuationFee: '',
    legalFee: '',
    brokerFee: '',
    exitFee: '',
    cashback: '',
    addToLoan: false,
  },
  topUpAmount: '',
  topUpRate: '',
  topUpFixedTermYears: '',
  topUpRevertRate: '',
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function MortgageCalculator() {
  const navigate = useNavigate();
  const { mortgages } = useMortgageData();

  const [step, setStep] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [activeMode, setActiveMode] = useState(0); // 0 = Overpayment, 1 = Switch

  React.useEffect(() => {
    if (mortgages.length === 1) setSelectedIdx(0);
  }, [mortgages]);

  // Overpayment state
  const [overpayAmt, setOverpayAmt]       = useState('');
  const [overpayFreq, setOverpayFreq]     = useState('monthly');
  const [oneOffEnabled, setOneOffEnabled] = useState(false);
  const [oneOffAmt, setOneOffAmt]         = useState('');
  const [oneOffDate, setOneOffDate]       = useState('');

  // Switch state
  const [switchInputs, setSwitchInputs] = useState(DEFAULT_SWITCH);

  const updateSwitch    = (field, value) => setSwitchInputs(prev => ({ ...prev, [field]: value }));
  const updateSwitchFees = (field, value) => setSwitchInputs(prev => ({ ...prev, fees: { ...prev.fees, [field]: value } }));

  // Sandbox (no saved mortgage) state — selectedIdx === -1 means sandbox is active
  const [sandboxMortgage, setSandboxMortgage] = useState(null);
  const [sandboxForm, setSandboxForm] = useState({
    name: '', lender: '', amount: '', rate: '', termYears: '', fixedTermYears: '', svrRate: '',
  });
  const updateSandbox = (field, val) => setSandboxForm(prev => ({ ...prev, [field]: val }));

  const applySandboxForm = () => {
    if (!sandboxForm.amount || !sandboxForm.rate || !sandboxForm.termYears) return;
    const today = new Date().toISOString().slice(0, 10);
    const m = {
      name: sandboxForm.name || 'New Mortgage',
      lender: sandboxForm.lender || 'TBC',
      type: 'Residential',
      outstandingBalance: parseFloat(sandboxForm.amount),
      interestRate: parseFloat(sandboxForm.rate),
      termYears: parseFloat(sandboxForm.termYears),
      startDate: today,
      fixedRateStartDate: today,
      fixedTermYears: sandboxForm.fixedTermYears ? parseFloat(sandboxForm.fixedTermYears) : null,
      defaultRate: sandboxForm.svrRate ? parseFloat(sandboxForm.svrRate) : null,
      _isSandbox: true,
    };
    setSandboxMortgage(m);
    setSelectedIdx(-1);
    setStep(2);
  };

  // activeMode: 0 = New Mortgage, 1 = Overpayment, 2 = Switch
  // Auto-select New Mortgage tab when user has no saved mortgages
  const userSetMode = React.useRef(false);
  React.useEffect(() => {
    if (userSetMode.current) return;
    setActiveMode(mortgages.length > 0 ? 1 : 0);
  }, [mortgages]);

  // selectedIdx === -1 → sandbox; null → nothing selected; ≥0 → real mortgage
  const selectedMortgage = selectedIdx === -1 ? sandboxMortgage : (selectedIdx !== null ? mortgages[selectedIdx] : null);

  // Auto-populate switch start date from mortgage fixed end date
  React.useEffect(() => {
    if (!selectedMortgage) return;
    const resolvedEnd = selectedMortgage.fixedRateEndDate ||
      (selectedMortgage.fixedRateStartDate && selectedMortgage.fixedTermYears
        ? (() => {
            const d = new Date(selectedMortgage.fixedRateStartDate);
            d.setFullYear(d.getFullYear() + selectedMortgage.fixedTermYears);
            return d.toISOString().slice(0, 10);
          })()
        : '');
    setSwitchInputs(prev => ({
      ...prev,
      newFixedStartDate: prev.newFixedStartDate || resolvedEnd || '',
      newRevertRate: prev.newRevertRate || (selectedMortgage.defaultRate ? String(selectedMortgage.defaultRate) : ''),
    }));
  }, [selectedMortgage]); // eslint-disable-line

  // Overpayment calculation
  const calc = useMemo(() => {
    if (!selectedMortgage) return null;

    const balance   = selectedMortgage.outstandingBalance || 0;
    const rate      = selectedMortgage.interestRate || 0;
    const remaining = calcRemainingMonths(selectedMortgage);

    const defaultRate = selectedMortgage.defaultRate ? parseFloat(selectedMortgage.defaultRate) : null;
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

    const monthsSaved   = Math.max(0, baseline.months - overpaid.months);
    const interestSaved = Math.max(0, baseline.totalInterest - overpaid.totalInterest);
    const now     = new Date();
    const origEnd = new Date(now.getFullYear(), now.getMonth() + baseline.months);
    const newEnd  = new Date(now.getFullYear(), now.getMonth() + overpaid.months);

    let cumSavings = 0;
    const tableRows = [];
    const maxRows = Math.min(overpaid.yearlyTable.length, 10);
    for (let i = 0; i < maxRows; i++) {
      const opRow   = overpaid.yearlyTable[i];
      const baseRow = baseline.yearlyTable[i];
      const saving  = baseRow ? Math.max(0, baseRow.interestPaid - opRow.interestPaid) : 0;
      cumSavings += saving;
      tableRows.push({ ...opRow, cumulativeSavings: Math.round(cumSavings) });
    }

    const tipResult = runAmortization(balance, rate, remaining, extraMonthly + 50, oneOff, oneOffMonthIdx, rateChangeMonth, defaultRate);
    const tipMonthsSaved = Math.max(0, overpaid.months - tipResult.months);

    return {
      baseline, overpaid,
      monthsSaved, interestSaved,
      origEnd, newEnd,
      tableRows, tipMonthsSaved,
      hasOverpayment: extraMonthly > 0 || oneOff > 0,
      remaining, rateChangeMonth, defaultRate,
    };
  }, [selectedMortgage, overpayAmt, overpayFreq, oneOffEnabled, oneOffAmt, oneOffDate]);

  // Switch calculation
  const switchCalc = useMemo(() => {
    if (!selectedMortgage || !switchInputs.newRate) return null;
    try { return calcSwitchResult(selectedMortgage, switchInputs); } catch { return null; }
  }, [selectedMortgage, switchInputs]);

  // ── Step 0 — Select Property / New Mortgage ───────────────────────────────

  if (step === 0) {
    const hasMortgages = mortgages.length > 0;
    const sandboxReady = !!(sandboxForm.amount && sandboxForm.rate && sandboxForm.termYears);
    const canContinue = activeMode === 0 ? sandboxReady : selectedIdx !== null;

    const tabs = [
      { label: 'New Mortgage', idx: 0, disabled: false },
      { label: 'Overpayment',  idx: 1, disabled: !hasMortgages },
      { label: 'Switch',       idx: 2, disabled: !hasMortgages },
    ];

    return (
      <MortgageLayout>
        <div style={{ padding: '0 0 32px' }}>

          <div style={{ padding: '24px 20px 16px' }}>
            <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Mortgages</p>
            <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
              Calculator
            </h1>
          </div>

          {/* Three-tab pill selector */}
          <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {tabs.map(({ label, idx, disabled }) => (
              <button
                key={label}
                className={`tab-btn${activeMode === idx ? ' active' : ''}`}
                onClick={() => { if (!disabled) { userSetMode.current = true; setActiveMode(idx); } }}
                style={{ opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer', width: '100%', textAlign: 'center' }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: '0 20px 16px' }}>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              {activeMode === 0
                ? "Enter your mortgage details to model payments and overpayment strategies."
                : activeMode === 1
                ? 'Choose a mortgage to model your overpayment strategy.'
                : 'Choose a mortgage to model a product switch or remortgage.'}
            </p>
          </div>

          <div style={{ padding: '0 16px' }}>

            {/* ── New Mortgage tab — inline form ── */}
            {activeMode === 0 && (
              <div style={{ ...cardStyle }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: '#1a2438', borderRadius: '10px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '22px' }}>calculate</span>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 2px' }}>Model a mortgage</p>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>No account needed — results are not saved</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <FieldLabel>Label (optional)</FieldLabel>
                    <input type="text" value={sandboxForm.name} onChange={e => updateSandbox('name', e.target.value)} placeholder="e.g. First Home" style={{ ...inputStyle, fontSize: '14px' }} />
                  </div>
                  <div>
                    <FieldLabel>Lender (optional)</FieldLabel>
                    <input type="text" value={sandboxForm.lender} onChange={e => updateSandbox('lender', e.target.value)} placeholder="e.g. Nationwide" style={{ ...inputStyle, fontSize: '14px' }} />
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <FieldLabel>Mortgage Amount</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#bbcabf', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>£</span>
                    <input type="number" value={sandboxForm.amount} onChange={e => updateSandbox('amount', e.target.value)} placeholder="200000" style={{ ...inputStyle, paddingLeft: '28px', fontSize: '18px' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <PctInput label="Interest Rate" value={sandboxForm.rate} onChange={v => updateSandbox('rate', v)} />
                  <div>
                    <FieldLabel>Term (Years)</FieldLabel>
                    <input type="number" value={sandboxForm.termYears} onChange={e => updateSandbox('termYears', e.target.value)} placeholder="25" style={{ ...inputStyle, fontSize: '16px' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <FieldLabel>Fixed For (Yrs)</FieldLabel>
                    <input type="number" step="0.5" value={sandboxForm.fixedTermYears} onChange={e => updateSandbox('fixedTermYears', e.target.value)} placeholder="e.g. 2" style={{ ...inputStyle, fontSize: '16px' }} />
                  </div>
                  <PctInput label="SVR After (opt)" value={sandboxForm.svrRate} onChange={v => updateSandbox('svrRate', v)} />
                </div>
              </div>
            )}

            {/* ── Overpayment / Switch tab — saved mortgage list ── */}
            {activeMode !== 0 && mortgages.map((m, i) => {
              const sel = selectedIdx === i;
              return (
                <button key={i} onClick={() => setSelectedIdx(i)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: sel ? '#222a3d' : '#171f33', borderRadius: '16px', padding: '20px', marginBottom: '12px', border: sel ? '2px solid #4edea3' : '2px solid transparent', boxShadow: sel ? '0 4px 20px rgba(78,222,163,0.12)' : 'none', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: sel ? '#10b981' : '#2d3449', borderRadius: '10px', padding: '8px', display: 'flex' }}>
                        <span className="material-symbols-outlined" style={{ color: sel ? '#003824' : '#adc6ff', fontSize: '20px' }}>{propertyIcon(m.type)}</span>
                      </div>
                      <div>
                        <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 2px' }}>{m.name}</p>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{m.type || 'Residential'} · {m.lender}</p>
                      </div>
                    </div>
                    {sel && <span className="material-symbols-outlined" style={{ color: '#4edea3', fontSize: '22px' }}>check_circle</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outstanding Balance</p>
                      <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '22px', color: sel ? '#4edea3' : '#dae2fd', margin: 0 }}>{fmtCcy(m.outstandingBalance || 0)}</p>
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
              onClick={() => { if (!canContinue) return; activeMode === 0 ? applySandboxForm() : setStep(1); }}
              disabled={!canContinue}
              style={{ width: '100%', background: canContinue ? '#4edea3' : '#1a2438', color: canContinue ? '#003824' : '#3d5068', border: 'none', borderRadius: '14px', padding: '16px', fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', cursor: canContinue ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
            >
              {activeMode === 0 ? 'Model this mortgage' : 'Select and Continue'}
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_forward</span>
            </button>
          </div>

        </div>
      </MortgageLayout>
    );
  }

  // ── Step 1 — Overpayment Inputs (activeMode 0 = new mortgage, 1 = overpayment) ──

  if (step === 1 && activeMode !== 2) {
    const m = selectedMortgage;
    const remaining = m ? calcRemainingMonths(m) : 0;

    return (
      <MortgageLayout>
        <div style={{ padding: '0 0 32px' }}>

          <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setStep(0)} style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '20px' }}>arrow_back</span>
            </button>
            <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>Select Mortgage</p>
          </div>

          <div style={{ padding: '16px 16px 0' }}>

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
                    {m?.defaultRate && <span style={{ color: '#ffb95f' }}> → {m.defaultRate}%</span>}
                    {' '}/ {Math.round(remaining / 12)}yr
                  </p>
                  {m?.defaultRate && (() => {
                    const end = m.fixedRateEndDate ||
                      (m.fixedRateStartDate && m.fixedTermYears
                        ? (() => { const d = new Date(m.fixedRateStartDate); d.setFullYear(d.getFullYear() + m.fixedTermYears); return d.toISOString(); })()
                        : null);
                    return end ? <p style={{ fontSize: '10px', color: '#ffb95f', margin: '3px 0 0' }}>Deal expires {new Date(end).toLocaleString('en-GB', { month: 'short', year: 'numeric' })}</p> : null;
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
                    <button key={f} onClick={() => setOverpayFreq(f)} style={{ background: overpayFreq === f ? '#4edea3' : 'transparent', color: overpayFreq === f ? '#003824' : '#bbcabf', border: 'none', borderRadius: '8px', padding: '5px 10px', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.15s' }}>{f}</button>
                  ))}
                </div>
              </div>

              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#bbcabf', fontWeight: 700, fontFamily: 'Manrope, sans-serif', fontSize: '20px', pointerEvents: 'none' }}>£</span>
                <input type="number" value={overpayAmt} onChange={e => setOverpayAmt(e.target.value)} placeholder="0.00" style={{ ...inputStyle, paddingLeft: '34px', fontSize: '22px', fontFamily: 'Manrope, sans-serif' }} />
              </div>

              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                {overpayFreq === 'monthly'
                  ? `${fmtCcy((parseFloat(overpayAmt) || 0) * 12)} per year in total overpayments`
                  : `${fmtCcy(Math.round((parseFloat(overpayAmt) || 0) / 12))} per month equivalent`}
              </p>

              <div style={{ marginTop: '16px' }}>
                <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px', fontWeight: 600 }}>Payment Timing</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ position: 'relative' }}>
                    <input type="number" placeholder="Day" min="1" max="28" defaultValue="1" style={{ ...inputStyle, fontSize: '15px', paddingRight: '44px' }} />
                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Day</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <select defaultValue="0" style={{ ...inputStyle, fontSize: '14px', appearance: 'none', paddingRight: '36px', cursor: 'pointer' }}>
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
                <div onClick={() => setOneOffEnabled(v => !v)} style={{ width: '46px', height: '26px', borderRadius: '13px', background: oneOffEnabled ? '#4edea3' : '#2d3449', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: '3px', left: oneOffEnabled ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                </div>
              </div>
              {oneOffEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', fontWeight: 600 }}>Amount</p>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#bbcabf', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>£</span>
                      <input type="number" value={oneOffAmt} onChange={e => setOneOffAmt(e.target.value)} placeholder="0" style={{ ...inputStyle, paddingLeft: '28px', fontSize: '16px', padding: '12px 12px 12px 28px' }} />
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', fontWeight: 600 }}>Target Date</p>
                    <input type="date" value={oneOffDate} onChange={e => setOneOffDate(e.target.value)} style={{ ...inputStyle, fontSize: '13px', padding: '12px' }} />
                  </div>
                </div>
              )}
            </div>

            {calc && calc.tipMonthsSaved > 0 && (
              <div style={{ background: 'rgba(255,185,95,0.05)', border: '1px solid rgba(255,185,95,0.2)', borderRadius: '14px', padding: '16px', marginBottom: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ background: '#e29100', borderRadius: '10px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: '#472a00', fontSize: '22px' }}>tips_and_updates</span>
                </div>
                <div>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '13px', color: '#ffb95f', margin: '0 0 4px' }}>Smart Optimisation Tip</p>
                  <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0, lineHeight: '1.6' }}>
                    Increasing your monthly overpayment by just <span style={{ color: '#dae2fd', fontWeight: 700 }}>£50</span> more would reduce your term by an additional <span style={{ color: '#dae2fd', fontWeight: 700 }}>{fmtMonths(calc.tipMonthsSaved)}</span> based on current rates.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!calc?.hasOverpayment}
              style={{ width: '100%', background: calc?.hasOverpayment ? '#4edea3' : '#1a2438', color: calc?.hasOverpayment ? '#003824' : '#3d5068', border: 'none', borderRadius: '14px', padding: '16px', fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', cursor: calc?.hasOverpayment ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px', transition: 'all 0.2s' }}
            >
              Calculate Savings
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>trending_up</span>
            </button>

            <button
              onClick={() => { setOverpayAmt(''); setOneOffEnabled(false); setOneOffAmt(''); setOneOffDate(''); setOverpayFreq('monthly'); }}
              style={{ width: '100%', background: 'transparent', border: '1px solid rgba(173,198,255,0.12)', borderRadius: '14px', padding: '14px', color: '#64748b', fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
            >
              Reset Form
            </button>

          </div>
        </div>
      </MortgageLayout>
    );
  }

  // ── Step 1 — Switch Inputs ─────────────────────────────────────────────────

  if (step === 1 && activeMode === 2) {
    const m = selectedMortgage;
    const sw = switchInputs;
    const isPT = sw.switchType === 'product_transfer';
    const isRM = sw.switchType === 'remortgage';
    const isNP = sw.switchType === 'new_property';
    const canCalculate = sw.newRate !== '';

    return (
      <MortgageLayout>
        <div style={{ padding: '0 0 40px' }}>

          <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setStep(0)} style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '20px' }}>arrow_back</span>
            </button>
            <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>Select Mortgage</p>
          </div>

          <div style={{ padding: '16px 16px 0' }}>

            {/* Active property summary */}
            <div style={{ background: '#222a3d', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px', borderLeft: '4px solid #adc6ff' }}>
              <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Modelling Switch For</p>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: '0 0 12px' }}>{m?.name}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Balance</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>{fmtCcy(m?.outstandingBalance || 0)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Rate</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>
                    {m?.interestRate || 0}%
                    {m?.defaultRate && <span style={{ color: '#ffb95f' }}> → {m.defaultRate}%</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Switch type */}
            <div style={{ ...cardStyle }}>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 12px' }}>Switch Type</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { val: 'product_transfer', label: 'Product Transfer', sub: 'Same lender, same property — minimal fees' },
                  { val: 'remortgage', label: 'Remortgage', sub: 'New lender, same property — full fee set' },
                  { val: 'new_property', label: 'Property Port', sub: 'Same lender, moving house — may need top-up' },
                ].map(({ val, label, sub }) => (
                  <button key={val} onClick={() => updateSwitch('switchType', val)} style={{ textAlign: 'left', padding: '12px 14px', borderRadius: '12px', width: '100%', background: sw.switchType === val ? 'rgba(173,198,255,0.08)' : '#060e20', border: sw.switchType === val ? '1.5px solid #adc6ff' : '1.5px solid transparent', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: sw.switchType === val ? '#adc6ff' : '#dae2fd', margin: '0 0 2px' }}>{label}</p>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* New deal dates + rates */}
            <div style={{ ...cardStyle }}>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 16px' }}>New Deal</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <FieldLabel>Start Date</FieldLabel>
                  <input type="date" value={sw.newFixedStartDate} onChange={e => updateSwitch('newFixedStartDate', e.target.value)} style={{ ...inputStyle, fontSize: '13px', padding: '12px' }} />
                </div>
                <div>
                  <FieldLabel>End Date</FieldLabel>
                  <input type="date" value={sw.newFixedEndDate} onChange={e => updateSwitch('newFixedEndDate', e.target.value)} style={{ ...inputStyle, fontSize: '13px', padding: '12px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: isRM ? '12px' : 0 }}>
                <PctInput label="New Fixed Rate" value={sw.newRate} onChange={v => updateSwitch('newRate', v)} />
                <PctInput label="SVR After" value={sw.newRevertRate} onChange={v => updateSwitch('newRevertRate', v)} />
              </div>
              {isRM && (
                <div>
                  <FieldLabel>New Mortgage Amount (optional)</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#bbcabf', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>£</span>
                    <input
                      type="number"
                      value={sw.newMortgageAmount}
                      onChange={e => updateSwitch('newMortgageAmount', e.target.value)}
                      placeholder={switchCalc ? String(switchCalc.balAtSwitch) : 'e.g. 215000'}
                      style={{ ...inputStyle, paddingLeft: '28px', fontSize: '16px' }}
                    />
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>
                    Leave blank to use the projected balance at switch date
                    {switchCalc ? ` (${fmtCcy(switchCalc.balAtSwitch)})` : ''}.
                    Round up if needed.
                  </p>
                </div>
              )}
            </div>

            {/* Term reset */}
            <div style={{ ...cardStyle }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: sw.termResetEnabled ? '16px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '20px' }}>timer</span>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>Reset Mortgage Term</p>
                </div>
                <Toggle on={sw.termResetEnabled} onToggle={() => updateSwitch('termResetEnabled', !sw.termResetEnabled)} />
              </div>
              {sw.termResetEnabled && (
                <div>
                  <FieldLabel>New Term (Years)</FieldLabel>
                  <input type="number" value={sw.newTermYears} onChange={e => updateSwitch('newTermYears', e.target.value)} placeholder="25" style={{ ...inputStyle, fontSize: '18px' }} />
                </div>
              )}
            </div>

            {/* Top-up (new property only) */}
            {isNP && (
              <div style={{ ...cardStyle }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#ffb95f', fontSize: '20px' }}>add_home</span>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>Top-up Borrowing</p>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px', lineHeight: 1.5 }}>Extra amount needed for the new property.</p>
                <PoundInput label="Top-up Amount" value={sw.topUpAmount} onChange={v => updateSwitch('topUpAmount', v)} />
                {parseFloat(sw.topUpAmount) > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                    <PctInput label="Top-up Rate" value={sw.topUpRate} onChange={v => updateSwitch('topUpRate', v)} />
                    <PctInput label="Top-up SVR" value={sw.topUpRevertRate} onChange={v => updateSwitch('topUpRevertRate', v)} />
                    <div>
                      <FieldLabel>Top-up Fixed (Yrs)</FieldLabel>
                      <input type="number" step="0.5" value={sw.topUpFixedTermYears} onChange={e => updateSwitch('topUpFixedTermYears', e.target.value)} placeholder="2" style={{ ...inputStyle, fontSize: '16px' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fees */}
            <div style={{ ...cardStyle }}>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 16px' }}>Fees</p>

              {/* ERC */}
              <div style={{ marginBottom: '16px' }}>
                <FieldLabel>Early Repayment Charge</FieldLabel>
                <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 10px' }}>Only applies if switching before your current deal end date.</p>
                <div style={{ display: 'flex', background: '#060e20', borderRadius: '10px', padding: '3px', gap: '2px', width: 'fit-content', marginBottom: '10px' }}>
                  {[['percentage', '% of balance'], ['fixed', '£ fixed']].map(([val, lbl]) => (
                    <button key={val} onClick={() => updateSwitchFees('ercType', val)} style={{ background: sw.fees.ercType === val ? '#ffb95f' : 'transparent', color: sw.fees.ercType === val ? '#472a00' : '#bbcabf', border: 'none', borderRadius: '8px', padding: '5px 12px', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{lbl}</button>
                  ))}
                </div>
                <div style={{ position: 'relative' }}>
                  {sw.fees.ercType === 'fixed' && <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#bbcabf', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>£</span>}
                  <input type="number" step={sw.fees.ercType === 'percentage' ? '0.01' : '1'} value={sw.fees.ercValue} onChange={e => updateSwitchFees('ercValue', e.target.value)} placeholder="0" style={{ ...inputStyle, paddingLeft: sw.fees.ercType === 'fixed' ? '28px' : '16px', paddingRight: sw.fees.ercType === 'percentage' ? '34px' : '16px', fontSize: '16px' }} />
                  {sw.fees.ercType === 'percentage' && <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700, fontSize: '14px' }}>%</span>}
                </div>
              </div>

              {/* Arrangement fee — all types */}
              <div style={{ marginBottom: (isRM || isNP) ? '12px' : 0 }}>
                <PoundInput label="Arrangement / Product Fee" value={sw.fees.arrangementFee} onChange={v => updateSwitchFees('arrangementFee', v)} />
              </div>

              {/* Extra fees for Remortgage / New Property */}
              {(isRM || isNP) && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <PoundInput label="Valuation Fee" value={sw.fees.valuationFee} onChange={v => updateSwitchFees('valuationFee', v)} />
                    <PoundInput label="Legal / Conveyancing" value={sw.fees.legalFee} onChange={v => updateSwitchFees('legalFee', v)} />
                    <PoundInput label="Broker Fee" value={sw.fees.brokerFee} onChange={v => updateSwitchFees('brokerFee', v)} />
                    {isRM && <PoundInput label="Exit / Deeds Fee" value={sw.fees.exitFee} onChange={v => updateSwitchFees('exitFee', v)} />}
                  </div>
                  {isRM && (
                    <div style={{ marginBottom: '14px' }}>
                      <PoundInput label="Cashback from New Lender" value={sw.fees.cashback} onChange={v => updateSwitchFees('cashback', v)} />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#060e20', borderRadius: '12px', padding: '14px 16px' }}>
                    <div>
                      <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#dae2fd', margin: '0 0 2px' }}>Add fees to loan</p>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Capitalise fees — lower upfront cost, higher balance</p>
                    </div>
                    <Toggle on={sw.fees.addToLoan} onToggle={() => updateSwitchFees('addToLoan', !sw.fees.addToLoan)} />
                  </div>
                </>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={() => setStep(2)}
              disabled={!canCalculate}
              style={{ width: '100%', background: canCalculate ? '#adc6ff' : '#1a2438', color: canCalculate ? '#060e20' : '#3d5068', border: 'none', borderRadius: '14px', padding: '16px', fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', cursor: canCalculate ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px', transition: 'all 0.2s' }}
            >
              Calculate Switch Savings
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>swap_horiz</span>
            </button>

            <button onClick={() => setSwitchInputs({ ...DEFAULT_SWITCH })} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(173,198,255,0.12)', borderRadius: '14px', padding: '14px', color: '#64748b', fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
              Reset Form
            </button>

          </div>
        </div>
      </MortgageLayout>
    );
  }

  // ── Step 2 — Switch Results ────────────────────────────────────────────────

  if (activeMode === 2) {
    if (!switchCalc) { setStep(1); return null; }
    const sc = switchCalc;
    const switchTypeLabel = { product_transfer: 'Product Transfer', remortgage: 'Remortgage', new_property: 'Property Port' }[switchInputs.switchType] || 'Switch';

    return (
      <MortgageLayout>
        <div style={{ padding: '0 0 32px' }}>

          <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setStep(1)} style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '20px' }}>arrow_back</span>
            </button>
            <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>Calculator</p>
          </div>

          <div style={{ padding: '0 16px', marginTop: '8px' }}>

            {/* Hero card */}
            <div style={{ background: 'linear-gradient(135deg, #2d4fd6 0%, #1a3aaa 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-24px', top: '-24px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(173,198,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px', fontFamily: 'Inter, sans-serif' }}>{switchTypeLabel}</p>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: '0 0 20px' }}>Deal Switch Analysis</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(173,198,255,0.6)', margin: '0 0 4px' }}>Balance at Switch</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: '#dae2fd', margin: 0 }}>{fmtCcy(sc.balAtSwitch)}</p>
                  {sc.switchMonth > 0 && <p style={{ fontSize: '10px', color: 'rgba(173,198,255,0.5)', margin: '4px 0 0' }}>in {fmtMonths(sc.switchMonth)}</p>}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(173,198,255,0.6)', margin: '0 0 4px' }}>New Monthly</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: '#4edea3', margin: 0 }}>{fmtCcy(sc.newMonthlyFixed)}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(173,198,255,0.5)', margin: '4px 0 0' }}>at {sc.newRate}%</p>
                </div>
              </div>
            </div>

            {/* Monthly comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div style={{ background: '#222a3d', borderRadius: '16px', padding: '16px', borderLeft: '4px solid rgba(134,148,138,0.5)' }}>
                <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 8px' }}>Stay on SVR</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: '#dae2fd', margin: 0 }}>{fmtCcy(sc.svrMonthly)}</p>
                <p style={{ fontSize: '10px', color: '#64748b', margin: '4px 0 0' }}>per month at {sc.svrRate}%</p>
              </div>
              <div style={{ background: sc.monthlySaving >= 0 ? 'rgba(78,222,163,0.06)' : 'rgba(248,113,113,0.06)', borderRadius: '16px', padding: '16px', borderLeft: `4px solid ${sc.monthlySaving >= 0 ? '#4edea3' : '#f87171'}` }}>
                <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 8px' }}>Monthly {sc.monthlySaving >= 0 ? 'Saving' : 'Extra Cost'}</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: sc.monthlySaving >= 0 ? '#4edea3' : '#f87171', margin: 0 }}>
                  {sc.monthlySaving >= 0 ? '' : '-'}{fmtCcy(Math.abs(sc.monthlySaving))}
                </p>
                <p style={{ fontSize: '10px', color: '#64748b', margin: '4px 0 0' }}>vs staying on SVR</p>
              </div>
            </div>

            {/* Interest comparison */}
            <div style={{ background: '#171f33', borderRadius: '16px', padding: '20px', marginBottom: '14px', borderLeft: '4px solid #0566d9' }}>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 14px' }}>Total Interest Comparison</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(45,52,73,0.8)' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 600 }}>Stay on SVR</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '18px', color: '#dae2fd', margin: 0 }}>{fmtCcy(sc.totalInterestNoSwitch)}</p>
                </div>
                <span className="material-symbols-outlined" style={{ color: '#64748b', fontSize: '20px' }}>arrow_forward</span>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: '#4edea3', margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 600 }}>New Deal</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '18px', color: sc.totalInterestSwitched < sc.totalInterestNoSwitch ? '#4edea3' : '#f87171', margin: 0 }}>{fmtCcy(sc.totalInterestSwitched)}</p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>Gross interest saving</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: sc.interestSavedGross >= 0 ? '#4edea3' : '#f87171', margin: 0 }}>
                  {sc.interestSavedGross >= 0 ? '+' : ''}{fmtCcy(sc.interestSavedGross)}
                </p>
              </div>
            </div>

            {/* Fees summary */}
            {sc.totalFees !== 0 && (
              <div style={{ background: '#171f33', borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 12px' }}>Fees</p>
                {sc.ercAmt > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#bbcabf' }}>Early Repayment Charge</span>
                    <span style={{ fontSize: '13px', color: '#f87171', fontWeight: 700 }}>-{fmtCcy(sc.ercAmt)}</span>
                  </div>
                )}
                {sc.cashback > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#bbcabf' }}>Cashback</span>
                    <span style={{ fontSize: '13px', color: '#4edea3', fontWeight: 700 }}>+{fmtCcy(sc.cashback)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(45,52,73,0.8)', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#dae2fd', fontWeight: 700 }}>Total fees</span>
                  <span style={{ fontSize: '13px', color: '#ffb95f', fontWeight: 700 }}>{fmtCcy(Math.abs(sc.totalFees))}</span>
                </div>
                {sc.upfrontCost > 0 && sc.upfrontCost !== sc.totalFees && (
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0' }}>Upfront cost: {fmtCcy(sc.upfrontCost)} (remainder added to loan)</p>
                )}
              </div>
            )}

            {/* Net saving */}
            <div style={{ background: sc.netSaving >= 0 ? 'linear-gradient(135deg, rgba(78,222,163,0.1) 0%, rgba(16,185,129,0.06) 100%)' : 'rgba(248,113,113,0.06)', border: `1px solid ${sc.netSaving >= 0 ? 'rgba(78,222,163,0.25)' : 'rgba(248,113,113,0.25)'}`, borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
              <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 8px' }}>Net saving after all fees</p>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '30px', color: sc.netSaving >= 0 ? '#4edea3' : '#f87171', margin: 0 }}>
                {sc.netSaving >= 0 ? '' : '-'}{fmtCcy(Math.abs(sc.netSaving))}
              </p>
              {sc.netSaving < 0 && <p style={{ fontSize: '11px', color: '#f87171', margin: '8px 0 0' }}>Fees exceed interest saved — consider staying on your current deal.</p>}
            </div>

            {/* Break-even */}
            {sc.breakEvenMonth !== null && (
              <div style={{ background: '#171f33', borderRadius: '16px', padding: '16px 20px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#e29100', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: '#472a00', fontSize: '24px' }}>timeline</span>
                </div>
                <div>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '14px', color: '#ffb95f', margin: '0 0 2px' }}>Break-even Point</p>
                  <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0, lineHeight: 1.5 }}>
                    You recoup upfront fees after <span style={{ color: '#dae2fd', fontWeight: 700 }}>{fmtMonths(sc.breakEvenMonth)}</span> of monthly savings.
                  </p>
                </div>
              </div>
            )}

            {/* Top-up note */}
            {sc.hasTopUp && (
              <div style={{ background: 'rgba(173,198,255,0.05)', border: '1px solid rgba(173,198,255,0.15)', borderRadius: '14px', padding: '14px 16px', marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', color: '#adc6ff', margin: '0 0 4px', fontWeight: 700 }}>Top-up Borrowing Included</p>
                <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0 }}>
                  Additional {fmtCcy(sc.topUpAmt)} borrowed — monthly payment and interest totals include both portions.
                </p>
              </div>
            )}

            {/* Balance chart */}
            <div className="animate-in stagger-1 section-card" style={{ margin: '0 0 14px' }}>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: '0 0 14px' }}>Balance After Switch Date</h3>
              <SwitchChart switched={sc.switched} stayOnSvr={sc.stayOnSvr} />
            </div>

            <button onClick={() => setStep(1)} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(173,198,255,0.15)', borderRadius: '14px', padding: '14px', color: '#dae2fd', fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>tune</span>
              Adjust Parameters
            </button>

          </div>
        </div>
      </MortgageLayout>
    );
  }

  // ── Step 2 — Overpayment / New Mortgage Results ───────────────────────────

  if (!calc) { setStep(activeMode === 0 ? 0 : 1); return null; }

  const { baseline, overpaid, monthsSaved, interestSaved, origEnd, newEnd, tableRows,
          rateChangeMonth, defaultRate: calcDefaultRate } = calc;

  const m = selectedMortgage;
  const isSandbox = activeMode === 0;
  const hasReversion = calcDefaultRate != null && rateChangeMonth < Infinity;
  const missingSVRData = !isSandbox && (m?.defaultRate || m?.interestRate) && !hasReversion;
  const backStep = isSandbox ? 0 : 1;
  const monthlyPayment = Math.round(pmt(m?.outstandingBalance || 0, m?.interestRate || 0, calcRemainingMonths(m)));

  return (
    <MortgageLayout>
      <div style={{ padding: '0 0 32px' }}>

        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setStep(backStep)} style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '20px' }}>arrow_back</span>
          </button>
          <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>Calculator</p>
        </div>

        <div style={{ padding: '0 16px', marginTop: '8px' }}>

          {hasReversion ? (
            <div style={{ background: 'rgba(78,222,163,0.06)', border: '1px solid rgba(78,222,163,0.15)', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ color: '#4edea3', fontSize: '18px', flexShrink: 0 }}>check_circle</span>
              <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0, lineHeight: 1.5 }}>
                Modelled at <span style={{ color: '#dae2fd', fontWeight: 700 }}>{m?.interestRate}%</span> for {rateChangeMonth} months, then <span style={{ color: '#ffb95f', fontWeight: 700 }}>{calcDefaultRate}% SVR</span> for the remainder
              </p>
            </div>
          ) : missingSVRData ? (
            <div style={{ background: 'rgba(255,185,95,0.06)', border: '1px solid rgba(255,185,95,0.2)', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ color: '#ffb95f', fontSize: '18px', flexShrink: 0 }}>warning</span>
              <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0, lineHeight: 1.5 }}>
                Modelled at a single rate of <span style={{ color: '#dae2fd', fontWeight: 700 }}>{m?.interestRate}%</span>. Add a <span style={{ color: '#ffb95f', fontWeight: 700 }}>Fixed Rate End Date</span> to model the SVR switch.
              </p>
            </div>
          ) : null}

          {/* Hero card — New Mortgage view */}
          {isSandbox ? (
            <div style={{ background: 'linear-gradient(135deg, #2d4fd6 0%, #1a3aaa 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-24px', top: '-24px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(173,198,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px', fontFamily: 'Inter, sans-serif' }}>Mortgage Summary</p>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: '0 0 20px' }}>{m?.name || 'New Mortgage'}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(173,198,255,0.6)', margin: '0 0 4px' }}>Monthly Payment</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '24px', color: '#4edea3', margin: 0 }}>{fmtCcy(monthlyPayment)}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(173,198,255,0.5)', margin: '4px 0 0' }}>at {m?.interestRate}%</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(173,198,255,0.6)', margin: '0 0 4px' }}>Mortgage Free</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: '#dae2fd', margin: 0 }}>{fmtDate(origEnd)}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(173,198,255,0.5)', margin: '4px 0 0' }}>{fmtMonths(baseline.months)} remaining</p>
                </div>
              </div>
            </div>
          ) : (
            /* Hero card — Overpayment view */
            <div style={{ background: 'linear-gradient(135deg, #4edea3 0%, #10b981 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-24px', top: '-24px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', right: '40px', bottom: '-30px', width: '80px', height: '80px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(0,56,36,0.65)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px', fontFamily: 'Inter, sans-serif' }}>Projection Results</p>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '28px', color: '#003824', margin: '0 0 20px' }}>Mortgage Freedom</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'stretch' }}>
                <div>
                  <p style={{ fontSize: '12px', color: 'rgba(0,56,36,0.7)', margin: '0 0 4px' }}>Interest Saved</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '28px', color: '#003824', margin: '0 0 14px', lineHeight: 1 }}>{fmtCcy(interestSaved)}</p>
                  <div style={{ background: 'rgba(0,56,36,0.1)', borderRadius: '10px', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ color: '#003824', fontSize: '16px' }}>timer</span>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '12px', color: '#003824' }}>{fmtMonths(monthsSaved)} saved</span>
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
          )}

          {/* Key stats — New Mortgage only */}
          {isSandbox && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div style={{ background: '#222a3d', borderRadius: '16px', padding: '16px', borderLeft: '4px solid #0566d9' }}>
                <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 8px' }}>Total Interest</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '22px', color: '#adc6ff', margin: 0 }}>{fmtCcy(baseline.totalInterest)}</p>
                <p style={{ fontSize: '10px', color: '#64748b', margin: '4px 0 0' }}>over {m?.termYears || 25} years</p>
              </div>
              <div style={{ background: '#222a3d', borderRadius: '16px', padding: '16px', borderLeft: '4px solid #e29100' }}>
                <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 8px' }}>Total Cost</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '22px', color: '#ffb95f', margin: 0 }}>{fmtCcy(baseline.totalPaid)}</p>
                <p style={{ fontSize: '10px', color: '#64748b', margin: '4px 0 0' }}>principal + interest</p>
              </div>
            </div>
          )}

          {/* Balance chart */}
          <div className="animate-in stagger-1 section-card" style={{ margin: '0 0 14px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: '0 0 14px' }}>Balance Projection</h3>
            <BalanceChart baseline={baseline} overpaid={overpaid} />
          </div>

          {/* Impact breakdown — Overpayment only */}
          {!isSandbox && (
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
          )}

          {/* Yearly trajectory table */}
          <div className="animate-in stagger-2 section-card" style={{ margin: '0 0 14px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>Yearly Trajectory</h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>First {tableRows.length} yrs</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'rgba(45,52,73,0.5)' }}>
                    {(isSandbox ? ['Year', 'Balance', 'Principal', 'Interest'] : ['Year', 'Balance', 'Principal', 'Interest', 'Saved']).map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
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
                      {!isSandbox && <td style={{ padding: '10px 12px', color: '#4edea3', fontWeight: 700, whiteSpace: 'nowrap' }}>+{fmtK(row.cumulativeSavings)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={() => setStep(backStep)} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(173,198,255,0.15)', borderRadius: '14px', padding: '14px', color: '#dae2fd', fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>tune</span>
            {isSandbox ? 'Edit Mortgage Details' : 'Adjust Parameters'}
          </button>

        </div>
      </div>
    </MortgageLayout>
  );
}
