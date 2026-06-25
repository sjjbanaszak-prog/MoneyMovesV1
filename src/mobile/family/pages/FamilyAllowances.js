import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import FamilyLayout from '../FamilyLayout';
import { useFamilyData, currentTaxYearLabel } from '../FamilyDataContext';
import { useSavingsData } from '../../savings/SavingsDataContext';
import { usePensionData } from '../../pension/PensionDataContext';
import { useAuth } from '../../../contexts/AuthContext';

function fmt(n)  { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }
function fmtK(n) {
  if (!n && n !== 0) return '£0';
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000)     return `£${Math.round(n / 1_000)}k`;
  return `£${Math.round(n)}`;
}

// ── Allowance bar ──────────────────────────────────────────────────────────────

function AllowanceBar({ name, contributed, limit, color, isBalance = false }) {
  const pct  = limit > 0 ? Math.min(100, (contributed / limit) * 100) : 0;
  const left = Math.max(0, limit - contributed);

  let barColor = color;
  if (pct >= 100) barColor = '#ff8a80';
  else if (pct >= 80) barColor = '#ffb95f';

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#dae2fd', fontWeight: 600 }}>{name}</span>
        <span style={{ fontSize: 12, color: pct >= 100 ? '#ff8a80' : '#bbcabf' }}>
          {pct >= 100 ? 'Limit reached' : `${fmtK(left)} left`}
        </span>
      </div>
      <div style={{ height: 7, background: '#131b2e', borderRadius: 9999, overflow: 'hidden', marginBottom: 5 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 9999, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: barColor, fontWeight: 700 }}>{fmt(isBalance ? contributed : contributed)}</span>
        <span style={{ fontSize: 11, color: '#64748b' }}>of {fmt(limit)}</span>
      </div>
    </div>
  );
}

// ── "Managed from" note for primary user ─────────────────────────────────────

