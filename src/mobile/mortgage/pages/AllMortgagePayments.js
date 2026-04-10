import React, { useMemo, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useMortgageData } from '../MortgageDataContext';
import MortgageDetailLayout from '../MortgageDetailLayout';

function fmt(n) {
  return '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtShort(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d) ? null : d;
}
function formatDate(str) {
  const d = parseDate(str);
  if (!d) return str || '–';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const YEAR_COLORS = ['#4edea3', '#adc6ff', '#ffb95f', '#f472b6', '#a78bfa', '#38bdf8'];
const RGB_MAP = {
  '#4edea3': '78,222,163', '#adc6ff': '173,198,255', '#ffb95f': '255,185,95',
  '#f472b6': '244,114,182', '#a78bfa': '167,139,250', '#38bdf8': '56,189,248',
};

const PAYMENT_TYPES = [
  { value: 'monthly',    label: 'Monthly Payment'   },
  { value: 'overpayment', label: 'Overpayment'      },
  { value: 'lump_sum',   label: 'Lump Sum'          },
  { value: 'fee',        label: 'Fee / Charge'      },
  { value: 'other',      label: 'Other'             },
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

export default function AllMortgagePayments() {
  const { idx } = useParams();
  const { mortgages, updateMortgage } = useMortgageData();

  const [hoveredKey, setHoveredKey] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate,   setEditDate]   = useState('');
  const [editDesc,   setEditDesc]   = useState('');
  const [editType,   setEditType]   = useState('monthly');
  const [isSaving,   setIsSaving]   = useState(false);

  const mortgage = mortgages[Number(idx)];
  if (!mortgage) return <Navigate to="/mobile/mortgage" replace />;

  const totalPaid = (mortgage.paymentHistory || []).reduce((s, p) => s + (p.amount || 0), 0);

  const groups = useMemo(() => {
    const map = {};
    (mortgage.paymentHistory || []).forEach(p => {
      if (!p.date) return;
      const d = parseDate(p.date);
      if (!d) return;
      const yr = d.getFullYear();
      if (!map[yr]) map[yr] = { year: yr, entries: [] };
      map[yr].entries.push(p);
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
    return Object.values(map).sort((a, b) => b.year - a.year);
  }, [mortgage.paymentHistory]);

  function handleDelete(target) {
    const newHistory = (mortgage.paymentHistory || []).filter(p => p !== target);
    updateMortgage(Number(idx), { paymentHistory: newHistory });
  }

  function startEdit(p, key) {
    setEditingKey(key);
    setEditAmount(String(p.amount || ''));
    setEditDate(p.date || '');
    setEditDesc(p.description || '');
    setEditType(p.type || 'monthly');
  }

  async function handleSaveEdit(target) {
    const newAmount  = parseFloat(editAmount) || 0;
    const newHistory = (mortgage.paymentHistory || []).map(p =>
      p === target
        ? { ...p, amount: newAmount, date: editDate, description: editDesc, type: editType }
        : p
    );
    setIsSaving(true);
    updateMortgage(Number(idx), { paymentHistory: newHistory });
    setIsSaving(false);
    setEditingKey(null);
  }

  return (
    <MortgageDetailLayout title="All Payments" backTo={`/mobile/mortgage/${idx}`}>
      <div style={{ padding: '16px' }}>

        {/* Summary strip */}
        <div className="animate-in stagger-1" style={{
          background: '#171f33', borderRadius: '14px', padding: '16px',
          marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 3px' }}>Total paid</p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '22px', color: '#4edea3', margin: 0 }}>
              {fmtShort(totalPaid)}
            </p>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            {(mortgage.paymentHistory || []).length} payments
          </p>
        </div>

        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', background: '#171f33', borderRadius: '16px', color: '#64748b', fontSize: '14px' }}>
            No payment history found.
          </div>
        ) : (
          groups.map((group, gi) => {
            const color   = YEAR_COLORS[gi % YEAR_COLORS.length];
            const rgb     = RGB_MAP[color] || '173,198,255';
            const yrTotal = group.entries.reduce((s, p) => s + (p.amount || 0), 0);

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
                    {fmtShort(yrTotal)}
                  </span>
                </div>

                {/* Payment rows */}
                <div style={{ background: '#171f33', borderRadius: '14px', overflow: 'hidden' }}>
                  {group.entries.map((p, ei) => {
                    const key       = `${group.year}-${ei}`;
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
                                {PAYMENT_TYPES.map(t => (
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
                                placeholder="e.g. Overpayment"
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
                                {p.description || 'Monthly Payment'}
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
    </MortgageDetailLayout>
  );
}
