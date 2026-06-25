import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileNavDrawer from '../../components/MobileNavDrawer';
import { useNotifications } from '../NotificationsContext';

const CATEGORY_LABEL = {
  isa:       'ISA & Savings',
  pension:   'Pension',
  mortgage:  'Mortgage',
  savings:   'Savings',
  milestone: 'Milestone',
};

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, dismiss } = useNotifications();

  const sorted = [...notifications].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    const pA = PRIORITY_ORDER[a.priority] ?? 2;
    const pB = PRIORITY_ORDER[b.priority] ?? 2;
    if (pA !== pB) return pA - pB;
    const tA = a.createdAt?.toDate?.()?.getTime() ?? 0;
    const tB = b.createdAt?.toDate?.()?.getTime() ?? 0;
    return tB - tA;
  });

  async function handleTap(n) {
    if (!n.read) await markAsRead(n.id);
    if (n.link) navigate(n.link);
  }

  return (
    <div className="mobile-screen" style={{ paddingTop: '64px', paddingBottom: '40px', background: '#0b1326', minHeight: '100vh' }}>
      <MobileNavDrawer />

      {/* Header */}
      <div style={{ padding: '20px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: 20 }}>arrow_back</span>
          </button>
          <div>
            <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: 22, color: '#dae2fd', margin: 0 }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p style={{ fontSize: 12, color: '#adc6ff', margin: '2px 0 0' }}>{unreadCount} unread</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#4edea3', fontWeight: 700, padding: '4px 8px' }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div style={{ padding: '4px 16px' }}>
        {loading && (
          <p style={{ color: '#adc6ff', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Loading…</p>
        )}

        {!loading && sorted.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 52, color: 'rgba(173,198,255,0.15)', display: 'block', marginBottom: 14 }}>
              notifications_none
            </span>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 16, color: '#adc6ff', margin: '0 0 6px' }}>
              You're all caught up
            </p>
            <p style={{ fontSize: 13, color: '#5a6a7a', margin: 0, lineHeight: 1.6 }}>
              Alerts will appear here when your finances need attention
            </p>
          </div>
        )}

        {!loading && sorted.map(n => (
          <NotificationCard
            key={n.id}
            n={n}
            onTap={() => handleTap(n)}
            onDismiss={(e) => { e.stopPropagation(); dismiss(n.id); }}
          />
        ))}
      </div>
    </div>
  );
}

function NotificationCard({ n, onTap, onDismiss }) {
  const bg = n.read ? '#131b2e' : '#171f33';
  const border = n.read ? 'transparent' : 'rgba(173,198,255,0.08)';
  const dotColor = n.iconColor || '#4edea3';
  const iconBg = `${dotColor}18`;

  return (
    <div
      onClick={onTap}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '14px 14px 14px 14px', borderRadius: 14, marginBottom: 8,
        background: bg, border: `1px solid ${border}`,
        cursor: 'pointer', position: 'relative',
      }}
    >
      {/* Unread dot */}
      {!n.read && (
        <div style={{ position: 'absolute', top: 14, right: 14, width: 7, height: 7, borderRadius: '50%', background: dotColor }} />
      )}

      {/* Icon */}
      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: dotColor }}>{n.icon || 'notifications'}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 14, color: n.read ? '#adc6ff' : '#dae2fd', margin: 0 }}>
            {n.title}
          </p>
          <span style={{ fontSize: 10, color: '#5a6a7a', background: '#0b1326', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>
            {CATEGORY_LABEL[n.category] || n.category}
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#adc6ff', margin: 0, lineHeight: 1.55 }}>{n.body}</p>
        {n.link && (
          <p style={{ fontSize: 11, color: dotColor, margin: '6px 0 0', fontWeight: 600 }}>
            View details →
          </p>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        style={{ position: 'absolute', bottom: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#3c4a42' }}>close</span>
      </button>
    </div>
  );
}
