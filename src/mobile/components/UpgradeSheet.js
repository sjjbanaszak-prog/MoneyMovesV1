import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * UpgradeSheet
 * Bottom sheet modal shown when a free user tries to access a premium feature.
 *
 * Props:
 *   isOpen       — boolean
 *   onClose      — () => void
 *   featureName  — e.g. "Pension Insights"
 *   description  — one-line description of the feature
 */
export default function UpgradeSheet({ isOpen, onClose, featureName, description }) {
  const navigate = useNavigate();

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 200,
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: '#171f33',
        borderRadius: '24px 24px 0 0',
        padding: '8px 24px 40px',
        zIndex: 201,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Drag handle */}
        <div style={{
          width: '40px', height: '4px', borderRadius: '2px',
          background: 'rgba(173,198,255,0.2)',
          margin: '12px auto 28px',
        }} />

        {/* Lock icon */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'rgba(173,198,255,0.08)',
          border: '1px solid rgba(173,198,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#adc6ff', fontVariationSettings: "'FILL' 1" }}>lock</span>
        </div>

        <h2 style={{
          fontFamily: 'Manrope, sans-serif', fontWeight: 900,
          fontSize: '22px', color: '#dae2fd',
          margin: '0 0 8px',
        }}>
          {featureName}
        </h2>
        <p style={{ fontSize: '14px', color: '#bbcabf', lineHeight: 1.6, margin: '0 0 28px' }}>
          {description || `${featureName} is available on the Premium plan. Upgrade to unlock unlimited access.`}
        </p>

        <button
          onClick={() => { onClose(); navigate('/mobile/upgrade'); }}
          style={{
            width: '100%',
            background: '#4edea3', color: '#003824',
            border: 'none', borderRadius: '14px',
            padding: '16px',
            fontFamily: 'Manrope, sans-serif', fontWeight: 800,
            fontSize: '16px', cursor: 'pointer',
            marginBottom: '12px',
          }}
        >
          Upgrade to Premium
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            background: 'transparent', color: '#adc6ff',
            border: '1px solid rgba(173,198,255,0.15)', borderRadius: '14px',
            padding: '14px',
            fontFamily: 'Manrope, sans-serif', fontWeight: 600,
            fontSize: '15px', cursor: 'pointer',
          }}
        >
          Not now
        </button>
      </div>
    </>
  );
}
