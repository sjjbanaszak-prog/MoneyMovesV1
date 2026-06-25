import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FamilyLayout from '../FamilyLayout';
import { useFamilyData } from '../FamilyDataContext';

function CurrencyInput({ label, value, onChange, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: '#adc6ff', fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</label>
      {hint && <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px' }}>{hint}</p>}
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 14 }}>£</span>
        <input
          type="number"
          min="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', background: '#131b2e', border: '1px solid rgba(173,198,255,0.15)',
            borderRadius: 10, padding: '10px 14px 10px 28px', color: '#dae2fd', fontSize: 14,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: '#adc6ff', fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: '#131b2e', border: '1px solid rgba(173,198,255,0.15)',
          borderRadius: 10, padding: '10px 14px', color: '#dae2fd', fontSize: 14,
          outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

const EMPTY_JISA  = { type: 'jisa',          enabled: false, provider: '', balance: '', contributionsThisYear: '' };
const EMPTY_SIPP  = { type: 'junior_sipp',   enabled: false, provider: '', balance: '', contributionsThisYear: '' };
const EMPTY_PB    = { type: 'premium_bonds', enabled: false, provider: 'NS&I', balance: '', contributionsThisYear: '' };

function accountFromData(accounts, type) {
  const existing = (accounts || []).find(a => a.type === type);
  if (existing) return { ...existing, enabled: true };
  if (type === 'premium_bonds') return { ...EMPTY_PB };
  if (type === 'junior_sipp')   return { ...EMPTY_SIPP };
  return { ...EMPTY_JISA };
}

export default function AddChild() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { household, addChild, updateChild } = useFamilyData();

  const editing = editId ? (household.children || []).find(c => c.id === editId) : null;

  const [name, setName] = useState(editing?.name || '');
  const [dob,  setDob]  = useState(editing?.dob  || '');
  const [jisa, setJisa] = useState(accountFromData(editing?.accounts, 'jisa'));
  const [sipp, setSipp] = useState(accountFromData(editing?.accounts, 'junior_sipp'));
  const [pb,   setPb]   = useState(accountFromData(editing?.accounts, 'premium_bonds'));

  // Reload if editing child changes (e.g. nav back/forward)
  useEffect(() => {
    if (editing) {
      setName(editing.name || '');
      setDob(editing.dob   || '');
      setJisa(accountFromData(editing.accounts, 'jisa'));
      setSipp(accountFromData(editing.accounts, 'junior_sipp'));
      setPb(accountFromData(editing.accounts, 'premium_bonds'));
    }
  }, [editId]); // eslint-disable-line

  function buildAccounts() {
    return [jisa, sipp, pb]
      .filter(a => a.enabled)
      .map(({ enabled, ...rest }) => ({
        ...rest,
        balance: parseFloat(rest.balance) || 0,
        contributionsThisYear: parseFloat(rest.contributionsThisYear) || 0,
      }));
  }

  function handleSave() {
    if (!name.trim() || !dob) return;
    const accounts = buildAccounts();
    if (editing) {
      updateChild(editId, { name: name.trim(), dob, accounts });
    } else {
      addChild({ name: name.trim(), dob, accounts });
    }
    navigate('/mobile/family/members');
  }

  function AccountSection({ label, icon, color, state, setState, limitHint, sippNet }) {
    return (
      <div style={{
        background: '#222a3d', borderRadius: 16, padding: 16, marginBottom: 12,
        border: state.enabled ? `1.5px solid ${color}33` : '1.5px solid rgba(173,198,255,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: state.enabled ? 16 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: state.enabled ? color : '#64748b' }}>{icon}</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: state.enabled ? '#dae2fd' : '#64748b', margin: 0 }}>{label}</p>
              {limitHint && <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{limitHint}</p>}
            </div>
          </div>
          <button
            onClick={() => setState(s => ({ ...s, enabled: !s.enabled }))}
            style={{
              width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
              background: state.enabled ? color : 'rgba(173,198,255,0.15)',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              background: state.enabled ? '#0b1326' : '#64748b',
              position: 'absolute', top: 3,
              left: state.enabled ? 21 : 3, transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {state.enabled && (
          <>
            <TextInput
              label="Provider"
              value={state.provider}
              onChange={v => setState(s => ({ ...s, provider: v }))}
              placeholder="e.g. Vanguard"
            />
            <CurrencyInput
              label="Current Balance"
              value={state.balance}
              onChange={v => setState(s => ({ ...s, balance: v }))}
            />
            <CurrencyInput
              label={sippNet ? "Contributions this year (net, before tax relief)" : "Contributions this tax year"}
              value={state.contributionsThisYear}
              onChange={v => setState(s => ({ ...s, contributionsThisYear: v }))}
              hint={sippNet ? "Max £2,880 net (HMRC grosses up to £3,600)" : null}
            />
          </>
        )}
      </div>
    );
  }

  const canSave = name.trim() && dob;

  return (
    <FamilyLayout>
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ paddingTop: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#adc6ff' }}>arrow_back</span>
          </button>
          <div>
            <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: 22, color: '#dae2fd', margin: 0 }}>
              {editing ? 'Edit Child' : 'Add Child'}
            </h1>
          </div>
        </div>

        {/* Basic info */}
        <div className="section-card animate-in stagger-1" style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 14px', fontSize: 11, color: '#adc6ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Details
          </p>
          <TextInput label="Name" value={name} onChange={setName} placeholder="Child's name" />
          <TextInput label="Date of Birth" value={dob} onChange={setDob} placeholder="" type="date" />
        </div>

        {/* Accounts */}
        <div className="animate-in stagger-2">
          <p style={{ fontSize: 11, color: '#adc6ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Accounts
          </p>
          <AccountSection
            label="Junior ISA (JISA)"
            icon="savings"
            color="#4edea3"
            limitHint="£9,000/year allowance"
            state={jisa}
            setState={setJisa}
          />
          <AccountSection
            label="Junior SIPP"
            icon="account_balance"
            color="#adc6ff"
            limitHint="£2,880/year net (£3,600 gross)"
            state={sipp}
            setState={setSipp}
            sippNet
          />
          <AccountSection
            label="Premium Bonds"
            icon="casino"
            color="#ffb95f"
            limitHint="£50,000 lifetime limit"
            state={pb}
            setState={setPb}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="animate-in stagger-3"
          style={{
            width: '100%', background: '#4edea3', color: '#0b1326', border: 'none',
            borderRadius: 14, padding: '14px', fontWeight: 800, fontSize: 15,
            cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.4,
            fontFamily: 'Manrope, sans-serif', marginTop: 8,
          }}
        >
          {editing ? 'Save Changes' : 'Add Child'}
        </button>
      </div>
    </FamilyLayout>
  );
}
