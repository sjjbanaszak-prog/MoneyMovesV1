import React, { useMemo, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { usePensionData, formatDate, parseDate } from '../PensionDataContext';
import PensionDetailLayout from '../PensionDetailLayout';
import ContributionsCard from '../components/ContributionsCard';

function fmt(n)    { return '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtShort(n) { const v = Math.round(n || 0); return (v < 0 ? '−' : '') + '£' + Math.abs(v).toLocaleString('en-GB'); }
function fmtPct(n) { const s = n >= 0 ? '+' : ''; return `${s}${n.toFixed(2)}%`; }

function providerInitials(name = '') {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}
function providerColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const COLORS = ['#4edea3', '#adc6ff', '#ffb95f', '#f472b6', '#a78bfa', '#38bdf8'];
  return COLORS[Math.abs(h) % COLORS.length];
}

// ---- IRR (Newton-Raphson) ----
function _calculateIRR(cashflows, guess = 0.05) {
  if (cashflows.length < 2) return null;
  let rate = guess;
  for (let i = 0; i < 100; i++) {
    let npv = 0, deriv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const div = Math.pow(1 + rate, t);
      npv += cashflows[t] / div;
      if (t !== 0) deriv -= (t * cashflows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(deriv) < 1e-6) break;
    const next = rate - npv / deriv;
    if (Math.abs(next - rate) < 1e-6) return next;
    rate = next;
  }
  return isFinite(rate) ? rate : null;
}

function computeIRR(paymentHistory, currentValue) {
  if (!paymentHistory?.length || !currentValue) return null;
  try {
    const byYear = {};
    paymentHistory.forEach(p => {
      const dt = parseDate(p.date);
      if (!dt) return;
      const yr = dt.getFullYear();
      byYear[yr] = (byYear[yr] || 0) + (p.amount || 0);
    });
    const years = Object.keys(byYear).map(Number).sort();
    if (!years.length) return null;
    const endYear = new Date().getFullYear();
    const cashflows = [];
    for (let y = years[0]; y <= endYear; y++) {
      if ((byYear[y] || 0) > 0) cashflows.push(-(byYear[y]));
      else if (y < endYear) cashflows.push(0);
    }
    cashflows.push(currentValue);
    return _calculateIRR(cashflows);
  } catch { return null; }
}

function formatIRR(rate) {
  if (rate === null || rate === undefined || !isFinite(rate)) return '—';
  const pct = rate * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

// ---- Account type options ----
const ACCOUNT_TYPES = [
  'Workplace', 'Personal SIPP', 'Personal', 'Previous Employer',
  'AVC', 'Defined Benefit', 'Stakeholder', 'LISA',
];

export default function ProviderDetail() {
  const { idx } = useParams();
  const { entries, updateEntryValue, updateEntry } = usePensionData();

  // ---- current value edit state ----
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal]     = useState('');
  const [isSaving, setIsSaving]   = useState(false);

  // ---- account details edit state ----
  const [isEditingDetails, setIsEditingDetails]         = useState(false);
  const [editAccountType, setEditAccountType]           = useState('');
  const [editEmployeeContrib, setEditEmployeeContrib]   = useState('');
  const [editEmployerContrib, setEditEmployerContrib]   = useState('');
  const [isSavingDetails, setIsSavingDetails]           = useState(false);

  const entry = entries[Number(idx)];
  if (!entry) return <Navigate to="/mobile/pension" replace />;

  const color    = providerColor(entry.provider);
  const initials = providerInitials(entry.provider);

  const sortedHistory = useMemo(() => {
    if (!entry.paymentHistory) return [];
    return [...entry.paymentHistory].sort((a, b) => {
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    });
  }, [entry.paymentHistory]);

  const recentFive = sortedHistory.slice(0, 5);

  // Contributions card works from a list of pensions; this page shows just one
  const entryList = useMemo(() => [entry], [entry]);

  const growth = (entry.currentValue || 0) - (entry.deposits || 0);
  const growthPct = entry.deposits > 0 ? (growth / entry.deposits) * 100 : 0;

  const lastPmt = parseDate(entry.lastPayment);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const isActive = lastPmt ? lastPmt > sixMonthsAgo : false;

  const irr = useMemo(
    () => computeIRR(entry.paymentHistory, entry.currentValue),
    [entry.paymentHistory, entry.currentValue],
  );

  // ---- current value edit handlers ----
  function handleEditClick() {
    setEditVal(String(entry.currentValue || ''));
    setIsEditing(true);
  }

  async function handleSave() {
    const val = parseFloat(editVal);
    if (isNaN(val) || val < 0) { setIsEditing(false); return; }
    setIsSaving(true);
    await updateEntryValue(Number(idx), val);
    setIsSaving(false);
    setIsEditing(false);
  }

  function handleCancel() {
    setIsEditing(false);
    setEditVal('');
  }

  // ---- account details edit handlers ----
  function handleEditDetails() {
    setEditAccountType(entry.accountType || '');
    setEditEmployeeContrib(String(entry.employeeContribution ?? ''));
    setEditEmployerContrib(String(entry.employerContribution ?? ''));
    setIsEditingDetails(true);
  }

  async function handleSaveDetails() {
    setIsSavingDetails(true);
    await updateEntry(Number(idx), {
      accountType:          editAccountType,
      employeeContribution: editEmployeeContrib !== '' ? Number(editEmployeeContrib) : 0,
      employerContribution: editEmployerContrib !== '' ? Number(editEmployerContrib) : 0,
    });
    setIsSavingDetails(false);
    setIsEditingDetails(false);
  }

  function handleCancelDetails() {
    setIsEditingDetails(false);
  }

  return (
    <PensionDetailLayout backTo="/mobile/pension">
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
                  {entry.provider}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0 }}>{entry.accountType || 'Pension'}</p>
                  <span className={isActive ? 'badge-active' : 'badge-inactive'}>{isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>All Contributions</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '24px', color: '#dae2fd', margin: '0 0 2px' }}>
                  {fmtShort(entry.deposits)}
                </p>
                <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0 }}>total deposited</p>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Current Value</p>
                  {!isEditing && (
                    <button
                      onClick={handleEditClick}
                      title="Edit current value"
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
                      {fmtShort(entry.currentValue)}
                    </p>
                    <p style={{ fontSize: '11px', color: growthPct >= 0 ? '#4edea3' : '#ff6b6b', margin: 0 }}>
                      {fmtPct(growthPct)} total growth
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contribution Timeline */}
        <ContributionsCard entries={entryList} color={color} />

        {/* Account Details */}
        <div className="animate-in stagger-2 section-card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>
              Account Details
            </h3>
            {!isEditingDetails ? (
              <button
                onClick={handleEditDetails}
                style={{
                  background: 'none', border: 'none', color: '#adc6ff', fontSize: '12px',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0,
                }}
              >
                Edit
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
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
                  onClick={handleCancelDetails}
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
              {/* Account Type */}
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 6px' }}>Account type</p>
                <select
                  className="input-field"
                  value={editAccountType}
                  onChange={e => setEditAccountType(e.target.value)}
                >
                  <option value="">— Select —</option>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {/* Employee contribution */}
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 6px' }}>Employee contribution (%)</p>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    className="input-field"
                    value={editEmployeeContrib}
                    onChange={e => setEditEmployeeContrib(e.target.value)}
                    min="0" max="100" step="0.5"
                    placeholder="0"
                    style={{ paddingRight: '28px' }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '13px' }}>%</span>
                </div>
              </div>
              {/* Employer match */}
              <div style={{ marginBottom: '4px' }}>
                <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 6px' }}>Employer match (%)</p>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    className="input-field"
                    value={editEmployerContrib}
                    onChange={e => setEditEmployerContrib(e.target.value)}
                    min="0" max="100" step="0.5"
                    placeholder="0"
                    style={{ paddingRight: '28px' }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '13px' }}>%</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <DetailRow label="Account type" value={entry.accountType || '–'} />
              {entry.employeeContribution > 0 && (
                <DetailRow label="Employee contrib." value={`${entry.employeeContribution}% / month`} />
              )}
              {entry.employerContribution > 0 && (
                <DetailRow label="Employer match" value={`${entry.employerContribution}%`} />
              )}
              <DetailRow label="IRR" value={formatIRR(irr)} valueColor={irr > 0 ? '#4edea3' : irr < 0 ? '#ff6b6b' : undefined} />
              <DetailRow label="First payment" value={formatDate(entry.firstPayment) || '–'} />
              <DetailRow label="Last payment"  value={formatDate(entry.lastPayment) || '–'} last />
            </>
          )}
        </div>

        {/* Recent Contributions */}
        <div className="animate-in stagger-3 section-card" style={{ marginBottom: '80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>
              Recent Contributions
            </h3>
            {sortedHistory.length > 5 && (
              <Link to={`/mobile/pension/provider/${idx}/contributions`} style={{ textDecoration: 'none' }}>
                <button style={{ background: 'none', border: 'none', color: '#adc6ff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  View All
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
                </button>
              </Link>
            )}
          </div>

          {recentFive.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px 0', margin: 0 }}>No contributions recorded</p>
          ) : (
            recentFive.map((p, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: i < recentFive.length - 1 ? '12px' : 0,
                marginBottom: i < recentFive.length - 1 ? '12px' : 0,
                borderBottom: i < recentFive.length - 1 ? '1px solid rgba(173,198,255,0.06)' : 'none',
              }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '13px', color: '#dae2fd', margin: '0 0 2px' }}>
                    {p.description || 'Contribution'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    {formatDate(p.date)}
                  </p>
                </div>
                <p style={{ fontWeight: 700, fontSize: '13px', color: '#4edea3', margin: 0 }}>
                  {fmt(p.amount)}
                </p>
              </div>
            ))
          )}
        </div>

      </div>

      {/* FAB */}
      <Link to={`/mobile/pension/provider/${idx}/add`} style={{ textDecoration: 'none' }}>
        <button style={{
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
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
          Add Contribution
        </button>
      </Link>
    </PensionDetailLayout>
  );
}

function DetailRow({ label, value, last, valueColor }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: last ? 0 : '12px',
      marginBottom: last ? 0 : '12px',
      borderBottom: last ? 'none' : '1px solid rgba(173,198,255,0.06)',
    }}>
      <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '13px', fontWeight: 600, color: valueColor || '#dae2fd', margin: 0 }}>{value}</p>
    </div>
  );
}
