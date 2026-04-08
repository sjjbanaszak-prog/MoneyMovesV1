import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIncomeData } from '../IncomeDataContext';
import IncomeDetailLayout from '../IncomeDetailLayout';

const EMPLOYMENT_TYPES = [
  { value: 'Full-time',     label: 'Full-time Employment' },
  { value: 'Part-time',     label: 'Part-time Employment' },
  { value: 'Contract',      label: 'Contract' },
  { value: 'Freelance',     label: 'Freelance / Gig Work' },
  { value: 'Self-employed', label: 'Self-employed' },
];

const BONUS_LABEL_PLACEHOLDER = [
  'e.g. Annual Bonus',
  'e.g. Q1 Commission',
  'e.g. Performance Bonus',
  'e.g. Signing Bonus',
];

function BonusRow({ index, entry, onChange, onRemove, canRemove }) {
  return (
    <div style={{
      background: 'rgba(78,222,163,0.04)',
      border: '1px solid rgba(78,222,163,0.12)',
      borderRadius: '12px',
      padding: '12px',
      marginBottom: '10px',
    }}>
      {/* Label */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
          Description
        </label>
        <input
          type="text"
          className="input-field"
          placeholder={BONUS_LABEL_PLACEHOLDER[index % BONUS_LABEL_PLACEHOLDER.length]}
          value={entry.label}
          onChange={e => onChange(index, 'label', e.target.value)}
          style={{ fontSize: '14px' }}
        />
      </div>

      {/* Amount + Remove */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px', fontWeight: 600 }}>£</span>
          <input
            type="number"
            className="input-field"
            placeholder="0"
            value={entry.amount}
            onChange={e => onChange(index, 'amount', e.target.value)}
            min="0"
            step="1"
            style={{ paddingLeft: '30px' }}
          />
        </div>
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            style={{
              flexShrink: 0,
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(244,114,182,0.1)',
              border: '1px solid rgba(244,114,182,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#f472b6' }}>close</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function AddIncome() {
  const navigate = useNavigate();
  const { addIncome } = useIncomeData();

  const [employer,       setEmployer]       = useState('');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [annualSalary,   setAnnualSalary]   = useState('');
  const [bonusEnabled,   setBonusEnabled]   = useState(false);
  const [bonuses,        setBonuses]        = useState([{ label: '', amount: '' }]);
  const [startDate,      setStartDate]      = useState('');
  const [isSaving,       setIsSaving]       = useState(false);

  const canSubmit = employer.trim().length > 0 && !isSaving;

  function handleBonusChange(index, field, value) {
    setBonuses(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
  }

  function handleAddBonus() {
    setBonuses(prev => [...prev, { label: '', amount: '' }]);
  }

  function handleRemoveBonus(index) {
    setBonuses(prev => prev.filter((_, i) => i !== index));
  }

  function handleBonusToggle() {
    setBonusEnabled(prev => !prev);
    if (!bonusEnabled) {
      setBonuses([{ label: '', amount: '' }]);
    }
  }

  const totalBonus = bonusEnabled
    ? bonuses.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0)
    : 0;

  async function handleConfirm() {
    if (!canSubmit) return;
    setIsSaving(true);

    const bonusEntries = bonusEnabled
      ? bonuses
          .filter(b => (parseFloat(b.amount) || 0) > 0)
          .map(b => ({ label: b.label.trim() || 'Bonus', amount: parseFloat(b.amount) || 0 }))
      : [];

    const newIncome = {
      employer:       employer.trim(),
      employmentType,
      annualSalary:   parseFloat(annualSalary) || 0,
      annualBonus:    totalBonus,
      bonusEntries,
      startDate:      startDate || null,
    };

    await addIncome(newIncome);
    navigate('/mobile/income');
  }

  return (
    <IncomeDetailLayout title="Add Income" backTo="/mobile/income">
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
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#4edea3' }}>payments</span>
          <span style={{ fontSize: '12px', color: '#4edea3', fontWeight: 600 }}>New Income Stream</span>
        </div>

        {/* Employment Details Card */}
        <div className="animate-in stagger-1 section-card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 20px' }}>
            Employment Details
          </h3>

          {/* Employer Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Employer Name *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Accenture, HSBC, Google"
              value={employer}
              onChange={e => setEmployer(e.target.value)}
            />
          </div>

          {/* Employment Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Employment Type
            </label>
            <select
              className="input-field"
              value={employmentType}
              onChange={e => setEmploymentType(e.target.value)}
            >
              {EMPLOYMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Annual Salary */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Annual Salary (£)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px', fontWeight: 600 }}>£</span>
              <input
                type="number"
                className="input-field"
                placeholder="0"
                value={annualSalary}
                onChange={e => setAnnualSalary(e.target.value)}
                min="0"
                step="1"
                style={{ paddingLeft: '30px' }}
              />
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>
              Enter your gross annual salary before tax
            </p>
          </div>

          {/* Bonus / Commission — toggle row */}
          <div style={{
            borderTop: '1px solid rgba(173,198,255,0.08)',
            paddingTop: '16px',
            marginBottom: bonusEnabled ? '12px' : 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>
                  Bonuses &amp; Commission
                </p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                  {bonusEnabled && totalBonus > 0
                    ? `£${Math.round(totalBonus).toLocaleString('en-GB')} total across ${bonuses.filter(b => parseFloat(b.amount) > 0).length} payment${bonuses.filter(b => parseFloat(b.amount) > 0).length !== 1 ? 's' : ''}`
                    : 'Toggle on to add bonuses or commission'}
                </p>
              </div>
              {/* Toggle switch */}
              <button
                onClick={handleBonusToggle}
                style={{
                  width: '44px', height: '24px', borderRadius: '12px',
                  background: bonusEnabled ? '#4edea3' : 'rgba(173,198,255,0.15)',
                  border: 'none', position: 'relative', cursor: 'pointer',
                  transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: bonusEnabled ? '#003824' : '#64748b',
                  position: 'absolute', top: '3px',
                  left: bonusEnabled ? '23px' : '3px',
                  transition: 'left 0.2s, background 0.2s',
                }} />
              </button>
            </div>
          </div>

          {/* Bonus entries (visible when toggled on) */}
          {bonusEnabled && (
            <div style={{ marginTop: '12px' }}>
              {bonuses.map((entry, i) => (
                <BonusRow
                  key={i}
                  index={i}
                  entry={entry}
                  onChange={handleBonusChange}
                  onRemove={handleRemoveBonus}
                  canRemove={bonuses.length > 1}
                />
              ))}

              {/* Add another bonus */}
              <button
                onClick={handleAddBonus}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  background: 'rgba(78,222,163,0.07)',
                  border: '1px dashed rgba(78,222,163,0.25)',
                  borderRadius: '10px',
                  padding: '10px',
                  cursor: 'pointer',
                  color: '#4edea3',
                  fontSize: '13px', fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                Add Another Bonus / Commission
              </button>
            </div>
          )}
        </div>

        {/* Start Date Card */}
        <div className="animate-in stagger-2 section-card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 16px' }}>
            Start Date
          </h3>
          <label style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
            Date Started <span style={{ color: '#64748b', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional</span>
          </label>
          <input
            type="date"
            className="input-field"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={{ colorScheme: 'dark' }}
          />
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
            Once added, this income stream will appear on your overview. You can add multiple employers to track your total earnings.
          </p>
        </div>

        {/* Confirm Button */}
        <button
          className="primary-btn"
          onClick={handleConfirm}
          disabled={!canSubmit}
          style={{ opacity: canSubmit ? 1 : 0.5 }}
        >
          {isSaving ? 'Saving…' : 'Confirm Income Stream'}
        </button>

      </div>
    </IncomeDetailLayout>
  );
}
