// ── Pension date helpers ───────────────────────────────────────────────────────

/**
 * Parse a date string in DD/MM/YYYY or ISO format.
 * Returns a plain Date object, or null if invalid.
 */
export function parseDate(str) {
  if (!str) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/').map(Number);
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Get the UK tax year start year for a given Date or date string.
 * Tax year runs April 6 → April 5.
 * e.g. April 5 2024 → 2023 (FY 23/24); April 6 2024 → 2024 (FY 24/25)
 */
export function getTaxYearStart(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : parseDate(date);
  if (!d || isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-based
  const day = d.getDate();
  if (month < 4 || (month === 4 && day < 6)) return year - 1;
  return year;
}

/**
 * Whole years of age on `today` for a date of birth ('YYYY-MM-DD' or a Date).
 * Returns null for a missing, invalid or future date.
 */
export function ageFromDob(dob, today = new Date()) {
  if (!dob) return null;
  const d = dob instanceof Date ? dob : (/^\d{4}-\d{2}-\d{2}$/.test(dob) ? new Date(`${dob}T00:00:00`) : parseDate(dob));
  if (!d || isNaN(d.getTime()) || d > today) return null;
  let age = today.getFullYear() - d.getFullYear();
  const hadBirthday = today.getMonth() > d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() >= d.getDate());
  if (!hadBirthday) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}
