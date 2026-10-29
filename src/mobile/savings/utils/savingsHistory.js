import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// ── Savings balance history ─────────────────────────────────────────────────────
// Rebuilds a month-end balance for each savings account so the net worth chart
// can show savings growing over time instead of today's total in every month.
//
// Sources, in order of preference for a given month:
//   1. balanceHistory snapshots (manual balance updates / demo data)
//   2. the balance column of uploaded statement rows
//   3. a running total of the amount column when there's no balance column
//   4. balanceAfter on manually added transactions
// The current month always uses the account's currentBalance.

function parseAmount(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  return parseFloat(String(value).replace(/[£$€\s,]/g, '')) || 0;
}

function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function parseRowDate(value, dateFormat) {
  if (!value) return null;
  const d = dateFormat ? dayjs(String(value), dateFormat, true) : dayjs(String(value));
  return d.isValid() ? d.toDate() : null;
}

/** Dated balance points for one account: [{ date: Date, value, priority }]. */
function balancePoints(account) {
  const { rawData = [], mapping = {}, dateFormat, deletedRawIndices = [] } = account;
  const deleted = new Set(deletedRawIndices);
  const points = [];

  const rows = rawData
    .map((row, i) => ({ row, i, date: mapping.date ? parseRowDate(row[mapping.date], dateFormat) : null }))
    .filter(r => r.date && !deleted.has(r.i))
    .sort((a, b) => a.date - b.date || a.i - b.i);

  if (mapping.balance) {
    rows.forEach(({ row, date }) => {
      const raw = row[mapping.balance];
      if (raw == null || raw === '') return;
      points.push({ date, value: parseAmount(raw), priority: 0 });
    });
  } else if (mapping.amount) {
    let running = 0;
    rows.forEach(({ row, date }) => {
      running += parseAmount(row[mapping.amount]);
      points.push({ date, value: running, priority: 0 });
    });
  }

  (account.manualTransactions || []).forEach(tx => {
    if (tx.balanceAfter == null || !tx.date) return;
    const date = new Date(tx.date);
    if (!isNaN(date.getTime())) points.push({ date, value: tx.balanceAfter, priority: 1 });
  });

  (account.balanceHistory || []).forEach(bh => {
    const date = new Date(bh.date);
    if (!isNaN(date.getTime())) points.push({ date, value: bh.value, priority: 2 });
  });

  return points.sort((a, b) => a.date - b.date || a.priority - b.priority);
}

/**
 * Month-end balance for one account across `months` ('YYYY-MM' keys, ascending).
 * Months before the account's first known balance are 0. An account with no
 * dated history at all is shown at its current balance throughout, matching the
 * chart's previous behaviour for balance-only accounts.
 */
export function accountBalanceSeries(account, months, nowKey) {
  const current = account.currentBalance || 0;
  const points = balancePoints(account);
  if (points.length === 0) return months.map(() => current);

  let ptr = 0;
  let value = 0;
  return months.map(mo => {
    if (mo >= nowKey) return current;
    while (ptr < points.length && toMonthKey(points[ptr].date) <= mo) {
      value = points[ptr].value;
      ptr++;
    }
    return value;
  });
}

/** Earliest 'YYYY-MM' with a known balance across all accounts, or null. */
export function earliestSavingsMonth(accounts) {
  let first = null;
  (accounts || []).forEach(account => {
    const points = balancePoints(account);
    if (!points.length) return;
    const key = toMonthKey(points[0].date);
    if (!first || key < first) first = key;
  });
  return first;
}

/** Total savings balance across all accounts for each month. */
export function savingsBalanceSeries(accounts, months, nowKey) {
  const totals = months.map(() => 0);
  (accounts || []).forEach(account => {
    accountBalanceSeries(account, months, nowKey).forEach((v, i) => { totals[i] += v; });
  });
  return totals;
}
