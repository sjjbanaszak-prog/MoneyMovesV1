import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePensionData } from '../PensionDataContext';
import PensionDetailLayout from '../PensionDetailLayout';

const ACCOUNT_TYPES = [
  { value: 'Workplace',        label: 'Workplace Pension' },
  { value: 'Personal SIPP',    label: 'Personal SIPP' },
  { value: 'Company Pension',  label: 'Company Pension' },
  { value: 'Stakeholder',      label: 'Stakeholder Pension' },
  { value: 'Defined Benefit',  label: 'Defined Benefit (Final Salary)' },
  { value: 'Other',            label: 'Other' },
];

export default function AddPension() {
  const navigate = useNavigate();
  const { addEntry } = usePensionData();

  const [provider,     setProvider]     = useState('');
  const [accountType,  setAccountType]  = useState('Workplace');
  const [currentValue, setCurrentValue] = useState('');
  const [startDate,    setStartDate]    = useState('');
  const [isSaving,     setIsSaving]     = useState(false);

  const valueNum = parseFloat(currentValue) || 0;
  const canSubmit = provider.trim().length > 0 && !isSaving;

  async function handleConfirm() {
    if (!canSubmit) return;
    setIsSaving(true);

    const today = new Date().toISOString().split('T')[0];
    const newEntry = {
      provider:     provider.trim(),
      accountType,
      currentValue: valueNum,
      deposits:     valueNum,
      firstPayment: startDate || today,
      lastPayment:  startDate || today,
      paymentHistory: valueNum > 0 ? [{
        date:        startDate || today,
        amount:      valueNum,
        description: 'Opening Balance',
        type:        'opening',
      }] : [],
      valueHistory: valueNum > 0 ? [{
        date:  new Date().toISOString(),
        value: valueNum,
      }] : [],
    };

    await addEntry(newEntry);
    navigate('/mobile/pension');
  }

  return (
    <PensionDetailLayout title="Add Pension" backTo="/mobile/pension">
      <div style={{ padding: '16px' }}>

        {/* Info pill */}
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
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#4edea3' }}>savings</span>
          <span style={{ fontSize: '12px', color: '#4edea3', fontWeight: 600 }}>New Pension Provider</span>
        </div>

        {/* Account Details Card */}
        <div className="animate-in stagger-1 section-card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 20px' }}>
            Account Details
          </h3>

          {/* Provider Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Provider Name *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Aegon, Nest, Aviva"
              value={provider}
              onChange={e => setProvider(e.target.value)}
            />
          </div>

          {/* Account Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Account Type
            </label>
            <select
              className="input-field"
              value={accountType}
              onChange={e => setAccountType(e.target.value)}
            >
              {ACCOUNT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Current Value */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Current Value (£)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px', fontWeight: 600 }}>£</span>
              <input
                type="number"
                className="input-field"
                placeholder="0.00"
                value={currentValue}
                onChange={e => setCurrentValue(e.target.value)}
                min="0"
                step="0.01"
                style={{ paddingLeft: '30px' }}
              />
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>
              Leave blank if unknown — you can update this later
            </p>
          </div>

          {/* Start Date */}
          <div>
            <label style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Start Date (optional)
            </label>
            <input
              type="date"
              className="input-field"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
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
            Once added, you can log contributions and update the current value from the provider's detail page.
          </p>
        </div>

        {/* Confirm Button */}
        <button
          className="primary-btn"
          onClick={handleConfirm}
          disabled={!canSubmit}
          style={{ opacity: canSubmit ? 1 : 0.5 }}
        >
          {isSaving ? 'Saving…' : 'Confirm Pension Provider'}
        </button>

      </div>
    </PensionDetailLayout>
  );
}
