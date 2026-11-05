import { parseDate, getTaxYearStart } from './pensionDates';

// ── Pension contributions & growth by month ────────────────────────────────────
// Shared by each pension's Contributions card and the all-pensions card on
// Insights. Every function takes a list of pension entries, so one pension is just
// `[entry]` and the Insights card passes them all.
//
// Growth for a month = (last value snapshot in the month) − (last snapshot before
// it) − contributions in the month, using each pension's valueHistory.

function emptyBuckets(mode, selectedYear) {
  return Array.from({ length: 12 }, (_, i) => {
    const calMonth = mode === 'fy' ? (3 + i) % 12 : i;
    const calYear  = mode === 'fy' ? (calMonth >= 3 ? selectedYear : selectedYear + 1) : selectedYear;
    return {
      label: new Date(calYear, calMonth, 1).toLocaleString('en-GB', { month: 'short' }),
      amount: 0, calMonth, calYear,
    };
  });
}

function entryMonths(entry, mode, selectedYear) {
  const buckets = emptyBuckets(mode, selectedYear);

  (entry.paymentHistory || []).forEach(p => {
    const dt = parseDate(p.date);
    if (!dt) return;
    if (mode === 'fy') {
      if (getTaxYearStart(dt) !== selectedYear) return;
      buckets[(dt.getMonth() - 3 + 12) % 12].amount += p.amount || 0;
    } else {
      if (dt.getFullYear() !== selectedYear) return;
      buckets[dt.getMonth()].amount += p.amount || 0;
    }
  });

  const vHistory = (entry.valueHistory || [])
    .map(vh => ({ date: new Date(vh.date), value: vh.value }))
    .filter(vh => !isNaN(vh.date.getTime()))
    .sort((a, b) => a.date - b.date);

  const growth = buckets.map(({ calMonth, calYear, amount }) => {
    const monthStart = new Date(calYear, calMonth, 1);
    const monthEnd   = new Date(calYear, calMonth + 1, 0, 23, 59, 59);
    const inMonth = vHistory.filter(vh => vh.date >= monthStart && vh.date <= monthEnd);
    if (!inMonth.length) return null;
    const before = vHistory.filter(vh => vh.date < monthStart);
    if (!before.length) return null;
    return inMonth[inMonth.length - 1].value - before[before.length - 1].value - amount;
  });

  return { buckets, growth };
}

/**
 * Monthly contributions and growth across `entries` for the FY starting 6 April
 * `selectedYear` ('fy') or the calendar year ('cy'). A month's growth is null when
 * no pension has the value snapshots to work it out.
 */
export function monthlyContributionHistory(entries, mode, selectedYear) {
  const monthlyData   = emptyBuckets(mode, selectedYear);
  const monthlyGrowth = monthlyData.map(() => null);

  (entries || []).forEach(entry => {
    const { buckets, growth } = entryMonths(entry, mode, selectedYear);
    buckets.forEach((b, i) => { monthlyData[i].amount += b.amount; });
    growth.forEach((g, i) => {
      if (g !== null) monthlyGrowth[i] = (monthlyGrowth[i] || 0) + g;
    });
  });

  return { monthlyData, monthlyGrowth };
}

function entryPeriodGrowth(entry, periodStart, contributions) {
  const before = (entry.valueHistory || [])
    .map(vh => ({ date: new Date(vh.date), value: vh.value }))
    .filter(vh => !isNaN(vh.date.getTime()) && vh.date < periodStart)
    .sort((a, b) => a.date - b.date);

  let openingValue;
  if (before.length) {
    openingValue = before[before.length - 1].value;
  } else {
    const paidBefore = (entry.paymentHistory || []).some(p => {
      const dt = parseDate(p.date);
      return dt && dt < periodStart;
    });
    if (paidBefore) return null;
    openingValue = 0; // pension started during the period
  }
  return (entry.currentValue || 0) - openingValue - contributions;
}

/**
 * Contributions and growth across `entries` for the period so far.
 * Growth per pension = today's value − value at the start of the period −
 * contributions in it (opening value = last valueHistory snapshot before the period,
 * or £0 if the pension started during it). Pensions that can't be worked out are
 * left out of growth; growth is null only when none can.
 */
export function periodContributionSummary(entries, mode, selectedYear) {
  const periodStart = mode === 'fy' ? new Date(selectedYear, 3, 6) : new Date(selectedYear, 0, 1);
  let contributions = 0;
  let growth = null;

  (entries || []).forEach(entry => {
    const paid = (entry.paymentHistory || []).reduce((s, p) => {
      const dt = parseDate(p.date);
      if (!dt) return s;
      const inPeriod = mode === 'fy' ? getTaxYearStart(dt) === selectedYear : dt.getFullYear() === selectedYear;
      return inPeriod ? s + (p.amount || 0) : s;
    }, 0);
    contributions += paid;
    const g = entryPeriodGrowth(entry, periodStart, paid);
    if (g !== null) growth = (growth || 0) + g;
  });

  return { contributions, growth };
}
