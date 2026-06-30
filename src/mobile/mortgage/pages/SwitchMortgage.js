import React, { useState, useMemo } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useMortgageData } from '../MortgageDataContext';
import MortgageDetailLayout from '../MortgageDetailLayout';

function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}
function fmtFull(n) {
  return '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(n) {
  return (n || 0).toFixed(2) + '%';
}

const labelStyle = {
  fontSize: '12px', color: '#adc6ff', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  display: 'block', marginBottom: '8px',
};
const hintStyle = { fontSize: '11px', color: '#64748b', margin: '6px 0 0' };

function MoneyInput({ label, value, onChange, hint, placeholder = '0.00' }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px', fontWeight: 600 }}>£</span>
        <input
          type="number"
          className="input-field"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          min="0"
          step="0.01"
          style={{ paddingLeft: '30px' }}
        />
      </div>
      {hint && <p style={hintStyle}>{hint}</p>}
    </div>
  );
}

function RateInput({ label, value, onChange, hint }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="number"
          className="input-field"
          placeholder="0.00"
          value={value}
          onChange={e => onChange(e.target.value)}
          min="0"
          step="0.01"
          style={{ paddingRight: '36px' }}
        />
        <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>%</span>
      </div>
      {hint && <p style={hintStyle}>{hint}</p>}
    </div>
  );
}

function SummaryRow({ label, value, valueColor, borderTop }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: borderTop ? '12px' : 0,
      marginTop: borderTop ? '12px' : 0,
      borderTop: borderTop ? '1px solid rgba(173,198,255,0.08)' : 'none',
      marginBottom: '10px',
    }}>
      <span style={{ fontSize: '13px', color: '#bbcabf' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 700, color: valueColor || '#dae2fd' }}>{value}</span>
    </div>
  );
}

