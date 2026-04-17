import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserPlan } from '../../contexts/UserPlanContext';

/**
 * PremiumGate
 * Wraps a page's content. For free users, renders a blurred overlay
 * with a centred upgrade card. For premium users, renders children normally.
 *
 * Props:
 *   featureName  — e.g. "Pension Insights"
 *   description  — one-line description shown on the gate card
 *   children     — the page content (partially visible behind blur)
 */
export default function PremiumGate({ featureName, description, children }) {
  const { isPremium, planLoading } = useUserPlan();
  const navigate = useNavigate();

  // Don't flash the gate while plan is loading
  if (planLoading) return children;
  if (isPremium) return children;

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
