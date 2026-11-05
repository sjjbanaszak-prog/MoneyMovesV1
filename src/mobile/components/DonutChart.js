import React, { useEffect, useState } from 'react';

// Negative values put the minus before the £ (−£12k), never £-12k
function fmtK(n) {
  if (!n) return '£0';
  const sign = n < 0 ? '−' : '';
  const abs  = Math.abs(n);
  if (abs >= 1000) return `${sign}£${Math.round(abs / 1000).toLocaleString('en-GB')}k`;
  return `${sign}£${Math.round(abs)}`;
}

// SVG donut chart: one segment per item ({ value, color, key? }), total in the middle.
//   centerLabel   — small text under the total (default "total")
//   onSelect      — makes segments clickable; called with the clicked item
//   animationKey  — when this changes, the segments sweep in clockwise from zero
export default function DonutChart({ items, totalValue, centerLabel = 'total', onSelect, animationKey }) {
  const total = items.reduce((s, p) => s + p.value, 0) || 1;
  const cx = 80, cy = 80, r = 60, strokeWidth = 18;
  const circumference = 2 * Math.PI * r;
  const [hoveredKey, setHoveredKey] = useState(null);

  // Sweep-in: draw at 0 for one frame, then transition to full size
  const animated = animationKey !== undefined;
  const [progress, setProgress] = useState(animated ? 0 : 1);
  useEffect(() => {
    if (!animated) return undefined;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) { setProgress(1); return undefined; }
    setProgress(0);
    let raf2;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setProgress(1)); });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [animationKey, animated]);

  let offset = 0;
  const segments = items.map((p, i) => {
    const dash = (p.value / total) * circumference * progress;
    const seg = { ...p, key: p.key ?? i, dash, offset };
    offset += dash;
    return seg;
  });

  return (
    <svg width="160" height="160" viewBox="0 0 160 160" onMouseLeave={() => setHoveredKey(null)}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(173,198,255,0.08)" strokeWidth={strokeWidth} />
      {segments.map(s => {
        const dimmed = hoveredKey !== null && hoveredKey !== s.key;
        return (
          <circle
            key={s.key} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={hoveredKey === s.key ? strokeWidth + 3 : strokeWidth}
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={circumference / 4 - s.offset}
            opacity={dimmed ? 0.45 : 1}
            onClick={onSelect ? () => onSelect(s) : undefined}
            onMouseEnter={onSelect ? () => setHoveredKey(s.key) : undefined}
            style={{
              transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease, stroke-width 0.15s, opacity 0.15s',
              cursor: onSelect ? 'pointer' : 'default',
            }}
          />
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#dae2fd" fontFamily="Manrope,sans-serif" fontWeight="900" fontSize="16" style={{ pointerEvents: 'none' }}>
        {fmtK(totalValue)}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#bbcabf" fontFamily="Inter,sans-serif" fontSize="10" style={{ pointerEvents: 'none' }}>
        {centerLabel.length > 18 ? centerLabel.slice(0, 17) + '…' : centerLabel}
      </text>
    </svg>
  );
}
