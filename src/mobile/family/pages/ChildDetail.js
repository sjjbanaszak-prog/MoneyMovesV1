import React, { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import FamilyLayout from '../FamilyLayout';
import { useFamilyData, calcAge, currentTaxYearLabel } from '../FamilyDataContext';

function fmt(n)  { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }
function fmtK(n) {
  if (!n) return '£0';
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000)     return `£${Math.round(n / 1_000)}k`;
  return `£${Math.round(n)}`;
}
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

const ACCOUNT_META = {
  jisa:          { label: 'Junior ISA',      icon: 'savings',         color: '#4edea3', limit: 9000,  limitLabel: '£9,000/yr',    limitNote: 'Annual JISA allowance' },
  junior_sipp:   { label: 'Junior SIPP',     icon: 'account_balance', color: '#adc6ff', limit: 2880,  limitLabel: '£2,880/yr net', limitNote: 'Net contributions (HMRC grosses up 20% to £3,600)' },
  premium_bonds: { label: 'Premium Bonds',   icon: 'casino',          color: '#ffb95f', limit: 50000, limitLabel: '£50,000 max',   limitNote: 'Lifetime holding limit per person' },
};

function AllowanceCard({ account }) {
  const meta = ACCOUNT_META[account.type] || { label: account.type, icon: 'account_balance_wallet', color: '#4edea3', limit: 0 };
  const contributed = account.contributionsThisYear || 0;
  const balance     = account.balance || 0;
  const isPB        = account.type === 'premium_bonds';
  const pct = meta.limit > 0 ? Math.min(100, ((isPB ? balance : contributed) / meta.limit) * 100) : 0;
  const remaining   = Math.max(0, meta.limit - (isPB ? balance : contributed));

  return (
    <div className="section-card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: `${meta.color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: meta.color }}>{meta.icon}</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: '#dae2fd', margin: 0 }}>
            {meta.label}
          </p>
          <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{account.provider || '—'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: 18, color: meta.color, margin: 0 }}>
            {fmt(balance)}
          </p>
          <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>balance</p>
        </div>
      </div>

      {/* Allowance bar */}
      {meta.limit > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#bbcabf' }}>
              {isPB ? 'Holding' : 'Contributed this year'}
            </span>
            <span style={{ fontSize: 12, color: '#bbcabf' }}>
              {isPB ? `${fmt(remaining)} remaining` : `${fmtK(remaining)} left of ${meta.limitLabel}`}
            </span>
          </div>
          <div style={{ height: 7, background: '#131b2e', borderRadius: 9999, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{
              width: `${pct}%`, height: '100%', background: meta.color,
              borderRadius: 9999, transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: meta.color, fontWeight: 700 }}>
              {isPB ? fmt(balance) : fmt(contributed)}
            </span>
            <span style={{ fontSize: 11, color: '#64748b' }}>of {fmt(meta.limit)} {meta.limitLabel.includes('/yr') ? 'annual allowance' : 'max'}</span>
          </div>
          {meta.limitNote && (
            <p style={{ fontSize: 11, color: '#64748b', margin: '8px 0 0', lineHeight: 1.5 }}>{meta.limitNote}</p>
          )}
        </>
      )}
    </div>
  );
}

