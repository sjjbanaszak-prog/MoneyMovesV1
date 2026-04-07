import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import MobileNavDrawer from '../components/MobileNavDrawer';

// Hardcoded until subscription system is implemented
const IS_PREMIUM = false;

export default function MobileSettingsPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [displayName, setDisplayName] = useState(
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'MoneyMoves User'
  );

  useEffect(() => {
    if (!currentUser) return;
    const ref = doc(db, 'users', currentUser.uid);
    getDoc(ref).then(snap => {
      if (snap.exists() && snap.data().fullName) {
        setDisplayName(snap.data().fullName);
      }
    });
  }, [currentUser]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      console.error('Logout failed', e);
    }
  }

  return (
    <div className="mobile-screen" style={{ paddingTop: '50px', paddingBottom: '40px', background: '#0b1326', minHeight: '100vh' }}>
      <MobileNavDrawer />

      <div style={{ padding: '0 16px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Profile Header */}
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '28px 0 20px', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '96px', height: '96px', borderRadius: '50%',
              padding: '3px',
              background: 'linear-gradient(135deg, #4edea3, #adc6ff)',
            }}>
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Profile"
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #0b1326' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  background: 'rgba(78,222,163,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '3px solid #0b1326',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#4edea3' }}>person</span>
                </div>
              )}
            </div>
            <div style={{
              position: 'absolute', bottom: '0', right: '0',
              background: '#4edea3', borderRadius: '50%',
              padding: '5px', border: '2px solid #0b1326',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#003824' }}>edit</span>
            </div>
          </div>

          <div>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '22px', color: '#dae2fd', margin: '0 0 8px' }}>
              {displayName}
            </h2>
            {IS_PREMIUM ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '4px 12px', borderRadius: '999px',
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                background: 'rgba(78,222,163,0.1)', color: '#4edea3', border: '1px solid rgba(78,222,163,0.3)',
              }}>
                Premium Member
              </span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '4px 12px', borderRadius: '999px',
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                background: '#2d3449', color: '#adc6ff', border: '1px solid rgba(60,74,66,0.2)',
              }}>
                Free Tier
              </span>
            )}
          </div>
        </section>

        {/* Upgrade / Subscription Card */}
        {IS_PREMIUM ? (
          <section style={{
            position: 'relative', overflow: 'hidden',
            borderRadius: '14px', marginBottom: '24px',
            background: 'linear-gradient(135deg, #222a3d 0%, #171f33 100%)',
            borderLeft: '4px solid #4edea3',
            padding: '20px',
            boxShadow: '0 0 20px rgba(78,222,163,0.1)',
          }}>
            <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '100px', height: '100px', background: 'rgba(78,222,163,0.07)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: '-30px', bottom: '-30px', width: '120px', height: '120px', background: 'rgba(173,198,255,0.04)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#4edea3', fontVariationSettings: "'FILL' 1" }}>diamond</span>
                <span style={{ fontSize: '10px', fontWeight: 900, color: '#4edea3', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Premium Tier</span>
              </div>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '16px', color: '#dae2fd', margin: '0 0 4px' }}>Your subscription is active</p>
              <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 16px' }}>Renewing on October 12, 2025</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button style={{
                  flex: 1, minWidth: '120px',
                  background: '#4edea3', color: '#003824',
                  border: 'none', borderRadius: '10px',
                  padding: '10px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                }}>
                  Manage Subscription
                </button>
                <button style={{
                  flex: 1, minWidth: '120px',
                  background: '#2d3449', color: '#dae2fd',
                  border: '1px solid rgba(60,74,66,0.3)', borderRadius: '10px',
                  padding: '10px 16px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                }}>
                  Restore Purchases
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section style={{
            position: 'relative', overflow: 'hidden',
            borderRadius: '14px', marginBottom: '24px',
            background: 'linear-gradient(135deg, #222a3d 0%, #171f33 100%)',
            borderLeft: '4px solid #4edea3',
            padding: '20px',
          }}>
            <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '100px', height: '100px', background: 'rgba(78,222,163,0.07)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#4edea3', margin: '0 0 6px' }}>Unlock Full Potential</h3>
              <p style={{ fontSize: '13px', color: '#bbcabf', margin: '0 0 16px', lineHeight: 1.5 }}>
                Access advanced tax optimisation, unlimited vault storage, and real-time insights.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => navigate('/mobile/upgrade')}
                  style={{
                    background: '#4edea3', color: '#003824',
                    border: 'none', borderRadius: '10px',
                    padding: '10px 20px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Upgrade to Premium
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Personal Details */}
        <SettingsSection label="Personal Details">
          <SettingsRow icon="person_edit" iconColor="#adc6ff" label="Edit Profile" onClick={() => navigate('/mobile/settings/edit-profile')} />
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection label="Preferences">
          <div style={rowStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#adc6ff' }}>notifications</span>
              <span style={{ fontSize: '15px', color: '#dae2fd', fontWeight: 500 }}>Push Notifications</span>
            </div>
            {/* Toggle */}
            <button
              onClick={() => setNotificationsOn(v => !v)}
              style={{
                width: '48px', height: '26px', borderRadius: '13px',
                background: notificationsOn ? '#4edea3' : 'rgba(173,198,255,0.2)',
                border: 'none', position: 'relative', cursor: 'pointer',
                transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: notificationsOn ? '#003824' : '#64748b',
                position: 'absolute', top: '4px',
                left: notificationsOn ? '26px' : '4px',
                transition: 'left 0.2s, background 0.2s',
              }} />
            </button>
          </div>
        </SettingsSection>

        {/* Data & Legal */}
        <SettingsSection label="Data & Legal">
          <SettingsRow icon="shield" iconColor="#adc6ff" label="Data & Privacy" disabled />
          <SettingsRow icon="gavel" iconColor="#adc6ff" label="Terms of Use" disabled />
        </SettingsSection>

        {/* Support */}
        <SettingsSection label="Support">
          <SettingsRow icon="report" iconColor="#ffb95f" label="Report a Problem" onClick={() => navigate('/mobile/settings/report-problem')} />
          <SettingsRow icon="mail" iconColor="#ffb95f" label="Contact Support" onClick={() => window.location.href = 'mailto:moneymovestest1@gmail.com'} />
          <SettingsRow icon="star" iconColor="#ffb95f" label="Rate on App Store" disabled />
        </SettingsSection>

        {/* Logout */}
        <div style={{ paddingTop: '8px', paddingBottom: '32px' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              borderRadius: '14px',
              background: 'rgba(147,0,10,0.08)',
              border: '1px solid rgba(255,180,171,0.2)',
              color: '#ffb4ab', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
            Logout
          </button>
        </div>

      </div>
    </div>
  );
}

function SettingsSection({ label, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{
        fontSize: '10px', fontWeight: 700, color: '#bbcabf',
        letterSpacing: '0.2em', textTransform: 'uppercase',
        margin: '0 0 8px 4px',
      }}>
        {label}
      </p>
      <div style={{
        background: '#171f33', borderRadius: '14px',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

const rowStyle = {
  padding: '14px 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  borderBottom: '1px solid rgba(60,74,66,0.1)',
  cursor: 'pointer',
};

function SettingsRow({ icon, iconColor, label, onClick, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        ...rowStyle,
        width: '100%', background: 'none', border: 'none', textAlign: 'left',
        borderBottom: '1px solid rgba(60,74,66,0.1)',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'default' : (onClick ? 'pointer' : 'default'),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '22px', color: iconColor }}>{icon}</span>
        <span style={{ fontSize: '15px', color: '#dae2fd', fontWeight: 500 }}>{label}</span>
      </div>
      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#3c4a42' }}>chevron_right</span>
    </button>
  );
}