export default function SwitchMortgage() {
  const { idx }                          = useParams();
  const navigate                         = useNavigate();
  const { mortgages, switchMortgage }    = useMortgageData();

  const mortgage = mortgages[Number(idx)];
  if (!mortgage) return <Navigate to="/mobile/mortgage" replace />;

  const today = new Date().toISOString().slice(0, 10);

  // ── Redemption Statement ─────────────────────────────────────────────────
  const [redemptionBalance, setRedemptionBalance] = useState(
    String(Math.round(mortgage.outstandingBalance || 0))
  );
  const [erc,      setErc]      = useState('0');
  const [exitFee,  setExitFee]  = useState('0');

  // ── Completion Statement ─────────────────────────────────────────────────
  const [completionDate,   setCompletionDate]   = useState(today);
  const [newLender,        setNewLender]        = useState('');
  const [newAdvance,       setNewAdvance]       = useState('');
  const [newRate,          setNewRate]          = useState('');
  const [newDefaultRate,   setNewDefaultRate]   = useState('');
  const [newTermYears,     setNewTermYears]     = useState(
    String(mortgage.termYears || '')
  );
  const [newFixedTermYears, setNewFixedTermYears] = useState('');
  const [newFixedEndDate,   setNewFixedEndDate]   = useState('');
  const [newMonthlyPayment, setNewMonthlyPayment] = useState('');
  const [feesOnCompletion,  setFeesOnCompletion]  = useState('0');

  // ── Confirm step ─────────────────────────────────────────────────────────
  const [confirming, setConfirming] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState(null);

  // ── Derived values ───────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const rBal     = parseFloat(redemptionBalance) || 0;
    const rErc     = parseFloat(erc)               || 0;
    const rExit    = parseFloat(exitFee)           || 0;
    const totalRedemption = rBal + rErc + rExit;

    const advance  = parseFloat(newAdvance)         || 0;
    const fees     = parseFloat(feesOnCompletion)   || 0;

    const netBalance      = advance - totalRedemption - fees;
    const isEquityRelease = netBalance > 0;
    const isTopUp         = netBalance < 0;

    const propertyValue   = mortgage.propertyValue || 0;
    const newLtv          = propertyValue > 0 ? (advance / propertyValue) * 100 : 0;
    const oldLtv          = propertyValue > 0
      ? ((mortgage.outstandingBalance || 0) / propertyValue) * 100
      : 0;
    const newEquity       = propertyValue - advance;
    const oldEquity       = propertyValue - (mortgage.outstandingBalance || 0);

    return {
      totalRedemption,
      netBalance,
      isEquityRelease,
      isTopUp,
      newLtv,
      oldLtv,
      newEquity,
      oldEquity,
      advance,
      fees,
    };
  }, [
    redemptionBalance, erc, exitFee,
    newAdvance, feesOnCompletion,
    mortgage.outstandingBalance, mortgage.propertyValue,
  ]);

  const canComplete = (
    newLender.trim() &&
    parseFloat(newAdvance) > 0 &&
    parseFloat(newRate) > 0 &&
    parseFloat(newTermYears) > 0 &&
    parseFloat(newMonthlyPayment) > 0 &&
    completionDate
  );

  async function handleCompleteSwitch() {
    if (!canComplete || saving) return;
    setSaving(true);
    setError(null);
    try {
      await switchMortgage(Number(idx), {
        switchDate: completionDate,
        redemption: {
          outstandingBalance:    parseFloat(redemptionBalance) || 0,
          earlyRepaymentCharge: parseFloat(erc)               || 0,
          exitFee:              parseFloat(exitFee)           || 0,
          totalRedemptionAmount: calc.totalRedemption,
        },
        completion: {
          newLender:          newLender.trim(),
          newMortgageAdvance: parseFloat(newAdvance)         || 0,
          newInterestRate:    parseFloat(newRate)            || 0,
          newDefaultRate:     parseFloat(newDefaultRate)     || 0,
          newTermYears:       parseFloat(newTermYears)       || 0,
          newFixedTermYears:  parseFloat(newFixedTermYears)  || 0,
          newFixedRateEndDate: newFixedEndDate || null,
          newMonthlyPayment:  parseFloat(newMonthlyPayment) || 0,
          feesPayableOnCompletion: parseFloat(feesOnCompletion) || 0,
        },
        cashReleasedToClient: calc.netBalance,
      });
      navigate(`/mobile/mortgage/${idx}`);
    } catch (e) {
      setError('Failed to complete the switch. Please try again.');
      setSaving(false);
    }
  }

  return (
    <MortgageDetailLayout title="Switch Mortgage" backTo={`/mobile/mortgage/${idx}`}>
      <div style={{ padding: '16px', paddingBottom: '40px' }}>

        {/* Property pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(78,222,163,0.08)', border: '1px solid rgba(78,222,163,0.15)',
          borderRadius: '20px', padding: '4px 12px', marginBottom: '20px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#4edea3' }}>home</span>
          <span style={{ fontSize: '12px', color: '#4edea3', fontWeight: 600 }}>{mortgage.name}</span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>·</span>
          <span style={{ fontSize: '12px', color: '#bbcabf' }}>{mortgage.lender}</span>
        </div>

        {/* ── Redemption Statement ── */}
        <div className="animate-in stagger-1 section-card" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,185,95,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ffb95f' }}>description</span>
            </div>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>
              Redemption Statement
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px' }}>
            Provided by your current lender ({mortgage.lender})
          </p>

          <MoneyInput
            label="Outstanding Balance"
            value={redemptionBalance}
            onChange={setRedemptionBalance}
            hint={`Current recorded balance: ${fmt(mortgage.outstandingBalance)}`}
          />
          <MoneyInput
            label="Early Repayment Charge (ERC)"
            value={erc}
            onChange={setErc}
            hint="Enter 0 if not applicable"
          />
          <MoneyInput
            label="Mortgage Exit Fee"
            value={exitFee}
            onChange={setExitFee}
            hint="Also called a deeds release or sealing fee"
          />

          {/* Redemption total */}
          <div style={{
            background: 'rgba(255,185,95,0.06)', border: '1px solid rgba(255,185,95,0.15)',
            borderRadius: '10px', padding: '12px 14px', marginTop: '4px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#bbcabf' }}>Total to redeem</span>
              <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '18px', color: '#ffb95f' }}>
                {fmtFull(calc.totalRedemption)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Completion Statement ── */}
        <div className="animate-in stagger-2 section-card" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(78,222,163,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#4edea3' }}>task</span>
            </div>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>
              Completion Statement
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px' }}>
            Provided by your new mortgage lender
          </p>

          {/* Completion date */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Completion Date</label>
            <input
              type="date"
              className="input-field"
              value={completionDate}
              onChange={e => setCompletionDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
            <p style={hintStyle}>
              Can be a future date — redemption statements are issued for a specific transfer date
            </p>
          </div>

          {/* New lender */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>New Lender</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Nationwide"
              value={newLender}
              onChange={e => setNewLender(e.target.value)}
            />
          </div>

          <MoneyInput
            label="New Mortgage Advance"
            value={newAdvance}
            onChange={setNewAdvance}
            hint="The total amount advanced by the new lender"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <RateInput
              label="Initial Rate"
              value={newRate}
              onChange={setNewRate}
            />
            <RateInput
              label="Reversion Rate"
              value={newDefaultRate}
              onChange={setNewDefaultRate}
              hint="Rate after fixed term"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Term (Years)</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g. 25"
                value={newTermYears}
                onChange={e => setNewTermYears(e.target.value)}
                min="1" max="40" step="1"
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Fixed Term (Years)</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g. 5"
                value={newFixedTermYears}
                onChange={e => setNewFixedTermYears(e.target.value)}
                min="0" max="15" step="1"
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Fixed Rate End Date (optional)</label>
            <input
              type="date"
              className="input-field"
              value={newFixedEndDate}
              onChange={e => setNewFixedEndDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
            <p style={hintStyle}>Leave blank to calculate from fixed term length</p>
          </div>

          <MoneyInput
            label="New Monthly Payment"
            value={newMonthlyPayment}
            onChange={setNewMonthlyPayment}
          />

          <MoneyInput
            label="Fees Payable on Completion"
            value={feesOnCompletion}
            onChange={setFeesOnCompletion}
            hint="Valuation, legal, and other fees paid separately (not added to mortgage)"
          />
        </div>

        {/* ── Switch Summary ── */}
        <div className="animate-in stagger-3 section-card" style={{ marginBottom: '12px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 16px' }}>
            Switch Summary
          </h3>

          <SummaryRow label="Total to redeem"    value={fmtFull(calc.totalRedemption)} valueColor="#ffb95f" />
          <SummaryRow label="New mortgage advance" value={fmt(calc.advance)}          valueColor="#4edea3" />
          <SummaryRow label="Fees on completion"  value={fmt(calc.fees)}              valueColor="#adc6ff" />

          {/* Net position */}
          <div style={{
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px',
            marginTop: '4px',
            background: calc.netBalance > 0
              ? 'rgba(78,222,163,0.07)'
              : calc.netBalance < 0
                ? 'rgba(255,185,95,0.07)'
                : 'rgba(173,198,255,0.05)',
            border: `1px solid ${
              calc.netBalance > 0
                ? 'rgba(78,222,163,0.2)'
                : calc.netBalance < 0
                  ? 'rgba(255,185,95,0.2)'
                  : 'rgba(173,198,255,0.1)'
            }`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#bbcabf' }}>
                {calc.isEquityRelease ? 'Cash released to you'
                  : calc.isTopUp    ? 'Due from you on completion'
                  : 'Net balance'}
              </span>
              <span style={{
                fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px',
                color: calc.isEquityRelease ? '#4edea3' : calc.isTopUp ? '#ffb95f' : '#dae2fd',
              }}>
                {calc.netBalance === 0 ? '£0'
                  : calc.isEquityRelease ? `+${fmt(calc.netBalance)}`
                  : fmt(Math.abs(calc.netBalance))}
              </span>
            </div>
            {calc.isEquityRelease && (
              <p style={{ fontSize: '11px', color: '#4edea3', margin: '6px 0 0', opacity: 0.8 }}>
                You are releasing equity from your property
              </p>
            )}
            {calc.isTopUp && (
              <p style={{ fontSize: '11px', color: '#ffb95f', margin: '6px 0 0', opacity: 0.8 }}>
                The new advance doesn't fully cover the redemption — you'll need to pay the difference
              </p>
            )}
          </div>

          {/* Equity & LTV comparison */}
          {mortgage.propertyValue > 0 && calc.advance > 0 && (
            <>
              <div style={{ height: '1px', background: 'rgba(173,198,255,0.07)', marginBottom: '14px' }} />
              <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Impact on Equity</p>
              <SummaryRow
                label="Current equity"
                value={`${fmt(calc.oldEquity)} (${(100 - calc.oldLtv).toFixed(0)}%)`}
                valueColor="#adc6ff"
              />
              <SummaryRow
                label="Equity after switch"
                value={`${fmt(calc.newEquity)} (${(100 - calc.newLtv).toFixed(0)}%)`}
                valueColor={calc.newEquity >= calc.oldEquity ? '#4edea3' : '#ffb95f'}
              />
              <SummaryRow
                label="New LTV"
                value={pct(calc.newLtv)}
                valueColor={calc.newLtv > calc.oldLtv ? '#ffb95f' : '#4edea3'}
              />
            </>
          )}
        </div>

        {/* Equity release info box */}
        {calc.isEquityRelease && calc.advance > 0 && (
          <div style={{
            display: 'flex', gap: '12px', alignItems: 'flex-start',
            background: 'rgba(173,198,255,0.05)',
            border: '1px solid rgba(173,198,255,0.1)',
            borderRadius: '12px', padding: '14px 16px',
            marginBottom: '16px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#adc6ff', flexShrink: 0, marginTop: '1px' }}>info</span>
            <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0, lineHeight: 1.55 }}>
              Equity release increases your outstanding balance and LTV. Your full payment history will be retained and equity calculations will continue from the new balance.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p style={{ fontSize: '13px', color: '#ffb4ab', margin: '0 0 16px', textAlign: 'center' }}>{error}</p>
        )}

        {/* ── Confirm step ── */}
        {!confirming ? (
          <button
            className="primary-btn"
            onClick={() => setConfirming(true)}
            disabled={!canComplete}
            style={{ opacity: canComplete ? 1 : 0.45, marginBottom: '8px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>swap_horiz</span>
            Review & Complete Switch
          </button>
        ) : (
          <div style={{
            background: 'rgba(78,222,163,0.05)',
            border: '1px solid rgba(78,222,163,0.2)',
            borderRadius: '14px', padding: '16px',
            marginBottom: '16px',
          }}>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '14px', color: '#dae2fd', margin: '0 0 8px' }}>
              Confirm switch: {mortgage.lender} → {newLender || '…'}
            </p>
            <p style={{ fontSize: '13px', color: '#bbcabf', margin: '0 0 16px', lineHeight: 1.55 }}>
              This will archive your current mortgage details and set the new mortgage as active. Your full payment history will be retained.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleCompleteSwitch}
                disabled={saving}
                style={{
                  flex: 2, background: '#4edea3', color: '#003824',
                  border: 'none', borderRadius: '10px',
                  padding: '12px', fontFamily: 'Manrope, sans-serif',
                  fontWeight: 800, fontSize: '14px', cursor: saving ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                {saving ? 'Completing…' : 'Complete Switch'}
                {!saving && <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={saving}
                style={{
                  flex: 1, background: 'rgba(173,198,255,0.08)', color: '#adc6ff',
                  border: '1px solid rgba(173,198,255,0.15)', borderRadius: '10px',
                  padding: '12px', fontFamily: 'Manrope, sans-serif',
                  fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {!canComplete && (
          <p style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', margin: '4px 0 0' }}>
            Complete all required fields to continue
          </p>
        )}

      </div>
    </MortgageDetailLayout>
  );
}
