# Money Moves V1 - Refactoring Project Overview

**Project:** Comprehensive Architecture Refactoring
**Status:** In Progress (Phase 5 Part 3 Completed)
**Last Updated:** October 19, 2025

---

## 📋 Project Phases

### **Phase 1: Foundation - Quick Wins** ✅ COMPLETED
- Centralized utilities (formatters, dateUtils) ✅
- Shared CSS file ✅
- Archive legacy code ✅

### **Phase 2: Custom Hooks + Firebase Security** ✅ COMPLETED
- Environment variables for Firebase ✅
- Custom hooks (useFirebaseDoc, useFirebaseCollection) ✅
- Hooks created but NOT applied (see Phase 4 note) ✅

### **Phase 3: Component Library + Pages Reorganization** ✅ COMPLETED
- Reusable components (Modal, Button, Input, Card) ✅
- Pages directory reorganization ✅

### **Phase 4: Apply Custom Hooks to Remaining Components** ⏭️ SKIPPED
**Decision:** Skipped this phase due to technical issues discovered during implementation.

**Reason:** The `useFirebaseDoc` hook caused re-render loops and input freezing bugs when applied to components with multiple individual state fields. The current pattern (direct useState + Firebase load/save effects) is:
- ✅ Already clean and consistent
- ✅ Working reliably across all components
- ✅ Easy to understand and debug
- ✅ Only ~30-40 lines per component (acceptable overhead)

**Original Objective:** Apply hooks to 22+ components to eliminate ~1,000 lines of boilerplate

**Actual Outcome:** Hooks remain available for simple use cases, but complex components use the proven direct useState pattern

**Impact:** Minimal - the working pattern is already maintainable and consistent

---

### **Phase 5: CSS Consolidation** ✅ IN PROGRESS

#### **Phase 5 Part 1: CSS Variables Foundation** ✅ COMPLETED
- Created variables.css with 40+ design tokens ✅
- Enhanced SharedStyles.css with CSS variables ✅
- Established complete design system ✅

#### **Phase 5 Part 2: Color Variable Replacement** ✅ COMPLETED
- Replaced 178+ hardcoded colors in top 5 CSS files ✅
- Applied semantic color variables ✅
- Improved theme consistency ✅

#### **Phase 5 Part 3: Duplicate CSS Removal** ✅ COMPLETED
- Removed 119 lines of duplicate CSS ✅
- Consolidated body styles (11 files) ✅
- Consolidated modal-overlay styles (3 files) ✅
- Single source of truth established ✅

#### **Phase 5 Part 4: Design System Consolidation** ✅ COMPLETED
- Created standardized chart component system in SharedStyles.css ✅
- Consolidated chart wrapper/header/title styles from 5 chart files ✅
- Established design pattern thinking (not just literal duplicate removal) ✅
- Chart components now use consistent base styles with custom overrides ✅

**Next:** Phase 6 (Optional) - Module Organization OR Phase 7 - Component Extraction

---

## **REMAINING TASKS (Optional):**

### **Phase 5 Part 4: Additional CSS Consolidation** (Optional)
**Problem Identified:** 33 CSS files with 8,205 total lines

**Proposed Actions:**
1. **Merge duplicate patterns** - Many CSS files share identical classes
2. **Create CSS modules** - Scope styles to components
3. **Theme system** - Centralize colors, spacing, typography
4. **Remove unused styles** - Dead CSS elimination

**Files with Most Duplication:**
- Modal styles (repeated in 5+ files)
- Card/container patterns
- Button variants
- Form styling
- Loading states

**Estimated Impact:** Could reduce CSS from 8,205 lines to ~4,000-5,000 lines

---

### **Phase 6: Module Organization** (Original Plan)
**Problem Identified:** `/modules/` directory has 30+ files mixed together

**Proposed Structure:**
```
/modules
  /pension
    - PensionPotPie.js
    - PensionAccountsTable.js
    - PensionUploader.js
    - PensionAllowanceChart.js
    - PensionPerformanceCards.js
    - PensionGrowthChart.js
    - PensionPeerComparison.js
    - AIFinancialAdvisory.js

  /savings
    - FileUploader.js
    - ColumnMapper.js
    - SavingsChart.js
    - AccountsTable.js
    - MonthlyBalanceChangeChart.js
    - ISALISAUtilization.js
    - PremiumBondsAnalysis.js
    - AISavingsAdvisory.js

  /mortgage
    - MortgageChart.js
    - MortgageSummary.js
    - ComparisonChart.js

  /trading
    - Trading212Uploader.js
    - PortfolioBuilder.js
    - PortfolioValueChart.js
    - TreemapChart.js
    - MonthlyPerformanceChart.js

  /shared
    - NetWorthChart.js
    - DataUploader.js (generalized)
    - ColumnMapper.js (if used across features)

  /utils
    - columnDetection.js
    - detectDateFormat.js
    - premiumBondsParser.js
    - dataValidation.js
    - mortgageUtils.js
    - pensionUtils.js
```

