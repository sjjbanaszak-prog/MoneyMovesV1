import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMortgageData } from '../MortgageDataContext';
import MortgageDetailLayout from '../MortgageDetailLayout';

const MORTGAGE_TYPES = [
  { value: 'Residential',      label: 'Residential' },
  { value: 'Buy-to-Let',       label: 'Buy-to-Let' },
  { value: 'Remortgage',       label: 'Remortgage' },
  { value: 'Help to Buy',      label: 'Help to Buy' },
  { value: 'Shared Ownership', label: 'Shared Ownership' },
  { value: 'Right to Buy',     label: 'Right to Buy' },
];

function Field({ label, required, hint, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        fontSize: '12px', color: '#adc6ff', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        display: 'block', marginBottom: '8px',
      }}>
        {label}{required && <span style={{ color: '#ff6b6b', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
      {hint && (
        <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>{hint}</p>
      )}
    </div>
  );
}

function PoundInput({ placeholder, value, onChange, min = '0', step = '1000' }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: '16px', top: '50%',
        transform: 'translateY(-50%)', color: '#64748b',
        fontSize: '18px', fontWeight: 600,
      }}>£</span>
      <input
        type="number"
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        step={step}
        style={{ paddingLeft: '30px' }}
      />
    </div>
  );
}

function PercentInput({ placeholder, value, onChange }) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type="number"
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min="0"
        max="25"
        step="0.01"
        style={{ paddingRight: '36px' }}
      />
      <span style={{
        position: 'absolute', right: '14px', top: '50%',
        transform: 'translateY(-50%)', color: '#64748b',
        fontSize: '14px', fontWeight: 600,
      }}>%</span>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      marginBottom: '16px', marginTop: '4px',
    }}>
      <h3 style={{
        fontFamily: 'Manrope, sans-serif', fontWeight: 800,
        fontSize: '15px', color: '#dae2fd', margin: 0,
      }}>{title}</h3>
      <div style={{ flex: 1, height: '1px', background: 'rgba(173,198,255,0.08)' }} />
    </div>
  );
}

