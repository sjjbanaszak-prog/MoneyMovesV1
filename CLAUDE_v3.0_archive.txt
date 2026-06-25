# CLAUDE.md

**Version**: 3.0
**Last Updated**: June 2026
**Status**: Active Development

This file provides guidance to AI coding assistants when working with code in this repository.

## Project Overview

**Money Moves** is a UK-based personal finance and financial literacy platform helping users make smarter decisions across: Pensions, Mortgages, Savings, Investments, Debt Management, and Financial Education.

## Tech Stack

- **Frontend**: React 19 with Create React App
- **Styling**: Custom CSS modules with responsive design
- **Backend**: Firebase 11 (Firestore + Authentication)
- **Routing**: React Router v7
- **Charts**: Recharts 3
- **Data Processing**: XLSX, PapaParse
- **Date Handling**: Day.js
- **Utilities**: Lodash, Axios
- **Locale**: UK-specific (£ currency, dd/mm/yyyy dates, HMRC 2025/26 tax rules, UK tax year April 6–April 5)

## Development Philosophy

1. **Visual and structural consistency** across all modules
2. **Plain, human-readable naming** — avoid jargon, optimize for user understanding
3. **Modular React architecture** — self-contained, reusable components
4. **MVP-first** — incremental implementation with clear prioritization
5. **Financial accuracy** — all calculations aligned with HMRC 2025/26 rules

When building a new module, follow this order: define purpose → user journeys → data inputs/outputs → Firestore schema → UI components → visualizations → financial logic → implementation steps.

## Firestore Data Architecture

### Collections

| Collection | Doc ID | Key Fields |
|---|---|---|
| `pensionScenarios` | userId | salary, age, retirementAge, currentPot, pensionType, contributions, returnRates |
| `pensionPots` | userId | entries (array), historical_positions (subcollection) |
| `mortgageScenarios` | userId | loanAmount, termYears, initialRate, overpayments, frequency |
| `savingsAccounts` | userId | uploads, selectedAccounts, historical_positions (subcollection) |
| `trading212Portfolios` | userId | transactions, portfolioData, convertTickers |

### Naming Conventions
- camelCase for collection and field names
- `userId` as document ID for all user-scoped data
- `createdAt` / `updatedAt` timestamps on all documents

### Data Storage Rules
- Store monetary values in pounds (float); display with `toLocaleString`
- Use ISO date strings for date fields
- Validate all user inputs before Firestore writes
- Debounced saving (500ms) to prevent excessive writes
- Credentials in `.env` (not committed); template in `.env.example`

## Component Architecture

### Component Types
- **Input**: Data collection and validation — `IncomeTaxInputs.js`, `MortgageInputForm.js`
- **Display**: Structured data views — `AccountsTable.js`, `PensionAccountsTable.js`
- **Visualization**: Recharts-based charts — `MortgageChart.js`, `SavingsChart.js`, `NetWorthChart.js`
- **Analytics**: Financial analysis — `PensionAllowanceUtilization.js`
- **Control**: User interactions — `TimeframeTabs.js`, `ISALISAUtilization.js`
- **Summary**: Dashboard overviews — `PensionPerformanceCards.js`, `MortgageSummary.js`
- **Upload/Parser**: File processing — `Trading212Uploader.js`, `PensionUploader.js`
- **Advisory**: AI guidance — `AIFinancialAdvisory.js`, `AISavingsAdvisory.js`

### Custom Hooks
- `useFirebaseDoc(collectionName, options)` — manages a single Firestore document with auto-save and debounce. Returns: `data`, `setData`, `updateData`, `loading`, `error`, `isSaving`, `save`, `reload`
- `useFirebaseCollection(collectionName, options)` — manages a collection with optional realtime updates. Returns: `documents`, `loading`, `error`, `refetch`, `add`, `update`, `remove`

### Reusable UI Library
- Location: `src/components/common/` — `Modal`, `Button`, `Input`, `Card`, barrel `index.js`

### Visual Design System
- **Green**: Progress, positive outcomes, low risk
- **Amber**: Warnings, moderate risk
- **Red**: High cost/risk, urgent attention

UI patterns: numeric summary cards, toggle switches, sortable tables, stacked area charts, progress bars, dynamic recalculation on input changes.

## Financial Calculations

### UK-Specific Requirements
- All tax calculations aligned with HMRC 2025/26 tax year
- Use EAR (effective annual rates) rather than nominal APR
- UK credit cards: daily compounding
- Pension annual allowance, tax relief rules
- ISA (£20k) and LISA (£4k) allowance limits
- Stamp duty, CGT, and IHT thresholds

### Calculation Accuracy
- Validate all formulas against manual calculations
- Test edge cases (zero balance, min payment < interest accrual, tax year boundaries)
- Document assumptions clearly in code comments

### Pension Allowance Calculations
Implemented in `/src/modules/utils/pensionAllowanceUtils.js`:

- **Annual allowance**: £40,000 (pre-2023), £60,000 (2023/24 onwards)
- **Carry forward**: Up to 3 previous tax years of unused allowance, FIFO ordering
- **Tax year cutoff**: April 6 — e.g. payment on April 5, 2024 → 2023/24; April 6, 2024 → 2024/25
- **Lost allowance**: Unused allowance older than 3 years is marked as lost (shown in red)

## User Experience Patterns

Microcopy should be encouraging, specific, and time-oriented:
- "You're on track to be debt-free by July 2029."
- "Switching to Avalanche could save you £1,250 in interest."
- "You've paid off 43% of your total debt."

Use progressive disclosure: simple views first, drill-down for details, tooltips for complex concepts.

## Testing

