import React, { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useSavingsData } from '../SavingsDataContext';
import SavingsDetailLayout from '../SavingsDetailLayout';

dayjs.extend(customParseFormat);

const ISA_LIMIT = 20000;

const DEPOSIT_TYPES = [
  { value: 'deposit',     label: 'Regular Savings'             },
  { value: 'lump_sum',    label: 'Lump Sum Deposit'            },
  { value: 'bonus',       label: 'Bonus / Gift'                },
  { value: 'transfer_in', label: 'Transfer In (ISA Transfer)'  },
  { value: 'interest',    label: 'Interest Received'           },
];

const WITHDRAWAL_TYPES = [
  { value: 'withdrawal',   label: 'Withdrawal'   },
  { value: 'transfer_out', label: 'Transfer Out' },
  { value: 'direct_debit', label: 'Direct Debit' },
  { value: 'fee',          label: 'Fee / Charge' },
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

// Returns the year in which the UK tax year started for a given date string (YYYY-MM-DD)
function getTaxYearStart(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const year  = d.getFullYear();
  const month = d.getMonth() + 1;
  const day   = d.getDate();
  return (month < 4 || (month === 4 && day < 6)) ? year - 1 : year;
}

function taxYearLabel(fyStart) {
  if (fyStart == null) return '';
  return `${fyStart}/${String(fyStart + 1).slice(2)}`;
}

function parseAmount(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  return parseFloat(String(value).replace(/[£$€\s,]/g, '')) || 0;
}

// Sum ISA deposits across all ISA accounts for the given tax year start
function computeIsaUsedInFY(accounts, fyStart) {
  if (fyStart == null) return 0;

  return accounts
    .filter(a => (a.accountType || '').toLowerCase().includes('isa'))
    .reduce((total, account) => {
      const { rawData = [], mapping = {}, dateFormat, manualTransactions = [] } = account;

      rawData.forEach(row => {
        if (!mapping.date) return;
        const dateVal = row[mapping.date];
        if (!dateVal) return;
        const d = dateFormat
          ? dayjs(String(dateVal), dateFormat, true)
          : dayjs(String(dateVal));
        if (!d.isValid()) return;
        if (getTaxYearStart(d.format('YYYY-MM-DD')) !== fyStart) return;

        const desc = (mapping.description ? String(row[mapping.description] || '') : '').toLowerCase();
        if (desc.includes('interest') || desc.includes('transfer')) return;

        let credit = 0;
        if (mapping.credit) {
          credit = parseAmount(row[mapping.credit]);
        } else if (mapping.amount) {
          const amt = parseAmount(row[mapping.amount]);
          if (amt > 0) credit = amt;
        }
        total += credit;
      });

      manualTransactions.forEach(tx => {
        if (tx.direction !== 'credit') return;
        if (tx.type === 'interest' || tx.type === 'transfer_in') return;
        if (!tx.date) return;
        if (getTaxYearStart(tx.date) !== fyStart) return;
        total += tx.amount || 0;
      });

      return total;
    }, 0);
}

export default function AddTransaction() {
  const { idx } = useParams();
  const navigate = useNavigate();
  const { accounts, addTransaction } = useSavingsData();

  const account = accounts[Number(idx)];
  if (!account) return <Navigate to="/mobile/savings" replace />;

  const currentBalance = account.currentBalance || 0;

  const [direction,    setDirection]    = useState('credit');
  const [amount,       setAmount]       = useState('');
  const [date,         setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [type,         setType]         = useState('deposit');
  const [description,  setDescription]  = useState('');
  const [balanceAfter, setBalanceAfter] = useState('');
  const [isSaving,     setIsSaving]     = useState(false);
  const [error,        setError]        = useState(null);

  const amountNum       = parseFloat(amount) || 0;
  const balanceAfterNum = balanceAfter !== '' ? parseFloat(balanceAfter) : null;
  const previewBalance  = balanceAfterNum != null
    ? balanceAfterNum
    : direction === 'credit'
      ? currentBalance + amountNum
      : Math.max(0, currentBalance - amountNum);

  const isDeposit = direction === 'credit';
  const types     = isDeposit ? DEPOSIT_TYPES : WITHDRAWAL_TYPES;

  function handleDirectionChange(dir) {
    setDirection(dir);
    setType(dir === 'credit' ? 'deposit' : 'withdrawal');
  }

  // ISA allowance calculations
  const isIsa          = (account.accountType || '').toLowerCase().includes('isa');
  const countsToIsa    = isIsa && isDeposit && type !== 'interest' && type !== 'transfer_in';
  const selectedFYStart = getTaxYearStart(date);
  const selectedFYLabel = taxYearLabel(selectedFYStart);
  const isaUsed         = isIsa ? computeIsaUsedInFY(accounts, selectedFYStart) : 0;
  const isaPreviewUsed  = countsToIsa ? isaUsed + amountNum : isaUsed;
  const isaPreviewPct   = Math.min(100, (isaPreviewUsed / ISA_LIMIT) * 100);
  const isaWillExceed   = countsToIsa && amountNum > 0 && isaPreviewUsed > ISA_LIMIT;

  async function handleConfirm() {
    if (isSaving || amountNum <= 0) return;
    setIsSaving(true);
    setError(null);

    const typeLabel = types.find(t => t.value === type)?.label || type;

    try {
      await addTransaction(Number(idx), {
        date,
        description: description.trim() || typeLabel,
        type,
        amount:    amountNum,
        direction,
        ...(balanceAfterNum != null ? { balanceAfter: balanceAfterNum } : {}),
        ...(description.trim() ? { notes: description.trim() } : {}),
      });
      navigate(`/mobile/savings/account/${idx}`);
    } catch (e) {
      setError('Failed to save transaction. Please try again.');
      setIsSaving(false);
    }
  }

  return (
    <SavingsDetailLayout title="Add Transaction" backTo={`/mobile/savings/account/${idx}`}>
      <div style={{ padding: '16px' }}>

        {/* Account context pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(78,222,163,0.08)', border: '1px solid rgba(78,222,163,0.15)',
          borderRadius: '20px', padding: '4px 12px', marginBottom: '16px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#4edea3' }}>account_balance</span>
          <span style={{ fontSize: '12px', color: '#4edea3', fontWeight: 600 }}>
            {account.bank || account.accountName}
          </span>
        </div>

        {/* Form Card */}
        <div className="animate-in stagger-2 section-card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 14px' }}>
            Transaction Details
          </h3>

          {/* Direction Toggle */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
            {[
              { dir: 'credit', label: 'Deposit' },
              { dir: 'debit',  label: 'Withdrawal' },
            ].map(({ dir, label }) => (
              <button
                key={dir}
                onClick={() => handleDirectionChange(dir)}
                style={{
                  flex: 1, border: 'none', borderRadius: '8px', padding: '10px 0',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  background: direction === dir
                    ? (dir === 'credit' ? 'rgba(78,222,163,0.15)' : 'rgba(255,107,107,0.15)')
                    : 'rgba(173,198,255,0.06)',
                  color: direction === dir
                    ? (dir === 'credit' ? '#4edea3' : '#ff6b6b')
                    : '#64748b',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Amount (£)</label>
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
                style={{ paddingLeft: '30px', borderColor: amountNum > 0 ? (isDeposit ? 'rgba(78,222,163,0.4)' : 'rgba(255,107,107,0.4)') : undefined }}
              />
            </div>
          </div>

          {/* Date */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Date</label>
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
            <label style={labelStyle}>Transaction Type</label>
            <select
              className="input-field"
              value={type}
              onChange={e => setType(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              {types.map(t => (
                <option key={t.value} value={t.value} style={{ background: '#060e20' }}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Description / Note */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Note (optional)</label>
            <input
              type="text"
              className="input-field"
              placeholder={isDeposit ? 'e.g. Monthly standing order' : 'e.g. Emergency fund withdrawal'}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Balance After */}
          <div>
            <label style={labelStyle}>Balance After (£) — optional</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px', fontWeight: 600 }}>£</span>
              <input
                type="number"
                className="input-field"
                placeholder={`Estimated: £${Math.round(previewBalance).toLocaleString('en-GB')}`}
                value={balanceAfter}
                onChange={e => setBalanceAfter(e.target.value)}
                min="0"
                step="0.01"
                style={{ paddingLeft: '30px' }}
              />
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>
              Enter your actual account balance to keep records accurate.
            </p>
          </div>
        </div>

        {/* Balance preview */}
        {amountNum > 0 && (
          <div className="section-card" style={{ marginBottom: '16px' }}>
            <h4 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '13px', color: '#adc6ff', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
              Balance Preview
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 4px' }}>Current</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '18px', color: '#dae2fd', margin: 0 }}>
                  £{Math.round(currentBalance).toLocaleString('en-GB')}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: isDeposit ? '#4edea3' : '#ff6b6b' }}>
                  {isDeposit ? 'add' : 'remove'}
                </span>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '18px', color: isDeposit ? '#4edea3' : '#ff6b6b' }}>
                  £{Math.round(amountNum).toLocaleString('en-GB')}
                </span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 4px' }}>After</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '18px', color: isDeposit ? '#4edea3' : '#ff6b6b', margin: 0 }}>
                  £{Math.round(previewBalance).toLocaleString('en-GB')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ISA Allowance Card */}
        {countsToIsa && (
          <>
            {isaWillExceed && (
              <div className="animate-in" style={{
                background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)',
                borderRadius: '12px', padding: '14px 16px', marginBottom: '16px',
                display: 'flex', gap: '10px', alignItems: 'flex-start',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ff6b6b', flexShrink: 0, marginTop: '1px' }}>warning</span>
                <p style={{ fontSize: '13px', color: '#ff6b6b', margin: 0, lineHeight: 1.55 }}>
                  This deposit would exceed your ISA allowance. Remaining available: <strong>£{Math.max(0, ISA_LIMIT - isaUsed).toLocaleString('en-GB')}</strong>
                </p>
              </div>
            )}

            <div className="section-card" style={{ marginBottom: '16px' }}>
              <h4 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '13px', color: '#adc6ff', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
                {selectedFYLabel} ISA Allowance
              </h4>
              <div style={{ background: 'rgba(173,198,255,0.08)', borderRadius: '4px', height: '6px', marginBottom: '8px', overflow: 'hidden' }}>
                <div style={{
                  width: `${isaPreviewPct}%`,
                  height: '100%', borderRadius: '4px',
                  background: isaWillExceed ? '#ff6b6b' : '#4edea3',
                  transition: 'width 0.3s ease, background 0.3s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#bbcabf' }}>
                  £{Math.round(isaPreviewUsed).toLocaleString('en-GB')} used
                </span>
                <span style={{ fontSize: '12px', color: '#bbcabf' }}>
                  £{ISA_LIMIT.toLocaleString('en-GB')} limit
                </span>
              </div>
            </div>
          </>
        )}

        {/* Info Box */}
        <div style={{
          background: 'rgba(173,198,255,0.06)', border: '1px solid rgba(173,198,255,0.1)',
          borderRadius: '12px', padding: '14px 16px', marginBottom: '24px',
          display: 'flex', gap: '10px', alignItems: 'flex-start',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#adc6ff', flexShrink: 0, marginTop: '1px' }}>info</span>
          <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0, lineHeight: 1.55 }}>
            Transactions are recorded for tracking purposes and will update your account balance. Add a balance after to keep your records precise.
          </p>
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontSize: '13px', color: '#ffb4ab', margin: '0 0 16px', textAlign: 'center' }}>{error}</p>
        )}

        {/* Confirm */}
        <button
          className="primary-btn"
          onClick={handleConfirm}
          disabled={!amount || amountNum <= 0 || isSaving}
          style={{
            opacity: (!amount || amountNum <= 0 || isSaving) ? 0.5 : 1,
            background: isDeposit ? '#4edea3' : '#ff6b6b',
            color: isDeposit ? '#003824' : '#fff',
          }}
        >
          {isSaving ? 'Saving…' : `Confirm ${isDeposit ? 'Deposit' : 'Withdrawal'}`}
        </button>

      </div>
    </SavingsDetailLayout>
  );
}