**Benefits:**
- Clearer feature boundaries
- Easier to find related components
- Better for code splitting
- Logical grouping

---

### **Phase 7: Component Extraction** (Not in Original Plan, but Identified)
**Large Components to Break Down:**

1. **AccountSettings.js** - 1,145 lines
   - Extract modal components (EditProfile, UpgradePremium, ReportProblem)
   - Extract SettingsCard, MenuItem as separate components

2. **AIFinancialAdvisory.js** - ~1,000 lines
   - Break into smaller advice section components
   - Extract analysis logic

3. **LandingPage.js** - 516 lines
   - Extract module card components
   - Separate overview sections

---

### **Additional Items from Original Analysis:**

### **Data Layer Consolidation**
- **3 different parsers** for CSV/file handling
- **Duplicate column detection** logic
- **Similar data validation** patterns

**Proposed:** Create unified data service layer

### **Utility Organization**
You already started this with formatters and dateUtils, but there are more:
- `/modules/utils/` has 6+ utility files that could be moved to `/src/utils/`
- Some utils are domain-specific (mortgage, pension) - could be organized better

---

## **Summary of Remaining Work:**

| Phase | Status | Estimated Impact |
|-------|--------|------------------|
| Custom Hooks Application | ⏳ Not Started | ~1,000 lines reduction |
| CSS Consolidation | ⏳ Not Started | ~3,000-4,000 lines reduction |
| Module Organization | ⏳ Not Started | Better structure |
| Large Component Breakdown | ⏳ Not Started | Improved maintainability |
| Data Layer Consolidation | ⏳ Not Started | Eliminate duplicate parsing |
| Utility Organization | 🔄 Partially Done | Complete the work |

**Biggest Impact Opportunities:**
1. **Apply custom hooks to 22+ components** (Phase 4) - Most immediate code reduction
2. **CSS consolidation** (Phase 5) - Reduce ~4,000 lines of duplicate CSS
3. **Break down large components** - Improve maintainability

---

## 🎯 Completed Achievements

### Phase 1 Results
- Created `/src/utils/formatters.js` - 11 duplicate formatCurrency functions eliminated
- Created `/src/utils/dateUtils.js` - 3+ duplicate tax year calculations eliminated
- Created `/src/styles/SharedStyles.css` - Global shared component styles
- Archived 909 lines of legacy code (MortgageCalc.js)

### Phase 2 Results
- Secured Firebase credentials in `.env` file
- Created `useFirebaseDoc` hook (155 lines) - eliminates 40-50 lines per component
- Created `useFirebaseCollection` hook (168 lines) - simplifies collection queries
- Refactored MortgageCalcNEW: 240 → 157 lines (83 lines removed, 35% reduction)
- Estimated potential: 1,000+ lines removable across 23+ components

### Phase 3 Results
- Created component library: Modal, Button, Input, Card (240 lines total)
- Organized 7 page components into `/src/pages/` directory (5,406 lines organized)
- Created barrel export for clean imports
- Clear separation: pages vs features vs reusable components
- Estimated savings: ~50 lines per modal implementation

**Total Lines Refactored So Far:** ~7,000+ lines
**Total Lines Reduced:** ~1,000+ lines
**Components with Better Structure:** 30+

---

## 📊 Original Problem Analysis

### CSS Files (33 files, 8,205 lines)
- AccountSettingsStyles.css: 1,424 lines
- SavingsTrackerStyles.css: 665 lines
- MortgageCalcNEWStyles.css: 649 lines
- LandingPage.css: 539 lines
- PensionPotsStyles.css: 469 lines
- ... 28 more CSS files

### Duplicate Code Patterns Identified
- **11 formatCurrency implementations** (eliminated ✅)
- **3+ tax year calculations** (eliminated ✅)
- **23+ Firebase load/save patterns** (hooks created ✅, application pending ⏳)
- **5+ modal implementations** (component created ✅)
- **Inconsistent button styles** (component created ✅)
- **Varied form patterns** (component created ✅)

---

*This document tracks the ongoing refactoring effort to improve code quality, reduce duplication, and establish better architectural patterns in the Money Moves V1 application.*