- **Framework**: Jest + React Testing Library (included with CRA)
- **Test files**: Co-located with source (`Component.test.js`, `utilityName.test.js`)
- **Priority**: Financial calculation functions must have 95%+ unit test coverage
- **Run**: `npm test` (watch mode), `npm test -- --coverage` (coverage report)
- Mock Firebase and external APIs in tests; never hit real Firestore in unit tests

## Authentication & Security

### Auth System
- Firebase Authentication: Email/Password + Google OAuth
- `src/contexts/AuthContext.js` — central auth state
- `ProtectedRoute.js` — wraps all authenticated pages
- Auth UI in `src/components/auth/`

### Security Principles
- All data scoped to authenticated users; document IDs use `userId`
- Credentials in `.env` (gitignored); never hardcoded
- Firebase security rules enforce server-side authorization
- Validate all user inputs before writes

### Security Checklist
- ✅ Firebase Authentication implemented
- ✅ Protected routes enforce authentication
- ✅ User data isolated by `userId`
- ✅ Environment variables for credentials
- ⚠️ Firestore security rules (deploy before production)
- ⚠️ Rate limiting (implement before production)

## Local Development

```bash
npm install --legacy-peer-deps
npm start         # http://localhost:3000
npm test
npm run build
```

**Troubleshooting**: Module resolution errors → `rm -rf node_modules/.cache && npm start`

**Environment variables** (copy `.env.example` to `.env`):
```
REACT_APP_FIREBASE_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN
REACT_APP_FIREBASE_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET
REACT_APP_FIREBASE_MESSAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID
REACT_APP_FIREBASE_MEASUREMENT_ID
```

## File Organization

```
src/
  App.js, index.js, firebase.js
  components/
    auth/          # Login, Register, ForgotPassword, ProtectedRoute
    common/        # Button, Card, Input, Modal (reusable UI library)
    Navbar.js
  contexts/        # AuthContext.js
  hooks/           # useFirebaseDoc.js, useFirebaseCollection.js
  modules/         # Feature components (charts, tables, uploaders, advisories)
    mortgage/      # MortgageChart, MortgageInputForm, MortgageSchedule, MortgageSummary
    utils/         # Financial utility functions
    archive/       # Legacy files (do not modify)
  pages/           # Route-level pages: LandingPage, PensionBuilderNEW, PensionPots,
                   # SavingsTracker, MortgageCalcNEW, Trading212Dashboard, AccountSettings
  styles/          # SharedStyles.css, variables.css
  utils/           # Global: formatters.js, dateUtils.js
```

## Implemented Modules

### Pension Builder (`PensionBuilderNEW.js`) ✅
Salary sacrifice vs personal contribution calculations, UK tax relief optimization (20/40/45%), employer matching, multiple return rate scenarios, retirement projections, annual allowance tracking, peer comparison.
- **Data**: `pensionScenarios` collection

### Pension Pots (`PensionPots.js`) ✅
Multiple pension account management with CSV/Excel upload, intelligent column mapping, IRR per provider, historical balance tracking, allowance utilization chart (carry forward, FIFO, lost allowance), drag-and-drop dashboard ordering, AI advisory.
- **Data**: `pensionPots`, `dashboardPreferences`, `userPreferences` collections
- **UK rules**: £40k allowance pre-2023, £60k from 2023/24; April 6 tax year cutoff

### Mortgage Calculator (`MortgageCalcNEW.js`) ✅
Fixed-rate with rate changes, regular and one-off overpayments, amortization schedule, interest savings, multiple payment frequencies, visual timeline charts.
- **Data**: `mortgageScenarios` collection

### Savings Tracker (`SavingsTracker.js`) ✅
CSV/Excel upload for bank statements, automatic account type detection, ISA/LISA allowance tracking, Premium Bonds analysis, monthly balance change charts, AI advisory, data quality scoring.
- **Data**: `savingsAccounts` collection
- **UK rules**: ISA £20k limit, LISA £4k limit

### Trading 212 Dashboard (`Trading212Dashboard.js`) ✅
CSV export parsing, portfolio value tracking, treemap asset allocation, monthly performance, ticker conversion for UK market.
- **Data**: `trading212Portfolios` collection

### Landing Page (`LandingPage.js`) ✅
Net worth aggregation across all modules, module navigation, summary cards, NetWorthChart.

### Account Settings (`AccountSettings.js`) ✅
User profile, preferences, data export/import, account security.

## Cross-Module Integration

- **Landing Page ↔ All Modules**: Net worth aggregation
- **Pension Builder ↔ Pension Pots**: Current pot values feed into projections
- **Savings Tracker ↔ Mortgage Calculator**: Savings usable for overpayments
- **Trading 212 ↔ Landing Page**: Investment values in net worth

**Planned**: DebtManager ↔ SavingsTracker, DebtManager ↔ PensionBuilder, All modules ↔ FinancialEducation

## Implementation Workflow

1. **Plan** — module purpose, user journeys, Firestore schema, UK compliance check
2. **Data layer** — Firestore schema, security rules, Cloud Functions if needed
3. **Components** — inputs first, then calculation logic, then visualizations
4. **Integration** — connect to Firestore, auth checks, real-time recalculation
5. **Polish** — animations, microcopy, export functionality, performance
6. **Deploy** — authenticated users only for MVP, monitor and iterate

## Migration & Troubleshooting

- **Legacy mortgage files**: Archived in `/src/modules/archive/` — do not modify
- **Legacy login**: `/src/modules/login/LoginScreen.js` replaced by `/src/components/auth/`
- **Webpack cache**: After large file moves — `rm -rf node_modules/.cache && npm start`
