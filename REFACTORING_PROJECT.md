# Money Moves V1 - Refactoring Project Overview

**Project:** Comprehensive Architecture Refactoring
**Status:** Phase 5 Complete — Phases 6 & 7 Optional
**Last Updated:** March 2026

---

## 📋 Project Phases

### **Phase 1: Foundation - Quick Wins** ✅ COMPLETED
- Centralized utilities (formatters, dateUtils) ✅
- Shared CSS file ✅
- Archive legacy code ✅

**Results:**
- Created `/src/utils/formatters.js` — eliminated 11 duplicate `formatCurrency` functions
- Created `/src/utils/dateUtils.js` — eliminated 3+ duplicate tax year calculations
- Created `/src/styles/SharedStyles.css` — global shared component styles
- Archived 909 lines of legacy code (`MortgageCalc.js`)

---

### **Phase 2: Custom Hooks + Firebase Security** ✅ COMPLETED
- Environment variables for Firebase ✅
- Custom hooks (`useFirebaseDoc`, `useFirebaseCollection`) created ✅
- Hooks NOT applied at scale (see Phase 4 note below)

**Results:**
- Secured Firebase credentials in `.env` file
- `useFirebaseDoc` hook (155 lines) — eliminates 40–50 lines per component
- `useFirebaseCollection` hook (168 lines) — simplifies collection queries
- Refactored `MortgageCalcNEW`: 240 → 157 lines (35% reduction)

---

### **Phase 3: Component Library + Pages Reorganization** ✅ COMPLETED
- Reusable components (Modal, Button, Input, Card) ✅
- Pages directory reorganization ✅

**Results:**
- Component library created: 240 lines total
- 7 page components organized into `/src/pages/` (5,406 lines structured)
- Barrel export for clean imports
- Clear separation: pages vs feature modules vs reusable components

---

### **Phase 4: Apply Custom Hooks to Remaining Components** ⏭️ SKIPPED
**Decision:** Skipped due to technical issues during implementation.

**Reason:** `useFirebaseDoc` caused re-render loops and input freezing when applied to components with multiple individual state fields. The current pattern (direct `useState` + Firebase load/save effects) is:
- Already clean and consistent
- Working reliably across all components
- Easy to understand and debug
- Only ~30–40 lines per component (acceptable overhead)

**Impact:** Minimal — the working pattern is maintainable and consistent. Hooks remain available for simple use cases.

---

### **Phase 5: CSS Consolidation** ✅ COMPLETED

#### **Part 1: CSS Variables Foundation** ✅
- Created `variables.css` with 40+ design tokens
- Enhanced `SharedStyles.css` with CSS variables
- Established complete design system

#### **Part 2: Color Variable Replacement** ✅
- Replaced 178+ hardcoded colors in top 5 CSS files
- Applied semantic color variables throughout
- Improved theme consistency

#### **Part 3: Duplicate CSS Removal** ✅
- Removed 119 lines of duplicate CSS
- Consolidated `body` styles (11 files)
- Consolidated `modal-overlay` styles (3 files)
- Single source of truth established

#### **Part 4: Design System Consolidation** ✅
- Created standardized chart component system in `SharedStyles.css`
- Consolidated chart wrapper/header/title styles from 5 chart files
- Chart components now use consistent base styles with component-specific overrides

**Phase 5 Total Impact:** ~400 lines removed, consistent design tokens across all modules

---

### **Additional Completed Work (Post-Phase 5)**

#### **Income Tax Calculator — Layout & Style Cleanup** ✅
- Extracted 50+ inline styles into named CSS classes in `IncomeTaxCalculator.css`
- Standardised card padding to 24px and grid gaps to 24px across the module
- Fixed `btn-toggle-group` → `itc-btn-toggle-group` class name mismatch
- Removed meaningless positional inline styles on Lucide icon wrappers
- Changes made on branch `fix/income-tax-layout-spacing` (merged to main)

---

## 🔧 Optional Future Work

