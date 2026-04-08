import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoMode } from '../../../contexts/DemoModeContext';
import { useIncomeData } from '../IncomeDataContext';
import IncomeLayout from '../IncomeLayout';
import { formatLastUpdated } from '../../utils/formatLastUpdated';

function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}

function employerColorIndex(name = '') {
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

function DemoToggle() {
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  return (
    <button
      onClick={toggleDemoMode}
      style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        background: isDemoMode ? 'rgba(78,222,163,0.12)' : 'rgba(173,198,255,0.08)',
        border: isDemoMode ? '1px solid rgba(78,222,163,0.3)' : '1px solid rgba(173,198,255,0.12)',
        borderRadius: '20px', padding: '5px 10px 5px 7px',
        cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      <div style={{
        width: '28px', height: '16px', borderRadius: '8px',
        background: isDemoMode ? '#4edea3' : 'rgba(173,198,255,0.2)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          width: '12px', height: '12px', borderRadius: '50%',
          background: isDemoMode ? '#003824' : '#64748b',
          position: 'absolute', top: '2px',
          left: isDemoMode ? '14px' : '2px',
          transition: 'left 0.2s, background 0.2s',
        }} />
      </div>
      <span style={{
        fontSize: '11px', fontWeight: 700,
        color: isDemoMode ? '#4edea3' : '#64748b',
        whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
      }}>
        Demo
      </span>
    </button>
  );
}

export default function IncomeOverview() {
  const navigate = useNavigate();
  const { incomes, metrics, isLoading, lastUpdated } = useIncomeData();

  const { totalIncome, totalBase, totalBonuses, bonusPct, baseBarPct } = metrics;

  return (
    <IncomeLayout>
      <div style={{ padding: '0 0 16px' }}>

        {/* Header */}
        <div style={{
          padding: '24px 20px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Income</p>
            <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
              Overview
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DemoToggle />
          </div>
        </div>

        {/* Hero Card */}
        <div className="animate-in stagger-1" style={{ margin: '0 16px 16px' }}>
          <div style={{
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #1a2744 0%, #0f1a30 100%)',
            border: '1px solid rgba(78,222,163,0.15)',
            padding: '24px', position: 'relative', overflow: 'hidden',
          }}>
            <div className="hero-gradient" style={{ position: 'absolute', inset: 0, zIndex: 0, borderRadius: '20px' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Total Income
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '36px', color: '#dae2fd', margin: 0, lineHeight: 1 }}>
                  {isLoading ? '–' : fmt(totalIncome)}
                </h2>
                {!isLoading && totalBonuses > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(78,222,163,0.15)', border: '1px solid rgba(78,222,163,0.25)', borderRadius: '20px', padding: '4px 10px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#4edea3' }}>arrow_upward</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#4edea3' }}>
                      +{bonusPct.toFixed(1)}% bonuses
                    </span>
                  </div>
                )}
              </div>

              {/* Base / Bonuses split bar */}
              {!isLoading && totalIncome > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Base</span>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Bonuses</span>
                  </div>
                  <div style={{ display: 'flex', height: '5px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(173,198,255,0.1)' }}>
                    <div style={{ width: `${baseBarPct}%`, background: 'linear-gradient(90deg, #adc6ff, #7aa5ff)', transition: 'width 0.6s ease' }} />
                    <div style={{ flex: 1, background: 'linear-gradient(90deg, #4edea3, #22c87a)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#adc6ff' }}>{fmt(totalBase)}</span>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#4edea3' }}>{fmt(totalBonuses)}</span>
                  </div>
                </div>
              )}

              <p style={{ fontSize: '12px', color: '#bbcabf', margin: '10px 0 0' }}>
                {isLoading
                  ? 'Loading...'
                  : incomes.length === 0
                    ? 'No income data yet'
                    : [incomes.length + ` employer${incomes.length !== 1 ? 's' : ''}`, formatLastUpdated(lastUpdated)].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </div>

        {/* Income Streams */}
        <div className="animate-in stagger-2" style={{ margin: '0 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>
              Income Streams
            </h3>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontSize: '14px' }}>
              Loading income streams...
            </div>
          ) : incomes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', background: '#171f33', borderRadius: '16px', color: '#64748b', fontSize: '14px' }}>
              No income streams added yet. Tap + Add Income to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {incomes.map((income, i) => {
                const color    = employerColorIndex(income.employer);
                const initials = employerInitials(income.employer);
                const badgeColor = typeColor(income.employmentType);
                const totalPkg = (income.annualSalary || 0) + (income.annualBonus || 0);
                const bonusShare = income.annualSalary > 0
                  ? ((income.annualBonus || 0) / income.annualSalary * 100)
                  : 0;

                return (
                  <div key={i} className="provider-row" onClick={() => navigate(`/mobile/income/employer/${i}`)} style={{ cursor: 'pointer' }}>
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '10px',
                      background: '#171f33', border: '1px solid rgba(60,74,66,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginRight: '14px', flexShrink: 0,
                      fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '13px', color,
                    }}>
                      {initials}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <h4 style={{
                          fontWeight: 700, fontSize: '15px', color: '#dae2fd', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px',
                        }}>
                          {income.employer}
                        </h4>
                        <span style={{
                          background: `rgba(${badgeColor === '#4edea3' ? '78,222,163' : badgeColor === '#ffb95f' ? '255,185,95' : badgeColor === '#f472b6' ? '244,114,182' : badgeColor === '#a78bfa' ? '167,139,250' : '173,198,255'},0.12)`,
                          color: badgeColor,
                          border: `1px solid ${badgeColor}40`,
                          borderRadius: '20px', padding: '3px 10px',
                          fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
                        }}>
                          {income.employmentType || 'Employment'}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0 }}>
                        {income.startDate ? `Since ${new Date(income.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : 'Income stream'}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right', marginLeft: '14px', flexShrink: 0 }}>
                      <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 2px' }}>
                        {fmt(totalPkg)}
                      </p>
                      <p style={{ fontSize: '11px', color: bonusShare > 0 ? '#4edea3' : '#64748b', margin: 0 }}>
                        {bonusShare > 0 ? `+${bonusShare.toFixed(0)}% bonus` : 'Base only'}
                      </p>
                    </div>
                    <span className="material-symbols-outlined row-chevron">chevron_right</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Teaser Card */}
        <div className="animate-in stagger-3" style={{
          margin: '0 16px 24px',
          position: 'relative', overflow: 'hidden',
          padding: '28px 24px', borderRadius: '20px',
          border: '1px solid rgba(78,222,163,0.2)',
          background: 'linear-gradient(135deg, rgba(78,222,163,0.18) 0%, #222a3d 100%)',
        }}>
          <div style={{ position: 'absolute', right: '-30px', bottom: '-30px', width: '120px', height: '120px', background: 'rgba(78,222,163,0.1)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: '-30px', top: '-30px', width: '100px', height: '100px', background: 'rgba(173,198,255,0.08)', borderRadius: '50%', filter: 'blur(35px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(78,222,163,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#4edea3' }}>psychology</span>
            </div>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '20px', fontWeight: 900, color: '#dae2fd', margin: '0 0 8px' }}>
              Maximise Your Earnings
            </h3>
            <p style={{ fontSize: '13px', color: '#bbcabf', lineHeight: 1.6, maxWidth: '280px', margin: '0 0 16px' }}>
              Our AI can identify salary benchmarks, tax optimisation opportunities, and strategies to grow your take-home pay.
            </p>
            <button className="primary-btn" style={{ marginTop: '6px' }}>See Income Insights</button>
          </div>
        </div>

      </div>

      {/* FAB — Add Income */}
      <button
        onClick={() => navigate('/mobile/income/add')}
        style={{
          position: 'fixed', bottom: '88px', right: '20px',
          background: '#4edea3', color: '#003824',
          border: 'none', borderRadius: '16px', padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px',
          cursor: 'pointer', boxShadow: '0 4px 24px rgba(78,222,163,0.35)',
          zIndex: 50,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
        Add Income
      </button>

    </IncomeLayout>
  );
}
