import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * PensionDetailLayout — wraps drill-down screens (Aegon Detail, Add Contribution, All Contributions).
 * Shows a back-button header instead of the bottom nav bar.
 */
export default function PensionDetailLayout({ children, title, backTo }) {
  const navigate = useNavigate();

  function handleBack() {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  }

  return (
    <div className="mobile-screen" style={{ paddingBottom: '24px' }}>

      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={handleBack}
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
        <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>My Pensions</p>
      </div>

      {title && (
        <div style={{ padding: '12px 20px 16px' }}>
          <h1 style={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 900,
            fontSize: '26px',
            color: '#dae2fd',
            margin: 0,
          }}>
            {title}
          </h1>
        </div>
      )}

      {children}
    </div>
  );
}
