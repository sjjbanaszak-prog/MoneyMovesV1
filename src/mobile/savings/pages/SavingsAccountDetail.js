import React, { useMemo, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useSavingsData } from '../SavingsDataContext';
import SavingsDetailLayout from '../SavingsDetailLayout';

dayjs.extend(customParseFormat);

// ---- Helpers ----
function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}
function fmtFull(n) {
  return '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function accountColor(accountType = '') {
  const TYPE_COLORS = {
    'isa':                     '#4edea3',
    'cash isa':                '#4edea3',
    'stocks & shares isa':     '#4edea3',
    'lifetime isa':            '#f472b6',
    'lisa':                    '#f472b6',
    'savings account':         '#adc6ff',
    'easy access':             '#adc6ff',
    'current account':         '#ffb95f',
    'fixed rate':              '#a78bfa',
  };
  const key = accountType.toLowerCase();
  for (const [k, v] of Object.entries(TYPE_COLORS)) {
    if (key.includes(k)) return v;
  }
  return '#adc6ff';
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
  return 'Savings';
}

const ACCOUNT_TYPES = [
  'ISA', 'Cash ISA', 'Stocks & Shares ISA', 'Lifetime ISA',
  'Savings Account', 'Easy Access Savings', 'Current Account', 'Fixed Rate', 'Premium Bonds',
];

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

// Pull all transactions from rawData, sorted descending by date
function getAllTransactions(account) {
  const { rawData = [], mapping = {}, dateFormat } = account;
  const dateCol   = mapping.date;
  const descCol   = mapping.description;
  const creditCol = mapping.credit;
  const debitCol  = mapping.debit;
  const amountCol = mapping.amount;
  const balCol    = mapping.balance;

  return rawData
    .map(row => {
      const dateRaw = row[dateCol];
      const date    = parseDate(dateRaw, dateFormat);
      const desc    = row[descCol] || '';

      let credit = 0, debit = 0;
      if (creditCol && row[creditCol] != null && row[creditCol] !== '') {
        credit = parseAmount(row[creditCol]);
      }
      if (debitCol && row[debitCol] != null && row[debitCol] !== '') {
        debit = parseAmount(row[debitCol]);
      }
      if (!credit && !debit && amountCol) {
        const amt = parseAmount(row[amountCol]);
        if (amt >= 0) credit = amt;
        else debit = Math.abs(amt);
      }

      const balance = balCol ? parseAmount(row[balCol]) : null;

      return { date, dateRaw, desc, credit, debit, balance };
    })
    .filter(tx => tx.date)
    .sort((a, b) => b.date - a.date);
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
    const isExcluded = desc.includes('interest') || desc.includes('dividend') || desc.includes('transfer');
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

  return Math.round(totalCredits - totalDebits);
}

