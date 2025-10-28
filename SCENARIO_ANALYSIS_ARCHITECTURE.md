# Scenario Analysis Architecture

**Version**: 1.0
**Created**: October 2025
**Status**: Planning / Not Yet Implemented

## Overview

This document outlines the recommended architecture for implementing scenario analysis across Money Moves financial modules.

## Recommendation: Scenario Modules Within Existing Pages

### Primary Approach

Implement scenario analysis as **modules within existing pages** (Savings Tracker, Pension Dashboard, Mortgage Calculator, etc.) rather than separate menus or standalone pages.

### Why This Approach?

#### 1. Maintains Context
- Users naturally think about scenarios within each financial area
- "What if I increase pension contributions?" while looking at pension data
- Easier to compare scenario vs current reality side-by-side

#### 2. Fits Current Architecture
- Each page already has multiple modules (charts, tables, advisories)
- Scenario modules would be a natural addition
- Consistent with existing modular design pattern

#### 3. Financial Area-Specific Needs
Different modules require different scenario types:
- **Pensions**: Contribution scenarios, retirement age variations, return rate scenarios
- **Savings**: Goal-based scenarios (house deposit, emergency fund)
- **Mortgage**: Rate change scenarios, overpayment strategies (already exists!)
- Each needs different inputs and outputs

#### 4. Progressive Enhancement
- Start simple with basic scenarios per page
- Add cross-page comparison later if needed
- Lower development overhead initially

---

## Proposed Structure by Module

### Pension Dashboard (`/pension-pots`)

```
Current Modules (keep as-is):
├─ Pension Metric Cards
├─ Pension Accounts Table V2
├─ Pension Allowance Utilization
├─ Pension Growth Chart
└─ AI Financial Advisory

NEW MODULE: "Pension Scenarios"
├─ Create Scenario: "Increase to 15%"
├─ Create Scenario: "Switch to salary sacrifice"
├─ Create Scenario: "Retire at 65 vs 67"
└─ Comparison View: Current | Scenario A | Scenario B
```

**Scenario Types:**
- Contribution rate changes (employee + employer %)
- Pension type changes (personal vs salary sacrifice)
- Retirement age variations
- Return rate assumptions (conservative, moderate, aggressive)
- One-off contributions
- Career breaks / sabbaticals

**Output Metrics:**
- Projected pot size at retirement
- Tax savings comparison
- Annual allowance utilization
- Retirement income projections

---

### Savings Tracker (`/savings-tracker`)

```
Current Modules (keep as-is):
├─ Savings Metric Cards
├─ Savings Accounts Table
├─ ISA Utilization Chart
├─ Monthly Balance Change Chart
├─ Premium Bonds Analysis
└─ AI Savings Advisory

NEW MODULE: "Savings Goals & Scenarios"
├─ Goal: House deposit (£50k by 2028)
├─ Goal: Emergency fund (6 months expenses)
├─ Goal: Holiday fund (£3k by June 2026)
└─ Shows: Timeline, required monthly savings, achievement probability
```

**Scenario Types:**
- Savings goals (target amount, target date)
- Regular contribution changes
- Interest rate variations
- ISA vs regular savings allocation
- Lump sum deposits

**Output Metrics:**
- Monthly savings required to hit goal
- Timeline to goal achievement
- ISA allowance optimization
- Tax savings vs regular accounts

---

### Mortgage Calculator (`/mortgage`)

```
Current Features (already has scenario analysis!):
├─ Regular overpayment scenarios
├─ One-off overpayment scenarios
├─ Interest savings calculations
└─ Amortization schedule

ENHANCE: Add more scenarios
├─ Rate change scenarios (what if SVR kicks in?)
├─ Remortgage comparison (new deal vs current)
├─ Lump sum vs monthly overpayments comparison
└─ Fixed term expiry planning
```

**Additional Scenario Types:**
- Rate change impact (e.g., "What if rates rise to 6%?")
- Remortgage comparison (fees vs savings)
- Term length changes
- Payment frequency changes

