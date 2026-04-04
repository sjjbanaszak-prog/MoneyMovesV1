import React, { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useMortgageData } from '../MortgageDataContext';
import MortgageDetailLayout from '../MortgageDetailLayout';

const PAYMENT_TYPES = [
  { value: 'monthly',     label: 'Monthly Payment' },
  { value: 'overpayment', label: 'Regular Overpayment' },
  { value: 'lump_sum',    label: 'Lump Sum Overpayment' },
  { value: 'fee',         label: 'Arrangement Fee' },
  { value: 'other',       label: 'Other' },
];

function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}
function fmtFull(n) {
  return '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AddMortgagePayment() {
  const { idx }                        = useParams();
  const navigate                       = useNavigate();
  const { mortgages, updateMortgage }  = useMortgageData();

  const mortgage = mortgages[Number(idx)];
  if (!mortgage) return <Navigate to="/mobile/mortgage" replace />;

  const [amount,   setAmount]   = useState('');
  const [date,     setDate]     = useState(new Date().toISOString().split('T')[0]);
  const [type,     setType]     = useState('monthly');
  const [notes,    setNotes]    = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const amountNum = parseFloat(amount) || 0;

  // Calendar-year total from this mortgage's payment history
  const currentYear = new Date().getFullYear();
  const ytdTotal = (mortgage.paymentHistory || []).reduce((s, p) => {
    if (!p.date) return s;
    return new Date(p.date).getFullYear() === currentYear ? s + (p.amount || 0) : s;
  }, 0);
  const previewYtd = ytdTotal + amountNum;

  async function handleConfirm() {
    if (isSaving || amountNum <= 0) return;
    setIsSaving(true);

    const typeLabel = PAYMENT_TYPES.find(t => t.value === type)?.label || type;
    const newPayment = {
      date,
      amount: amountNum,
      description: typeLabel,
      type,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    const existingHistory = mortgage.paymentHistory || [];
    await updateMortgage(Number(idx), {
      paymentHistory: [...existingHistory, newPayment],
    });

    navigate(`/mobile/mortgage/${idx}`);
  }

  return (
    <MortgageDetailLayout title="Add Payment" backTo={`/mobile/mortgage/${idx}`}>
      <div style={{ padding: '16px' }}>

        {/* Property context pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(78,222,163,0.08)',
          border: '1px solid rgba(78,222,163,0.15)',
          borderRadius: '20px',
          padding: '4px 12px',
          marginBottom: '16px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#4edea3' }}>home</span>
          <span style={{ fontSize: '12px', color: '#4edea3', fontWeight: 600 }}>{mortgage.name}</span>
        </div>

        {/* Form Card */}
        <div className="animate-in stagger-1 section-card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 20px' }}>
            Payment Details
          </h3>

          {/* Amount */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Amount (£)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px', fontWeight: 600 }}>£</span>
              <input
                type="number"
                className="input-field"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0"
                step="0.01"
                style={{ paddingLeft: '30px' }}
              />
            </div>
            {mortgage.monthlyPayment > 0 && (
              <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>
                Regular monthly payment: {fmtFull(mortgage.monthlyPayment)}
              </p>
            )}
          </div>

          {/* Date */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Date
            </label>
            <input
              type="date"
              className="input-field"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Payment Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Payment Type
            </label>
            <select
              className="input-field"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              {PAYMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Notes (optional)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Extra overpayment this month"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Info box */}
        <div style={{
          background: 'rgba(173,198,255,0.06)',
          border: '1px solid rgba(173,198,255,0.1)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '16px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#adc6ff', flexShrink: 0, marginTop: '1px' }}>info</span>
          <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0, lineHeight: 1.55 }}>
            Payments are recorded for tracking purposes. Contact your lender directly to process actual payments.
          </p>
        </div>

        {/* Payment Summary */}
        <div className="section-card" style={{ marginBottom: '24px' }}>
          <h4 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '13px', color: '#adc6ff', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px' }}>
            {currentYear} Payment Summary
          </h4>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: '#bbcabf' }}>Paid so far this year</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#dae2fd' }}>{fmt(ytdTotal)}</span>
          </div>

          {amountNum > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: '#bbcabf' }}>After this payment</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#4edea3' }}>{fmt(previewYtd)}</span>
            </div>
          )}

          <div style={{ height: '1px', background: 'rgba(173,198,255,0.08)', margin: '10px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: '#bbcabf' }}>Outstanding balance</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#adc6ff' }}>{fmt(mortgage.outstandingBalance)}</span>
          </div>
        </div>

        {/* Confirm */}
        <button
          className="primary-btn"
          onClick={handleConfirm}
          disabled={!amount || amountNum <= 0 || isSaving}
          style={{ opacity: (!amount || amountNum <= 0 || isSaving) ? 0.5 : 1 }}
        >
          {isSaving ? 'Saving…' : 'Confirm Payment'}
        </button>

      </div>
    </MortgageDetailLayout>
  );
}