// ---- Monthly savings history bar chart (FY: Apr → Mar) ----
function SavingsHistoryChart({ account, color, currentBalance }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const today = new Date();
  const nowMonth = today.getMonth() + 1; // 1-indexed
  const nowDay   = today.getDate();
  const currentFYStart = (nowMonth > 4 || (nowMonth === 4 && nowDay >= 6))
    ? today.getFullYear()
    : today.getFullYear() - 1;
  const fyLabel = `${currentFYStart}/${String(currentFYStart + 1).slice(-2)}`;

  // Bucket index for today within the FY (0 = Apr, ..., 11 = Mar)
  const currentBucketIdx = (() => {
    const m = today.getMonth();
    const d = today.getDate();
    if (m === 3 && d < 6) return 11; // April 1-5: end of previous FY
    return (m - 3 + 12) % 12;
  })();

  const monthlyData = useMemo(() => {
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const calMonth = (3 + i) % 12;
      const year = calMonth >= 3 ? currentFYStart : currentFYStart + 1;
      return {
        label:  new Date(year, calMonth, 1).toLocaleString('en-GB', { month: 'short' }),
        amount: 0,
      };
    });

    const { rawData = [], mapping = {}, dateFormat } = account;
    const creditCol = mapping.credit;
    const amountCol = mapping.amount;

    rawData.forEach(row => {
      if (!row[mapping.date]) return;
      const d = parseDate(row[mapping.date], dateFormat);
      if (!d) return;

      // Determine which FY this transaction belongs to
      const dMonth = d.getMonth() + 1;
      const dDay   = d.getDate();
      const dYear  = d.getFullYear();
      const txFYStart = (dMonth > 4 || (dMonth === 4 && dDay >= 6)) ? dYear : dYear - 1;
      if (txFYStart !== currentFYStart) return;

      let credit = 0;
      if (creditCol && row[creditCol] != null && row[creditCol] !== '') {
        credit = parseAmount(row[creditCol]);
      } else if (amountCol) {
        const amt = parseAmount(row[amountCol]);
        if (amt > 0) credit = amt;
      }
      if (credit > 0) {
        const bucketIdx = ((d.getMonth()) - 3 + 12) % 12;
        buckets[bucketIdx].amount += credit;
      }
    });

    return buckets;
  }, [account, currentFYStart]);

  // Value-trajectory line (same as pension ContributionBarChart)
  const linePath = useMemo(() => {
    const cv = currentBalance || 0;
    if (!cv) return null;

    const fyTotal    = monthlyData.reduce((s, b) => s + b.amount, 0);
    const openingVal = Math.max(0, cv - fyTotal);

    const values = [openingVal];
    let running = openingVal;
    for (let i = 0; i <= currentBucketIdx; i++) {
      running = i === currentBucketIdx ? cv : running + monthlyData[i].amount;
      values.push(running);
    }

    const COL_W  = 100 / 12;
    const CHART_H = 52;
    const PAD_Y  = 4;
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range  = maxVal - minVal || 1;

    const coords = values.map((v, i) => ({
      x: i === 0 ? 0 : (i - 1 + 0.5) * COL_W,
      y: CHART_H - PAD_Y - ((v - minVal) / range) * (CHART_H - PAD_Y * 2),
    }));

    const linePoints = coords.map(c => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ');
    const lastX = coords[coords.length - 1].x.toFixed(2);
    const fillD  = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ')
      + ` L${lastX},${CHART_H} L0,${CHART_H} Z`;

    return { linePoints, fillD };
  }, [monthlyData, currentBalance, currentBucketIdx]);

  const max = Math.max(...monthlyData.map(b => b.amount), 1);
  const lineColor = color || '#4edea3';

  return (
    <div style={{ position: 'relative' }}>
      {/* Hover tooltip */}
      {hoveredIdx !== null && monthlyData[hoveredIdx].amount > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: `${Math.min(Math.max((hoveredIdx + 0.5) / 12 * 100, 14), 86)}%`,
          transform: 'translateX(-50%)',
          background: '#1a2744',
          border: '1px solid rgba(173,198,255,0.15)',
          borderRadius: '10px',
          padding: '8px 12px',
          zIndex: 20,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#dae2fd', margin: '0 0 4px', fontFamily: 'Manrope, sans-serif' }}>
            {monthlyData[hoveredIdx].label} {fyLabel}
          </p>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#4edea3', margin: 0 }}>
            {fmt(monthlyData[hoveredIdx].amount)}
          </p>
        </div>
      )}

      {/* Value-trajectory line — sits behind the bars */}
      {linePath && (
        <svg
          viewBox="0 0 100 52"
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '52px', pointerEvents: 'none', zIndex: 0 }}
        >
          <path d={linePath.fillD} fill={lineColor} fillOpacity={0.07} />
          <polyline
            points={linePath.linePoints}
            fill="none"
            stroke={lineColor}
            strokeWidth="1.5"
            strokeOpacity={0.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      <div
        style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '60px', position: 'relative', zIndex: 1 }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {monthlyData.map((b, i) => (
          <div
            key={i}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: b.amount > 0 ? 'pointer' : 'default' }}
            onMouseEnter={() => setHoveredIdx(i)}
          >
            <div style={{
              width: '100%',
              height: `${Math.max(3, (b.amount / max) * 52)}px`,
              borderRadius: '3px 3px 2px 2px',
              background: b.amount > 0
                ? (i === currentBucketIdx ? lineColor : `${lineColor}88`)
                : 'rgba(173,198,255,0.06)',
              outline: hoveredIdx === i && b.amount > 0 ? `1px solid ${lineColor}66` : 'none',
              opacity: hoveredIdx !== null && hoveredIdx !== i && monthlyData[hoveredIdx].amount > 0 ? 0.4 : 1,
              transition: 'height 0.4s ease, opacity 0.15s',
            }} />
            <span style={{ fontSize: '8px', color: i === currentBucketIdx ? lineColor : '#64748b' }}>
              {b.label.slice(0, 1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
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
  const { idx }                          = useParams();
  const { accounts, updateAccount }      = useSavingsData();

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
  const totalGrowth    = Math.max(0, currentBalance - netDeposited);
  const growthPct      = netDeposited > 0 ? (totalGrowth / netDeposited) * 100 : 0;

  // FY label for chart header
  const today    = new Date();
  const nowM     = today.getMonth() + 1;
  const nowD     = today.getDate();
  const fyStart  = (nowM > 4 || (nowM === 4 && nowD >= 6)) ? today.getFullYear() : today.getFullYear() - 1;
  const fyLabel  = `${fyStart}/${String(fyStart + 1).slice(-2)}`;

  // Current balance edit handlers
  function handleEditClick() {
    setEditVal(String(Math.round(currentBalance)));
    setIsEditing(true);
  }

  async function handleSave() {
    const val = parseFloat(editVal);
    if (isNaN(val) || val < 0) { setIsEditing(false); return; }
    setIsSaving(true);
    await updateAccount(Number(idx), { currentBalance: val });
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

  const fyTotal = useMemo(() => {
    const now = new Date();
    const yr  = now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6)
      ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = new Date(yr, 3, 6); // April 6
    const { rawData = [], mapping = {}, dateFormat } = account;
    const creditCol = mapping.credit;
    const amountCol = mapping.amount;
    let total = 0;
    rawData.forEach(row => {
      const d = parseDate(row[mapping.date], dateFormat);
      if (!d || d < fyStart) return;
      const desc = String(row[mapping.description] || '').toLowerCase();
      if (desc.includes('interest') || desc.includes('dividend') || desc.includes('transfer')) return;
      let credit = 0;
      if (creditCol && row[creditCol] != null && row[creditCol] !== '') {
        credit = parseAmount(row[creditCol]);
      } else if (amountCol) {
        const amt = parseAmount(row[amountCol]);
        if (amt > 0) credit = amt;
      }
      total += credit;
    });
    return Math.round(total);
  }, [account]);

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
                    <p style={{ fontSize: '11px', color: growthPct >= 0 ? '#4edea3' : '#ff6b6b', margin: 0 }}>
                      {growthPct >= 0 ? '+' : ''}{growthPct.toFixed(1)}% total growth
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Savings History Chart */}
        <div className="animate-in stagger-2 section-card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>
              Savings History
            </h3>
            <span style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600 }}>{fyLabel}</span>
          </div>
          <SavingsHistoryChart account={account} color={color} currentBalance={currentBalance} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '12px', background: 'rgba(173,198,255,0.04)', borderRadius: '10px' }}>
            <div>
              <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 2px' }}>FY deposits</p>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#4edea3', margin: 0 }}>{fmt(fyTotal)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 2px' }}>Net deposits</p>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#dae2fd', margin: 0 }}>{fmt(netDeposited)}</p>
            </div>
          </div>
        </div>

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
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
                Edit
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
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 14px' }}>
            Recent Transactions
          </h3>

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
                    <p style={{ fontWeight: 600, fontSize: '14px', color: '#dae2fd', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      {tx.desc || 'Transaction'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                      {formatDateShort(tx.date)}
                      {tx.balance !== null && (
                        <span style={{ marginLeft: '8px', color: '#475569' }}>· bal {fmt(tx.balance)}</span>
                      )}
                    </p>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: amtColor, margin: 0, flexShrink: 0 }}>
                    {amtPrefix}{fmtFull(amount)}
                  </p>
                </div>
              );
            })
          )}
        </div>

      </div>
    </SavingsDetailLayout>
  );
}