function SyncedNote({ to, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(78,222,163,0.06)', borderRadius: 8,
      padding: '6px 10px', marginTop: 4,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#4edea3' }}>sync</span>
      <span style={{ fontSize: 11, color: '#4edea3', flex: 1 }}>Synced from your {label}</span>
      <Link to={to} style={{ fontSize: 11, color: '#4edea3', fontWeight: 700, textDecoration: 'none' }}>
        Manage →
      </Link>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, subtitle, icon, color, children }) {
  return (
    <div className="section-card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color }}>{icon}</span>
        </div>
        <div>
          <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: '#dae2fd', margin: 0 }}>{title}</p>
          {subtitle && <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Allowance editor for partner (inline) ─────────────────────────────────────

function EditableAllowances({ label, allowances, onSave }) {
  const [open, setOpen]             = useState(false);
  const [isa,          setIsa]      = useState(allowances?.isa?.contributed           ?? 0);
  const [pension,      setPension]  = useState(allowances?.pension?.contributed       ?? 0);
  const [lisaAmt,      setLisaAmt]  = useState(allowances?.lisa?.contributed          ?? 0);
  const [lisaEligible, setLisaEl]   = useState(allowances?.lisa?.eligible             ?? false);
  const [pb,           setPb]       = useState(allowances?.premiumBonds?.balance      ?? 0);

  function handleSave() {
    onSave({
      isa:          { contributed: parseFloat(isa)     || 0 },
      pension:      { contributed: parseFloat(pension) || 0 },
      lisa:         { contributed: parseFloat(lisaAmt) || 0, eligible: lisaEligible },
      premiumBonds: { balance: parseFloat(pb)          || 0 },
    });
    setOpen(false);
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ background: 'rgba(173,198,255,0.06)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#adc6ff', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
      Edit {label} figures
    </button>
  );

  function Field({ label: fieldLabel, value, onChange }) {
    return (
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: '#adc6ff', fontWeight: 600, display: 'block', marginBottom: 4 }}>{fieldLabel}</label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 13 }}>£</span>
          <input
            type="number" min="0"
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{
              width: '100%', background: '#131b2e', border: '1px solid rgba(173,198,255,0.15)',
              borderRadius: 8, padding: '8px 10px 8px 24px', color: '#dae2fd', fontSize: 13,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid rgba(173,198,255,0.08)', paddingTop: 12 }}>
      <p style={{ fontSize: 12, color: '#adc6ff', fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Edit {label}
      </p>
      <Field label="ISA contributed this year"     value={isa}     onChange={setIsa}     />
      <Field label="Pension contributed this year" value={pension} onChange={setPension} />
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: 11, color: '#adc6ff', fontWeight: 600 }}>LISA eligible (under 40)?</label>
          <button
            onClick={() => setLisaEl(v => !v)}
            style={{
              width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: lisaEligible ? '#4edea3' : 'rgba(173,198,255,0.15)',
              position: 'relative',
            }}
          >
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: lisaEligible ? '#0b1326' : '#64748b',
              position: 'absolute', top: 3,
              left: lisaEligible ? 19 : 3, transition: 'left 0.2s',
            }} />
          </button>
        </div>
        {lisaEligible && <Field label="LISA contributed this year" value={lisaAmt} onChange={setLisaAmt} />}
      </div>
      <Field label="Premium Bonds balance" value={pb} onChange={setPb} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={handleSave} style={{ flex: 1, background: '#4edea3', color: '#0b1326', border: 'none', borderRadius: 10, padding: '10px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Save
        </button>
        <button onClick={() => setOpen(false)} style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: 10, padding: '10px 16px', color: '#adc6ff', fontSize: 13, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FamilyAllowances() {
  const { household, setPartner } = useFamilyData();
  const { metrics: savingsMetrics } = useSavingsData();
  const { metrics: pensionMetrics } = usePensionData();
  const { currentUser } = useAuth();
  const { partner, children, childBenefit } = household;

  const taxYear = currentTaxYearLabel();
  const yourName = currentUser?.displayName?.split(' ')[0] || 'You';

  // Primary user — sourced from live Savings & Pension contexts
  const yourIsa     = savingsMetrics.currentFYIsaDeposits;
  const yourPension = pensionMetrics.currentFYTotal;
  const yourLisa    = savingsMetrics.currentFYLisaDeposits;
  const yourPb      = savingsMetrics.premiumBondsBalance;
  const yourHasLisa = savingsMetrics.hasLisa;

  // Partner — sourced from household document (editable here)
  const pp = partner?.allowances || {};
  const partnerIsa     = pp.isa?.contributed     || 0;
  const partnerPension = pp.pension?.contributed || 0;

  // Combined ISA
  const combinedIsa      = yourIsa + partnerIsa;
  const combinedIsaLimit = (partner ? 2 : 1) * 20000;

  // Combined pension
  const combinedPension      = yourPension + partnerPension;
  const combinedPensionLimit = (partner ? 2 : 1) * 60000;

  // JISA per child
  const jisaRows = useMemo(() => (children || []).map(child => {
    const jisa = (child.accounts || []).find(a => a.type === 'jisa');
    return { name: child.name, contributed: jisa?.contributionsThisYear || 0 };
  }), [children]);

  // Junior SIPP per child
  const sippRows = useMemo(() => (children || [])
    .filter(child => (child.accounts || []).some(a => a.type === 'junior_sipp'))
    .map(child => {
      const sipp = (child.accounts || []).find(a => a.type === 'junior_sipp');
      return { name: child.name, contributed: sipp?.contributionsThisYear || 0 };
    }), [children]);

  // Premium Bonds rows
  const pbRows = useMemo(() => {
    const rows = [];
    rows.push({ name: yourName, balance: yourPb });
    if (partner) rows.push({ name: partner.name, balance: pp.premiumBonds?.balance || 0 });
    (children || []).forEach(child => {
      const pb = (child.accounts || []).find(a => a.type === 'premium_bonds');
      if (pb) rows.push({ name: child.name, balance: pb.balance || 0 });
    });
    return rows;
  }, [yourPb, pp, partner, children, yourName]);

  // LISA rows
  const lisaRows = useMemo(() => {
    const rows = [];
    if (yourHasLisa) rows.push({ name: yourName, contributed: yourLisa, bonus: Math.min(1000, yourLisa * 0.25), isYou: true });
    if (pp.lisa?.eligible) rows.push({ name: partner?.name || 'Partner', contributed: pp.lisa.contributed || 0, bonus: Math.min(1000, (pp.lisa.contributed || 0) * 0.25), isYou: false });
    return rows;
  }, [yourHasLisa, yourLisa, yourName, pp, partner]);

  // Child Benefit weekly entitlement
  const cbWeekly = useMemo(() => {
    const n = childBenefit?.childCount || 0;
    if (n === 0) return 0;
    return 25.60 + Math.max(0, n - 1) * 16.95;
  }, [childBenefit]);

  return (
    <FamilyLayout>
      <div style={{ padding: '0 16px 24px' }}>

        {/* Header */}
        <div style={{ paddingTop: 8, marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: 24, color: '#dae2fd', margin: 0 }}>
            Allowances
          </h1>
          <p style={{ fontSize: 12, color: '#bbcabf', margin: '2px 0 0' }}>{taxYear} tax year</p>
        </div>

        {/* ── ISA ─────────────────────────────────────────────────────── */}
        <Section title="ISA" subtitle="£20,000 per adult per year" icon="savings" color="#4edea3">
          <AllowanceBar name={yourName} contributed={yourIsa} limit={20000} color="#4edea3" />
          <SyncedNote to="/mobile/savings" label="Savings section" />
          {partner && (
            <>
              <div style={{ height: 1, background: 'rgba(173,198,255,0.06)', margin: '14px 0' }} />
              <AllowanceBar name={partner.name} contributed={partnerIsa} limit={20000} color="#4edea3" />
              <EditableAllowances
                label={partner.name}
                allowances={pp}
                onSave={(updated) => setPartner({ ...partner, allowances: updated })}
              />
            </>
          )}
          {partner && (
            <div style={{ borderTop: '1px solid rgba(173,198,255,0.08)', paddingTop: 12, marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, color: '#bbcabf', fontWeight: 600 }}>Household total</span>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: '#4edea3' }}>
                  {fmt(combinedIsa)} / {fmt(combinedIsaLimit)}
                </span>
              </div>
            </div>
          )}
        </Section>

        {/* ── JISA ────────────────────────────────────────────────────── */}
        {jisaRows.length > 0 && (
          <Section title="Junior ISA (JISA)" subtitle="£9,000 per child per year" icon="child_care" color="#adc6ff">
            {jisaRows.map((row, i) => (
              <AllowanceBar key={i} name={row.name} contributed={row.contributed} limit={9000} color="#adc6ff" />
            ))}
            {jisaRows.length > 1 && (
              <div style={{ borderTop: '1px solid rgba(173,198,255,0.08)', paddingTop: 12, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12, color: '#bbcabf', fontWeight: 600 }}>Household total</span>
                  <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: '#adc6ff' }}>
                    {fmt(jisaRows.reduce((s, r) => s + r.contributed, 0))} / {fmt(jisaRows.length * 9000)}
                  </span>
                </div>
              </div>
            )}
            <p style={{ fontSize: 11, color: '#64748b', margin: '12px 0 0', lineHeight: 1.5 }}>
              Update individual JISA contributions from each child's profile.
            </p>
            <Link to="/mobile/family/members" style={{ fontSize: 12, color: '#4edea3', textDecoration: 'none', display: 'block', marginTop: 6 }}>
              Edit child accounts →
            </Link>
          </Section>
        )}

        {/* ── Pension ─────────────────────────────────────────────────── */}
        <Section title="Pension" subtitle="£60,000 per adult per year" icon="account_balance" color="#ffb95f">
          <AllowanceBar name={yourName} contributed={yourPension} limit={60000} color="#ffb95f" />
          <SyncedNote to="/mobile/pension" label="Pension section" />
          {partner && (
            <>
              <div style={{ height: 1, background: 'rgba(173,198,255,0.06)', margin: '14px 0' }} />
              <AllowanceBar name={partner.name} contributed={partnerPension} limit={60000} color="#ffb95f" />
            </>
          )}
          {partner && (
            <div style={{ borderTop: '1px solid rgba(173,198,255,0.08)', paddingTop: 12, marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, color: '#bbcabf', fontWeight: 600 }}>Household total</span>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: '#ffb95f' }}>
                  {fmt(combinedPension)} / {fmt(combinedPensionLimit)}
                </span>
              </div>
            </div>
          )}
        </Section>

        {/* ── Junior SIPP ─────────────────────────────────────────────── */}
        {sippRows.length > 0 && (
          <Section title="Junior SIPP" subtitle="£2,880/yr net per child (£3,600 gross)" icon="account_balance" color="#a78bfa">
            {sippRows.map((row, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <AllowanceBar name={row.name} contributed={row.contributed} limit={2880} color="#a78bfa" />
                <p style={{ fontSize: 11, color: '#64748b', margin: '-8px 0 0', lineHeight: 1.5 }}>
                  HMRC adds 20% tax relief: {fmt(row.contributed)} net → {fmt(Math.round(row.contributed * 1.25))} gross
                </p>
              </div>
            ))}
          </Section>
        )}

        {/* ── LISA ────────────────────────────────────────────────────── */}
        {lisaRows.length > 0 && (
          <Section title="Lifetime ISA (LISA)" subtitle="£4,000/yr · 25% govt bonus up to £1,000" icon="home" color="#f472b6">
            {lisaRows.map((row, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <AllowanceBar name={row.name} contributed={row.contributed} limit={4000} color="#f472b6" />
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(244,114,182,0.08)', borderRadius: 8, padding: '4px 10px', marginTop: 4,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#f472b6' }}>redeem</span>
                  <span style={{ fontSize: 11, color: '#f472b6', fontWeight: 700 }}>
                    Govt bonus: {fmt(row.bonus)} / £1,000 max
                  </span>
                </div>
                {row.isYou && (
                  <div style={{ marginTop: 6 }}>
                    <SyncedNote to="/mobile/savings" label="Savings section" />
                  </div>
                )}
              </div>
            ))}
            <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0', lineHeight: 1.5 }}>
              LISA must be opened before age 40. Funds usable for first home purchase or retirement from age 60.
            </p>
          </Section>
        )}

        {/* ── Premium Bonds ────────────────────────────────────────────── */}
        <Section title="Premium Bonds" subtitle="£50,000 per person lifetime limit" icon="casino" color="#ffb95f">
          {pbRows.map((row, i) => (
            <AllowanceBar key={i} name={row.name} contributed={row.balance} limit={50000} color="#ffb95f" isBalance />
          ))}
          <SyncedNote to="/mobile/savings" label="Savings section" />
          <p style={{ fontSize: 11, color: '#64748b', margin: '8px 0 0', lineHeight: 1.5 }}>
            Premium Bonds can be purchased for children by a parent or guardian.
          </p>
        </Section>

        {/* ── Child Benefit ────────────────────────────────────────────── */}
        {cbWeekly > 0 && (
          <Section title="Child Benefit" subtitle="Tax-free weekly payment" icon="child_care" color="#38bdf8">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="metric-card">
                <p style={{ fontSize: 11, color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>Weekly</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 20, color: '#38bdf8', margin: '0 0 2px' }}>
                  £{cbWeekly.toFixed(2)}
                </p>
                <p style={{ fontSize: 11, color: '#bbcabf', margin: 0 }}>{childBenefit?.childCount} child{childBenefit?.childCount !== 1 ? 'ren' : ''}</p>
              </div>
              <div className="metric-card">
                <p style={{ fontSize: 11, color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>Annual</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 20, color: '#38bdf8', margin: '0 0 2px' }}>
                  {fmtK(cbWeekly * 52)}
                </p>
                <p style={{ fontSize: 11, color: '#bbcabf', margin: 0 }}>per year</p>
              </div>
            </div>
            <div style={{
              marginTop: 14, background: 'rgba(255,185,95,0.08)', borderRadius: 12,
              padding: '12px', borderLeft: '3px solid #ffb95f',
            }}>
              <p style={{ fontSize: 12, color: '#ffb95f', fontWeight: 700, margin: '0 0 4px' }}>
                High Income Child Benefit Charge
              </p>
              <p style={{ fontSize: 12, color: '#bbcabf', margin: 0, lineHeight: 1.5 }}>
                If either adult earns over £60,000, Child Benefit is gradually clawed back.
                At £80,000+ the full amount is repaid via a tax charge.
              </p>
            </div>
          </Section>
        )}

        {/* Add partner prompt if no partner */}
        {!partner && (
          <div className="section-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#64748b', display: 'block', marginBottom: 8 }}>group_add</span>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 10px' }}>
              Add a partner to see combined household allowances
            </p>
            <Link to="/mobile/family/members" style={{ fontSize: 13, color: '#4edea3', textDecoration: 'none', fontWeight: 600 }}>
              Manage members →
            </Link>
          </div>
        )}

      </div>
    </FamilyLayout>
  );
}
