import React, { useMemo, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useSavingsData } from '../SavingsDataContext';
import SavingsDetailLayout from '../SavingsDetailLayout';

dayjs.extend(customParseFormat);

function fmt(n) {
  return '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtShort(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }

function parseAmount(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  return parseFloat(String(value).replace(/[£$€\s,]/g, '')) || 0;
}

function parseDate(str, dateFormat) {
  if (!str) return null;
  const d = dateFormat
    ? dayjs(String(str), dateFormat, true)
    : dayjs(String(str));
  return d.isValid() ? d.toDate() : null;
}

function formatDateShort(date) {
  if (!date) return '–';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const YEAR_COLORS = ['#4edea3', '#adc6ff', '#ffb95f', '#f472b6', '#a78bfa', '#38bdf8'];
const RGB_MAP = {
  '#4edea3': '78,222,163', '#adc6ff': '173,198,255', '#ffb95f': '255,185,95',
  '#f472b6': '244,114,182', '#a78bfa': '167,139,250', '#38bdf8': '56,189,248',
};

const DEPOSIT_TYPES = [
  { value: 'deposit',     label: 'Regular Savings'            },
  { value: 'lump_sum',    label: 'Lump Sum Deposit'           },
  { value: 'bonus',       label: 'Bonus / Gift'               },
  { value: 'transfer_in', label: 'Transfer In (ISA Transfer)' },
  { value: 'interest',    label: 'Interest Received'          },
];

const WITHDRAWAL_TYPES = [
  { value: 'withdrawal',   label: 'Withdrawal'   },
  { value: 'transfer_out', label: 'Transfer Out' },
  { value: 'direct_debit', label: 'Direct Debit' },
  { value: 'fee',          label: 'Fee / Charge' },
];

const inputStyle = {
  background: 'rgba(173,198,255,0.08)',
  border: '1px solid rgba(173,198,255,0.2)',
  borderRadius: '8px',
  padding: '6px 10px',
  color: '#dae2fd',
  fontSize: '13px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

// Build full merged transaction list.
// CSV rows get a rawIdx for targeted edits/deletes.
// deletedRawIndices and rawOverrides are applied here.
function buildAllTransactions(account) {
  const {
    rawData = [], mapping = {}, dateFormat,
    deletedRawIndices = [],
    rawOverrides = {},
  } = account;

  const dateCol   = mapping.date;
  const descCol   = mapping.description;
  const creditCol = mapping.credit;
  const debitCol  = mapping.debit;
  const amountCol = mapping.amount;
  const balCol    = mapping.balance;

  const deletedSet = new Set(deletedRawIndices);

  const rawTxs = rawData
    .map((row, rawIdx) => {
      if (deletedSet.has(rawIdx)) return null;

      const override = rawOverrides[rawIdx];

      if (override) {
        const date = parseDate(override.date);
        if (!date) return null;
        return {
          date,
          desc:      override.description || '',
          credit:    override.direction === 'credit' ? override.amount : 0,
          debit:     override.direction === 'debit'  ? override.amount : 0,
          balance:   null,
          isManual:  false,
          rawIdx,
        };
      }

      const date = parseDate(row[dateCol], dateFormat);
      if (!date) return null;

      let credit = 0, debit = 0;
      if (creditCol && row[creditCol] != null && row[creditCol] !== '') credit = parseAmount(row[creditCol]);
      if (debitCol  && row[debitCol]  != null && row[debitCol]  !== '') debit  = parseAmount(row[debitCol]);
      if (!credit && !debit && amountCol) {
        const amt = parseAmount(row[amountCol]);
        if (amt >= 0) credit = amt; else debit = Math.abs(amt);
      }

      return {
        date,
        desc:    row[descCol] || '',
        credit,
        debit,
        balance: balCol ? parseAmount(row[balCol]) : null,
        isManual: false,
        rawIdx,
      };
    })
    .filter(Boolean);

  const manualTxs = (account.manualTransactions || []).map((tx, manualIdx) => ({
    date:      tx.date ? new Date(tx.date) : null,
    desc:      tx.description || tx.type || 'Transaction',
    credit:    tx.direction === 'credit' ? tx.amount : 0,
    debit:     tx.direction === 'debit'  ? tx.amount : 0,
    balance:   tx.balanceAfter != null ? tx.balanceAfter : null,
    notes:     tx.notes || null,
    type:      tx.type || '',
    direction: tx.direction,
    isManual:  true,
    manualIdx,
  })).filter(tx => tx.date);

  return [...rawTxs, ...manualTxs].sort((a, b) => b.date - a.date);
}

export default function AllTransactions() {
  const { idx }                    = useParams();
  const { accounts, updateAccount } = useSavingsData();

  const [hoveredKey,    setHoveredKey]    = useState(null);
  const [editingKey,    setEditingKey]    = useState(null);
  const [editAmount,    setEditAmount]    = useState('');
  const [editDate,      setEditDate]      = useState('');
  const [editDesc,      setEditDesc]      = useState('');
  const [editType,      setEditType]      = useState('deposit');
  const [editDirection, setEditDirection] = useState('credit');
  const [isSaving,      setIsSaving]      = useState(false);

  const account = accounts[Number(idx)];
  if (!account) return <Navigate to="/mobile/savings" replace />;

  const allTx = useMemo(() => buildAllTransactions(account), [account]);

  const groups = useMemo(() => {
    const map = {};
    allTx.forEach(tx => {
      const yr = tx.date.getFullYear();
      if (!map[yr]) map[yr] = { year: yr, entries: [] };
      map[yr].entries.push(tx);
    });
    return Object.values(map).sort((a, b) => b.year - a.year);
  }, [allTx]);

  const totalDeposits    = allTx.reduce((s, tx) => s + tx.credit, 0);
  const totalWithdrawals = allTx.reduce((s, tx) => s + tx.debit,  0);

  function handleDelete(tx) {
    if (tx.isManual) {
      const newManual = (account.manualTransactions || []).filter((_, i) => i !== tx.manualIdx);
      updateAccount(Number(idx), { manualTransactions: newManual });
    } else {
      const existing = account.deletedRawIndices || [];
      updateAccount(Number(idx), { deletedRawIndices: [...existing, tx.rawIdx] });
    }
  }

  function startEdit(tx, key) {
    const dir = tx.credit > 0 ? 'credit' : 'debit';
    setEditingKey(key);
    setEditDirection(dir);
    setEditAmount(String(tx.credit > 0 ? tx.credit : tx.debit));
    setEditDate(tx.date ? tx.date.toISOString().split('T')[0] : '');
    setEditDesc(tx.notes || tx.desc || '');
    setEditType(tx.type || (dir === 'credit' ? 'deposit' : 'withdrawal'));
  }

  async function handleSaveEdit(tx) {
    const newAmount = parseFloat(editAmount) || 0;
    setIsSaving(true);

    if (tx.isManual) {
      const newManual = (account.manualTransactions || []).map((m, i) =>
        i === tx.manualIdx
          ? { ...m, amount: newAmount, date: editDate, description: editDesc, type: editType, direction: editDirection }
          : m
      );
      await updateAccount(Number(idx), { manualTransactions: newManual });
    } else {
      const existing = account.rawOverrides || {};
      const newOverrides = {
        ...existing,
        [tx.rawIdx]: { amount: newAmount, direction: editDirection, date: editDate, description: editDesc, type: editType },
      };
      await updateAccount(Number(idx), { rawOverrides: newOverrides });
    }

    setIsSaving(false);
    setEditingKey(null);
  }

  // When direction changes in the edit form, reset type to a sensible default
  function handleDirectionChange(dir) {
    setEditDirection(dir);
    setEditType(dir === 'credit' ? 'deposit' : 'withdrawal');
  }

  return (
    <SavingsDetailLayout title="All Transactions" backTo={`/mobile/savings/account/${idx}`}>
      <div style={{ padding: '16px' }}>

        {/* Summary strip */}
        <div className="animate-in stagger-1" style={{
          background: '#171f33', borderRadius: '14px', padding: '16px',
          marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px',
        }}>
          <div>
            <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 3px' }}>Transactions</p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '18px', color: '#dae2fd', margin: 0 }}>
              {allTx.length}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 3px' }}>Deposits</p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '18px', color: '#4edea3', margin: 0 }}>
              {fmtShort(totalDeposits)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 3px' }}>Withdrawals</p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '18px', color: '#ff6b6b', margin: 0 }}>
              {fmtShort(totalWithdrawals)}
            </p>
          </div>
        </div>

        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', background: '#171f33', borderRadius: '16px', color: '#64748b', fontSize: '14px' }}>
            No transactions recorded.
          </div>
        ) : (
          groups.map((group, gi) => {
            const color = YEAR_COLORS[gi % YEAR_COLORS.length];
            const rgb   = RGB_MAP[color] || '173,198,255';
            const yrNet = group.entries.reduce((s, tx) => s + tx.credit - tx.debit, 0);

            return (
              <div key={group.year} className={`animate-in stagger-${Math.min(gi + 2, 5)}`} style={{ marginBottom: '20px' }}>

                {/* Year header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                    <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '14px', color: '#dae2fd', margin: 0 }}>
                      {group.year}
                    </h3>
                  </div>
                  <span style={{ background: `rgba(${rgb},0.1)`, color, borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 }}>
                    {yrNet >= 0 ? '+' : ''}{fmtShort(yrNet)}
                  </span>
                </div>

                {/* Transaction rows */}
                <div style={{ background: '#171f33', borderRadius: '14px', overflow: 'hidden' }}>
                  {group.entries.map((tx, ei) => {
                    const key       = `${group.year}-${ei}`;
                    const isHovered = hoveredKey === key;
                    const isEditing = editingKey === key;
                    const isCredit  = tx.credit > 0;
                    const amount    = isCredit ? tx.credit : tx.debit;
                    const amtColor  = isCredit ? '#4edea3' : '#ff6b6b';
                    const amtPrefix = isCredit ? '+' : '−';
                    const editTypes = editDirection === 'credit' ? DEPOSIT_TYPES : WITHDRAWAL_TYPES;

                    return (
                      <div
                        key={ei}
                        style={{
                          borderBottom: ei < group.entries.length - 1 ? '1px solid rgba(173,198,255,0.06)' : 'none',
                          background: isHovered && !isEditing ? 'rgba(173,198,255,0.03)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={() => !isEditing && setHoveredKey(key)}
                        onMouseLeave={() => setHoveredKey(null)}
                      >
                        {isEditing ? (
                          /* ── Inline Edit Form ── */
                          <div style={{ padding: '14px 16px' }}>
                            {/* Direction toggle */}
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                              {['credit', 'debit'].map(dir => (
                                <button
                                  key={dir}
                                  onClick={() => handleDirectionChange(dir)}
                                  style={{
                                    flex: 1, border: 'none', borderRadius: '8px', padding: '6px 0',
                                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                    background: editDirection === dir
                                      ? (dir === 'credit' ? 'rgba(78,222,163,0.15)' : 'rgba(255,107,107,0.15)')
                                      : 'rgba(173,198,255,0.06)',
                                    color: editDirection === dir
                                      ? (dir === 'credit' ? '#4edea3' : '#ff6b6b')
                                      : '#64748b',
                                  }}
                                >
                                  {dir === 'credit' ? 'Deposit' : 'Withdrawal'}
                                </button>
                              ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                              <div>
                                <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 4px' }}>Amount (£)</p>
                                <div style={{ position: 'relative' }}>
                                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>£</span>
                                  <input
                                    type="number"
                                    value={editAmount}
                                    onChange={e => setEditAmount(e.target.value)}
                                    min="0" step="0.01"
                                    style={{ ...inputStyle, paddingLeft: '24px' }}
                                  />
                                </div>
                              </div>
                              <div>
                                <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 4px' }}>Date</p>
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={e => setEditDate(e.target.value)}
                                  style={{ ...inputStyle, colorScheme: 'dark' }}
                                />
                              </div>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                              <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 4px' }}>Type</p>
                              <select
                                value={editType}
                                onChange={e => setEditType(e.target.value)}
                                style={{ ...inputStyle, cursor: 'pointer' }}
                              >
                                {editTypes.map(t => (
                                  <option key={t.value} value={t.value} style={{ background: '#060e20' }}>{t.label}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                              <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 4px' }}>Note</p>
                              <input
                                type="text"
                                value={editDesc}
                                onChange={e => setEditDesc(e.target.value)}
                                placeholder="e.g. Monthly savings transfer"
                                style={inputStyle}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleSaveEdit(tx)}
                                disabled={isSaving}
                                style={{
                                  flex: 1, background: '#4edea3', color: '#003824', border: 'none',
                                  borderRadius: '8px', padding: '8px', fontSize: '13px',
                                  fontWeight: 700, cursor: 'pointer', opacity: isSaving ? 0.6 : 1,
                                }}
                              >
                                {isSaving ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingKey(null)}
                                style={{
                                  flex: 1, background: 'rgba(173,198,255,0.1)', color: '#adc6ff',
                                  border: '1px solid rgba(173,198,255,0.2)', borderRadius: '8px',
                                  padding: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── Normal Row ── */
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontWeight: 600, fontSize: '13px', color: '#dae2fd', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {tx.desc || 'Transaction'}
                              </p>
                              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                                {formatDateShort(tx.date)}
                                {tx.balance != null && (
                                  <span style={{ marginLeft: '6px', color: '#475569' }}>· bal {fmtShort(tx.balance)}</span>
                                )}
                                {tx.notes && (
                                  <span style={{ marginLeft: '6px', color: '#475569', fontStyle: 'italic' }}>{tx.notes}</span>
                                )}
                              </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
                              {isHovered && (
                                <>
                                  <button
                                    onClick={() => startEdit(tx, key)}
                                    title="Edit"
                                    style={{
                                      background: 'rgba(173,198,255,0.1)', border: 'none', borderRadius: '6px',
                                      width: '28px', height: '28px', display: 'flex', alignItems: 'center',
                                      justifyContent: 'center', cursor: 'pointer',
                                    }}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#adc6ff' }}>edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(tx)}
                                    title="Delete"
                                    style={{
                                      background: 'rgba(255,107,107,0.1)', border: 'none', borderRadius: '6px',
                                      width: '28px', height: '28px', display: 'flex', alignItems: 'center',
                                      justifyContent: 'center', cursor: 'pointer',
                                    }}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#ff6b6b' }}>delete</span>
                                  </button>
                                </>
                              )}
                              <p style={{ fontWeight: 700, fontSize: '14px', color: amtColor, margin: 0 }}>
                                {amtPrefix}{fmt(amount)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })
        )}

      </div>
    </SavingsDetailLayout>
  );
}
