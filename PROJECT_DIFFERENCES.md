# Project Differences: V1 (this repo) vs v3 (reference)

This document compares Money Moves V1 (base) against the MoneyMoves_v3 `PROJECT_STATUS.md` and suggests documentation-only improvements for V1.

## Overview

- **Base**: V1 (Create React App, custom CSS, shared hooks/components)
- **Reference**: v3 (Vite + Tailwind, Debt Manager + Savings Tracker + Pension Builder implemented, dashboard scaffolding)

## Key Differences

### Build & Styling
- V1: Create React App + custom CSS (shared `SharedStyles.css`); reusable components in `/components/common`
- v3: Vite + Tailwind CSS 4 with custom theme

Implications:
- V1 benefits from shared CSS + reusable components; v3 benefits from utility-first consistency and theme tokens

### Auth & App Shell
- V1: Google Sign-In via `AuthProvider`, Navbar, route-level pages
- v3: Full auth flows (login/register/forgot) and protected routes; dashboard layout (sidebar + topbar)

### Feature Modules
- V1: Pension Pots, Pension Builder, Mortgage Calculator, Savings Tracker, Trading 212, Account Settings, Landing Page
- v3: Debt Manager, Savings Tracker, Pension Builder (debt module not present in V1)

### Utilities & Hooks
- V1: Centralized formatters/date utils, `useFirebaseDoc`, `useFirebaseCollection`
- v3: Calculation utilities (EAR, snowball/avalanche), open banking data fetcher, a `useDebts` hook

### Firestore Data Model
- V1: `pensionScenarios`, `pensionPots`, `mortgageScenarios`, `savingsAccounts`, `trading212Portfolios` (values in pounds)
- v3: `user_debts`, `user_savings_accounts` (+ subcollections), `user_pension_accounts` (+ subcollections), `repayment_plans` (values in pence)

## Suggestions for V1 (Documentation-Only; no implementation here)

### 1) Data Model Harmonization
- Define canonical monetary unit: choose pence (integer) across Firestore for precision, document conversion at UI boundaries
- Introduce subcollections for time-series data consistently (`historical_positions`, `payment_history`, `yearly_totals`)
- Add collection naming conventions doc (snake_case vs camelCase) and migration guidance

### 2) Common Upload/Mapping Pipeline
- Document a shared interface for uploaders: parser inputs/outputs, mapping schema, validation results
- Create a spec for a generalized `DataUploader` and `ColumnMapper` contract used by pensions, savings, Trading212

### 3) Reusable Component Library Docs
- Document component APIs (Modal, Button, Input, Card) in a single reference
- Suggest adding Storybook documentation (non-blocking) to preview variants and states

### 4) Calculation Utilities Catalog
- Create a catalog listing all financial utilities in V1 (`mortgageUtils`, pension calculators, savings analytics)
- Identify missing shared functions from v3 (EAR, snowball/avalanche) and document proposed locations/namespaces

### 5) Auth & Routing Patterns
- Document protected route pattern and page-level loading/auth guards
- Clarify redirect behavior for legacy routes (e.g., `/MortgageCalc` → `/MortgageCalcNEW`)

### 6) Styling & Design Tokens
- Add a design tokens document capturing color roles, spacing, typography and map existing CSS to those tokens
- Consider documenting an incremental path to introduce a lightweight utility CSS layer (optional), keeping shared components as the primary abstraction

### 7) Hooks Usage Guidelines
- Expand docs for `useFirebaseDoc` and `useFirebaseCollection` with examples, error/loading patterns, and testing guidelines
- Document when to use document vs collection hooks; debounce defaults; realtime tradeoffs

### 8) Testing & QA Guidance
- Add a minimal testing guide for utils and hooks (unit tests), and for critical calculations (snapshot tests)
- Document manual QA checklists for upload/mapping flows and charts

### 9) Migration Notes
- Add documentation for converting pounds → pence storage (and vice versa) if adopting integer storage
- Provide a data backfill strategy doc covering one-time transforms and validation

## Summary Table

| Area | V1 | v3 | Suggested Doc Additions (V1) |
|------|----|----|-------------------------------|
| Build | CRA | Vite | N/A |
| Styling | Custom CSS + shared components | Tailwind | Design tokens + component API docs |
| Auth | Google Sign-In | Full auth flows | Protected-route pattern docs |
| Modules | Pensions, Mortgage, Savings, Trading212 | Debts, Savings, Pensions | Document shared uploader/mapping contracts |
| Data | Mixed naming, pounds | snake_case, pence, subcollections | Data model conventions + migration guide |
| Hooks | Firestore hooks | useDebts | Hooks cookbook + testing guide |
| Calculations | Mortgage, pensions | Debt/EAR utilities | Catalog + proposed gaps |

---

This document proposes documentation-only improvements to align V1 with scalable patterns while preserving its current tech stack and architecture.


