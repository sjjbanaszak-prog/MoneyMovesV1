import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import MobileNavDrawer from '../components/MobileNavDrawer';

const INDUSTRIES = [
  { value: 'finance',    label: 'Financial Services' },
  { value: 'tech',       label: 'Technology & SaaS' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'other',      label: 'Other' },
];

const labelStyle = {
  fontSize: '12px',
  color: '#adc6ff',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: '8px',
};

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [fullName, setFullName] = useState('');
  const [dob,      setDob]      = useState('');
  const [industry, setIndustry] = useState('finance');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  const email = currentUser?.email || '';

  useEffect(() => {
    if (!currentUser) return;
    const ref = doc(db, 'users', currentUser.uid);
    getDoc(ref).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setFullName(data.fullName || currentUser.displayName || '');
        setDob(data.dob          || '');
        setIndustry(data.industry || 'finance');
      } else {
        setFullName(currentUser.displayName || '');
      }
    }).catch(() => {
      setError('Failed to load profile data.');
    }).finally(() => {
      setLoading(false);
    });
  }, [currentUser]);

  async function handleSave() {
    if (!currentUser) return;
    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, 'users', currentUser.uid);
      await setDoc(ref, { fullName, dob, industry }, { merge: true });
      navigate('/mobile/settings');
    } catch (e) {
      setError('Failed to save changes. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="mobile-screen" style={{ paddingTop: '50px', paddingBottom: '40px', background: '#0b1326', minHeight: '100vh' }}>
      <MobileNavDrawer />

      {/* Sub-header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate('/mobile/settings')}
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

      <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Avatar */}
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 20px' }}>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <div style={{
              width: '88px', height: '88px', borderRadius: '50%',
              border: '2px solid rgba(78,222,163,0.2)',
              padding: '3px',
            }}>
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Profile"
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  background: 'rgba(78,222,163,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#4edea3' }}>person</span>
                </div>
              )}
            </div>
            <button style={{
              position: 'absolute', bottom: '2px', right: '0',
              background: '#4edea3', color: '#003824',
              border: 'none', borderRadius: '50%',
              width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
            </button>
          </div>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '18px', color: '#dae2fd', margin: '0 0 2px' }}>
            {loading ? '—' : (fullName || 'Your Name')}
          </h2>
          <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0 }}>MoneyMoves Member</p>
        </section>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#bbcabf', fontSize: '14px' }}>
            Loading profile…
          </div>
        ) : (
          <>
            {/* Personal Information card — matches AddContribution section-card style */}
            <div className="animate-in stagger-1 section-card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#dae2fd', margin: '0 0 20px' }}>
                Personal Information
              </h3>

              {/* Full Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>

              {/* Date of Birth */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Date of Birth</label>
                <input
                  type="date"
                  className="input-field"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Industry */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Industry</label>
                <select
                  className="input-field"
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {INDUSTRIES.map(ind => (
                    <option key={ind.value} value={ind.value} style={{ background: '#060e20' }}>
                      {ind.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email — read only */}
              <div>
                <label style={labelStyle}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="input-field"
                    value={email}
                    readOnly
                    style={{ paddingRight: '44px', opacity: 0.6, cursor: 'not-allowed' }}
                  />
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    fontSize: '18px', color: '#64748b', pointerEvents: 'none',
                  }}>lock</span>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>
                  To update your verified email, please contact support.
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p style={{ fontSize: '13px', color: '#ffb4ab', margin: '0 0 16px', textAlign: 'center' }}>{error}</p>
            )}

            {/* Save / Cancel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: '100%',
                  background: saving ? 'rgba(78,222,163,0.5)' : '#4edea3',
                  color: '#003824',
                  border: 'none', borderRadius: '14px',
                  padding: '16px', cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 0 20px rgba(78,222,163,0.25)',
                  transition: 'background 0.2s',
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
                {!saving && (
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                )}
              </button>
              <button
                onClick={() => navigate('/mobile/settings')}
                style={{
                  width: '100%',
                  background: 'transparent', color: '#bbcabf',
                  border: '1px solid rgba(60,74,66,0.15)', borderRadius: '14px',
                  padding: '14px', cursor: 'pointer',
                  fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: '15px',
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Privacy Commitment */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: 'rgba(34,42,61,0.5)', borderRadius: '16px',
          padding: '20px', marginBottom: '32px',
          borderTop: '2px solid rgba(78,222,163,0.15)',
        }}>
          <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', width: '100px', height: '100px', background: 'rgba(78,222,163,0.04)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#4edea3' }}>security</span>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '15px', color: '#dae2fd', margin: 0 }}>Privacy Commitment</p>
            </div>
            <p style={{ fontSize: '13px', color: '#bbcabf', lineHeight: 1.6, margin: 0 }}>
              Your financial data is encrypted with enterprise-grade security. Changes to core identity may trigger a verification check.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
