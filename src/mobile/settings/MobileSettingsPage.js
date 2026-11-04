import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useUserPlan } from '../../contexts/UserPlanContext';
import { db } from '../../firebase';
import MobileNavDrawer from '../components/MobileNavDrawer';

export default function MobileSettingsPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const { isPremium } = useUserPlan();
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
            {isPremium ? (
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
        {isPremium ? (
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
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
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
          <div style={{ ...rowStyle, opacity: 0.4, cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#adc6ff' }}>notifications_off</span>
              <div>
                <span style={{ fontSize: '15px', color: '#dae2fd', fontWeight: 500, display: 'block' }}>Push Notifications</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Coming soon</span>
              </div>
            </div>
            <div style={{
              width: '48px', height: '26px', borderRadius: '13px',
              background: 'rgba(173,198,255,0.1)',
              position: 'relative', flexShrink: 0,
            }}>
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: '#3c4a42',
                position: 'absolute', top: '4px', left: '4px',
              }} />
            </div>
          </div>
        </SettingsSection>

        {/* Data & Legal */}
        <SettingsSection label="Data & Legal">
          <SettingsRow icon="shield" iconColor="#adc6ff" label="Privacy Policy" onClick={() => navigate('/mobile/settings/privacy-policy')} />
          <SettingsRow icon="gavel" iconColor="#adc6ff" label="Terms of Use" onClick={() => navigate('/mobile/settings/terms-of-use')} />
          <SettingsRow icon="delete_forever" iconColor="#ffb4ab" label="Delete Account" onClick={() => setShowDelete(true)} />
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
      {showDelete && <DeleteAccountSheet onClose={() => setShowDelete(false)} />}
    </div>
  );
}

function DeleteAccountSheet({ onClose }) {
  const navigate = useNavigate();
  const { currentUser, deleteAccount } = useAuth();
  const isGoogle = currentUser?.providerData.some(p => p.providerId === 'google.com');
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const canDelete = confirmText === 'DELETE' && (isGoogle || password) && !deleting;

  async function handleDelete() {
    setError('');
    setDeleting(true);
    try {
      await deleteAccount(password);
      navigate('/login');
    } catch (e) {
      console.error('Account deletion failed', e);
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('That password is incorrect.');
      } else if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        setError('Google sign-in was cancelled, so nothing was deleted.');
      } else {
        setError('Something went wrong deleting your account. Please try again or contact support.');
      }
      setDeleting(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    background: '#0b1326', border: '1px solid rgba(173,198,255,0.15)',
    color: '#dae2fd', fontSize: '15px', marginBottom: '12px',
  };

  return (
    <div
      onClick={deleting ? undefined : onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Delete account"
        style={{
          width: '100%', maxWidth: '600px',
          background: '#171f33', borderRadius: '20px 20px 0 0',
          padding: '24px 20px 32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '26px', color: '#ffb4ab' }}>delete_forever</span>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '18px', color: '#dae2fd', margin: 0 }}>
            Delete your account?
          </h3>
        </div>
        <p style={{ fontSize: '14px', color: '#bbcabf', lineHeight: 1.6, margin: '0 0 16px' }}>
          This permanently deletes your profile, pensions, savings, mortgages, income, family details and
          notifications. It can't be undone.
        </p>

        {!isGoogle && (
          <input
            type="password"
            placeholder="Your password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={deleting}
            style={inputStyle}
          />
        )}
        <input
          type="text"
          placeholder="Type DELETE to confirm"
          autoCapitalize="characters"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          disabled={deleting}
          style={inputStyle}
        />
        {isGoogle && (
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>
            You'll be asked to sign in with Google again to confirm.
          </p>
        )}

        {error && <p style={{ fontSize: '13px', color: '#ffb4ab', margin: '0 0 12px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              flex: 1, padding: '14px', borderRadius: '12px', cursor: 'pointer',
              background: 'rgba(173,198,255,0.08)', border: 'none',
              color: '#dae2fd', fontWeight: 600, fontSize: '15px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete}
            style={{
              flex: 1, padding: '14px', borderRadius: '12px',
              cursor: canDelete ? 'pointer' : 'default',
              background: canDelete ? '#93000a' : 'rgba(147,0,10,0.25)', border: 'none',
              color: canDelete ? '#ffdad6' : 'rgba(255,218,214,0.4)', fontWeight: 700, fontSize: '15px',
            }}
          >
            {deleting ? 'Deleting…' : 'Delete account'}
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