**Output Metrics:**
- Interest savings
- Term reduction
- Monthly payment changes
- Break-even analysis for remortgaging

---

### Pension Builder (`/pension-builder`)

```
Current Features (already has scenario comparison!):
├─ Current vs Future contribution comparison
├─ Low/Medium/High return scenarios
├─ Salary sacrifice vs personal contribution
└─ Retirement age projections

ENHANCE: Save and compare multiple scenarios
├─ Named scenarios (e.g., "Aggressive", "Conservative")
├─ Scenario history tracking
└─ Side-by-side comparison of 3+ scenarios
```

---

## Future Enhancement: Cross-Module Scenario Hub (Optional)

**NEW PAGE: `/scenario-hub`**

A cross-cutting scenario comparison tool that shows net worth impact across all financial areas.

```
Scenario Hub Features:
├─ Cross-module scenario creation
│   ├─ "Max pension vs Overpay mortgage vs Increase savings"
│   └─ "Buy house now vs Save 2 more years"
├─ Net worth projection over 10/20/30 years
├─ Trade-off analysis
└─ Optimal allocation recommendations
```

**When to Build:**
- After individual module scenarios are implemented
- When users request cross-cutting comparisons
- When data integration across modules is mature

---

## Implementation Pattern

### Component Structure

```jsx
// Example: PensionPots.js
<div className="dashboard-modules">
  {/* Existing modules */}
  <PensionMetricCards {...} />
  <PensionAccountsTableV2 {...} />

  {/* NEW: Scenario module */}
  <PensionScenarioBuilder
    currentData={pensions}
    yearlyTotals={yearlyTotals}
    userAge={userAge}
    retirementAge={retirementAge}
    onScenarioCreate={handleScenarioCreate}
    onScenarioCompare={handleScenarioCompare}
  />

  {/* Existing modules */}
  <PensionAllowanceUtilization {...} />
  <PensionGrowthChart {...} />
</div>
```

### Data Structure (Firestore)

#### Option 1: Subcollection per module

```javascript
// Collection: pensionScenarios/{userId}/scenarios/{scenarioId}
{
  scenarioId: "uuid-123",
  scenarioName: "Increase to 15%",
  createdAt: timestamp,
  updatedAt: timestamp,
  inputs: {
    employeeContribution: 15,
    employerContribution: 5,
    salaryIncrease: 3,
    returnRate: 5,
    retirementAge: 67
  },
  results: {
    projectedPot: 450000,
    taxSavings: 12500,
    annualAllowanceUsed: 42000
  }
}
```

#### Option 2: Array within main document

