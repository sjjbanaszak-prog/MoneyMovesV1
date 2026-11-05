import React from 'react';
import { useDemoMode } from '../../contexts/DemoModeContext';

/**
 * Shown at the top of add/edit pages while demo mode is on. Nothing is saved in
 * demo mode, so the page's save button is disabled and this explains why, with a
 * one-tap way to switch back to the user's own data.
 */
export default function DemoSaveNotice() {
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  if (!isDemoMode) return null;

  return (
    <div style={{
      margin: '16px 16px 0',
      padding: '12px 14px',
      borderRadius: '12px',
      background: 'rgba(255,185,95,0.08)',
      border: '1px solid rgba(255,185,95,0.25)',
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#ffb95f', flexShrink: 0 }}>science</span>
      <p style={{ flex: 1, fontSize: '12px', color: '#bbcabf', lineHeight: 1.5, margin: 0 }}>
        You're viewing sample data, so nothing here will be saved. Switch off demo mode to add your own.
      </p>
      <button
        onClick={toggleDemoMode}
        style={{
          flexShrink: 0,
          background: '#ffb95f', color: '#2a1700',
          border: 'none', borderRadius: '10px',
          padding: '8px 12px',
          fontWeight: 700, fontSize: '12px', cursor: 'pointer',
        }}
      >
        Switch off
      </button>
    </div>
  );
}
