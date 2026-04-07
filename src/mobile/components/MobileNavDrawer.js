import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'grid_view',        path: '/mobile/pension',  match: null },
  { label: 'Pension',   icon: 'account_balance',  path: '/mobile/pension',  match: '/mobile/pension'  },
  { label: 'Mortgage',  icon: 'home',             path: '/mobile/mortgage', match: '/mobile/mortgage' },
  { label: 'Savings',   icon: 'savings',          path: '/mobile/savings',  match: '/mobile/savings'  },
  { label: 'Income',    icon: 'payments',         path: '/income-new',      match: '/income-new'      },
  { label: 'Debt',      icon: 'credit_card',      path: '/debt-manager',    match: '/debt-manager'    },
];

export default function MobileNavDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();
  const { currentUser } = useAuth();

  const close  = () => setIsOpen(false);
  const toggle = () => setIsOpen(prev => !prev);

  function isActive(item) {
    // Dashboard highlights when none of the specific sections match
    if (item.match === null) {
      return !NAV_ITEMS.some(n => n.match && pathname.startsWith(n.match));
    }
    return pathname.startsWith(item.match);
  }

  return (
    <>
      {/* ── Top Header Bar ───────────────────────────────────────────────── */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: '#0b1326',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 80,
      }}>
        {/* Left: hamburger */}
        <button
          onClick={toggle}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#4edea3' }}>menu</span>
        </button>

        {/* Centre: app name */}
        <span style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'Manrope, sans-serif',
          fontWeight: 900,
          fontSize: '16px',
          color: '#4edea3',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          pointerEvents: 'none',
        }}>
          MoneyMoves
        </span>

        {/* Right: notifications + profile */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button style={{
            background: 'none', border: 'none', padding: '8px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#4edea3' }}>notifications</span>
          </button>
          <Link to="/mobile/settings" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'none', border: 'none', padding: '8px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#4edea3' }}>account_circle</span>
            </button>
          </Link>
        </div>
      </header>

      {/* ── Overlay ──────────────────────────────────────────────────────── */}
      <div
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 95,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* ── Drawer ───────────────────────────────────────────────────────── */}
      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '288px',
        background: '#171f33',
        borderRadius: '0 24px 24px 0',
        boxShadow: '4px 0 40px rgba(0,0,0,0.5)',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>

        {/* Profile strip */}
        <div style={{
          padding: '32px 24px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          borderBottom: '1px solid rgba(78,222,163,0.08)',
          marginBottom: '8px',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'rgba(78,222,163,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#4edea3' }}>person</span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '16px', color: '#4edea3', margin: '0 0 1px' }}>
              MoneyMoves
            </p>
            <p style={{
              fontSize: '12px', color: '#adc6ff', margin: '0 0 2px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {currentUser?.email || 'The Architect'}
            </p>
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#4edea3',
            }}>
              Premium Tier
            </span>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '8px 12px' }}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item);
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={close}
                style={{ textDecoration: 'none', display: 'block', marginBottom: '2px' }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: active ? 'rgba(78,222,163,0.12)' : 'transparent',
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                }}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '22px',
                      color: active ? '#4edea3' : '#adc6ff',
                      transition: 'color 0.2s',
                    }}
                  >
                    {item.icon}
                  </span>
                  <span style={{
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: active ? 700 : 500,
                    fontSize: '15px',
                    color: active ? '#4edea3' : '#adc6ff',
                    transition: 'color 0.2s',
                  }}>
                    {item.label}
                  </span>
                  {active && (
                    <div style={{
                      marginLeft: 'auto',
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: '#4edea3',
                      flexShrink: 0,
                    }} />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Settings footer */}
        <div style={{
          padding: '16px 12px 32px',
          borderTop: '1px solid rgba(60,74,66,0.15)',
        }}>
          <Link to="/mobile/settings" onClick={close} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 16px',
              borderRadius: '12px',
              transition: 'background 0.2s',
              cursor: 'pointer',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#adc6ff' }}>settings</span>
              <span style={{
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 500,
                fontSize: '15px',
                color: '#adc6ff',
              }}>
                Settings
              </span>
            </div>
          </Link>
        </div>

      </aside>
    </>
  );
}
