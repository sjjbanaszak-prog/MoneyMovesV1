import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePensionData } from '../PensionDataContext';

/**
 * Prompt shown on pension projection pages while we don't know the user's age
 * (no date of birth on their profile and no age set in the Pension Calculator).
 */
export default function AgeAssumptionNotice({ style }) {
  const { userProfile } = usePensionData();
  const navigate = useNavigate();
  if (userProfile.ageKnown) return null;

  return (
    <div style={{
      margin: '0 16px 16px',
      padding: '14px',
      borderRadius: '12px',
      background: 'rgba(173,198,255,0.06)',
      border: '1px solid rgba(173,198,255,0.15)',
      display: 'flex', alignItems: 'center', gap: '12px',
      ...style,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#adc6ff', flexShrink: 0 }}>cake</span>
      <p style={{ flex: 1, fontSize: '12px', color: '#bbcabf', lineHeight: 1.5, margin: 0 }}>
        These projections assume you're {userProfile.currentAge} and retiring at {userProfile.retirementAge}.
        Add your date of birth for figures based on your real age.
      </p>
      <button
        onClick={() => navigate('/mobile/settings/edit-profile')}
        style={{
          flexShrink: 0,
          background: 'rgba(173,198,255,0.12)', color: '#dae2fd',
          border: '1px solid rgba(173,198,255,0.2)', borderRadius: '10px',
          padding: '8px 12px',
          fontWeight: 700, fontSize: '12px', cursor: 'pointer',
        }}
      >
        Add
      </button>
    </div>
  );
}
