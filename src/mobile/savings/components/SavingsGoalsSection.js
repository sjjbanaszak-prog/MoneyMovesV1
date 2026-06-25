import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useDemoMode } from '../../../contexts/DemoModeContext';
import { useSavingsData } from '../SavingsDataContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}

function monthsUntil(yyyyMm) {
  if (!yyyyMm) return null;
  const [y, m] = yyyyMm.split('-').map(Number);
  const now = new Date();
  const months = (y - now.getFullYear()) * 12 + (m - (now.getMonth() + 1));
  return months;
}

function formatTargetDate(yyyyMm) {
  if (!yyyyMm) return '';
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Demo goals ────────────────────────────────────────────────────────────────

const DEMO_GOALS = [
  {
    id: 'demo1',
    name: 'Emergency Fund',
    targetAmount: 10000,
    targetDate: '2027-03',
    linkedAccount: null,
  },
  {
    id: 'demo2',
    name: 'Holiday 2027',
    targetAmount: 3500,
    targetDate: '2026-12',
    linkedAccount: null,
  },
];

// ── Bottom sheet ──────────────────────────────────────────────────────────────

const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

function GoalSheet({ goal, accounts, onSave, onDelete, onClose }) {
  const isEdit = !!goal?.id;

  const nowY = new Date().getFullYear();
  const nowM = new Date().getMonth() + 1;

  const [name,    setName]    = useState(goal?.name          || '');
  const [amount,  setAmount]  = useState(goal?.targetAmount  ? String(goal.targetAmount) : '');
  const [month,   setMonth]   = useState(() => {
    if (goal?.targetDate) return Number(goal.targetDate.split('-')[1]);
    return nowM;
  });
  const [year,    setYear]    = useState(() => {
    if (goal?.targetDate) return Number(goal.targetDate.split('-')[0]);
    return nowY + 1;
  });
  const [linked,  setLinked]  = useState(goal?.linkedAccount ?? '__all__');

  const years = Array.from({ length: 10 }, (_, i) => nowY + i);

  function handleSave() {
    const parsed = parseFloat(String(amount).replace(/[£,\s]/g, ''));
    if (!name.trim() || isNaN(parsed) || parsed <= 0) return;
    const mm = String(month).padStart(2, '0');
    onSave({
      id:             isEdit ? goal.id : genId(),
      name:           name.trim(),
      targetAmount:   parsed,
      targetDate:     `${year}-${mm}`,
      linkedAccount:  linked === '__all__' ? null : linked,
    });
  }

  const inputStyle = {
    width: '100%', background: '#1a2744', border: '1px solid rgba(173,198,255,0.15)',
    borderRadius: '10px', padding: '12px 14px', color: '#dae2fd',
    fontSize: '15px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
    outline: 'none',
  };
  const labelStyle = {
    fontSize: '12px', fontWeight: 600, color: '#adc6ff',
    letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', display: 'block',
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 200,
      }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#111827', borderRadius: '24px 24px 0 0',
        padding: '0 20px 40px', zIndex: 201,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 20px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(173,198,255,0.2)' }} />
        </div>

        <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: '#dae2fd', margin: '0 0 24px' }}>
          {isEdit ? 'Edit Goal' : 'New Savings Goal'}
        </h3>

        {/* Goal name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Goal name</label>
          <input
            style={inputStyle}
            placeholder="e.g. Emergency Fund, Holiday, House Deposit"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Target amount */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Target amount</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '15px' }}>£</span>
            <input
              style={{ ...inputStyle, paddingLeft: '26px' }}
              placeholder="10,000"
              type="number"
              min="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
        </div>

        {/* Target date */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Target date</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              style={{ ...inputStyle, flex: 1 }}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              style={{ ...inputStyle, flex: 1 }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Link to account */}
        {accounts.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Track progress from</label>
            <select
              value={linked}
              onChange={e => setLinked(e.target.value)}
              style={inputStyle}
            >
              <option value="__all__">All savings (total balance)</option>
              {accounts.map((a, i) => (
                <option key={i} value={a.bank || a.accountName}>
                  {a.bank || a.accountName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!name.trim() || !amount}
          style={{
            width: '100%', padding: '16px', borderRadius: '14px',
            background: name.trim() && amount ? '#4edea3' : 'rgba(78,222,163,0.2)',
            color: name.trim() && amount ? '#003824' : '#4edea3',
            border: 'none', fontFamily: 'Manrope, sans-serif', fontWeight: 800,
            fontSize: '16px', cursor: name.trim() && amount ? 'pointer' : 'default',
            marginBottom: isEdit ? '12px' : 0,
          }}
        >
          {isEdit ? 'Save Changes' : 'Add Goal'}
        </button>

        {isEdit && (
          <button
            onClick={onDelete}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px',
              background: 'transparent', color: '#ff6b6b',
              border: '1px solid rgba(255,107,107,0.3)',
              fontFamily: 'Manrope, sans-serif', fontWeight: 700,
              fontSize: '15px', cursor: 'pointer',
            }}
          >
            Delete Goal
          </button>
        )}
      </div>
    </>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function SavingsGoalsSection() {
  const { currentUser }     = useAuth();
  const { isDemoMode }      = useDemoMode();
  const { accounts, metrics } = useSavingsData();

  const [goals,   setGoals]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheet,   setSheet]   = useState(null); // null | 'new' | goal object

  // ── Load goals ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) {
      setGoals(DEMO_GOALS);
      setLoading(false);
      return;
    }
    if (!currentUser) { setLoading(false); return; }

    getDoc(doc(db, 'savingsTracker', currentUser.uid))
      .then(snap => {
        if (snap.exists()) setGoals(snap.data().goals || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentUser, isDemoMode]);

  // ── Persist goals ───────────────────────────────────────────────────────────
  const persist = useCallback(async (newGoals) => {
    if (isDemoMode || !currentUser) return;
    await setDoc(
      doc(db, 'savingsTracker', currentUser.uid),
      { goals: newGoals },
      { merge: true },
    );
  }, [currentUser, isDemoMode]);

  // ── CRUD ────────────────────────────────────────────────────────────────────
  function handleSave(goal) {
    const updated = goals.some(g => g.id === goal.id)
      ? goals.map(g => g.id === goal.id ? goal : g)
      : [...goals, goal];
    setGoals(updated);
    persist(updated);
    setSheet(null);
  }

  function handleDelete(id) {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    persist(updated);
    setSheet(null);
  }

  // ── Progress per goal ───────────────────────────────────────────────────────
  function currentAmount(goal) {
    if (goal.linkedAccount) {
      const match = accounts.find(a =>
        (a.bank || a.accountName) === goal.linkedAccount
      );
      return match ? (match.currentBalance || 0) : 0;
    }
    return metrics.totalBalance || 0;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div style={{ margin: '0 16px 16px' }}>
        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 }}>
            Savings Goals
          </h3>
          {!isDemoMode && (
            <button
              onClick={() => setSheet('new')}
              style={{
                background: 'rgba(78,222,163,0.12)', border: '1px solid rgba(78,222,163,0.25)',
                borderRadius: '20px', padding: '5px 12px',
                display: 'flex', alignItems: 'center', gap: '5px',
                cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#4edea3' }}>add</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#4edea3', fontFamily: 'Inter, sans-serif' }}>Add Goal</span>
            </button>
          )}
        </div>

        {/* Empty state */}
        {!loading && goals.length === 0 && (
          <div style={{
            background: '#171f33', borderRadius: '16px',
            padding: '28px 20px', textAlign: 'center',
            border: '1px dashed rgba(173,198,255,0.12)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#4edea3', opacity: 0.5 }}>flag</span>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '8px 0 16px' }}>
              Set a goal and track your progress toward it.
            </p>
            <button
              onClick={() => setSheet('new')}
              style={{
                background: 'rgba(78,222,163,0.12)', border: '1px solid rgba(78,222,163,0.25)',
                borderRadius: '20px', padding: '8px 18px',
                cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                color: '#4edea3', fontFamily: 'Inter, sans-serif',
              }}
            >
              + Add your first goal
            </button>
          </div>
        )}

        {/* Goal cards */}
        {!loading && goals.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {goals.map(goal => {
              const current  = currentAmount(goal);
              const target   = goal.targetAmount;
              const pct      = Math.min(100, target > 0 ? (current / target) * 100 : 0);
              const months   = monthsUntil(goal.targetDate);
              const needed   = target - current;
              const monthly  = (months && months > 0 && needed > 0) ? needed / months : null;
              const reached  = current >= target;

              const accentColor = reached
                ? '#4edea3'
                : pct >= 75 ? '#4edea3'
                : pct >= 40 ? '#ffb95f'
                : '#adc6ff';

              const barGradient = reached || pct >= 75
                ? 'linear-gradient(90deg,#4edea3,#22c87a)'
                : pct >= 40
                  ? 'linear-gradient(90deg,#ffb95f,#ff8c42)'
                  : 'linear-gradient(90deg,#adc6ff,#7aa5ff)';

              return (
                <div
                  key={goal.id}
                  className="section-card"
                  onClick={() => !isDemoMode && setSheet(goal)}
                  style={{
                    borderLeft: `3px solid ${accentColor}`,
                    cursor: isDemoMode ? 'default' : 'pointer',
                  }}
                >
                  {/* Title row — matches ISA card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <p style={{ fontWeight: 700, fontSize: '14px', color: '#dae2fd', margin: 0 }}>
                      {goal.name}
                    </p>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '20px', color: accentColor }}>
                      {Math.round(pct)}%
                    </span>
                  </div>

                  {/* Amount — matches ISA card */}
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '22px', color: '#dae2fd', margin: '0 0 12px', lineHeight: 1 }}>
                    {fmt(current)}{' '}
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>/ {fmt(target)}</span>
                  </p>

                  {/* Progress bar — matches ISA card (8px) */}
                  <div style={{ background: 'rgba(173,198,255,0.08)', borderRadius: '4px', height: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: '4px',
                      background: barGradient,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>

                  {/* Subtext row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {goal.linkedAccount || 'All savings'} · {formatTargetDate(goal.targetDate)}
                    </span>
                    {reached && (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#4edea3' }}>Goal reached!</span>
                    )}
                    {!reached && monthly !== null && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{fmt(monthly)}/mo needed</span>
                    )}
                    {!reached && months !== null && months <= 0 && (
                      <span style={{ fontSize: '12px', color: '#ff6b6b' }}>Past target date</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit sheet */}
      {sheet !== null && (
        <GoalSheet
          goal={sheet === 'new' ? null : sheet}
          accounts={accounts}
          onSave={handleSave}
          onDelete={() => handleDelete(sheet.id)}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}
