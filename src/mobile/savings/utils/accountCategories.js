// ── Savings account categories ─────────────────────────────────────────────────
// One place for the four top-level categories and their colours, shared by the
// Overview account pills/avatars, the account page, and the Account Allocation
// donut on Insights, so the same category is always the same colour.

export const CATEGORY_COLORS = {
  ISA:     '#4edea3',
  Savings: '#adc6ff',
  Bonds:   '#38bdf8',
  Current: '#ffb95f',
};

/** 'Bonds' | 'ISA' | 'Current' | 'Savings' for an account type string. */
export function accountCategory(accountType = '') {
  const t = (accountType || '').toLowerCase();
  if (t.includes('bond'))    return 'Bonds';
  if (t.includes('isa'))     return 'ISA';
  if (t.includes('current')) return 'Current';
  return 'Savings';
}

export function accountCategoryColor(accountType = '') {
  return CATEGORY_COLORS[accountCategory(accountType)];
}
