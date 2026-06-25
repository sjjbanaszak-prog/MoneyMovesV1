import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileNavDrawer from '../components/MobileNavDrawer';

const FREE_FEATURES = [
  {
    title: 'Single pension account tracking',
    desc: 'Track one pension account with full overview and pot value history.',
  },
  {
    title: 'Basic mortgage calculator',
    desc: 'Monitor your net equity position and calculate mortgage repayments.',
  },
  {
    title: 'Single savings account tracking',
    desc: 'Track one savings account with balance history and growth.',
  },
  {
    title: 'Income calculator',
    desc: 'Estimate take-home pay with standard tax and NI calculations.',
  },
  {
    title: 'Standard support',
    desc: 'Access our help centre and community forums.',
  },
];

const PREMIUM_FEATURES = [
  {
    title: 'Unlimited mortgage scenario modelling',
    desc: 'Plan complex financing with limitless iterations.',
  },
  {
    title: 'Real-time property valuation alerts',
    desc: 'Stay ahead of market shifts with instant notifications.',
  },
  {
    title: 'Advanced pension tax-efficiency AI',
    desc: 'Custom algorithms to maximise your future yields.',
  },
  {
    title: 'Priority expert support',
    desc: 'Skip the queue with dedicated financial advisors.',
  },
  {
    title: 'Ad-free experience',
    desc: 'Uninterrupted focus on your financial architecture.',
  },
];

const FAMILY_FEATURES = [
  {
    title: 'Everything in Professional',
    desc: 'All pro features included for every adult in the household.',
  },
  {
    title: 'Family Hub & partner tracking',
    desc: 'Track your partner\'s ISA, pension, and savings alongside your own.',
  },
  {
    title: 'Children\'s account management',
    desc: 'Monitor JISA, Junior SIPP, and Premium Bonds for each child.',
  },
  {
    title: 'Combined household allowances',
    desc: 'See your full household ISA, pension, and savings picture in one place.',
  },
  {
    title: 'Up to 6 family members',
    desc: 'Cover your whole household — adults and children — under one plan.',
  },
];

