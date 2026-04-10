import React, { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { usePensionData, getTaxYearStart, taxYearLabel, parseDate } from '../PensionDataContext';
import PensionDetailLayout from '../PensionDetailLayout';

const CONTRIBUTION_TYPES = [
  { value: 'employee', label: 'Employee Contribution' },
  { value: 'employer', label: 'Employer Contribution' },
  { value: 'personal', label: 'Personal (SIPP)' },
  { value: 'one_off',  label: 'One-Off Payment' },
];

export default function AddContribution() {
  const { idx } = useParams();
  const navigate = useNavigate();
  const { entries, updateEntry } = usePensionData();

  const entry = entries[Number(idx)];
  if (!entry) return <Navigate to="/mobile/pension" replace />;

  const [amount, setAmount]   = useState('');
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [type, setType]       = useState('employee');
  const [notes, setNotes]     = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const amountNum   = parseFloat(amount) || 0;
  const annualLimit = 60000;

  // Derive the FY from the date the user has entered, not today
  const selectedFYStart = getTaxYearStart(parseDate(date) || new Date());
  const selectedFYLabel = taxYearLabel(selectedFYStart);

  // Sum contributions already recorded across ALL providers for that FY
  const ytdUsed = entries.reduce((total, e) => {
    return total + (e.paymentHistory || []).reduce((s, p) => {
      return getTaxYearStart(p.date) === selectedFYStart ? s + (p.amount || 0) : s;
    }, 0);
  }, 0);

  const remaining   = annualLimit - ytdUsed;
  const willExceed  = amountNum > 0 && (ytdUsed + amountNum) > annualLimit;
  const previewUsed = ytdUsed + amountNum;
  const previewPct  = Math.min(100, (previewUsed / annualLimit) * 100);

  async function handleConfirm() {
    if (isSaving || amountNum <= 0) return;
    setIsSaving(true);

    const typeLabel = CONTRIBUTION_TYPES.find(t => t.value === type)?.label || type;
    const newPayment = {
      date,                        // YYYY-MM-DD — parseDate() handles this format
      amount: amountNum,
      description: typeLabel,
      type,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    const existingHistory = entry.paymentHistory || [];
    const newDeposits = (entry.deposits || 0) + amountNum;

    // Keep firstPayment / lastPayment accurate
    const newDate      = parseDate(date);
    const existingFirst = parseDate(entry.firstPayment);
    const existingLast  = parseDate(entry.lastPayment);
    const newFirstPayment = (!existingFirst || newDate < existingFirst) ? date : entry.firstPayment;
    const newLastPayment  = (!existingLast  || newDate > existingLast)  ? date : entry.lastPayment;

    await updateEntry(Number(idx), {
      paymentHistory: [...existingHistory, newPayment],
      deposits:       newDeposits,
      firstPayment:   newFirstPayment,
      lastPayment:    newLastPayment,
    });

    navigate(`/mobile/pension/provider/${idx}`);
  }

  return (
    <PensionDetailLayout title="Add Contribution" backTo={`/mobile/pension/provider/${idx}`}>
      <div style={{ padding: '16px' }}>

        {/* Provider context pill */}
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
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#4edea3' }}>account_balance</span>
          <span style={{ fontSize: '12px', color: '#4edea3', fontWeight: 600 }}>{entry.provider}</span>
        </div>

        {/* Form Card */}
        <div className="animate-in stagger-1 section-card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 20px' }}>
            Contribution Details
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

          {/* Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Type
            </label>
            <select
              className="input-field"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              {CONTRIBUTION_TYPES.map(t => (
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
              placeholder="e.g. Bonus contribution"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Warning */}
        {willExceed && (
          <div className="animate-in" style={{
            background: 'rgba(255,107,107,0.08)',
            border: '1px solid rgba(255,107,107,0.2)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ff6b6b', flexShrink: 0, marginTop: '1px' }}>warning</span>
            <p style={{ fontSize: '13px', color: '#ff6b6b', margin: 0, lineHeight: 1.55 }}>
              This contribution would exceed your annual allowance. Remaining available: <strong>£{Math.max(0, remaining).toLocaleString('en-GB')}</strong>
            </p>
          </div>
        )}

        {/* Allowance Summary */}
        <div className="section-card" style={{ marginBottom: '16px' }}>
          <h4 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '13px', color: '#adc6ff', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
            {selectedFYLabel} Allowance
          </h4>
          <div style={{ background: 'rgba(173,198,255,0.08)', borderRadius: '4px', height: '6px', marginBottom: '8px', overflow: 'hidden' }}>
            <div style={{
              width: `${previewPct}%`,
              height: '100%', borderRadius: '4px',
              background: willExceed ? '#ff6b6b' : '#4edea3',
              transition: 'width 0.3s ease, background 0.3s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: '#bbcabf' }}>
              £{Math.round(previewUsed).toLocaleString('en-GB')} used
            </span>
            <span style={{ fontSize: '12px', color: '#bbcabf' }}>
              £{annualLimit.toLocaleString('en-GB')} limit
            </span>
          </div>
        </div>

        {/* Info Box */}
        <div style={{
          background: 'rgba(173,198,255,0.06)',
          border: '1px solid rgba(173,198,255,0.1)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '24px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#adc6ff', flexShrink: 0, marginTop: '1px' }}>info</span>
          <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0, lineHeight: 1.55 }}>
            Contributions are recorded for tracking purposes. Contact your pension provider directly to process actual payments.
          </p>
        </div>

        {/* Confirm */}
        <button
          className="primary-btn"
          onClick={handleConfirm}
          disabled={!amount || amountNum <= 0 || isSaving}
          style={{ opacity: (!amount || amountNum <= 0 || isSaving) ? 0.5 : 1 }}
        >
          {isSaving ? 'Saving…' : 'Confirm Contribution'}
        </button>

      </div>
    </PensionDetailLayout>
  );
}
