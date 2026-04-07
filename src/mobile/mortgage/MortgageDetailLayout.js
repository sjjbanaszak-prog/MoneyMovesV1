import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileNavDrawer from '../components/MobileNavDrawer';

export default function MortgageDetailLayout({ children, title, backTo }) {
  const navigate = useNavigate();

  function handleBack() {
    if (backTo) navigate(backTo);
    else navigate(-1);
  }

  return (
    <div className="mobile-screen" style={{ paddingTop: '50px', paddingBottom: '24px' }}>
      <MobileNavDrawer />

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
        <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>My Mortgages</p>
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
