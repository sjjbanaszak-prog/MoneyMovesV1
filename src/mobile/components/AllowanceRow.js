import React from 'react';

// Interpolates amber → green → red based on allowance % used.
// 0–60 %: #ffb95f (amber) → #4edea3 (green)
// 60–99 %: #4edea3 (green) → near-red
// 100 %+: #ff6b6b (red)
export function allowanceColor(pct) {
  if (pct >= 100) return '#ff6b6b';
  if (pct <= 60) {
    const t = pct / 60;
    return `rgb(${Math.round(255 + (78  - 255) * t)},${Math.round(185 + (222 - 185) * t)},${Math.round(95  + (163 - 95)  * t)})`;
  }
  const t = (pct - 60) / 39;
  return `rgb(${Math.round(78  + (255 - 78)  * t)},${Math.round(222 + (107 - 222) * t)},${Math.round(163 + (107 - 163) * t)})`;
}

function cfLabel(amount, prefix) {
  if (!amount) return null;
  const val = amount >= 1000 ? `£${Math.round(amount / 1000)}k` : `£${amount.toLocaleString('en-GB')}`;
  return `${prefix}${val} CF`;
}

// Single allowance year row — bar with carry-forward pills in the header.
// +£Xk CF  = this year drew carry forward from prior years  (purple)
// →£Xk CF  = this year's unused allowance was used by a future year  (muted teal)
export default function AllowanceRow({ yr }) {
  const usedLabel     = cfLabel(yr.carryForwardUsed,     '+');
  const providedLabel = cfLabel(yr.carryForwardProvided, '→');

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <p style={{ fontSize: '13px', color: '#dae2fd', fontWeight: 600, margin: 0 }}>{yr.fy}</p>
          {usedLabel && (
            <span style={{
              fontSize: '10px', fontWeight: 700, color: '#a78bfa',
              background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)',
              borderRadius: '4px', padding: '1px 5px', lineHeight: '16px',
            }}>
              {usedLabel}
            </span>
          )}
          {providedLabel && (
            <span style={{
              fontSize: '10px', fontWeight: 700, color: '#4edea3',
              background: 'rgba(78,222,163,0.08)', border: '1px solid rgba(78,222,163,0.2)',
              borderRadius: '4px', padding: '1px 5px', lineHeight: '16px',
            }}>
              {providedLabel}
            </span>
          )}
        </div>
        <p style={{ fontSize: '12px', color: '#bbcabf', margin: 0 }}>
          £{yr.used.toLocaleString('en-GB')} / £{yr.limit.toLocaleString('en-GB')}
        </p>
      </div>
      <div style={{ background: 'rgba(173,198,255,0.08)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
        <div style={{
          width: `${yr.pct}%`, height: '100%', borderRadius: '4px',
          background: yr.color, transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}