export default function AddMortgage() {
  const navigate = useNavigate();
  const { addMortgage } = useMortgageData();

  // Property
  const [name,             setName]             = useState('');
  const [type,             setType]             = useState('Residential');
  const [lender,           setLender]           = useState('');
  const [purchasePrice,    setPurchasePrice]    = useState('');
  const [outstandingBal,   setOutstandingBal]   = useState('');
  const [monthlyPayment,   setMonthlyPayment]   = useState('');

  // Mortgage term
  const [startDate,        setStartDate]        = useState('');
  const [termYears,        setTermYears]        = useState('');

  // Fixed rate deal
  const [fixedStartDate,   setFixedStartDate]   = useState('');
  const [fixedEndDate,     setFixedEndDate]     = useState('');
  const [interestRate,     setInterestRate]     = useState('');
  const [defaultRate,      setDefaultRate]      = useState('');

  // Mortgage fees
  const [feesEnabled,   setFeesEnabled]   = useState(false);
  const [mortgageFees,  setMortgageFees]  = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = name.trim().length > 0 && lender.trim().length > 0 && !isSaving;

  // Derived preview values
  const propVal    = parseFloat(purchasePrice)  || 0;
  const outstanding = parseFloat(outstandingBal) || 0;
  const equity     = Math.max(0, propVal - outstanding);
  const ltvPct     = propVal > 0 ? Math.round((outstanding / propVal) * 100) : null;

  async function handleConfirm() {
    if (!canSubmit) return;
    setIsSaving(true);

    const newMortgage = {
      name:               name.trim(),
      type,
      lender:             lender.trim(),
      purchasePrice:      propVal,
      propertyValue:      propVal,
      mortgageAmount:     outstanding,
      outstandingBalance: outstanding,
      monthlyPayment:     parseFloat(monthlyPayment) || 0,
      startDate:          startDate || null,
      termYears:          parseInt(termYears, 10) || null,
      fixedRateStartDate: fixedStartDate || null,
      fixedRateEndDate:   fixedEndDate || null,
      interestRate:       parseFloat(interestRate) || null,
      defaultRate:        parseFloat(defaultRate) || null,
      paymentHistory:     [],
      fees:               feesEnabled ? (parseFloat(mortgageFees) || 0) : 0,
    };

    await addMortgage(newMortgage);
    navigate('/mobile/mortgage');
  }

  return (
    <MortgageDetailLayout title="Add Mortgage" backTo="/mobile/mortgage">
      <div style={{ padding: '16px' }}>

        {/* Context pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(78,222,163,0.08)',
          border: '1px solid rgba(78,222,163,0.15)',
          borderRadius: '20px', padding: '4px 12px', marginBottom: '16px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#4edea3' }}>home</span>
          <span style={{ fontSize: '12px', color: '#4edea3', fontWeight: 600 }}>New Mortgage</span>
        </div>

        {/* ---- Property Details ---- */}
        <div className="animate-in stagger-1 section-card" style={{ marginBottom: '16px' }}>
          <SectionHeader title="Property Details" />

          <Field label="Property Address" required>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 12 Oak Street"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </Field>

          <Field label="Mortgage Type">
            <select
              className="input-field"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              {MORTGAGE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Lender" required>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Halifax, Nationwide, Barclays"
              value={lender}
              onChange={e => setLender(e.target.value)}
            />
          </Field>

          <Field label="Purchase Price" hint="The original price you paid for the property">
            <PoundInput placeholder="0" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} />
          </Field>

          <Field label="Total Mortgage Amount" hint="Original mortgage loan amount">
            <PoundInput placeholder="0" value={outstandingBal} onChange={e => setOutstandingBal(e.target.value)} />
          </Field>

          {/* Equity preview */}
          {propVal > 0 && outstanding > 0 && (
            <div style={{
              background: 'rgba(78,222,163,0.06)',
              border: '1px solid rgba(78,222,163,0.12)',
              borderRadius: '10px', padding: '10px 14px',
              display: 'flex', justifyContent: 'space-between',
              marginBottom: '16px',
            }}>
              <div>
                <p style={{ fontSize: '11px', color: '#adc6ff', margin: '0 0 2px' }}>Net Equity</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#4edea3', margin: 0 }}>
                  £{Math.round(equity).toLocaleString('en-GB')}
                </p>
              </div>
              {ltvPct !== null && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: '#adc6ff', margin: '0 0 2px' }}>LTV</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#adc6ff', margin: 0 }}>
                    {ltvPct}%
                  </p>
                </div>
              )}
            </div>
          )}

          <Field label="Monthly Payment" hint="Your regular monthly mortgage payment">
            <PoundInput placeholder="0" value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} step="10" />
          </Field>
        </div>

        {/* ---- Mortgage Fees ---- */}
        <div className="animate-in stagger-2 section-card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: feesEnabled ? '16px' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ color: '#ffb95f', fontSize: '20px' }}>payments</span>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>Include Mortgage Fees</p>
            </div>
            <div
              onClick={() => setFeesEnabled(v => !v)}
              style={{
                width: '46px', height: '26px', borderRadius: '13px',
                background: feesEnabled ? '#4edea3' : '#2d3449',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: '3px',
                left: feesEnabled ? '23px' : '3px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }} />
            </div>
          </div>
          {feesEnabled && (
            <div>
              <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', fontWeight: 600 }}>Mortgage Fees</p>
              <PoundInput
                placeholder="0"
                value={mortgageFees}
                onChange={e => setMortgageFees(e.target.value)}
                step="100"
              />
              <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0', lineHeight: 1.5 }}>
                Fees are added to the total cost of your mortgage but do not affect your property value or equity.
              </p>
            </div>
          )}
        </div>

        {/* ---- Mortgage Term ---- */}
        <div className="animate-in stagger-3 section-card" style={{ marginBottom: '16px' }}>
          <SectionHeader title="Mortgage Term" />

          <Field label="Start Date" hint="When the original mortgage began">
            <input
              type="date"
              className="input-field"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </Field>

          <Field label="Total Term (Years)" hint="Full length of the mortgage, e.g. 25 or 30">
            <input
              type="number"
              className="input-field"
              placeholder="e.g. 25"
              value={termYears}
              onChange={e => setTermYears(e.target.value)}
              min="1"
              max="40"
              step="1"
            />
          </Field>
        </div>

        {/* ---- Fixed Rate Deal ---- */}
        <div className="animate-in stagger-4 section-card" style={{ marginBottom: '16px' }}>
          <SectionHeader title="Fixed Rate Deal" />

          <Field label="Fixed Rate Start Date" hint="When your current fixed deal started">
            <input
              type="date"
              className="input-field"
              value={fixedStartDate}
              onChange={e => setFixedStartDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </Field>

          <Field label="Fixed Rate End Date" hint="When your current fixed deal expires">
            <input
              type="date"
              className="input-field"
              value={fixedEndDate}
              onChange={e => setFixedEndDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </Field>

          <Field label="Current Rate" hint="Your current fixed interest rate">
            <PercentInput placeholder="e.g. 4.25" value={interestRate} onChange={e => setInterestRate(e.target.value)} />
          </Field>

          <Field label="Default Rate (SVR)" hint="The rate you revert to when your fixed deal expires">
            <PercentInput placeholder="e.g. 7.49" value={defaultRate} onChange={e => setDefaultRate(e.target.value)} />
          </Field>
        </div>

        {/* Info box */}
        <div style={{
          background: 'rgba(173,198,255,0.06)',
          border: '1px solid rgba(173,198,255,0.1)',
          borderRadius: '12px', padding: '14px 16px',
          marginBottom: '24px', display: 'flex', gap: '10px', alignItems: 'flex-start',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#adc6ff', flexShrink: 0, marginTop: '1px' }}>info</span>
          <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0, lineHeight: 1.55 }}>
            Fields marked <span style={{ color: '#ff6b6b' }}>*</span> are required. All other details can be updated later from the property's detail page.
          </p>
        </div>

        {/* Confirm */}
        <button
          className="primary-btn"
          onClick={handleConfirm}
          disabled={!canSubmit}
          style={{ opacity: canSubmit ? 1 : 0.5 }}
        >
          {isSaving ? 'Saving…' : 'Confirm Mortgage Provider'}
        </button>

      </div>
    </MortgageDetailLayout>
  );
}
