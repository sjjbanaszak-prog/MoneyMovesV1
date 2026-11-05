import React from 'react';
import { useDemoMode } from '../../contexts/DemoModeContext';

/**
 * Empty state for a section with no data yet: icon, short message, a primary
 * action (e.g. "Add pension") and an optional link to explore with demo data.
 */
export default function EmptyState({ icon, title, body, actionLabel, onAction, showDemoLink = true }) {
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  return (
    <div style={{
      textAlign: 'center',
      padding: '28px 20px 24px',
      background: '#171f33',
      borderRadius: '16px',
    }}>
      <div style={{
        width: '48px', height: '48px', margin: '0 auto 14px',
        borderRadius: '14px',
        background: 'rgba(78,222,163,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#4edea3' }}>{icon}</span>
      </div>
      <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: '0 0 6px' }}>
        {title}
      </p>
      <p style={{ fontSize: '13px', color: '#bbcabf', lineHeight: 1.6, margin: '0 auto 18px', maxWidth: '300px' }}>
        {body}
      </p>
      {actionLabel && (
        <button className="primary-btn" onClick={onAction}>{actionLabel}</button>
      )}
      {showDemoLink && !isDemoMode && (
        <button
          onClick={toggleDemoMode}
          style={{
            marginTop: '14px', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: '#adc6ff', fontSize: '13px', fontWeight: 600,
          }}
        >
          Or explore with sample data
        </button>
      )}
    </div>
  );
}
