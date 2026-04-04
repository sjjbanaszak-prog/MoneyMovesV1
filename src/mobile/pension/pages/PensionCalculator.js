import React, { useState, useMemo, useEffect, useRef } from 'react';
import PensionLayout from '../PensionLayout';
import { usePensionData } from '../PensionDataContext';

function calcProjection({ currentAge, retirementAge, monthlyContrib, returnRate, currentPot }) {
  const years = retirementAge - currentAge;
  if (years <= 0) return 0;
  const monthlyRate = returnRate / 100 / 12;
  const months = years * 12;
  const fvPot = currentPot * Math.pow(1 + monthlyRate, months);
  const fvContribs = monthlyRate > 0
    ? monthlyContrib * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
    : monthlyContrib * months;
  return Math.round(fvPot + fvContribs);
}

export default function PensionCalculator() {
  const { metrics, isLoading, userProfile, updateUserProfile } = usePensionData();
  const potSeeded      = useRef(false);
  const agesSeeded     = useRef(false);
  const hasInteracted  = useRef(false);
  const pendingAges    = useRef(null);

  const [currentAge, setCurrentAge]         = useState(38);
  const [retirementAge, setRetirementAge]   = useState(65);
  const [monthlyContrib, setMonthlyContrib] = useState(800);
  const [returnRate, setReturnRate]         = useState(7);
  const [currentPot, setCurrentPot]         = useState(0);

  // Seed currentPot from real data once it loads
  useEffect(() => {
    if (!potSeeded.current && metrics.totalValue > 0) {
      setCurrentPot(Math.round(metrics.totalValue));
      potSeeded.current = true;
    }
  }, [metrics.totalValue]);

  // Seed ages from userProfile once loading finishes
  useEffect(() => {
    if (!isLoading && !agesSeeded.current) {
      setCurrentAge(userProfile.currentAge);
      setRetirementAge(userProfile.retirementAge);
      agesSeeded.current = true;
    }
  }, [isLoading, userProfile]);

  // Debounced save of age changes to Firebase
  useEffect(() => {
    if (!hasInteracted.current) return;
    pendingAges.current = { currentAge, retirementAge };
    const timer = setTimeout(() => {
      updateUserProfile({ currentAge, retirementAge });
      pendingAges.current = null;
    }, 800);
    return () => clearTimeout(timer);
  }, [currentAge, retirementAge]); // eslint-disable-line

  // Flush any pending save when navigating away before debounce fires
  useEffect(() => {
    return () => {
      if (pendingAges.current) {
        updateUserProfile(pendingAges.current);
      }
    };
  }, []); // eslint-disable-line

  const projected = useMemo(
    () => calcProjection({ currentAge, retirementAge, monthlyContrib, returnRate, currentPot }),
    [currentAge, retirementAge, monthlyContrib, returnRate, currentPot]
  );

  const totalContributions = useMemo(() => {
    const years = retirementAge - currentAge;
    return years > 0 ? monthlyContrib * years * 12 + currentPot : currentPot;
  }, [currentAge, retirementAge, monthlyContrib, currentPot]);

  const totalGrowth = projected - totalContributions;

  function fmt(n) {
    return '£' + Math.max(0, Math.round(n)).toLocaleString('en-GB');
  }

  return (
    <PensionLayout>
      <div style={{ padding: '0 0 16px' }}>

        {/* Header */}
        <div style={{ padding: '24px 20px 16px' }}>
          <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Pensions</p>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
            Calculator
          </h1>
        </div>

        {/* Sliders Card */}
        <div className="animate-in stagger-1 section-card" style={{ margin: '0 16px 16px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: '0 0 20px' }}>
            Adjust Your Inputs
          </h3>

          <SliderRow
            label="Current Age"
            value={currentAge}
            min={18} max={70}
            display={`${currentAge} yrs`}
            onChange={v => { hasInteracted.current = true; setCurrentAge(v); }}
          />
          <SliderRow
            label="Retirement Age"
            value={retirementAge}
            min={currentAge + 1} max={80}
            display={`${retirementAge} yrs`}
            onChange={v => { hasInteracted.current = true; setRetirementAge(v); }}
          />
          <SliderRow
            label="Monthly Contribution"
            value={monthlyContrib}
            min={0} max={5000} step={50}
            display={`£${monthlyContrib.toLocaleString('en-GB')}`}
            onChange={setMonthlyContrib}
          />
          <SliderRow
            label="Expected Return Rate"
            value={returnRate}
            min={1} max={15} step={0.5}
            display={`${returnRate}% p.a.`}
            onChange={setReturnRate}
          />
          <SliderRow
            label="Current Pot Value"
            value={currentPot}
            min={0} max={2000000} step={1000}
            display={`£${currentPot.toLocaleString('en-GB')}`}
            onChange={setCurrentPot}
            last
          />
        </div>

        {/* Projection Result */}
        <div className="animate-in stagger-2" style={{ margin: '0 16px 16px' }}>
          <div style={{
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(78,222,163,0.12) 0%, #1a2744 100%)',
            border: '1px solid rgba(78,222,163,0.2)',
            padding: '24px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '12px', color: '#adc6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
              Projected at retirement ({retirementAge})
            </p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '40px', color: '#4edea3', margin: '0 0 4px' }}>
              {fmt(projected)}
            </p>
            <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>
              in {retirementAge - currentAge} years time
            </p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="animate-in stagger-3 section-card" style={{ margin: '0 16px 24px' }}>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: '0 0 16px' }}>
            Breakdown
          </h3>
          <BreakdownRow label="Current pot"         value={fmt(currentPot)} color="#adc6ff" />
          <BreakdownRow label="Total contributions"  value={fmt(monthlyContrib * (retirementAge - currentAge) * 12)} color="#4edea3" />
          <BreakdownRow label="Investment growth"    value={fmt(totalGrowth)} color="#ffb95f" last />
        </div>

      </div>
    </PensionLayout>
  );
}

function SliderRow({ label, value, min, max, step = 1, display, onChange, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>{label}</p>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#dae2fd', margin: 0 }}>{display}</p>
      </div>
      <input
        type="range"
        className="range-input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function BreakdownRow({ label, value, color, last }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: last ? 0 : '14px',
      marginBottom: last ? 0 : '14px',
      borderBottom: last ? 'none' : '1px solid rgba(173,198,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
        <p style={{ fontSize: '14px', color: '#bbcabf', margin: 0 }}>{label}</p>
      </div>
      <p style={{ fontSize: '14px', fontWeight: 700, color: '#dae2fd', margin: 0 }}>{value}</p>
    </div>
  );
}