### **Phase 6: Module Organization**
**Problem:** `/modules/` directory has 30+ files mixed together.

**Proposed structure:**
```
/modules
  /pension
  /savings
  /mortgage
  /trading
  /debt
  /income-tax
  /shared
  /utils
```

**Benefits:** Clearer feature boundaries, easier navigation, better for code splitting.

---

### **Phase 7: Large Component Extraction**

| Component | Lines | Extraction Opportunity |
|-----------|-------|------------------------|
| `AccountSettings.js` | ~1,145 | Extract modal components (EditProfile, UpgradePremium, ReportProblem) |
| `AIFinancialAdvisory.js` | ~1,000 | Break into advice section components |
| `IncomeTaxCalculator.js` | ~1,300 | Extract input panel, results panel, chart panel |
| `LandingPage.js` | ~516 | Extract module card components |

---

### **Phase 5 (Continued): Further CSS Reduction**

Based on analysis across 34 CSS files (~10,749 lines total):

**What can be eliminated (estimated 30–40% reduction):**

| Category | Files Affected | Lines Saveable |
|----------|----------------|----------------|
| Duplicate modal overlays | 4 files | ~160 lines |
| Duplicate button styles | 3 files | ~90 lines |
| Duplicate card wrappers | 6 files | ~150 lines |
| Duplicate form inputs | 5 files | ~100 lines |
| Base `body` styles (already global) | 20 files | ~160 lines |
| Generic wrapper containers | 8 files | ~200 lines |
| **Total** | **31 files** | **~860 lines** |

**Small files that could be fully eliminated** (replace with utility classes):
- `TimeframeTabs.css` (51 lines)
- `StackedBarChart.css` (minimal)
- Several small modal wrapper files

**Large files that must stay** (component-specific complexity):
- `AccountSettingsStyles.css` — reducible from ~1,421 to ~900 lines
- `PensionAccountsTableStyles.css` — reducible from ~586 to ~450 lines
- `ISALISAUtilization.css` — reducible from ~518 to ~380 lines
- `Navbar.css` — reducible from ~576 to ~480 lines

**Optimal approach:** Hybrid model — shared utilities in `SharedStyles.css`, component-specific layouts in dedicated CSS files. Avoid a single mega-file.

---

### **Data Layer Consolidation**
- 3 different parsers for CSV/file handling
- Duplicate column detection logic
- Similar data validation patterns

**Proposed:** Create a unified data service layer.

---

### **Utility Organization**
- `/modules/utils/` has 6+ domain-specific utility files that could be better organized
- Some utils (mortgage, pension, income tax) could move to `/src/utils/` with clear naming

---

## 📊 Summary of Remaining Work

| Phase | Status | Estimated Impact |
|-------|--------|------------------|
| CSS Consolidation (further) | ⏳ Optional | ~2,000–3,000 lines reduction |
| Module Organization | ⏳ Optional | Better file structure |
| Large Component Breakdown | ⏳ Optional | Improved maintainability |
| Data Layer Consolidation | ⏳ Optional | Eliminate duplicate parsers |
| Custom Hooks Application | ⏭️ Skipped | Approach not viable at scale |

---

## 🎯 Completed Achievements Summary

| Phase | Key Outcome |
|-------|-------------|
| Phase 1 | 11 duplicate formatCurrency fns eliminated; shared CSS established |
| Phase 2 | Firebase credentials secured; custom hooks created |
| Phase 3 | Component library + pages reorganisation |
| Phase 4 | Skipped (re-render issues) |
| Phase 5 Parts 1–4 | CSS variables, color replacement, duplicate removal, design system |
| Income Tax CSS | 50+ inline styles extracted, spacing standardised |

**Total Lines Refactored:** ~7,000+ lines structured/organised
**Total Lines Removed:** ~1,500+ lines of duplication
**Components with Better Structure:** 30+

---

*This document tracks the refactoring effort to improve code quality, reduce duplication, and establish better architectural patterns in the Money Moves V1 application.*