function ProjectionCard({ child }) {
  const age = calcAge(child.dob);
  const totalPot = (child.accounts || []).reduce((s, a) => s + (a.balance || 0), 0);
  const jisa = (child.accounts || []).find(a => a.type === 'jisa');

  const projections = useMemo(() => {
    const yearsTo18 = Math.max(0, 18 - (age || 0));
    const yearsTo25 = Math.max(0, 25 - (age || 0));

    // Optimistic: 7% annual growth (JISA stocks & shares)
    const growthRate = 0.07;
    const annualAdd  = jisa?.contributionsThisYear || 0;

    function project(years, initial, add) {
      let v = initial;
      for (let i = 0; i < years; i++) v = (v + add) * (1 + growthRate);
      return Math.round(v);
    }

    return {
      at18: project(yearsTo18, totalPot, annualAdd),
      at25: project(yearsTo25, totalPot, annualAdd),
      yearsTo18,
      yearsTo25,
    };
  }, [age, totalPot, jisa]);

  return (
    <div className="section-card" style={{ marginBottom: 12 }}>
      <p style={{ margin: '0 0 14px', fontSize: 11, color: '#adc6ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Growth Projection
      </p>
      <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 14px', lineHeight: 1.5 }}>
        Assumes 7% annual growth with current contribution rate maintained.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {projections.yearsTo18 > 0 && (
          <div className="metric-card">
            <p style={{ fontSize: 11, color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>
              At 18
            </p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 20, color: '#4edea3', margin: '0 0 2px' }}>
              {fmtK(projections.at18)}
            </p>
            <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
              in {projections.yearsTo18} yr{projections.yearsTo18 !== 1 ? 's' : ''}
            </p>
          </div>
        )}
        <div className="metric-card">
          <p style={{ fontSize: 11, color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>
            At 25
          </p>
          <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 20, color: '#4edea3', margin: '0 0 2px' }}>
            {fmtK(projections.at25)}
          </p>
          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
            in {projections.yearsTo25} yr{projections.yearsTo25 !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ChildDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { household } = useFamilyData();
  const child = (household.children || []).find(c => c.id === id);
  const taxYear = currentTaxYearLabel();

  if (!child) {
    return (
      <FamilyLayout>
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <p style={{ color: '#64748b' }}>Child not found.</p>
          <Link to="/mobile/family/members" style={{ color: '#4edea3' }}>Back to members</Link>
        </div>
      </FamilyLayout>
    );
  }

  const age      = calcAge(child.dob);
  const totalPot = (child.accounts || []).reduce((s, a) => s + (a.balance || 0), 0);
  const color    = avatarColor(child.name);

  // Age milestones
  const milestones = [
    { age: 18, label: 'JISA matures → adult ISA', icon: 'savings' },
    { age: 18, label: 'LISA eligibility opens',   icon: 'home' },
    { age: 57, label: 'Junior SIPP accessible',    icon: 'account_balance' },
  ].filter(m => m.age > (age || 0));

  return (
    <FamilyLayout>
      <div style={{ padding: '0 16px 24px' }}>

        {/* Back header */}
        <div style={{ paddingTop: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#adc6ff' }}>arrow_back</span>
          </button>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: 22, color: '#dae2fd', margin: 0 }}>
            {child.name}
          </h1>
          <Link to={`/mobile/family/add-child?edit=${child.id}`} style={{ marginLeft: 'auto', textDecoration: 'none' }}>
            <span style={{ fontSize: 12, color: '#4edea3', fontWeight: 600 }}>Edit</span>
          </Link>
        </div>

        {/* Hero card */}
        <div className="section-card animate-in stagger-1" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
              background: `${color}22`, border: `3px solid ${color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: 22, color }}>
                {initials(child.name)}
              </span>
            </div>
            <div>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: 20, color: '#dae2fd', margin: 0 }}>
                {child.name}
              </p>
              <p style={{ fontSize: 13, color: '#bbcabf', margin: '2px 0 0' }}>
                Age {age} · born {new Date(child.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: 22, color: '#4edea3', margin: 0 }}>
                {fmtK(totalPot)}
              </p>
              <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>total pot</p>
            </div>
          </div>
        </div>

        {/* Accounts */}
        <p style={{ fontSize: 11, color: '#adc6ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 10px' }}>
          Accounts · {taxYear}
        </p>
        {(child.accounts || []).length === 0 ? (
          <div className="section-card" style={{ marginBottom: 12, textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>No accounts recorded yet.</p>
            <Link to={`/mobile/family/add-child?edit=${child.id}`} style={{ color: '#4edea3', fontSize: 13 }}>Add accounts →</Link>
          </div>
        ) : (
          (child.accounts || []).map((acc, i) => <AllowanceCard key={i} account={acc} />)
        )}

        {/* Growth projection */}
        <ProjectionCard child={child} />

        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="section-card animate-in" style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 14px', fontSize: 11, color: '#adc6ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Upcoming Milestones
            </p>
            {milestones.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < milestones.length - 1 ? 12 : 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(173,198,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#adc6ff' }}>{m.icon}</span>
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 13, color: '#dae2fd', margin: 0 }}>Age {m.age}</p>
                  <p style={{ fontSize: 12, color: '#bbcabf', margin: '2px 0 0' }}>{m.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </FamilyLayout>
  );
}
