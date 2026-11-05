import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { useSavingsData } from '../SavingsDataContext';
import SavingsDetailLayout from '../SavingsDetailLayout';
import { accountCategoryColor } from '../utils/accountCategories';
import SavingsHistoryCard from '../components/SavingsHistoryCard';
import {
  parseAmount, parseDate, isReturnDescription, getAllTransactions,
} from '../utils/savingsTransactions';

// ---- Helpers ----
function fmt(n) {
  const v = Math.round(n || 0);
  return (v < 0 ? '−' : '') + '£' + Math.abs(v).toLocaleString('en-GB');
}
function fmtFull(n) {
  return '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Colour by category (ISA / Savings / Bonds / Current), shared with the Insights donut
function accountColor(accountType = '') {
  return accountCategoryColor(accountType);
}

function accountInitials(name = '') {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function accountTypeBadge(accountType = '') {
  const t = accountType.toLowerCase();
  if (t.includes('lisa') || t.includes('lifetime')) return 'LISA';
  if (t.includes('isa')) return 'ISA';
  if (t.includes('current')) return 'Current';
  if (t.includes('fixed')) return 'Fixed Rate';
  if (t.includes('premium bonds') || t.includes('bonds')) return 'Bonds';
  return 'Savings';
}

const ACCOUNT_TYPES = [
  'ISA', 'Cash ISA', 'Stocks & Shares ISA', 'Lifetime ISA',
  'Savings Account', 'Easy Access Savings', 'Current Account', 'Fixed Rate', 'Premium Bonds',
];

function formatDateShort(date) {
  if (!date) return '–';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Compute net deposits (total credits minus total debits, excluding interest/dividends/transfers)
function computeNetDeposits(account) {
  const { rawData = [], mapping = {} } = account;
  const descCol   = mapping.description;
  const creditCol = mapping.credit;
  const debitCol  = mapping.debit;
  const amountCol = mapping.amount;

  let totalCredits = 0;
  let totalDebits  = 0;

  rawData.forEach(row => {
    const desc = String(row[descCol] || '').toLowerCase();
    const isExcluded = isReturnDescription(desc) || desc.includes('transfer');
    if (isExcluded) return;

    if (creditCol && row[creditCol] != null && row[creditCol] !== '') {
      totalCredits += parseAmount(row[creditCol]);
    }
    if (debitCol && row[debitCol] != null && row[debitCol] !== '') {
      totalDebits += parseAmount(row[debitCol]);
    }
    if (!creditCol && !debitCol && amountCol) {
      const amt = parseAmount(row[amountCol]);
      if (amt > 0) totalCredits += amt;
      else totalDebits += Math.abs(amt);
    }
  });

  // Also include manual transactions (exclude interest and ISA transfers)
  (account.manualTransactions || []).forEach(tx => {
    if (tx.direction === 'credit' && tx.type !== 'interest' && tx.type !== 'transfer_in') {
      totalCredits += tx.amount;
    } else if (tx.direction === 'debit' && tx.type !== 'transfer_out') {
      totalDebits += tx.amount;
    }
  });

  return Math.round(totalCredits - totalDebits);
}

// ---- Detail row ----
function DetailRow({ label, value, valueColor, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingBottom: last ? 0 : '12px',
      marginBottom: last ? 0 : '12px',
      borderBottom: last ? 'none' : '1px solid rgba(173,198,255,0.06)',
    }}>
      <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '13px', fontWeight: 600, color: valueColor || '#dae2fd', margin: 0 }}>{value}</p>
    </div>
  );
}

