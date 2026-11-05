import { parseDate, getTaxYearStart } from './pensionDates';

// ── Tax-year contribution projection ──────────────────────────────────────────
// Projects total pension contributions for the current tax year (to 5 April):
// what's been paid so far, plus a typical month's contributions for each month
// still to come. "Typical" is the median of the last three complete months, so a
// one-off bonus sacrifice or lump sum doesn't inflate the forecast.

function monthKey(y, m) {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function projectTaxYearContributions(entries, now = new Date()) {
  const fyStart = getTaxYearStart(now);
  const byMonth = {};
  let paidSoFar = 0;

  (entries || []).forEach(entry => {
    (entry.paymentHistory || []).forEach(p => {
      const d = parseDate(p.date);
      if (!d || d > now) return;
      const key = monthKey(d.getFullYear(), d.getMonth());
      byMonth[key] = (byMonth[key] || 0) + (p.amount || 0);
      if (getTaxYearStart(d) === fyStart) paidSoFar += p.amount || 0;
    });
  });

  // Typical month: median of the last 3 complete calendar months
  const recent = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    recent.push(byMonth[monthKey(d.getFullYear(), d.getMonth())] || 0);
  }
  const typicalMonth = median(recent);

  // Months still to contribute: the rest of this month if nothing's been paid in it
  // yet, then every month up to and including March. April 1–5 belongs to the
  // closing tax year, so there are no further months then.
  const paidThisMonth = (byMonth[monthKey(now.getFullYear(), now.getMonth())] || 0) > 0;
  const yearEnd = new Date(fyStart + 1, 2, 1); // March of the closing tax year
  let monthsRemaining = 0;
  if (now < new Date(fyStart + 1, 3, 1)) {
    monthsRemaining = (yearEnd.getFullYear() - now.getFullYear()) * 12 + (yearEnd.getMonth() - now.getMonth());
    if (!paidThisMonth) monthsRemaining += 1;
  }

  return {
    paidSoFar,
    typicalMonth,
    monthsRemaining,
    projected: paidSoFar + typicalMonth * monthsRemaining,
  };
}
