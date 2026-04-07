/**
 * Formats an ISO timestamp into a human-readable "updated X" string.
 * Returns null when no timestamp is available so callers can omit the label entirely.
 */
export function formatLastUpdated(isoString) {
  if (!isoString) return null;
  const updated = new Date(isoString);
  if (isNaN(updated.getTime())) return null;
  const now = new Date();
  const diffDays = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'updated today';
  if (diffDays === 1) return 'updated yesterday';
  if (diffDays < 7) return `updated ${diffDays} days ago`;
  return `updated ${updated.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
