import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileNavDrawer from '../components/MobileNavDrawer';

const FEATURES = [
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

export default function MobileUpgradePage() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);

  const price = isAnnual ? '£49.99/year' : '£5.99/month';
  const subLabel = isAnnual ? 'Equivalent to £4.16 per month, billed annually.' : 'Billed monthly. Cancel anytime.';

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

        {/* Billing Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'flex', gap: '4px', padding: '6px',
            background: '#131b2e', borderRadius: '14px',
            border: '1px solid rgba(60,74,66,0.1)',
          }}>
            <button
              onClick={() => setIsAnnual(false)}
              style={{
                padding: '8px 20px', borderRadius: '10px',
                border: 'none', cursor: 'pointer',
                background: !isAnnual ? '#171f33' : 'transparent',
                color: !isAnnual ? '#dae2fd' : '#bbcabf',
                fontWeight: 600, fontSize: '13px',
                transition: 'all 0.2s',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              style={{
                padding: '8px 20px', borderRadius: '10px',
                border: 'none', cursor: 'pointer',
                background: isAnnual ? '#4edea3' : 'transparent',
                color: isAnnual ? '#003824' : '#bbcabf',
                fontWeight: 700, fontSize: '13px',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              Annually
              {isAnnual && (
                <span style={{
                  background: 'rgba(0,56,36,0.15)',
                  fontSize: '9px', fontWeight: 800, letterSpacing: '0.1em',
                  textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px',
                }}>
                  Save 17%
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Subscription Card */}
        <div style={{
          background: '#171f33', borderRadius: '20px',
          padding: '28px', marginBottom: '16px',
          borderTop: '4px solid #4edea3',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 0 40px rgba(78,222,163,0.12)',
        }}>
          <div style={{
            position: 'absolute', top: 0, right: 0, padding: '20px',
            opacity: 0.08, pointerEvents: 'none',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '80px', color: '#4edea3' }}>diamond</span>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#4edea3', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 8px' }}>
              Professional Plan
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '40px', color: '#dae2fd' }}>
                {isAnnual ? '£49.99' : '£5.99'}
              </span>
              <span style={{ fontSize: '16px', color: '#adc6ff', fontWeight: 500 }}>
                {isAnnual ? '/year' : '/month'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#bbcabf', margin: '0 0 24px' }}>{subLabel}</p>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: '20px', color: '#4edea3',
                    background: 'rgba(78,222,163,0.1)', borderRadius: '6px',
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

            <button style={{
              width: '100%',
              background: '#4edea3', color: '#003824',
              border: 'none', borderRadius: '14px',
              padding: '18px', fontFamily: 'Manrope, sans-serif',
              fontWeight: 800, fontSize: '16px', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(78,222,163,0.25)',
            }}>
              Start 7-Day Free Trial
            </button>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#bbcabf', margin: '10px 0 0' }}>
              No commitment. Cancel anytime before trial ends.
            </p>
          </div>
        </div>

        {/* Sophisticated Analytics Card */}
        <div style={{
          background: '#171f33', borderRadius: '16px',
          marginBottom: '12px', overflow: 'hidden',
          position: 'relative',
          minHeight: '100px',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(78,222,163,0.05) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />
          <div style={{ padding: '20px', position: 'relative', zIndex: 1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#4edea3', display: 'block', marginBottom: '8px' }}>insights</span>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>
              Sophisticated Analytics
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