```javascript
// Collection: pensionScenarios/{userId}
{
  baselineData: { /* current pension data */ },
  scenarios: [
    {
      scenarioId: "uuid-123",
      scenarioName: "Increase to 15%",
      // ... scenario data
    },
    {
      scenarioId: "uuid-456",
      scenarioName: "Retire at 65",
      // ... scenario data
    }
  ],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Recommendation**: Use **subcollection** approach for scalability and easier querying.

---

## Why NOT Other Options

### ❌ Sub-menus for each page
**Issues:**
- Adds navigation complexity without clear benefit
- Takes users away from their data context
- Extra clicks to access scenarios
- Harder to compare scenario vs actual

### ❌ Separate menu for scenario analysis
**Issues:**
- Disconnects scenarios from actual data
- Harder to see impact on real numbers
- Requires data synchronization across pages
- Users lose context when switching views

### ✅ Modules within pages (Recommended)
**Benefits:**
- Natural, contextual placement
- Consistent with existing architecture
- Side-by-side comparison with actual data
- Lower development overhead
- Better UX for financial decision-making

---

## Implementation Roadmap

### Phase 1: Single Module Proof of Concept (MVP)
**Goal**: Build one scenario module to validate approach

**Recommendation**: Start with **Pension Scenarios**
- Most complex calculations (tax relief, annual allowance, projections)
- High user value (retirement planning is critical)
- Existing PensionBuilder provides foundation

**Steps:**
1. Design data structure (Firestore schema)
2. Build `PensionScenarioBuilder` component
3. Implement scenario creation UI
4. Add comparison logic (current vs scenarios)
5. Reuse existing charts for visualization (PensionReturnsChart)
6. Add scenario management (edit, delete, duplicate)

**Success Criteria:**
- Users can create named pension scenarios
- Side-by-side comparison of current vs scenario
- Scenarios persist in Firestore
- Visual comparison using existing chart components

---

### Phase 2: Expand to Other Modules
**After Phase 1 validation:**

1. **Savings Scenarios** (3-4 weeks)
   - Goal-based scenarios
   - Timeline calculations
   - ISA optimization

2. **Enhanced Mortgage Scenarios** (2-3 weeks)
   - Rate change impact
   - Remortgage comparison
   - Break-even analysis

3. **Pension Builder Enhancement** (2 weeks)
   - Save named scenarios
   - Scenario history
   - 3-way comparison view

---

### Phase 3: Cross-Module Integration (Future)
**Only if user demand exists:**

1. Scenario Hub page
2. Net worth projection across all modules
3. Trade-off analysis tools
4. Optimal allocation recommendations

---

## Design Considerations

### UI/UX Patterns

**Scenario Creation:**
- Modal or slide-out panel for scenario inputs
- Pre-filled with current values as baseline
- Clear "Save Scenario" and "Compare" actions
- Visual differentiation (scenario vs actual)

**Comparison View:**
- Side-by-side cards: Current | Scenario A | Scenario B
- Highlight differences (green for improvements, red for drawbacks)
- Toggle between scenarios
- Export/share functionality

**Visual Design:**
- Reuse existing chart components (PensionReturnsChart, SavingsChart)
- Add "scenario layer" to charts (dashed lines, different colors)
- Consistent with Money Moves design system

### Data Management

**State Management:**
- Store scenarios in Firestore (persist across sessions)
- Local state for active comparison
- Debounced auto-save (500ms delay)
- Optimistic updates for better UX

**Calculations:**
- Reuse existing calculation utilities
- Move to utility files if not already modular
- Server-side validation for critical calculations (Cloud Functions)

---

## Technical Requirements

### Dependencies
- **Existing**: React, Firestore, dayjs, lodash
- **New**: None (use existing stack)

### File Organization

```
/src/modules/
├── scenarios/
│   ├── PensionScenarioBuilder.js
│   ├── PensionScenarioCard.js
│   ├── PensionScenarioComparison.js
│   ├── SavingsScenarioBuilder.js
│   ├── SavingsScenarioCard.js
│   └── scenarioUtils.js
├── utils/
│   ├── scenarioCalculations.js
│   └── scenarioValidation.js
└── (existing modules)
```

### Firestore Collections

```
/pensionScenarios/{userId}/scenarios/{scenarioId}
/savingsScenarios/{userId}/scenarios/{scenarioId}
/mortgageScenarios/{userId}/scenarios/{scenarioId}
```

---

## Next Steps

1. ✅ Document architecture (this file)
2. ⬜ Design Firestore schema for pension scenarios
3. ⬜ Create `PensionScenarioBuilder` component wireframe
4. ⬜ Define calculation logic for pension scenarios
5. ⬜ Implement Phase 1 MVP (Pension Scenarios)
6. ⬜ User testing and feedback
7. ⬜ Iterate and expand to other modules

---

## Questions to Address

Before implementation:

1. **Scenario Limits**: How many scenarios can a user save? (Suggest: 10 per module)
2. **Comparison**: Max scenarios to compare side-by-side? (Suggest: 3)
3. **Naming**: Auto-generate names or require user input? (Suggest: Auto-generate with option to rename)
4. **Baseline**: Always compare to current, or allow scenario vs scenario? (Suggest: Both)
5. **Sharing**: Should scenarios be shareable? (Suggest: Phase 2 feature)

---

## Version History

### Version 1.0 - October 2025
- Initial architecture document
- Recommendation: Scenario modules within existing pages
- Proposed structure for all major modules
- Implementation roadmap defined
- Technical requirements outlined

---

**End of Document**
