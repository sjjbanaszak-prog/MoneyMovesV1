import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserPlan } from '../../contexts/UserPlanContext';
import { useDemoMode } from '../../contexts/DemoModeContext';

/**
 * PremiumGate
 * Wraps a page's content. For free users, renders a blurred overlay
 * with a centred upgrade card. For premium users, renders children normally.
 * In demo mode free users can preview the page (it's sample data), with a
 * banner making clear it's a Premium preview.
 *
 * Props:
 *   featureName  — e.g. "Pension Insights"
 *   description  — one-line description shown on the gate card
 *   children     — the page content (partially visible behind blur)
 */
export default function PremiumGate({ featureName, description, children }) {
  const { isPremium, planLoading } = useUserPlan();
  const { isDemoMode } = useDemoMode();
  const navigate = useNavigate();

  // Don't flash the gate while plan is loading
  if (planLoading) return children;
  if (isPremium) return children;

  if (isDemoMode) {
    return (
      <>
        <div style={{
          margin: '16px 16px 0',
          padding: '12px 14px',
          borderRadius: '12px',
          background: 'rgba(173,198,255,0.06)',
          border: '1px solid rgba(173,198,255,0.15)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#adc6ff', flexShrink: 0 }}>visibility</span>
          <p style={{ flex: 1, fontSize: '12px', color: '#bbcabf', lineHeight: 1.5, margin: 0 }}>
            You're previewing <strong style={{ color: '#dae2fd' }}>{featureName}</strong> with sample data. Upgrade to see it with your own.
          </p>
          <button
            onClick={() => navigate('/mobile/upgrade')}
            style={{
              flexShrink: 0,
              background: '#4edea3', color: '#003824',
              border: 'none', borderRadius: '10px',
              padding: '8px 12px',
              fontWeight: 700, fontSize: '12px', cursor: 'pointer',
            }}
          >
            Upgrade
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '60vh' }}>
      {/* Blurred background content */}
      <div style={{ filter: 'blur(6px)', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>

      {/* Gate overlay — fixed to viewport so position is consistent across all pages */}
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 10,
      }}>
        <div style={{
          background: '#171f33',
          border: '1px solid rgba(173,198,255,0.15)',
          borderRadius: '20px',
          padding: '32px 24px',
          textAlign: 'center',
          maxWidth: '320px',
          width: '100%',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}>
          {/* Lock icon */}
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'rgba(173,198,255,0.08)',
            border: '1px solid rgba(173,198,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#adc6ff', fontVariationSettings: "'FILL' 1" }}>lock</span>
          </div>

          <h2 style={{
            fontFamily: 'Manrope, sans-serif', fontWeight: 900,
            fontSize: '20px', color: '#dae2fd',
            margin: '0 0 8px',
          }}>
            {featureName}
          </h2>
          <p style={{ fontSize: '13px', color: '#bbcabf', lineHeight: 1.6, margin: '0 0 24px' }}>
            {description || `${featureName} is available on the Premium plan.`}
          </p>

          <button
            onClick={() => navigate('/mobile/upgrade')}
            style={{
              width: '100%',
              background: '#4edea3', color: '#003824',
              border: 'none', borderRadius: '12px',
              padding: '14px',
              fontFamily: 'Manrope, sans-serif', fontWeight: 800,
              fontSize: '15px', cursor: 'pointer',
            }}
          >
            Upgrade to Premium →
          </button>
        </div>
      </div>
    </div>
  );
}
