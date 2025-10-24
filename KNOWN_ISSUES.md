# Known Issues

## PensionAccountsTableV2 - Mobile Right Margin Inconsistency

**Date Identified:** 2025-01-24

**Description:**
On mobile devices (≤768px), the PensionAccountsTableV2 card has slightly more padding/margin to the right compared to other cards on the PensionPots page (e.g., Allowance Utilization, Pie Chart, Growth Chart).

**Root Cause:**
The `.table-container-v2` has `max-width: calc(100vw - 42px)` applied on mobile, which creates extra right-side spacing. Other cards on the page do not have this width constraint and fill the available space naturally.

**Technical Details:**
- Location: `/src/modules/PensionAccountsTableV2Styles.css` (line 203-204)
- Current mobile styling:
  ```css
  @media (max-width: 768px) {
    .table-container-v2 {
      max-width: calc(100vw - 42px);
    }
  }
  ```
- Comparison: `.cf-card` (Allowance Utilization) uses `width: 100%; max-width: 100%; box-sizing: border-box;` on mobile and aligns correctly

**Attempted Solutions (All Failed):**
1. ❌ Changing calc to `calc(100vw - 8px)` - Caused horizontal scroll on all cards
2. ❌ Removing max-width constraint entirely - Broke layout completely
3. ❌ Adding `width: 100%; max-width: 100%; box-sizing: border-box;` - Broke layout completely
4. ❌ Removing `.full-width-card` wrapper from Allowance Utilization - Broke spacing between cards

**Note:**
- Desktop `box-sizing: border-box` was added to `.table-container-v2` (line 18) during investigation
- This may help when the proper mobile width solution is found

**Impact:**
Visual inconsistency only - does not affect functionality. The V2 table appears slightly narrower than other cards on mobile, with more whitespace on the right edge.

**Next Steps:**
Need to investigate with browser developer tools to:
1. Measure exact computed widths of both V2 table and other cards on mobile
2. Identify all margins, paddings, and borders contributing to width
3. Determine correct calc() value or alternative approach
4. Test solution across multiple mobile screen sizes

**Priority:** Low (cosmetic issue)
