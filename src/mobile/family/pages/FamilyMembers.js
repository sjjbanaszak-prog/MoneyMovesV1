import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FamilyLayout from '../FamilyLayout';
import { useFamilyData, calcAge, childTotalPot } from '../FamilyDataContext';

function initials(name = '') {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
function avatarColor(name = '') {
  const COLORS = ['#4edea3', '#adc6ff', '#ffb95f', '#f472b6', '#a78bfa', '#38bdf8'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}
function fmt(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }

// ── Partner editor ────────────────────────────────────────────────────────────

function PartnerEditor({ partner, onSave, onRemove }) {
  const [name,  setName]  = useState(partner?.name  || '');
  const [email, setEmail] = useState(partner?.email || '');

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), email: email.trim(), allowances: partner?.allowances || {
      isa:          { contributed: 0 },
      pension:      { contributed: 0 },
      lisa:         { contributed: 0, eligible: false },
      premiumBonds: { balance: 0 },
    }});
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ fontSize: 12, color: '#adc6ff', fontWeight: 600, display: 'block', marginBottom: 6 }}>Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Partner's name"
          style={{
            width: '100%', background: '#131b2e', border: '1px solid rgba(173,198,255,0.15)',
            borderRadius: 10, padding: '10px 14px', color: '#dae2fd', fontSize: 14,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
      <div>
        <label style={{ fontSize: 12, color: '#adc6ff', fontWeight: 600, display: 'block', marginBottom: 6 }}>Email (optional)</label>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="partner@email.com"
          type="email"
          style={{
            width: '100%', background: '#131b2e', border: '1px solid rgba(173,198,255,0.15)',
            borderRadius: 10, padding: '10px 14px', color: '#dae2fd', fontSize: 14,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          style={{
            flex: 1, background: '#4edea3', color: '#0b1326', border: 'none',
            borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: 14,
            cursor: name.trim() ? 'pointer' : 'default',
            opacity: name.trim() ? 1 : 0.4,
          }}
        >
          Save Partner
        </button>
        {partner && (
          <button
            onClick={onRemove}
            style={{
              background: 'rgba(255,138,128,0.12)', color: '#ff8a80', border: 'none',
              borderRadius: 12, padding: '12px 16px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FamilyMembers() {
  const { household, setPartner, removeChild } = useFamilyData();
  const { partner, children } = household;
  const [editingPartner, setEditingPartner] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  function handleSavePartner(data) {
    setPartner(data);
    setEditingPartner(false);
  }

  function handleRemovePartner() {
    setPartner(null);
    setEditingPartner(false);
  }

  function handleRemoveChild(id) {
    removeChild(id);
    setConfirmRemoveId(null);
  }

  return (
    <FamilyLayout>
      <div style={{ padding: '0 16px 24px' }}>

        {/* Header */}
        <div style={{ paddingTop: 8, marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: 24, color: '#dae2fd', margin: 0 }}>
            Members
          </h1>
          <p style={{ fontSize: 12, color: '#bbcabf', margin: '2px 0 0' }}>Manage your household</p>
        </div>

        {/* ── Partner section ──────────────────────────────────────────── */}
        <div className="section-card animate-in stagger-1" style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 14px', fontSize: 11, color: '#adc6ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Partner
          </p>

          {editingPartner ? (
            <PartnerEditor
              partner={partner}
              onSave={handleSavePartner}
              onRemove={handleRemovePartner}
            />
          ) : partner ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                background: `${avatarColor(partner.name)}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${avatarColor(partner.name)}44`,
              }}>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: 16, color: avatarColor(partner.name) }}>
                  {initials(partner.name)}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 16, color: '#dae2fd', margin: 0 }}>
                  {partner.name}
                </p>
                {partner.email && (
                  <p style={{ fontSize: 12, color: '#bbcabf', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {partner.email}
                  </p>
                )}
              </div>
              <button
                onClick={() => setEditingPartner(true)}
                style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#adc6ff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Edit
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingPartner(true)}
              style={{
                width: '100%', background: 'rgba(78,222,163,0.08)', border: '1.5px dashed rgba(78,222,163,0.3)',
                borderRadius: 14, padding: '16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#4edea3' }}>person_add</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4edea3' }}>Add Partner</span>
            </button>
          )}
        </div>

        {/* ── Children section ─────────────────────────────────────────── */}
        <div className="section-card animate-in stagger-2" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#adc6ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Children
            </p>
            <Link to="/mobile/family/add-child" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#4edea3' }}>add</span>
                <span style={{ fontSize: 12, color: '#4edea3', fontWeight: 600 }}>Add Child</span>
              </div>
            </Link>
          </div>

          {(children || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#64748b', display: 'block', marginBottom: 8 }}>child_care</span>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>No children added yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(children || []).map(child => {
                const age   = calcAge(child.dob);
                const pot   = childTotalPot(child);
                const color = avatarColor(child.name);
                return (
                  <div key={child.id}>
                    <div style={{
                      background: '#222a3d', borderRadius: 14, padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: `${color}22`, border: `2px solid ${color}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: 14, color }}>
                          {initials(child.name)}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: '#dae2fd', margin: 0 }}>
                          {child.name}
                        </p>
                        <p style={{ fontSize: 12, color: '#bbcabf', margin: '2px 0 0' }}>
                          Age {age} · Total pot: {fmt(pot)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link to={`/mobile/family/child/${child.id}`} style={{ textDecoration: 'none' }}>
                          <button style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: 10, padding: '8px 12px', color: '#adc6ff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            View
                          </button>
                        </Link>
                        <Link to={`/mobile/family/add-child?edit=${child.id}`} style={{ textDecoration: 'none' }}>
                          <button style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: 10, padding: '8px 12px', color: '#adc6ff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Edit
                          </button>
                        </Link>
                        <button
                          onClick={() => setConfirmRemoveId(child.id)}
                          style={{ background: 'rgba(255,138,128,0.08)', border: 'none', borderRadius: 10, padding: '8px 12px', color: '#ff8a80', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {/* Inline remove confirm */}
                    {confirmRemoveId === child.id && (
                      <div style={{
                        background: 'rgba(255,138,128,0.08)', border: '1px solid rgba(255,138,128,0.2)',
                        borderRadius: 12, padding: '12px 16px', marginTop: 6,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <p style={{ fontSize: 13, color: '#ff8a80', margin: 0 }}>Remove {child.name}?</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setConfirmRemoveId(null)} style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#adc6ff', fontSize: 12, cursor: 'pointer' }}>
                            Cancel
                          </button>
                          <button onClick={() => handleRemoveChild(child.id)} style={{ background: 'rgba(255,138,128,0.15)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#ff8a80', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </FamilyLayout>
  );
}
