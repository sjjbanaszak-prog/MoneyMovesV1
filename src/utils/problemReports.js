// Problem reports are kept for a rolling 12 months (see the Privacy Policy).
// Firestore TTL needs a billed (Blaze) project, so expired reports are deleted
// by hand: once a month, remove any problem_reports whose expireAt has passed.
export const PROBLEM_REPORT_RETENTION_MONTHS = 12;

export function problemReportExpiry(from = new Date()) {
  const expireAt = new Date(from);
  expireAt.setMonth(expireAt.getMonth() + PROBLEM_REPORT_RETENTION_MONTHS);
  return expireAt;
}