// ---- Main Component ----
export default function SavingsAccountDetail() {
  const { idx }                                = useParams();
  const navigate                               = useNavigate();
  const { accounts, updateAccount, updateAccountBalance } = useSavingsData();

  // Current balance edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editVal,   setEditVal]   = useState('');
  const [isSaving,  setIsSaving]  = useState(false);

  // Account details edit state
  const [isEditingDetails,  setIsEditingDetails]  = useState(false);
  const [editAccountType,   setEditAccountType]   = useState('');
  const [editBank,          setEditBank]          = useState('');
  const [editAccountName,   setEditAccountName]   = useState('');
  const [editInterestRate,  setEditInterestRate]  = useState('');
  const [isSavingDetails,   setIsSavingDetails]   = useState(false);

  const account = accounts[Number(idx)];
  if (!account) return <Navigate to="/mobile/savings" replace />;

  const color    = accountColor(account.accountType);
  const initials = accountInitials(account.bank || account.accountName);
  const badge    = accountTypeBadge(account.accountType);

  const netDeposited   = useMemo(() => computeNetDeposits(account), [account]);
  const currentBalance = account.currentBalance || 0;
  const totalGrowth    = currentBalance - netDeposited;
  const growthPct      = netDeposited > 0 ? (totalGrowth / netDeposited) * 100 : 0;

  // FY label for chart header

  // Current balance edit handlers
  function handleEditClick() {
    setEditVal(String(Math.round(currentBalance)));
    setIsEditing(true);
  }

  async function handleSave() {
    const val = parseFloat(editVal);
    if (isNaN(val) || val < 0) { setIsEditing(false); return; }
    setIsSaving(true);
    await updateAccountBalance(Number(idx), val);
    setIsSaving(false);
    setIsEditing(false);
  }

  function handleCancel() {
    setIsEditing(false);
    setEditVal('');
  }

  // Account details edit handlers
  function handleEditDetails() {
    setEditAccountType(account.accountType || '');
    setEditBank(account.bank || '');
    setEditAccountName(account.accountName || '');
    setEditInterestRate(account.interestRate != null ? String(account.interestRate) : '');
    setIsEditingDetails(true);
  }

  async function handleSaveDetails() {
    setIsSavingDetails(true);
    await updateAccount(Number(idx), {
      accountType:  editAccountType,
      bank:         editBank,
      accountName:  editAccountName,
      interestRate: editInterestRate !== '' ? Number(editInterestRate) : null,
    });
    setIsSavingDetails(false);
    setIsEditingDetails(false);
  }

  function handleCancelDetails() {
    setIsEditingDetails(false);
  }

  const allTx = useMemo(() => getAllTransactions(account), [account]);
  const recentFive = allTx.slice(0, 5);

  const firstTx = allTx.length > 0 ? allTx[allTx.length - 1] : null;
  const lastTx  = allTx.length > 0 ? allTx[0] : null;

  // Savings History card works from a list of accounts; this page shows just one
  const accountList = useMemo(() => [account], [account]);

  return (
    <SavingsDetailLayout backTo="/mobile/savings">
      <div style={{ padding: '16px' }}>

        {/* Hero Card */}
        <div className="animate-in stagger-1" style={{
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(78,222,163,0.08) 0%, #1a2744 100%)',
          border: `1px solid ${color}26`,
          padding: '24px',
          marginBottom: '16px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div className="hero-gradient" style={{ position: 'absolute', inset: 0, zIndex: 0, borderRadius: '20px' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>

            {/* Account identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: `${color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '16px', color,
              }}>
                {initials}
              </div>
              <div>
                <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '18px', color: '#dae2fd', margin: '0 0 3px', lineHeight: 1.2 }}>
                  {account.accountName}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0 }}>{account.bank || badge}</p>
                  <span className="badge-active">{badge}</span>
                </div>
              </div>
            </div>

            {/* Two-column metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Net Deposits</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '24px', color: '#dae2fd', margin: '0 0 2px' }}>
                  {fmt(netDeposited)}
                </p>
                <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0 }}>deposits minus withdrawals</p>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Current Balance</p>
                  {!isEditing && (
                    <button
                      onClick={handleEditClick}
                      title="Edit current balance"
                      style={{ background: 'none', border: 'none', padding: '1px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#adc6ff', opacity: 0.7 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit</span>
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div>
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>£</span>
                      <input
                        type="number"
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        autoFocus
                        min="0"
                        step="100"
                        style={{
                          width: '100%',
                          background: 'rgba(173,198,255,0.08)',
                          border: '1px solid rgba(173,198,255,0.3)',
                          borderRadius: '8px',
                          padding: '6px 8px 6px 24px',
                          color: '#dae2fd',
                          fontSize: '16px',
                          fontFamily: 'Manrope, sans-serif',
                          fontWeight: 700,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                          flex: 1, background: '#4edea3', color: '#003824', border: 'none',
                          borderRadius: '8px', padding: '6px 8px', fontSize: '12px',
                          fontWeight: 700, cursor: 'pointer', opacity: isSaving ? 0.6 : 1,
                        }}
                      >
                        {isSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancel}
                        style={{
                          flex: 1, background: 'rgba(173,198,255,0.1)', color: '#adc6ff',
                          border: '1px solid rgba(173,198,255,0.2)', borderRadius: '8px',
                          padding: '6px 8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '24px', color, margin: '0 0 2px' }}>
                      {fmt(currentBalance)}
                    </p>
                    <p style={{ fontSize: '11px', color: growthPct > 0 ? '#4edea3' : growthPct < 0 ? '#ff6b6b' : '#ffb95f', margin: 0 }}>
                      {growthPct >= 0 ? '+' : ''}{growthPct.toFixed(2)}% total growth
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Savings History */}
        <SavingsHistoryCard accounts={accountList} color={color} />

        {/* Account Details */}
        <div className="animate-in stagger-3 section-card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>
              Account Details
            </h3>
            {!isEditingDetails ? (
              <button
                onClick={handleEditDetails}
                style={{ background: 'none', border: 'none', color: '#adc6ff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
              >
                Edit
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveDetails}
                  disabled={isSavingDetails}
                  style={{ background: '#4edea3', color: '#003824', border: 'none', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: isSavingDetails ? 0.6 : 1 }}
                >
                  {isSavingDetails ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={handleCancelDetails}
                  style={{ background: 'rgba(173,198,255,0.1)', color: '#adc6ff', border: '1px solid rgba(173,198,255,0.2)', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {isEditingDetails ? (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 6px' }}>Account type</p>
                <select className="input-field" value={editAccountType} onChange={e => setEditAccountType(e.target.value)}>
                  <option value="">— Select —</option>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 6px' }}>Bank</p>
                <input
                  type="text"
                  className="input-field"
                  value={editBank}
                  onChange={e => setEditBank(e.target.value)}
                  placeholder="e.g. Barclays"
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 6px' }}>Account name</p>
                <input
                  type="text"
                  className="input-field"
                  value={editAccountName}
                  onChange={e => setEditAccountName(e.target.value)}
                  placeholder="e.g. Instant Access Saver"
                />
              </div>
              {editAccountType !== 'Premium Bonds' && (
                <div style={{ marginBottom: '4px' }}>
                  <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 6px' }}>Interest rate (%)</p>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      className="input-field"
                      value={editInterestRate}
                      onChange={e => setEditInterestRate(e.target.value)}
                      min="0" max="20" step="0.01"
                      placeholder="0.00"
                      style={{ paddingRight: '28px' }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '13px' }}>%</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <DetailRow label="Account type"  value={account.accountType || badge} />
              <DetailRow label="Bank"          value={account.bank || '–'} />
              <DetailRow label="Account name"  value={account.accountName || '–'} />
              {account.interestRate != null && account.interestRate > 0 && (
                <DetailRow label="Interest rate" value={`${account.interestRate}%`} valueColor="#4edea3" />
              )}
              <DetailRow label="Total balance" value={fmt(currentBalance)} valueColor={color} />
              {totalGrowth > 0 && (
                <DetailRow label="Interest / growth" value={fmt(totalGrowth)} valueColor="#4edea3" />
              )}
              <DetailRow label="First transaction" value={firstTx ? formatDateShort(firstTx.date) : '–'} />
              <DetailRow label="Last transaction"  value={lastTx  ? formatDateShort(lastTx.date)  : '–'} last />
            </>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="animate-in stagger-4 section-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>
              Recent Transactions
            </h3>
            {allTx.length > 5 && (
              <Link to={`/mobile/savings/account/${idx}/transactions`} style={{ textDecoration: 'none' }}>
                <button style={{ background: 'none', border: 'none', color: '#adc6ff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  View All
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
                </button>
              </Link>
            )}
          </div>

          {recentFive.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px 0', margin: 0 }}>
              No transactions recorded
            </p>
          ) : (
            recentFive.map((tx, i) => {
              const isCredit  = tx.credit > 0;
              const amount    = isCredit ? tx.credit : tx.debit;
              const amtColor  = isCredit ? '#4edea3' : '#ff6b6b';
              const amtPrefix = isCredit ? '+' : '−';
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingBottom: i < recentFive.length - 1 ? '12px' : 0,
                    marginBottom: i < recentFive.length - 1 ? '12px' : 0,
                    borderBottom: i < recentFive.length - 1 ? '1px solid rgba(173,198,255,0.06)' : 'none',
                  }}
                >
                  <div style={{ minWidth: 0, marginRight: '12px' }}>
                    <p style={{ fontWeight: 600, fontSize: '13px', color: '#dae2fd', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      {tx.desc || 'Transaction'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                      {formatDateShort(tx.date)}
                      {tx.notes && (
                        <span style={{ marginLeft: '8px', color: '#475569', fontStyle: 'italic' }}>{tx.notes}</span>
                      )}
                    </p>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '13px', color: amtColor, margin: 0, flexShrink: 0 }}>
                    {amtPrefix}{fmtFull(amount)}
                  </p>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* FAB — Add Transaction */}
      <button
        onClick={() => navigate(`/mobile/savings/account/${idx}/add`)}
        style={{
          position: 'fixed', bottom: '88px', right: '20px',
          background: '#4edea3', color: '#003824',
          border: 'none', borderRadius: '16px', padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px',
          cursor: 'pointer', boxShadow: '0 4px 24px rgba(78,222,163,0.35)',
          zIndex: 50,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
        Add Transaction
      </button>

    </SavingsDetailLayout>
  );
}
