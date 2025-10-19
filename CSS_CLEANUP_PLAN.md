# CSS Cleanup Plan - Phase 5 Part 2

## Strategy

Instead of removing duplicate code immediately (which requires updating component JSX), we'll:
1. **Import variables.css** in all component CSS files
2. **Replace hardcoded colors** with CSS variables
3. **Document duplicate styles** for future removal

This approach:
- ✅ Immediate benefit (consistent colors, easy theming)
- ✅ No breaking changes (components still work)
- ✅ Sets up for future cleanup

## Priority Files (by size and duplication)

### High Priority
1. **AccountSettingsStyles.css** (1,421 lines) - Replace colors
2. **Navbar.css** (593 lines) - Replace colors
3. **PensionAccountsTableStyles.css** (585 lines) - Replace colors  
4. **ISALISAUtilization.css** (516 lines) - Replace colors
5. **PensionAllowanceChart.css** (437 lines) - Replace colors

### Color Replacements

| Hardcoded | Variable | Usage Count |
|-----------|----------|-------------|
| #10b981 | var(--color-primary) | 84 |
| #f3f4f6 | var(--text-secondary) | 70 |
| #1f2937 | var(--bg-secondary) | 66 |
| #9ca3af | var(--text-muted) | 57 |
| #111827 | var(--bg-primary) | 44 |
| #94a3b8 | var(--color-slate-400) | 33 |
| #374151 | var(--border-primary) | 24 |
| #ef4444 | var(--color-danger) | 22 |

## Duplicate Styles (Future Cleanup)

### Modal Styles (Can be removed when components use SharedStyles)
- AccountSettingsStyles.css: lines 1384-1420 (~40 lines)
- ColumnMapperStyles.css: modal definitions
- PensionUploaderStyles.css: modal definitions
- FileUploaderStyles.css: modal definitions

### Button Styles (Can be removed)
- Multiple files with `.btn-primary`, `.btn-secondary` definitions

### Card Styles (Can be removed)
- 6+ files with duplicate `.card` definitions

**Estimated Savings:** 1,500-2,000 lines once components updated to use SharedStyles

## Implementation: Color Replacement Only

Focus on replacing colors first, saves duplicate style removal for when components are refactored.
