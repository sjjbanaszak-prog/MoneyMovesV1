import React, { useState, useMemo } from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import { useMortgageData } from '../MortgageDataContext';
import MortgageDetailLayout from '../MortgageDetailLayout';

// ---- Helpers ----
function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}
function fmtFull(n) {
  return '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d) ? null : d;
}
function formatDate(str) {
  const d = parseDate(str);
  if (!d) return str || '–';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
function formatDateShort(str) {
  const d = parseDate(str);
  if (!d) return str || '–';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function propertyColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const COLORS = ['#4edea3', '#adc6ff', '#ffb95f', '#f472b6', '#a78bfa', '#38bdf8'];
  return COLORS[Math.abs(h) % COLORS.length];
}
function propertyInitials(name = '') {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

// Remaining term from mortgage start to end date, relative to today
function calcRemainingTerm(startDate, termYears) {
  if (!startDate || !termYears) return '–';
  const end = new Date(startDate);
  end.setFullYear(end.getFullYear() + termYears);
  const msLeft = end - new Date();
  if (msLeft <= 0) return 'Expired';
  const totalMonths = Math.round(msLeft / (1000 * 60 * 60 * 24 * 30.44));
  const yrs = Math.floor(totalMonths / 12);
  const mos = totalMonths % 12;
  if (yrs === 0) return `${mos} month${mos !== 1 ? 's' : ''}`;
  if (mos === 0) return `${yrs} year${yrs !== 1 ? 's' : ''}`;
  return `${yrs} yr ${mos} mo`;
}

// Fixed term expiry — uses direct end date if stored, otherwise derives from start + years
function calcFixedExpiry(fixedRateStartDate, fixedTermYears, fixedRateEndDate) {
  if (fixedRateEndDate) return new Date(fixedRateEndDate);
  if (!fixedRateStartDate || !fixedTermYears) return null;
  const d = new Date(fixedRateStartDate);
  d.setFullYear(d.getFullYear() + fixedTermYears);
  return d;
}

// Next review date = fixed expiry - 6 months
function calcNextReviewDate(fixedRateStartDate, fixedTermYears, fixedRateEndDate) {
  const expiry = calcFixedExpiry(fixedRateStartDate, fixedTermYears, fixedRateEndDate);
  if (!expiry) return '–';
  const review = new Date(expiry);
  review.setMonth(review.getMonth() - 6);
  return review;
}

// ---- Inline editable postcode field ----
function EditablePostcode({ value, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal]     = useState('');

  function startEdit() { setEditVal(value || ''); setIsEditing(true); }
  function handleSave() {
    const v = editVal.trim().toUpperCase().replace(/\s+/g, ' ');
    if (v) onSave(v);
    setIsEditing(false);
  }
  function handleCancel() { setIsEditing(false); }

  const inputStyle = {
    width: '100%', background: 'rgba(173,198,255,0.08)',
    border: '1px solid rgba(173,198,255,0.3)', borderRadius: '8px',
    padding: '6px 10px', color: '#dae2fd', fontSize: '15px',
    fontFamily: 'Manrope, sans-serif', fontWeight: 700,
    outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Postcode</p>
        {!isEditing && (
          <button onClick={startEdit} style={{ background: 'none', border: 'none', padding: '1px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#adc6ff', opacity: 0.7 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit</span>
          </button>
        )}
      </div>
      {isEditing ? (
        <div>
          <input type="text" value={editVal} onChange={e => setEditVal(e.target.value.toUpperCase())}
            autoFocus maxLength={8} placeholder="e.g. SW1A 2AA" style={{ ...inputStyle, marginBottom: '8px' }} />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleSave} style={{ flex: 1, background: '#4edea3', color: '#003824', border: 'none', borderRadius: '8px', padding: '6px 8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Save</button>
            <button onClick={handleCancel} style={{ flex: 1, background: 'rgba(173,198,255,0.1)', color: '#adc6ff', border: '1px solid rgba(173,198,255,0.2)', borderRadius: '8px', padding: '6px 8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '16px', color: value ? '#dae2fd' : '#475569', margin: 0 }}>
          {value || 'Not set — tap to add'}
        </p>
      )}
    </div>
  );
}

// ---- Inline editable value field ----
function EditableValue({ label, value, color, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal]     = useState('');

  function startEdit() {
    setEditVal(String(Math.round(value || 0)));
    setIsEditing(true);
  }
  function handleSave() {
    const v = parseFloat(editVal);
    if (!isNaN(v) && v >= 0) onSave(v);
    setIsEditing(false);
  }
  function handleCancel() { setIsEditing(false); }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          {label}
        </p>
        {!isEditing && (
          <button
            onClick={startEdit}
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
              autoFocus min="0" step="1000"
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
            <button onClick={handleSave} style={{ flex: 1, background: '#4edea3', color: '#003824', border: 'none', borderRadius: '8px', padding: '6px 8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              Save
            </button>
            <button onClick={handleCancel} style={{ flex: 1, background: 'rgba(173,198,255,0.1)', color: '#adc6ff', border: '1px solid rgba(173,198,255,0.2)', borderRadius: '8px', padding: '6px 8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '24px', color: color || '#dae2fd', margin: 0 }}>
          {fmt(value)}
        </p>
      )}
    </div>
  );
}

// ---- Principal / Interest bar chart ----
function MortgagePaymentChart({ mortgage, mode = 'fy' }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const today    = new Date();
  const nowYear  = today.getFullYear();
  const nowMonth = today.getMonth(); // 0-indexed
  const nowDay   = today.getDate();
  const fyStart  = (nowMonth > 3 || (nowMonth === 3 && nowDay >= 6)) ? nowYear : nowYear - 1;

  const { months, periodTotal, currentBucketIdx, periodLabel } = useMemo(() => {
    const history = mortgage.paymentHistory || [];

    if (mode === 'cy') {
      const buckets = Array.from({ length: 12 }, (_, i) => {
        const total = history.reduce((s, p) => {
          if (!p.date) return s;
          const d = new Date(p.date);
          return d.getFullYear() === nowYear && d.getMonth() === i ? s + (p.amount || 0) : s;
        }, 0);
        return {
          label:     new Date(nowYear, i, 1).toLocaleString('en-GB', { month: 'short' }),
          isFuture:  i > nowMonth,
          isCurrent: i === nowMonth,
          payment:   total > 0 ? total : null,
        };
      });
      return {
        months:           buckets,
        periodTotal:      buckets.reduce((s, b) => s + (b.payment || 0), 0),
        currentBucketIdx: nowMonth,
        periodLabel:      String(nowYear),
      };
    }

    // FY: April (bucket 0) → March (bucket 11)
    const currentBucket = (nowMonth === 3 && nowDay < 6) ? 11 : (nowMonth - 3 + 12) % 12;
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const calMonth = (3 + i) % 12;
      const year     = calMonth >= 3 ? fyStart : fyStart + 1;
      const total    = history.reduce((s, p) => {
        if (!p.date) return s;
        const d  = new Date(p.date);
        const dM = d.getMonth() + 1;
        const dD = d.getDate();
        const dY = d.getFullYear();
        const txFY = (dM > 4 || (dM === 4 && dD >= 6)) ? dY : dY - 1;
        return txFY === fyStart && d.getMonth() === calMonth ? s + (p.amount || 0) : s;
      }, 0);
      return {
        label:     new Date(year, calMonth, 1).toLocaleString('en-GB', { month: 'short' }),
        isFuture:  i > currentBucket,
        isCurrent: i === currentBucket,
        payment:   total > 0 ? total : null,
      };
    });
    return {
      months:           buckets,
      periodTotal:      buckets.reduce((s, b) => s + (b.payment || 0), 0),
      currentBucketIdx: currentBucket,
      periodLabel:      `${fyStart}/${String(fyStart + 1).slice(-2)}`,
    };
  }, [mortgage.paymentHistory, mode, nowYear, nowMonth, nowDay, fyStart]);

  // Estimated principal/interest split
  const monthlyInterest = (mortgage.outstandingBalance || 0) * ((mortgage.interestRate || 0) / 100 / 12);
  const monthlyPayment  = mortgage.monthlyPayment || 0;
  const interestFrac    = monthlyPayment > 0 ? monthlyInterest / monthlyPayment : 0.5;

  const maxBar   = Math.max(...months.map(m => m.payment).filter(v => v !== null), monthlyPayment || 1);
  const allTotal = (mortgage.paymentHistory || []).reduce((s, p) => s + (p.amount || 0), 0);

  const tooltipLeft = hoveredIdx !== null
    ? Math.min(Math.max((hoveredIdx + 0.5) / 12 * 100, 14), 86)
    : 50;

  const isHoveringPayment = hoveredIdx !== null && months[hoveredIdx].payment !== null;

  return (
    <div>
      {/* Bars + tooltip wrapper */}
      <div style={{ position: 'relative' }} onMouseLeave={() => setHoveredIdx(null)}>

        {/* Hover tooltip */}
        {isHoveringPayment && (
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: `${tooltipLeft}%`,
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
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#dae2fd', margin: '0 0 6px', fontFamily: 'Manrope, sans-serif' }}>
              {months[hoveredIdx].label} {periodLabel}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ fontSize: '11px', color: '#4edea3' }}>Principal</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#dae2fd' }}>~{'£' + Math.round((months[hoveredIdx].payment || 0) * (1 - interestFrac)).toLocaleString('en-GB')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ fontSize: '11px', color: '#adc6ff' }}>Interest</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#dae2fd' }}>~{'£' + Math.round((months[hoveredIdx].payment || 0) * interestFrac).toLocaleString('en-GB')}</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', gap: '16px',
                borderTop: '1px solid rgba(173,198,255,0.1)',
                paddingTop: '3px', marginTop: '1px',
              }}>
                <span style={{ fontSize: '11px', color: '#bbcabf' }}>Total paid</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#dae2fd' }}>{'£' + Math.round(months[hoveredIdx].payment || 0).toLocaleString('en-GB')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Bars */}
        <div style={{ display: 'flex', gap: '4px', height: '52px', alignItems: 'flex-end' }}>
          {months.map((m, i) => {
            const barHeightPct = m.payment !== null ? Math.max(8, (m.payment / maxBar) * 100) : 0;
            return (
              <div
                key={i}
                style={{ flex: 1, height: '52px', display: 'flex', alignItems: 'flex-end', cursor: m.payment !== null ? 'pointer' : 'default' }}
                onMouseEnter={() => setHoveredIdx(i)}
              >
                <div style={{
                  width: '100%',
                  height: m.isFuture ? '100%' : `${barHeightPct}%`,
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  outline: m.isCurrent && m.payment !== null
                    ? '1px solid rgba(78,222,163,0.4)'
                    : hoveredIdx === i && m.payment !== null ? '1px solid rgba(173,198,255,0.25)' : 'none',
                  opacity: isHoveringPayment && hoveredIdx !== i ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                }}>
                  {m.isFuture ? (
                    <div style={{ flex: 1, background: 'rgba(173,198,255,0.06)' }} />
                  ) : m.payment !== null ? (
                    <>
                      <div style={{ width: '100%', height: `${interestFrac * 100}%`, background: 'rgba(173,198,255,0.35)' }} />
                      <div style={{ width: '100%', flex: 1, background: 'rgba(78,222,163,0.45)' }} />
                    </>
                  ) : (
                    <div style={{ flex: 1, background: 'rgba(173,198,255,0.04)' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Month labels */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
          {months.map((m, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '8px', color: m.isCurrent ? '#4edea3' : '#64748b' }}>
                {m.label.slice(0, 1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend — centred */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '10px', marginBottom: '2px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(78,222,163,0.45)' }} />
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>Principal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(173,198,255,0.35)' }} />
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>Interest</span>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '12px', background: 'rgba(173,198,255,0.04)', borderRadius: '10px' }}>
        <div>
          <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 2px' }}>{periodLabel} total</p>
          <p style={{ fontWeight: 700, fontSize: '14px', color: '#4edea3', margin: 0 }}>
            {'£' + Math.round(periodTotal).toLocaleString('en-GB')}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 2px' }}>All payments</p>
          <p style={{ fontWeight: 700, fontSize: '14px', color: '#dae2fd', margin: 0 }}>
            {'£' + Math.round(allTotal).toLocaleString('en-GB')}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- Equity progress bar ----
function EquityBar({ equity, outstanding, equityFromPayments, equityFromGrowth }) {
  const total  = equity + outstanding || 1;
  const equPct = Math.round((equity / total) * 100);
  const outPct = 100 - equPct;

  // Second bar: split of equity between payments and growth
  const hasGrowthSplit = equityFromPayments != null && equityFromGrowth != null && equity > 0;
  const paymentsPct = hasGrowthSplit ? Math.round((equityFromPayments / equity) * 100) : 100;
  const growthPct   = hasGrowthSplit ? 100 - paymentsPct : 0;

  return (
    <div>
      {/* Bar 1: Equity vs Outstanding */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Equity</span>
        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Outstanding</span>
      </div>
      <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(173,198,255,0.1)' }}>
        <div style={{ width: `${equPct}%`, background: 'linear-gradient(90deg, #4edea3, #22c87a)', transition: 'width 0.6s ease' }} />
        <div style={{ flex: 1, background: 'rgba(173,198,255,0.15)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', marginBottom: '16px' }}>
        <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#4edea3' }}>{equPct}%</span>
        <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#adc6ff' }}>{outPct}% LTV</span>
      </div>

      {/* Bar 2: Equity split — Payments vs Growth */}
      {hasGrowthSplit && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Payments</span>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Growth</span>
          </div>
          <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(173,198,255,0.1)' }}>
            <div style={{ width: `${paymentsPct}%`, background: 'linear-gradient(90deg, #adc6ff, #7aa5ff)', transition: 'width 0.6s ease' }} />
            {growthPct > 0 && (
              <div style={{ flex: 1, background: 'linear-gradient(90deg, #4edea3, #22c87a)' }} />
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#adc6ff' }}>{fmt(equityFromPayments)}</span>
            <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: growthPct > 0 ? '#4edea3' : '#64748b' }}>
              {growthPct > 0 ? fmt(equityFromGrowth) : '–'}
            </span>
          </div>
        </div>
      )}
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
export default function MortgageDetail() {
  const { idx }                        = useParams();
  const navigate                       = useNavigate();
  const { mortgages, updateMortgage }  = useMortgageData();
  const [periodType, setPeriodType]    = useState('fy');

  const mortgage = mortgages[Number(idx)];
  if (!mortgage) return <Navigate to="/mobile/mortgage" replace />;

  const color    = propertyColor(mortgage.name);
  const initials = propertyInitials(mortgage.name);

  const equity   = (mortgage.propertyValue || 0) - (mortgage.outstandingBalance || 0);

  // Equity split: payments = deposit + capital repaid; growth = property appreciation
  const purchasePrice      = mortgage.purchasePrice || mortgage.propertyValue || 0;
  const equityFromPayments = Math.max(0, purchasePrice - (mortgage.outstandingBalance || 0));
  const equityFromGrowth   = Math.max(0, (mortgage.propertyValue || 0) - purchasePrice);

  const ltvPct   = mortgage.propertyValue > 0
    ? Math.round((mortgage.outstandingBalance / mortgage.propertyValue) * 100)
    : 0;
  const equityPct = 100 - ltvPct;
  const initialLtvPct = mortgage.propertyValue > 0 && mortgage.mortgageAmount
    ? Math.round((mortgage.mortgageAmount / mortgage.propertyValue) * 100)
    : ltvPct;

  // Derived mortgage fields
  const initialTermLabel  = mortgage.termYears
    ? `${mortgage.termYears} Years${mortgage.fixedTermYears ? ` (Fixed for ${mortgage.fixedTermYears})` : ''}`
    : '–';
  const remainingTerm     = calcRemainingTerm(mortgage.startDate, mortgage.termYears);
  const nextReviewDate    = calcNextReviewDate(mortgage.fixedRateStartDate, mortgage.fixedTermYears, mortgage.fixedRateEndDate);
  const nextReviewLabel   = nextReviewDate instanceof Date
    ? formatDate(nextReviewDate.toISOString().slice(0, 10))
    : '–';

  // Colour: red if past, amber if < 6 months away, green if > 6 months away
  const reviewColor = (() => {
    if (!(nextReviewDate instanceof Date)) return '#dae2fd';
    const now = new Date();
    if (nextReviewDate < now) return '#ff6b6b';
    const sixMonthsFromNow = new Date(now);
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    return nextReviewDate <= sixMonthsFromNow ? '#ffb95f' : '#4edea3';
  })();

  // Payment history — most recent 5
  const sortedPayments = useMemo(() => {
    return [...(mortgage.paymentHistory || [])].sort((a, b) => {
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    });
  }, [mortgage.paymentHistory]);

  const recentFive = sortedPayments.slice(0, 5);

  function savePropertyValue(v) {
    const today   = new Date().toISOString().slice(0, 10);
    const history = [...(mortgage.propertyValueHistory || []), { date: today, value: v }];
    updateMortgage(Number(idx), { propertyValue: v, propertyValueHistory: history });
  }
  function saveOutstandingBalance(v) { updateMortgage(Number(idx), { outstandingBalance: v }); }
  function savePurchasePrice(v)      { updateMortgage(Number(idx), { purchasePrice: v }); }
  function savePostcode(v)           { updateMortgage(Number(idx), { postcode: v }); }

  return (
    <MortgageDetailLayout backTo="/mobile/mortgage">
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

            {/* Property identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
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
                  {mortgage.name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0 }}>{mortgage.lender}</p>
                  <span className="badge-active">{mortgage.type}</span>
                </div>
              </div>
            </div>

            {/* Net Equity headline */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
                Net Equity
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '32px', color: '#4edea3', margin: 0, lineHeight: 1 }}>
                  {fmt(equity)}
                </p>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: 'rgba(78,222,163,0.15)',
                  border: '1px solid rgba(78,222,163,0.25)',
                  borderRadius: '20px', padding: '4px 10px',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#4edea3' }}>home</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#4edea3' }}>{equityPct}% equity</span>
                </span>
              </div>
            </div>

            {/* Editable: Property Value + Outstanding Balance */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <EditableValue
                label="Property Value"
                value={mortgage.propertyValue}
                color="#dae2fd"
                onSave={savePropertyValue}
              />
              <EditableValue
                label="Outstanding"
                value={mortgage.outstandingBalance}
                color="#adc6ff"
                onSave={saveOutstandingBalance}
              />
            </div>
          </div>
        </div>

        {/* Principal / Interest Chart */}
        <div className="animate-in stagger-2 section-card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>
              Payments
            </h3>
            <div style={{ display: 'flex', background: '#060e20', borderRadius: '8px', padding: '2px', gap: '2px' }}>
              {['fy', 'cy'].map(t => (
                <button key={t} onClick={() => setPeriodType(t)} style={{
                  padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: periodType === t ? '#4edea3' : 'transparent',
                  color: periodType === t ? '#003824' : '#bbcabf',
                  fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '11px',
                  textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.15s',
                }}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <MortgagePaymentChart mortgage={mortgage} mode={periodType} />
        </div>

        {/* Equity Progress */}
        <div className="animate-in stagger-3 section-card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 16px' }}>
            Equity Progress
          </h3>
          <EquityBar
            equity={equity}
            outstanding={mortgage.outstandingBalance}
            equityFromPayments={equityFromPayments}
            equityFromGrowth={equityFromGrowth}
          />
        </div>

        {/* Mortgage Details */}
        <div className="animate-in stagger-4 section-card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 14px' }}>
            Mortgage Details
          </h3>
          <DetailRow label="Lender"            value={mortgage.lender || '–'} />
          <DetailRow label="Type"              value={mortgage.type || '–'} />
          <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(173,198,255,0.06)' }}>
            <EditablePostcode value={mortgage.postcode} onSave={savePostcode} />
          </div>
          {mortgage.purchasePrice > 0 && (
            <DetailRow label="Purchase Price"  value={fmt(mortgage.purchasePrice)} />
          )}
          {mortgage.mortgageAmount > 0 && (
            <DetailRow label="Mortgage Amount" value={fmt(mortgage.mortgageAmount)} />
          )}
          <DetailRow label="Initial LTV"       value={`${initialLtvPct}%`} />
          <DetailRow label="Initial Term"      value={initialTermLabel} />
          <DetailRow label="Remaining Term"    value={remainingTerm} />
          <DetailRow label="Current Rate"      value={mortgage.interestRate != null ? `${parseFloat(mortgage.interestRate).toFixed(2)}%` : '–'} />
          <DetailRow label="Default Rate"      value={mortgage.defaultRate != null ? `${parseFloat(mortgage.defaultRate).toFixed(2)}%` : '–'} valueColor="#ffb95f" />
          <DetailRow label="Monthly Payment"   value={fmtFull(mortgage.monthlyPayment)} />
          {mortgage.fees > 0 && (
            <DetailRow label="Mortgage Fees"   value={fmtFull(mortgage.fees)} />
          )}
          <DetailRow label="Start Date"        value={formatDate(mortgage.startDate)} />
          <DetailRow
            label="Next Review Date"
            value={nextReviewLabel}
            valueColor={reviewColor}
            last
          />
        </div>

        {/* Recent Payments */}
        <div className="animate-in stagger-5 section-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>
              Recent Payments
            </h3>
            {sortedPayments.length > 5 && (
              <Link to={`/mobile/mortgage/${idx}/payments`} style={{ textDecoration: 'none' }}>
                <button style={{ background: 'none', border: 'none', color: '#adc6ff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  View All
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
                </button>
              </Link>
            )}
          </div>

          {recentFive.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px 0', margin: 0 }}>
              No payment history recorded
            </p>
          ) : (
            recentFive.map((p, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: i < recentFive.length - 1 ? '12px' : 0,
                  marginBottom: i < recentFive.length - 1 ? '12px' : 0,
                  borderBottom: i < recentFive.length - 1 ? '1px solid rgba(173,198,255,0.06)' : 'none',
                }}
              >
                <div>
                  <p style={{ fontWeight: 600, fontSize: '13px', color: '#dae2fd', margin: '0 0 2px' }}>
                    {p.description || 'Monthly Payment'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    {formatDateShort(p.date)}
                  </p>
                </div>
                <p style={{ fontWeight: 700, fontSize: '13px', color: '#4edea3', margin: 0 }}>
                  {fmtFull(p.amount)}
                </p>
              </div>
            ))
          )}
        </div>

      </div>

      {/* FAB — Add Payment */}
      <button
        onClick={() => navigate(`/mobile/mortgage/${idx}/add`)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '20px',
          background: '#4edea3',
          color: '#003824',
          border: 'none',
          borderRadius: '16px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          fontSize: '15px',
          cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(78,222,163,0.35)',
          zIndex: 50,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
        Add Payment
      </button>

    </MortgageDetailLayout>
  );
}