export default function MobileUpgradePage() {
  const navigate = useNavigate();
  const [plan, setPlan]                       = useState('individual'); // 'individual' | 'family'
  const [individualBilling, setIndivBilling]  = useState('annual');    // 'free' | 'monthly' | 'annual'
  const [familyBilling, setFamilyBilling]     = useState('monthly');   // 'monthly' | 'annual'

  const isFamily   = plan === 'family';
  const isIndivFree    = !isFamily && individualBilling === 'free';
  const isIndivMonthly = !isFamily && individualBilling === 'monthly';
  const isIndivAnnual  = !isFamily && individualBilling === 'annual';
  const isFamAnnual    = isFamily  && familyBilling     === 'annual';

  const price = isIndivFree ? '£0'
    : isIndivAnnual         ? '£49.99'
    : isIndivMonthly        ? '£5.99'
    : isFamAnnual           ? '£69.99'
    :                         '£7.99';

  const period = isIndivFree ? null : (isIndivAnnual || isFamAnnual) ? '/year' : '/month';

  const subLabel = isIndivFree
    ? 'Access to core features. No payment required.'
    : isIndivAnnual
      ? 'Equivalent to £4.16 per month, billed annually.'
      : isIndivMonthly
        ? 'Billed monthly. Cancel anytime.'
        : isFamAnnual
          ? 'Equivalent to £5.83 per month, billed annually.'
          : 'Billed monthly. Cancel anytime.';

  const features  = isFamily ? FAMILY_FEATURES : isIndivFree ? FREE_FEATURES : PREMIUM_FEATURES;
  const planLabel = isFamily ? 'Family Plan' : isIndivFree ? 'Free Plan' : 'Professional Plan';
  const accentCol = isFamily ? '#a78bfa' : isIndivFree ? '#adc6ff' : '#4edea3';
  const checkBg   = isFamily ? 'rgba(167,139,250,0.1)' : isIndivFree ? 'rgba(173,198,255,0.1)' : 'rgba(78,222,163,0.1)';

  const INDIV_BILLING_OPTS = [
    { key: 'free',    label: 'Free' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'annual',  label: 'Annual', badge: '-17%', badgeColor: '#ff4d4d', badgeText: '#ffffff' },
  ];

  const FAMILY_BILLING_OPTS = [
    { key: 'monthly', label: 'Monthly' },
    { key: 'annual',  label: 'Annual', badge: '-27%', badgeColor: '#ff4d4d', badgeText: '#ffffff' },
  ];

  return (
    <div className="mobile-screen" style={{ paddingTop: '50px', paddingBottom: '40px', background: '#0b1326', minHeight: '100vh' }}>
      <MobileNavDrawer />

      {/* Sub-header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(173,198,255,0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '20px' }}>arrow_back</span>
        </button>
        <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>Settings</p>
      </div>

      <div style={{ padding: '0 16px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Hero */}
        <section style={{ textAlign: 'center', padding: '28px 0 24px' }}>
          <h2 style={{
            fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '30px',
            color: '#dae2fd', margin: '0 0 10px', lineHeight: 1.2,
          }}>
            Unlock Your <span style={{ color: '#4edea3' }}>Financial Potential</span>
          </h2>
          <p style={{ fontSize: '14px', color: '#adc6ff', lineHeight: 1.6, margin: 0 }}>
            Experience precision wealth management with advanced AI tools and real-time insights.
          </p>
        </section>

        {/* Plan type toggle — Individual / Family */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'flex', gap: '4px', padding: '6px',
            background: '#131b2e', borderRadius: '14px',
            border: '1px solid rgba(60,74,66,0.1)',
            width: '100%',
          }}>
            {[
              { key: 'individual', label: 'Individual', activeColor: '#4edea3', activeText: '#003824' },
              { key: 'family',     label: 'Family',     activeColor: '#a78bfa', activeText: '#1a0a2e' },
            ].map(tab => {
              const active = plan === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setPlan(tab.key)}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: '10px', border: 'none',
                    cursor: 'pointer', fontSize: '13px', fontWeight: active ? 700 : 600,
                    background: active ? tab.activeColor : 'transparent',
                    color: active ? tab.activeText : '#bbcabf',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subscription Card */}
        <div style={{
          background: '#171f33', borderRadius: '20px',
          padding: '28px', marginBottom: '16px',
          borderTop: `4px solid ${accentCol}`,
          position: 'relative', overflow: 'hidden',
          boxShadow: `0 0 40px ${isFamily ? 'rgba(167,139,250,0.12)' : isIndivFree ? 'rgba(173,198,255,0.08)' : 'rgba(78,222,163,0.12)'}`,
        }}>
          <div style={{
            position: 'absolute', top: 0, right: 0, padding: '20px',
            opacity: 0.08, pointerEvents: 'none',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '80px', color: accentCol }}>
              {isFamily ? 'family_restroom' : isIndivFree ? 'lock_open' : 'diamond'}
            </span>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: accentCol, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 8px' }}>
              {planLabel}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '40px', color: '#dae2fd' }}>
                {price}
              </span>
              {period && (
                <span style={{ fontSize: '16px', color: '#adc6ff', fontWeight: 500 }}>{period}</span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#bbcabf', margin: '0 0 24px' }}>{subLabel}</p>

            {/* Billing frequency toggle */}
            <div style={{
              display: 'flex', gap: '4px', padding: '4px',
              background: '#0b1326', borderRadius: '10px',
              marginBottom: '24px',
            }}>
              {(isFamily ? FAMILY_BILLING_OPTS : INDIV_BILLING_OPTS).map(opt => {
                const currentBilling = isFamily ? familyBilling : individualBilling;
                const active = currentBilling === opt.key;
                const btn = (
                  <button
                    key={opt.key}
                    onClick={() => isFamily ? setFamilyBilling(opt.key) : setIndivBilling(opt.key)}
                    style={{
                      width: '100%', height: '100%', padding: '7px 8px',
                      borderRadius: '7px', border: 'none',
                      cursor: 'pointer', fontSize: '12px', fontWeight: active ? 700 : 500,
                      background: active ? accentCol : 'transparent',
                      color: active ? (isFamily ? '#1a0a2e' : '#003824') : '#bbcabf',
                      transition: 'all 0.2s',
                    }}
                  >
                    {opt.label}
                  </button>
                );
                if (!opt.badge) return <div key={opt.key} style={{ flex: 1 }}>{btn}</div>;
                return (
                  <div key={opt.key} style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '7px' }}>
                    {btn}
                    <span style={{
                      position: 'absolute', top: '6px', right: '-15px', width: '58px',
                      background: opt.badgeColor, color: opt.badgeText,
                      fontSize: '7px', fontWeight: 800, letterSpacing: '0.06em',
                      textTransform: 'uppercase', textAlign: 'center',
                      padding: '2px 0', transform: 'rotate(45deg)', pointerEvents: 'none',
                    }}>
                      {opt.badge}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
              {features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: '20px', color: accentCol,
                    background: checkBg, borderRadius: '6px',
                    padding: '2px', flexShrink: 0,
                  }}>
                    check_circle
                  </span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#dae2fd', margin: '0 0 2px' }}>{f.title}</p>
                    <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {isIndivFree ? (
              <button style={{
                width: '100%',
                background: 'rgba(173,198,255,0.08)', color: '#adc6ff',
                border: '1px solid rgba(173,198,255,0.2)', borderRadius: '14px',
                padding: '18px', fontFamily: 'Manrope, sans-serif',
                fontWeight: 800, fontSize: '16px', cursor: 'default',
              }}>
                Current Plan
              </button>
            ) : (
              <button style={{
                width: '100%',
                background: accentCol, color: isFamily ? '#1a0a2e' : '#003824',
                border: 'none', borderRadius: '14px',
                padding: '18px', fontFamily: 'Manrope, sans-serif',
                fontWeight: 800, fontSize: '16px', cursor: 'pointer',
                boxShadow: `0 4px 20px ${isFamily ? 'rgba(167,139,250,0.25)' : 'rgba(78,222,163,0.25)'}`,
              }}>
                Start 7-Day Free Trial
              </button>
            )}
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#bbcabf', margin: '10px 0 0' }}>
              {isIndivFree ? 'Upgrade anytime to unlock premium features.' : isFamily ? 'All family members included. Cancel anytime before trial ends.' : 'No commitment. Cancel anytime before trial ends.'}
            </p>
          </div>
        </div>

        {/* Secure Growth Card */}
        <div style={{
          background: '#222a3d', borderRadius: '16px',
          padding: '20px', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(13,86,217,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#adc6ff' }}>verified_user</span>
            </div>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '15px', color: '#dae2fd', margin: 0 }}>Secure Growth</p>
          </div>
          <p style={{ fontSize: '13px', color: '#bbcabf', lineHeight: 1.6, margin: '0 0 16px' }}>
            Your data is encrypted using military-grade protocols. We prioritise your privacy as much as your prosperity.
          </p>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ flex: 1, height: '4px', background: '#4edea3', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '4px', background: '#3c4a42', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '4px', background: '#3c4a42', borderRadius: '2px' }} />
          </div>
        </div>

        {/* Restore Purchases */}
        <div style={{ textAlign: 'center', paddingBottom: '32px' }}>
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 500, color: '#adc6ff',
            borderBottom: '1px solid transparent',
            padding: '2px 0',
          }}>
            Restore Purchases
          </button>
        </div>

      </div>
    </div>
  );
}
