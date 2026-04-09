import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileNavDrawer from '../../components/MobileNavDrawer';
import { useSavingsData } from '../SavingsDataContext';

const ACCOUNT_TYPES = [
  { value: 'Cash ISA',              label: 'Cash ISA' },
  { value: 'Stocks & Shares ISA',   label: 'Stocks & Shares ISA' },
  { value: 'Lifetime ISA',          label: 'Lifetime ISA (LISA)' },
  { value: 'Easy Access Savings',   label: 'Easy Access Savings' },
  { value: 'Savings Account',       label: 'Savings Account' },
  { value: 'Fixed Rate',            label: 'Fixed Rate Bond' },
  { value: 'Current Account',       label: 'Current Account' },
  { value: 'Premium Bonds',         label: 'Premium Bonds' },
];

const labelStyle = {
  fontSize: '12px',
  color: '#adc6ff',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: '8px',
};

export default function AddSavingsAccount() {
  const navigate = useNavigate();
  const { addAccount } = useSavingsData();

  const [accountName,  setAccountName]  = useState('');
  const [bank,         setBank]         = useState('');
  const [accountType,  setAccountType]  = useState('Cash ISA');
  const [balance,      setBalance]      = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [openDate,     setOpenDate]     = useState('');
  const [isSaving,     setIsSaving]     = useState(false);
  const [error,        setError]        = useState(null);

  const isPremiumBonds = accountType === 'Premium Bonds';
  const balanceNum     = parseFloat(balance) || 0;
  const rateNum        = parseFloat(interestRate) || null;
  const canSubmit      = accountName.trim().length > 0 && !isSaving;

  async function handleConfirm() {
    if (!canSubmit) return;
    setIsSaving(true);
    setError(null);

    const newAccount = {
      accountName:  accountName.trim(),
      bank:         bank.trim() || null,
      accountType,
      currentBalance: balanceNum,
      interestRate:   isPremiumBonds ? null : rateNum,
      openDate:       openDate || null,
      rawData:        [],
      mapping:        {},
    };

    try {
      await addAccount(newAccount);
      navigate('/mobile/savings');
    } catch (e) {
      setError('Failed to save account. Please try again.');
      setIsSaving(false);
    }
  }

  return (
    <div className="mobile-screen" style={{ paddingTop: '50px', paddingBottom: '40px', background: '#0b1326', minHeight: '100vh' }}>
      <MobileNavDrawer />

      {/* Sub-header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate('/mobile/savings')}
          style={{
            background: 'rgba(173,198,255,0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '20px' }}>arrow_back</span>
        </button>
        <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>My Savings</p>
      </div>

      <div style={{ padding: '12px 20px 16px' }}>
        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
          Add Account
        </h1>
      </div>

      <div style={{ padding: '0 16px' }}>

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
          <span style={{ fontSize: '12px', color: '#4edea3', fontWeight: 600 }}>New Savings Account</span>
        </div>

        {/* Account Details Card */}
        <div className="animate-in stagger-1 section-card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 20px' }}>
            Account Details
          </h3>

          {/* Account Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Account Name *</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Monzo Easy Access, Barclays ISA"
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
            />
          </div>

          {/* Bank / Provider */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Bank / Provider</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Monzo, Barclays, NS&I"
              value={bank}
              onChange={e => setBank(e.target.value)}
            />
          </div>

          {/* Account Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Account Type</label>
            <select
              className="input-field"
              value={accountType}
              onChange={e => setAccountType(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              {ACCOUNT_TYPES.map(t => (
                <option key={t.value} value={t.value} style={{ background: '#060e20' }}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Current Balance */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Current Balance (£)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px', fontWeight: 600 }}>£</span>
              <input
                type="number"
                className="input-field"
                placeholder="0.00"
                value={balance}
                onChange={e => setBalance(e.target.value)}
                min="0"
                step="0.01"
                style={{ paddingLeft: '30px' }}
              />
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>
              Leave blank if unknown — you can update this later
            </p>
          </div>

          {/* Interest Rate — hidden for Premium Bonds */}
          {!isPremiumBonds && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Interest Rate (%)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g. 4.50"
                  value={interestRate}
                  onChange={e => setInterestRate(e.target.value)}
                  min="0"
                  step="0.01"
                  style={{ paddingRight: '40px' }}
                />
                <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '15px', fontWeight: 600 }}>%</span>
              </div>
            </div>
          )}

          {/* Open Date */}
          <div>
            <label style={labelStyle}>Date Opened (optional)</label>
            <input
              type="date"
              className="input-field"
              value={openDate}
              onChange={e => setOpenDate(e.target.value)}
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
            Once added, you can update the balance and view account details from the account's detail page.
          </p>
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontSize: '13px', color: '#ffb4ab', margin: '0 0 16px', textAlign: 'center' }}>{error}</p>
        )}

        {/* Confirm Button */}
        <button
          className="primary-btn"
          onClick={handleConfirm}
          disabled={!canSubmit}
          style={{ opacity: canSubmit ? 1 : 0.5 }}
        >
          {isSaving ? 'Saving…' : 'Confirm Savings Account'}
        </button>

      </div>
    </div>
  );
}
