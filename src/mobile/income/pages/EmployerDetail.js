import React, { useState, useMemo } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useIncomeData } from '../IncomeDataContext';
import IncomeDetailLayout from '../IncomeDetailLayout';

// ---- Helpers ----
function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}
function fmtFull(n) {
  return '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function employerColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const COLORS = ['#4edea3', '#adc6ff', '#ffb95f', '#f472b6', '#a78bfa', '#38bdf8'];
  return COLORS[Math.abs(h) % COLORS.length];
}
function employerInitials(name = '') {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

const EMPLOYMENT_TYPES = [
  'Full-time', 'Part-time', 'Contract', 'Freelance', 'Self-employed',
];

const EMPLOYMENT_TYPE_COLORS = {
  'Full-time':     '#4edea3',
  'Part-time':     '#adc6ff',
  'Contract':      '#ffb95f',
  'Freelance':     '#f472b6',
  'Self-employed': '#a78bfa',
};
function typeColor(type = '') {
  return EMPLOYMENT_TYPE_COLORS[type] || '#adc6ff';
}

// ---- Salary / Bonus bar chart ----
// Each bar = one year of income. Bottom segment = salary (green), top = bonus (blue).
function IncomeHistoryChart({ income }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const currentYear = new Date().getFullYear();

  // Build unified year list: current entry + salaryHistory entries
  const allYears = useMemo(() => {
    const map = {};

    // Historical entries
    (income.salaryHistory || []).forEach(h => {
      map[h.year] = { year: h.year, salary: h.salary || 0, bonus: h.bonus || 0 };
    });

    // Current entry — placed at current year (override if present)
    map[currentYear] = {
      year:   currentYear,
      salary: income.annualSalary || 0,
      bonus:  income.annualBonus  || 0,
    };

    return Object.values(map).sort((a, b) => a.year - b.year);
  }, [income, currentYear]);

  if (allYears.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '24px 0', margin: 0 }}>
        No income history yet
      </p>
    );
  }

  const maxTotal = Math.max(...allYears.map(y => y.salary + y.bonus), 1);

  const tooltipLeft = hoveredIdx !== null
    ? Math.min(Math.max((hoveredIdx + 0.5) / allYears.length * 100, 14), 86)
    : 50;

  return (
    <div>
      <div style={{ position: 'relative' }} onMouseLeave={() => setHoveredIdx(null)}>

        {/* Hover tooltip */}
        {hoveredIdx !== null && (
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
              {allYears[hoveredIdx].year}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ fontSize: '11px', color: '#4edea3' }}>Salary</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#dae2fd' }}>{fmt(allYears[hoveredIdx].salary)}</span>
              </div>
              {allYears[hoveredIdx].bonus > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                  <span style={{ fontSize: '11px', color: '#adc6ff' }}>Bonus</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#dae2fd' }}>{fmt(allYears[hoveredIdx].bonus)}</span>
                </div>
              )}
              <div style={{
                display: 'flex', justifyContent: 'space-between', gap: '16px',
                borderTop: '1px solid rgba(173,198,255,0.1)',
                paddingTop: '3px', marginTop: '1px',
              }}>
                <span style={{ fontSize: '11px', color: '#bbcabf' }}>Total</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#dae2fd' }}>{fmt(allYears[hoveredIdx].salary + allYears[hoveredIdx].bonus)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Bars */}
        <div style={{ display: 'flex', gap: '6px', height: '72px', alignItems: 'flex-end' }}>
          {allYears.map((y, i) => {
            const total     = y.salary + y.bonus;
            const totalPct  = Math.max(8, (total / maxTotal) * 100);
            const bonusFrac = total > 0 ? y.bonus / total : 0;
            const isCurrent = y.year === currentYear;
            return (
              <div
                key={y.year}
                style={{ flex: 1, height: '72px', display: 'flex', alignItems: 'flex-end', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(i)}
              >
                <div style={{
                  width: '100%',
                  height: `${totalPct}%`,
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  outline: isCurrent ? '1px solid rgba(78,222,163,0.4)' : hoveredIdx === i ? '1px solid rgba(173,198,255,0.25)' : 'none',
                  opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                }}>
                  {/* Bonus segment (top, blue) */}
                  {bonusFrac > 0 && (
                    <div style={{ width: '100%', height: `${bonusFrac * 100}%`, background: 'rgba(173,198,255,0.45)' }} />
                  )}
                  {/* Salary segment (bottom, green) */}
                  <div style={{ width: '100%', flex: 1, background: 'rgba(78,222,163,0.5)' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Year labels */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          {allYears.map((y, i) => (
            <div key={y.year} style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '8px', color: y.year === currentYear ? '#4edea3' : '#64748b' }}>
                {String(y.year).slice(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '10px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(78,222,163,0.5)' }} />
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>Salary</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(173,198,255,0.45)' }} />
          <span style={{ fontSize: '11px', color: '#bbcabf' }}>Bonuses</span>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '12px', background: 'rgba(173,198,255,0.04)', borderRadius: '10px' }}>
        <div>
          <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 2px' }}>This year</p>
          <p style={{ fontWeight: 700, fontSize: '14px', color: '#4edea3', margin: 0 }}>
            {fmt((income.annualSalary || 0) + (income.annualBonus || 0))}
          </p>
        </div>
        {allYears.length > 1 && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 2px' }}>
              {allYears.length} years tracked
            </p>
            <p style={{ fontWeight: 700, fontSize: '14px', color: '#dae2fd', margin: 0 }}>
              {fmt(allYears.reduce((s, y) => s + y.salary + y.bonus, 0) / allYears.length)} avg
            </p>
          </div>
        )}
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
export default function EmployerDetail() {
  const { idx }                          = useParams();
  const navigate                         = useNavigate();
  const { incomes, updateIncome }        = useIncomeData();

  // ---- employer details edit state ----
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editType,         setEditType]         = useState('');
  const [editSalary,       setEditSalary]       = useState('');
  const [editBonus,        setEditBonus]        = useState('');
  const [editStartDate,    setEditStartDate]    = useState('');
  const [isSavingDetails,  setIsSavingDetails]  = useState(false);

  const income = incomes[Number(idx)];
  if (!income) return <Navigate to="/mobile/income" replace />;

  const color    = employerColor(income.employer);
  const initials = employerInitials(income.employer);
  const badgeColor = typeColor(income.employmentType);

  const totalIncome  = (income.annualSalary || 0) + (income.annualBonus || 0);
  const bonusPct     = income.annualSalary > 0
    ? ((income.annualBonus || 0) / income.annualSalary * 100)
    : 0;
  const basePct      = totalIncome > 0
    ? Math.round((income.annualSalary / totalIncome) * 100)
    : 100;

  const isActive = income.startDate
    ? new Date(income.startDate) <= new Date()
    : true;

  // ---- detail edit handlers ----
  function handleEditDetails() {
    setEditType(income.employmentType || 'Full-time');
    setEditSalary(String(income.annualSalary || ''));
    setEditBonus(String(income.annualBonus || ''));
    setEditStartDate(income.startDate || '');
    setIsEditingDetails(true);
  }

  async function handleSaveDetails() {
    setIsSavingDetails(true);
    await updateIncome(Number(idx), {
      employmentType: editType,
      annualSalary:   parseFloat(editSalary)  || 0,
      annualBonus:    parseFloat(editBonus)   || 0,
      startDate:      editStartDate || null,
    });
    setIsSavingDetails(false);
    setIsEditingDetails(false);
  }

  return (
    <IncomeDetailLayout backTo="/mobile/income">
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

            {/* Identity */}
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
                  {income.employer}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: `${badgeColor}1a`, color: badgeColor,
                    border: `1px solid ${badgeColor}40`,
                    borderRadius: '20px', padding: '2px 8px',
                    fontSize: '11px', fontWeight: 600,
                  }}>
                    {income.employmentType || 'Employment'}
                  </span>
                  <span className={isActive ? 'badge-active' : 'badge-inactive'}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Annual Income headline */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
                Total Annual Income
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '32px', color: '#4edea3', margin: 0, lineHeight: 1 }}>
                  {fmt(totalIncome)}
                </p>
                {bonusPct > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: 'rgba(78,222,163,0.15)',
                    border: '1px solid rgba(78,222,163,0.25)',
                    borderRadius: '20px', padding: '4px 10px',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#4edea3' }}>arrow_upward</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#4edea3' }}>+{bonusPct.toFixed(1)}% bonus</span>
                  </span>
                )}
              </div>
            </div>

            {/* Base / Bonus split bar */}
            {totalIncome > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Base</span>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Bonuses</span>
                </div>
                <div style={{ display: 'flex', height: '5px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(173,198,255,0.1)' }}>
                  <div style={{ width: `${basePct}%`, background: 'linear-gradient(90deg, #adc6ff, #7aa5ff)', transition: 'width 0.6s ease' }} />
                  <div style={{ flex: 1, background: 'linear-gradient(90deg, #4edea3, #22c87a)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#adc6ff' }}>{fmt(income.annualSalary)}</span>
                  <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#4edea3' }}>{fmt(income.annualBonus)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Annual Income Chart */}
        <div className="animate-in stagger-2 section-card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>
              Annual Income
            </h3>
            <span style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600 }}>
              {(income.salaryHistory || []).length + 1} year{(income.salaryHistory || []).length + 1 !== 1 ? 's' : ''}
            </span>
          </div>
          <IncomeHistoryChart income={income} />
        </div>

        {/* Employer Details */}
        <div className="animate-in stagger-3 section-card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>
              Employer Details
            </h3>
            {!isEditingDetails ? (
              <button
                onClick={handleEditDetails}
                style={{
                  background: 'none', border: 'none', color: '#adc6ff', fontSize: '12px',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
                Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveDetails}
                  disabled={isSavingDetails}
                  style={{
                    background: '#4edea3', color: '#003824', border: 'none',
                    borderRadius: '8px', padding: '5px 12px', fontSize: '12px',
                    fontWeight: 700, cursor: 'pointer', opacity: isSavingDetails ? 0.6 : 1,
                  }}
                >
                  {isSavingDetails ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditingDetails(false)}
                  style={{
                    background: 'rgba(173,198,255,0.1)', color: '#adc6ff',
                    border: '1px solid rgba(173,198,255,0.2)', borderRadius: '8px',
                    padding: '5px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {isEditingDetails ? (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 6px' }}>Employment type</p>
                <select
                  className="input-field"
                  value={editType}
                  onChange={e => setEditType(e.target.value)}
                >
                  {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 6px' }}>Annual salary (£)</p>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '15px', fontWeight: 600 }}>£</span>
                  <input
                    type="number" className="input-field"
                    value={editSalary} onChange={e => setEditSalary(e.target.value)}
                    min="0" step="1" style={{ paddingLeft: '26px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 6px' }}>Annual bonus total (£)</p>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '15px', fontWeight: 600 }}>£</span>
                  <input
                    type="number" className="input-field"
                    value={editBonus} onChange={e => setEditBonus(e.target.value)}
                    min="0" step="1" style={{ paddingLeft: '26px' }}
                  />
                </div>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 6px' }}>Start date</p>
                <input
                  type="date" className="input-field"
                  value={editStartDate} onChange={e => setEditStartDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
          ) : (
            <>
              <DetailRow label="Employment type" value={income.employmentType || '–'} valueColor={typeColor(income.employmentType)} />
              <DetailRow label="Annual salary"   value={fmt(income.annualSalary)} />
              {income.annualBonus > 0 && (
                <DetailRow label="Annual bonus"  value={fmt(income.annualBonus)} valueColor="#4edea3" />
              )}
              {income.bonusEntries && income.bonusEntries.length > 1 && (
                income.bonusEntries.map((b, i) => (
                  <DetailRow
                    key={i}
                    label={`  └ ${b.label || `Bonus ${i + 1}`}`}
                    value={fmt(b.amount)}
                    valueColor="#4edea3"
                  />
                ))
              )}
              <DetailRow
                label="Start date"
                value={income.startDate
                  ? new Date(income.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '–'}
                last
              />
            </>
          )}
        </div>

        {/* Income History list */}
        {(income.salaryHistory || []).length > 0 && (
          <div className="animate-in stagger-4 section-card" style={{ marginBottom: '100px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 14px' }}>
              Salary History
            </h3>
            {[...income.salaryHistory]
              .sort((a, b) => b.year - a.year)
              .map((h, i, arr) => (
                <div
                  key={h.year}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingBottom: i < arr.length - 1 ? '12px' : 0,
                    marginBottom: i < arr.length - 1 ? '12px' : 0,
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(173,198,255,0.06)' : 'none',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: '#dae2fd', margin: '0 0 2px' }}>{h.year}</p>
                    {h.bonus > 0 && (
                      <p style={{ fontSize: '12px', color: '#4edea3', margin: 0 }}>+{fmt(h.bonus)} bonus</p>
                    )}
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: '#adc6ff', margin: 0 }}>{fmt(h.salary)}</p>
                </div>
              ))
            }
          </div>
        )}

      </div>

      {/* FAB — Add History */}
      <button
        onClick={() => navigate(`/mobile/income/employer/${idx}/add-history`)}
        style={{
          position: 'fixed',
          bottom: '90px',
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
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>history</span>
        Add History
      </button>

    </IncomeDetailLayout>
  );
}
