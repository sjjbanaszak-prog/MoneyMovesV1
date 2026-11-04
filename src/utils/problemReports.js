// Problem reports are kept for a rolling 12 months (see the Privacy Policy).
// Firestore's TTL policy on problem_reports.expireAt deletes each report
// automatically once this date passes.
export const PROBLEM_REPORT_RETENTION_MONTHS = 12;

export function problemReportExpiry(from = new Date()) {
  const expireAt = new Date(from);
  expireAt.setMonth(expireAt.getMonth() + PROBLEM_REPORT_RETENTION_MONTHS);
  return expireAt;
}
