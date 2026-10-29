// ── Mortgage history helpers (switch-aware) ─────────────────────────────────────
// A remortgage overwrites a mortgage's active fields (startDate, rate, balance…)
// with the new provider's values and archives the old details in switchHistory.
// For historical charts we must reconstruct the balance across each provider
// segment and anchor the property to its ORIGINAL start date, not the switch date.

export function monthKeyFromDate(str) {
  if (!str) return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// The date the property was first mortgaged, tracing back through any switches.
export function originalMortgageStartDate(m) {
  const switches = m.switchHistory || [];
  if (switches.length) {
    const sorted = [...switches].sort((a, b) => (a.switchDate || '').localeCompare(b.switchDate || ''));
    return sorted[0].previousStartDate || m.startDate;
  }
  return m.startDate;
}

// Break a mortgage's life into provider segments, each with the known balance at
// its end, so we can amortize backwards accurately within each segment.
export function mortgageBalanceSegments(m) {
  const switches = [...(m.switchHistory || [])].sort((a, b) => (a.switchDate || '').localeCompare(b.switchDate || ''));
  const segs = [];

  if (switches.length === 0) {
    segs.push({
      startDate:  m.startDate,
      endDate:    null, // runs to "now"
      endBalance: m.outstandingBalance || 0,
      rate:       (m.interestRate || 0) / 100 / 12,
      payment:    m.monthlyPayment || 0,
    });
    return segs;
  }

  // Original mortgage: from its start to the first switch, ending at the
  // redeemed balance (what was owed the moment the switch completed).
  segs.push({
    startDate:  switches[0].previousStartDate || m.startDate,
    endDate:    switches[0].switchDate,
    endBalance: switches[0].redemption?.outstandingBalance ?? switches[0].previousBalance ?? 0,
    rate:       (switches[0].previousRate || 0) / 100 / 12,
    payment:    switches[0].previousMonthlyPayment || 0,
  });

  // Intermediate providers between consecutive switches.
  for (let i = 0; i < switches.length - 1; i++) {
    segs.push({
      startDate:  switches[i].switchDate,
      endDate:    switches[i + 1].switchDate,
      endBalance: switches[i + 1].redemption?.outstandingBalance ?? switches[i + 1].previousBalance ?? 0,
      rate:       (switches[i + 1].previousRate || 0) / 100 / 12,
      payment:    switches[i + 1].previousMonthlyPayment || 0,
    });
  }

  // Current (active) mortgage: from the last switch to now.
  const last = switches[switches.length - 1];
  segs.push({
    startDate:  last.switchDate,
    endDate:    null,
    endBalance: m.outstandingBalance || 0,
    rate:       (m.interestRate || 0) / 100 / 12,
    payment:    m.monthlyPayment || 0,
  });

  return segs;
}

// Amortize backwards from a known end balance to reach an earlier month.
export function amortizeBackwards(monthsAgo, endBalance, rate, payment) {
  if (monthsAgo <= 0) return endBalance;
  if (rate > 0 && payment > 0) {
    const factor = Math.pow(1 + rate, monthsAgo);
    return (endBalance + (payment / rate) * (factor - 1)) / factor;
  }
  return endBalance + payment * monthsAgo;
}

// Overpayment totals keyed by 'YYYY-MM' for months in (afterKey, throughKey].
const OVERPAYMENT_TYPES = ['overpayment', 'lump_sum'];
function overpaymentsByMonth(m, afterKey, throughKey) {
  const totals = {};
  (m.paymentHistory || []).forEach(p => {
    if (!OVERPAYMENT_TYPES.includes(p.type)) return;
    const key = monthKeyFromDate(p.date);
    if (!key || key <= afterKey || key > throughKey) return;
    totals[key] = (totals[key] || 0) + (p.amount || 0);
  });
  return totals;
}

// Reconstructed outstanding balance for a mortgage at a given chart month.
export function historicalMortgageBalance(m, moKey, nowKey) {
  const [moY, moM] = moKey.split('-').map(Number);
  const segments = mortgageBalanceSegments(m);

  for (const seg of segments) {
    const segStartKey = monthKeyFromDate(seg.startDate);
    if (segStartKey && moKey < segStartKey) continue; // month is before this segment

    // The switch month belongs to the NEW mortgage, not the old one: treat a
    // non-final segment's end as exclusive so the boundary month falls to the
    // next (later) segment. The final/active segment (no endDate → nowKey) stays
    // inclusive so the current month reflects the live outstanding balance.
    if (seg.endDate) {
      const segEndKey = monthKeyFromDate(seg.endDate);
      if (segEndKey && moKey >= segEndKey) continue; // month is at/after the switch
    }

    const segEndKey    = seg.endDate ? monthKeyFromDate(seg.endDate) : nowKey;
    const [endY, endM] = segEndKey.split('-').map(Number);
    const monthsAgo    = (endY - moY) * 12 + (endM - moM);

    // Overpayments made after this month (within the segment) also reduced the
    // balance, so add them back when stepping backwards.
    const overpayments = overpaymentsByMonth(m, moKey, segEndKey);
    if (Object.keys(overpayments).length === 0) {
      return Math.max(0, Math.round(amortizeBackwards(monthsAgo, seg.endBalance, seg.rate, seg.payment)));
    }
    let bal = seg.endBalance;
    let y = endY, mo = endM;
    for (let i = 0; i < monthsAgo; i++) {
      bal = (bal + seg.payment + (overpayments[`${y}-${String(mo).padStart(2, '0')}`] || 0)) / (1 + seg.rate);
      mo--;
      if (mo < 1) { mo = 12; y--; }
    }
    return Math.max(0, Math.round(bal));
  }

  // Month predates the property's earliest mortgage → no liability yet.
  return 0;
}
