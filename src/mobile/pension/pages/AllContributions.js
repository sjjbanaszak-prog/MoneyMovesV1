import React, { useMemo, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { usePensionData, formatDate, parseDate, getTaxYearStart, taxYearLabel } from '../PensionDataContext';
import PensionDetailLayout from '../PensionDetailLayout';

function fmt(n) {
  return '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtShort(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }

const FY_COLORS = ['#4edea3', '#adc6ff', '#ffb95f', '#f472b6', '#a78bfa', '#38bdf8'];

const CONTRIBUTION_TYPES = [
  { value: 'employee', label: 'Employee Contribution' },
  { value: 'employer', label: 'Employer Contribution' },
  { value: 'personal', label: 'Personal (SIPP)' },
  { value: 'one_off',  label: 'One-Off Payment' },
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

export default function AllContributions() {
  const { idx } = useParams();
  const { entries, updateEntry } = usePensionData();

  const [hoveredKey, setHoveredKey] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate,   setEditDate]   = useState('');
  const [editDesc,   setEditDesc]   = useState('');
  const [editType,   setEditType]   = useState('employee');
  const [isSaving,   setIsSaving]   = useState(false);

  const entry = entries[Number(idx)];
  if (!entry) return <Navigate to="/mobile/pension" replace />;

  const groups = useMemo(() => {
    const map = {};
    (entry.paymentHistory || []).forEach(p => {
      if (!p.date) return;
      const fyStart = getTaxYearStart(p.date);
      if (fyStart === null || fyStart === undefined) return;
      if (!map[fyStart]) map[fyStart] = { fyStart, entries: [] };
      map[fyStart].entries.push(p);
    });
    Object.values(map).forEach(g => {
      g.entries.sort((a, b) => {
        const da = parseDate(a.date);
        const db = parseDate(b.date);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db - da;
      });
    });
    return Object.values(map).sort((a, b) => b.fyStart - a.fyStart);
  }, [entry.paymentHistory]);

  const totalContributions = entry.deposits || 0;

  async function handleDelete(target) {
    const newHistory  = (entry.paymentHistory || []).filter(p => p !== target);
    const newDeposits = Math.max(0, (entry.deposits || 0) - (target.amount || 0));
    await updateEntry(Number(idx), { paymentHistory: newHistory, deposits: newDeposits });
  }

  function startEdit(p, key) {
    setEditingKey(key);
    setEditAmount(String(p.amount || ''));
    setEditDate(p.date || '');
    setEditDesc(p.description || '');
    setEditType(p.type || 'employee');
  }

  async function handleSaveEdit(target) {
    const newAmount  = parseFloat(editAmount) || 0;
    const amountDiff = newAmount - (target.amount || 0);
    const newHistory = (entry.paymentHistory || []).map(p =>
      p === target
        ? { ...p, amount: newAmount, date: editDate, description: editDesc, type: editType }
        : p
    );
    const newDeposits = Math.max(0, (entry.deposits || 0) + amountDiff);
    setIsSaving(true);
    await updateEntry(Number(idx), { paymentHistory: newHistory, deposits: newDeposits });
    setIsSaving(false);
    setEditingKey(null);
  }

  return (
    <PensionDetailLayout title="All Contributions" backTo={`/mobile/pension/provider/${idx}`}>
      <div style={{ padding: '16px' }}>

        {/* Summary strip */}
        <div className="animate-in stagger-1" style={{
          background: '#171f33', borderRadius: '14px', padding: '16px',
          marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 3px' }}>Total contributions</p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '22px', color: '#4edea3', margin: 0 }}>
              {fmtShort(totalContributions)}
            </p>
          </div>
          <Link to={`/mobile/pension/provider/${idx}/add`} style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'rgba(78,222,163,0.12)', border: '1px solid rgba(78,222,163,0.25)',
              borderRadius: '10px', padding: '8px 14px', color: '#4edea3',
              fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              Add
            </button>
          </Link>
        </div>

        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', background: '#171f33', borderRadius: '16px', color: '#64748b', fontSize: '14px' }}>
            No contribution history found.
          </div>
        ) : (
          groups.map((group, gi) => {
            const color  = FY_COLORS[gi % FY_COLORS.length];
            const rgbMap = { '#4edea3': '78,222,163', '#adc6ff': '173,198,255', '#ffb95f': '255,185,95', '#f472b6': '244,114,182', '#a78bfa': '167,139,250', '#38bdf8': '56,189,248' };
            const rgb    = rgbMap[color] || '173,198,255';
            const fyTotal = group.entries.reduce((s, p) => s + (p.amount || 0), 0);
            const label   = taxYearLabel(group.fyStart);

            return (
              <div key={group.fyStart} className={`animate-in stagger-${Math.min(gi + 2, 5)}`} style={{ marginBottom: '20px' }}>

                {/* FY header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                    <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '14px', color: '#dae2fd', margin: 0 }}>
                      {label}
                    </h3>
                  </div>
                  <span style={{ background: `rgba(${rgb},0.1)`, color, borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 }}>
                    {fmtShort(fyTotal)}
                  </span>
                </div>

                {/* Entries */}
                <div style={{ background: '#171f33', borderRadius: '14px', overflow: 'hidden' }}>
                  {group.entries.map((p, ei) => {
                    const key       = `${group.fyStart}-${ei}`;
                    const isHovered = hoveredKey === key;
                    const isEditing = editingKey === key;

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
                                {CONTRIBUTION_TYPES.map(t => (
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
                                placeholder="e.g. Bonus contribution"
                                style={inputStyle}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleSaveEdit(p)}
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
                                {p.description || 'Contribution'}
                              </p>
                              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                                {formatDate(p.date)}
                              </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
                              {isHovered && (
                                <>
                                  <button
                                    onClick={() => startEdit(p, key)}
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
                                    onClick={() => handleDelete(p)}
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
                              <p style={{ fontWeight: 700, fontSize: '14px', color: '#4edea3', margin: 0 }}>
                                {fmt(p.amount)}
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
    </PensionDetailLayout>
  );
}
