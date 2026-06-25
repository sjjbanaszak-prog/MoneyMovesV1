import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import FamilyLayout from '../FamilyLayout';
import { useFamilyData, calcAge, childTotalPot, currentTaxYearLabel } from '../FamilyDataContext';
import { useDemoMode } from '../../../contexts/DemoModeContext';
import { useSavingsData } from '../../savings/SavingsDataContext';
import { usePensionData } from '../../pension/PensionDataContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }
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

function AllowanceBar({ label, contributed, limit, color = '#4edea3' }) {
  const pct = limit > 0 ? Math.min(100, (contributed / limit) * 100) : 0;
  const remaining = Math.max(0, limit - contributed);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#dae2fd', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color: '#bbcabf' }}>{fmt(remaining)} left</span>
      </div>
      <div style={{ height: 6, background: '#131b2e', borderRadius: 9999, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 9999, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 11, color: '#64748b' }}>{fmt(contributed)} / {fmt(limit)}</span>
      </div>
    </div>
  );
}

function AccountTypePills({ accounts }) {
  const TYPE_META = {
    jisa:          { label: 'JISA',  color: '#4edea3' },
    junior_sipp:   { label: 'SIPP',  color: '#adc6ff' },
    premium_bonds: { label: 'PB',    color: '#ffb95f' },
  };
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
      {(accounts || []).map((a, i) => {
        const meta = TYPE_META[a.type] || { label: a.type, color: '#64748b' };
        return (
          <span key={i} style={{
            fontSize: 10, fontWeight: 700, color: meta.color,
            background: `${meta.color}18`, borderRadius: 9999,
            padding: '2px 8px', letterSpacing: '0.05em',
          }}>
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FamilyHub() {
  const { household } = useFamilyData();
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  const { metrics: savingsMetrics } = useSavingsData();
  const { metrics: pensionMetrics } = usePensionData();
  const { partner, children, childBenefit } = household;

  const taxYear = currentTaxYearLabel();

  // Combined household allowance totals — primary user from live contexts
  const combined = useMemo(() => {
    const pp = partner?.allowances || {};
    const yourIsa     = savingsMetrics.currentFYIsaDeposits;
    const yourPension = pensionMetrics.currentFYTotal;
    const yourPb      = savingsMetrics.premiumBondsBalance;
    const partnerPb   = pp.premiumBonds?.balance || 0;
    const childrenPb  = (children || []).reduce((s, c) => {
      const pb = (c.accounts || []).find(a => a.type === 'premium_bonds');
      return s + (pb?.balance || 0);
    }, 0);
    const memberCount = 1 + (partner ? 1 : 0) + (children || []).length;
    return {
      isa:          yourIsa + (pp.isa?.contributed || 0),
      isaLimit:     (partner ? 2 : 1) * 20000,
      pension:      yourPension + (pp.pension?.contributed || 0),
      pensionLimit: (partner ? 2 : 1) * 60000,
      jisa:         (children || []).reduce((s, c) =>
        s + (c.accounts || []).filter(a => a.type === 'jisa').reduce((ss, a) => ss + (a.contributionsThisYear || 0), 0), 0),
      jisaLimit:    (children || []).length * 9000,
      pb:           yourPb + partnerPb + childrenPb,
      pbLimit:      memberCount * 50000,
    };
  }, [savingsMetrics, pensionMetrics, partner, children]);

  const memberCount = 1 + (partner ? 1 : 0) + (children || []).length;

  return (
    <FamilyLayout>
      <div style={{ padding: '0 16px 24px' }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 8 }}>
          <div>
            <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: 24, color: '#dae2fd', margin: 0 }}>
              Family
            </h1>
            <p style={{ fontSize: 12, color: '#bbcabf', margin: '2px 0 0' }}>
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </p>
          </div>
          {/* Demo toggle */}
          <button
            onClick={toggleDemoMode}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: isDemoMode ? 'rgba(78,222,163,0.12)' : 'rgba(173,198,255,0.08)',
              border: isDemoMode ? '1px solid rgba(78,222,163,0.3)' : '1px solid rgba(173,198,255,0.12)',
              borderRadius: 20, padding: '5px 10px 5px 7px', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 28, height: 16, borderRadius: 8,
              background: isDemoMode ? '#4edea3' : 'rgba(173,198,255,0.2)',
              position: 'relative', flexShrink: 0,
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: isDemoMode ? '#003824' : '#64748b',
                position: 'absolute', top: 2,
                left: isDemoMode ? 14 : 2, transition: 'left 0.2s',
              }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: isDemoMode ? '#4edea3' : '#64748b' }}>Demo</span>
          </button>
        </div>

        {/* ── Partner card ─────────────────────────────────────────────── */}
        <div className="animate-in stagger-1 section-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#adc6ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Partner</p>
            <Link to="/mobile/family/members" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: 12, color: '#4edea3', fontWeight: 600 }}>
                {partner ? 'Edit →' : 'Add →'}
              </span>
            </Link>
          </div>

          {partner ? (
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
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 16, color: '#dae2fd', margin: '0 0 2px' }}>
                  {partner.name}
                </p>
                <p style={{ fontSize: 12, color: '#bbcabf', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {partner.email}
                </p>
              </div>
            </div>
          ) : (
            <Link to="/mobile/family/members" style={{ textDecoration: 'none' }}>
              <div style={{
                border: '2px dashed rgba(173,198,255,0.15)', borderRadius: 16,
                padding: '20px 16px', textAlign: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#adc6ff', display: 'block', marginBottom: 8 }}>person_add</span>
                <p style={{ fontSize: 13, color: '#adc6ff', margin: 0 }}>Add your partner to see combined allowances</p>
              </div>
            </Link>
          )}
        </div>

        {/* ── Children ─────────────────────────────────────────────────── */}
        <div className="animate-in stagger-2 section-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#adc6ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Children
            </p>
            <Link to="/mobile/family/members" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: 12, color: '#4edea3', fontWeight: 600 }}>Manage →</span>
            </Link>
          </div>

          {(children || []).length === 0 ? (
            <Link to="/mobile/family/members" style={{ textDecoration: 'none' }}>
              <div style={{
                border: '2px dashed rgba(173,198,255,0.15)', borderRadius: 16,
                padding: '20px 16px', textAlign: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#adc6ff', display: 'block', marginBottom: 8 }}>child_care</span>
                <p style={{ fontSize: 13, color: '#adc6ff', margin: 0 }}>Add children to track their JISA, Junior SIPP and Premium Bonds</p>
              </div>
            </Link>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(children || []).map(child => {
                const age  = calcAge(child.dob);
                const pot  = childTotalPot(child);
                const color = avatarColor(child.name);
                return (
                  <Link key={child.id} to={`/mobile/family/child/${child.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: '#222a3d', borderRadius: 14, padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: `${color}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${color}44`,
                      }}>
                        <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: 14, color }}>
                          {initials(child.name)}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: '#dae2fd', margin: 0 }}>
                            {child.name}
                          </p>
                          <p style={{ fontSize: 14, fontWeight: 800, color: '#4edea3', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
                            {fmtK(pot)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ fontSize: 12, color: '#bbcabf', margin: '2px 0 0' }}>Age {age}</p>
                          <AccountTypePills accounts={child.accounts} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Household allowances preview ─────────────────────────────── */}
        <div className="animate-in stagger-3 section-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: '#adc6ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Household Allowances
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>{taxYear} tax year</p>
            </div>
            <Link to="/mobile/family/allowances" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: 12, color: '#4edea3', fontWeight: 600 }}>View all →</span>
            </Link>
          </div>

          <AllowanceBar
            label={`ISA${partner ? ' (both adults)' : ''}`}
            contributed={combined.isa}
            limit={combined.isaLimit}
            color="#4edea3"
          />
          {combined.jisaLimit > 0 && (
            <AllowanceBar
              label={`JISA (${(children || []).length} child${(children || []).length !== 1 ? 'ren' : ''})`}
              contributed={combined.jisa}
              limit={combined.jisaLimit}
              color="#adc6ff"
            />
          )}
          <AllowanceBar
            label={`Pension${partner ? ' (both adults)' : ''}`}
            contributed={combined.pension}
            limit={combined.pensionLimit}
            color="#ffb95f"
          />
          <AllowanceBar
            label="Premium Bonds"
            contributed={combined.pb}
            limit={combined.pbLimit}
            color="#f59e0b"
          />
        </div>

        {/* ── Child Benefit nudge ───────────────────────────────────────── */}
        {childBenefit?.childCount > 0 && (
          <div className="animate-in stagger-4 section-card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255,185,95,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ffb95f' }}>child_care</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: '#dae2fd', margin: '0 0 4px' }}>Child Benefit</p>
                <p style={{ fontSize: 12, color: '#bbcabf', margin: 0, lineHeight: 1.5 }}>
                  {childBenefit.childCount === 1
                    ? 'You may be entitled to £25.60/week for your child.'
                    : `You may be entitled to £${(25.60 + (childBenefit.childCount - 1) * 16.95).toFixed(2)}/week for ${childBenefit.childCount} children.`}
                  {' '}Check your household income against the High Income Child Benefit threshold (£60k).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Quick actions ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
          <Link to="/mobile/family/members" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#1a2540', borderRadius: 16, padding: '16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#4edea3' }}>group</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#dae2fd' }}>Manage Members</span>
            </div>
          </Link>
          <Link to="/mobile/family/allowances" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#1a2540', borderRadius: 16, padding: '16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#adc6ff' }}>donut_large</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#dae2fd' }}>All Allowances</span>
            </div>
          </Link>
        </div>

      </div>
    </FamilyLayout>
  );
}
