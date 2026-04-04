import React from 'react';
import { Link } from 'react-router-dom';
import PensionDetailLayout from '../PensionDetailLayout';

// Monthly contribution bar chart data (FY 25/26)
const MONTHLY_BARS = [
  { month: 'Apr', amount: 800 },
  { month: 'May', amount: 800 },
  { month: 'Jun', amount: 1200 },
  { month: 'Jul', amount: 800 },
  { month: 'Aug', amount: 800 },
  { month: 'Sep', amount: 800 },
  { month: 'Oct', amount: 1000 },
  { month: 'Nov', amount: 800 },
  { month: 'Dec', amount: 800 },
  { month: 'Jan', amount: 800 },
  { month: 'Feb', amount: 800 },
  { month: 'Mar', amount: 800 },
];

const RECENT_CONTRIBUTIONS = [
  { date: '15 Mar 2026', type: 'Employee', amount: '£800.00',  note: 'Monthly contribution' },
  { date: '15 Feb 2026', type: 'Employer', amount: '£480.00',  note: 'Employer match (60%)' },
  { date: '15 Feb 2026', type: 'Employee', amount: '£800.00',  note: 'Monthly contribution' },
  { date: '15 Jan 2026', type: 'Employer', amount: '£480.00',  note: 'Employer match (60%)' },
  { date: '15 Jan 2026', type: 'Employee', amount: '£800.00',  note: 'Monthly contribution' },
];

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.amount));
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '60px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '100%',
            height: `${(d.amount / max) * 52}px`,
            borderRadius: '3px 3px 2px 2px',
            background: d.amount > 800 ? '#4edea3' : 'rgba(78,222,163,0.35)',
            transition: 'height 0.4s ease',
          }} />
          <span style={{ fontSize: '8px', color: '#64748b', letterSpacing: '-0.02em' }}>{d.month.slice(0, 1)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AegonDetail() {
  return (
    <PensionDetailLayout title="Aegon" backTo="/mobile/pension">
      <div style={{ padding: '16px' }}>

        {/* Hero Card */}
        <div className="animate-in stagger-1" style={{
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(78,222,163,0.12) 0%, #1a2744 100%)',
          border: '1px solid rgba(78,222,163,0.15)',
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
                background: 'rgba(78,222,163,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '16px', color: '#4edea3',
              }}>AE</div>
              <div>
                <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: '#dae2fd', margin: '0 0 2px' }}>Aegon</h2>
                <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0 }}>Workplace Pension · Active</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Current Value</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '24px', color: '#4edea3', margin: '0 0 2px' }}>£212,540</p>
                <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0 }}>+£25,910 YTD</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Annual IRR</p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '24px', color: '#dae2fd', margin: '0 0 2px' }}>14.2%</p>
                <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0 }}>annualised</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contribution Timeline */}
        <div className="animate-in stagger-2 section-card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>
              Contributions
            </h3>
            <span style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600 }}>FY 25/26</span>
          </div>
          <BarChart data={MONTHLY_BARS} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '12px', background: 'rgba(173,198,255,0.04)', borderRadius: '10px' }}>
            <div>
              <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 2px' }}>Year total</p>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#4edea3', margin: 0 }}>£11,240</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '11px', color: '#bbcabf', margin: '0 0 2px' }}>Monthly avg</p>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#dae2fd', margin: 0 }}>£937</p>
            </div>
          </div>
        </div>

        {/* Provider Details */}
        <div className="animate-in stagger-2 section-card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 14px' }}>
            Account Details
          </h3>
          <DetailRow label="Account type" value="Workplace Pension" />
          <DetailRow label="Annual fee" value="0.35%" />
          <DetailRow label="Fund" value="Aegon BlackRock 100% Equity" />
          <DetailRow label="Employee contrib." value="£800 / month" />
          <DetailRow label="Employer match" value="£480 / month (60%)" last />
        </div>

        {/* Recent Contributions */}
        <div className="animate-in stagger-3 section-card" style={{ marginBottom: '80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: 0 }}>
              Recent Contributions
            </h3>
            <Link to="/mobile/pension/aegon/contributions" style={{ textDecoration: 'none' }}>
              <button style={{ background: 'none', border: 'none', color: '#4edea3', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                View All
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
              </button>
            </Link>
          </div>

          {RECENT_CONTRIBUTIONS.map((c, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: i < RECENT_CONTRIBUTIONS.length - 1 ? '12px' : 0,
              marginBottom: i < RECENT_CONTRIBUTIONS.length - 1 ? '12px' : 0,
              borderBottom: i < RECENT_CONTRIBUTIONS.length - 1 ? '1px solid rgba(173,198,255,0.06)' : 'none',
            }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px', color: '#dae2fd', margin: '0 0 2px' }}>{c.note}</p>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{c.date}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 700, fontSize: '14px', color: '#4edea3', margin: '0 0 2px' }}>{c.amount}</p>
                <span style={{
                  fontSize: '10px', fontWeight: 600,
                  color: c.type === 'Employer' ? '#adc6ff' : '#4edea3',
                  background: c.type === 'Employer' ? 'rgba(173,198,255,0.1)' : 'rgba(78,222,163,0.1)',
                  borderRadius: '10px', padding: '2px 7px',
                }}>
                  {c.type}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* FAB — Add Contribution */}
      <Link to="/mobile/pension/aegon/add" style={{ textDecoration: 'none' }}>
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

function DetailRow({ label, value, last }) {
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
      <p style={{ fontSize: '13px', fontWeight: 600, color: '#dae2fd', margin: 0 }}>{value}</p>
    </div>
  );
}
