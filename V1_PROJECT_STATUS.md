# Money Moves V1 - Project Status

**Last Updated:** March 2026
**Status:** Active Development ✅
**Live Modules:** Pension Pots, Pension Builder, Mortgage Calculator, Savings Tracker, Trading 212, Debt Manager, Income Tax Calculator, Account Settings

---

## ✅ Completed Implementation

### 1. Core Infrastructure
- ✅ React 19 with Create React App build system
- ✅ Custom CSS with shared styles (`/src/styles/SharedStyles.css`, `/src/styles/variables.css`)
- ✅ React Router v7 for navigation
- ✅ Firebase 11 integration (Auth + Firestore)
- ✅ Recharts 3 for data visualization
- ✅ Centralized utilities (`/src/utils/*`)
- ✅ Custom React hooks for Firestore (`useFirebaseDoc`, `useFirebaseCollection`)
- ✅ CSS design token system (40+ variables)

### 2. Authentication
- ✅ Firebase Authentication configured
- ✅ Google Sign-In via `AuthProvider`
- ✅ Auth context provider and hooks (`useAuth`)
- ✅ `ReportProblemContext` and `ReportProblemModal` for in-app user feedback

### 3. Pages and Layout
- ✅ Route-level pages in `/src/pages/`
- ✅ Global shared styles available to all pages
- ✅ Navbar with navigation (mobile-responsive)

### 4. Utilities & Hooks
- ✅ `/src/utils/formatters.js` (currency/number formatting)
- ✅ `/src/utils/dateUtils.js` (UK tax year/date helpers)
- ✅ `useFirebaseDoc` for document CRUD + debounced auto-save
- ✅ `useFirebaseCollection` for collection CRUD + optional realtime

### 5. Shared UI Components
- ✅ Reusable components in `/src/components/common/`: Modal, Button, Input, Card (+ barrel export)
- ✅ Consistent styling via shared CSS classes (`btn-*`, `modal-*`, `input-*`, `card-*`)

---

## ✅ Completed Modules

### Pension Pots (COMPLETE)
- File upload (CSV/Excel), intelligent column detection and mapping
- Multi-account tracking with historical analysis and visuals
- Pension Allowance Utilization chart with HMRC carry-forward rules (3-year FIFO)
- PensionAccountsTableV2 with sortable columns, search, and IRR per provider
- AI financial advisory integration

### Pension Builder (COMPLETE)
- Salary sacrifice vs personal contribution, employer match, tax optimization
- Growth projections with multiple return scenarios (Low/Medium/High)
- UK tax logic (HMRC 2025/26 rules)

### Mortgage Calculator (COMPLETE)
- Fixed-term + revert-rate modelling, overpayments, amortization schedule
- Savings vs overpayment comparisons

### Savings Tracker (COMPLETE)
- File upload and parsing, account detection
- ISA/LISA allowance tracking, Premium Bonds analysis
- AI savings advisory integration

### Trading 212 Dashboard (COMPLETE)
- CSV ingestion, portfolio building, value chart, treemap, monthly performance

### Debt Manager (COMPLETE)
- V2 debt list (`DebtListV2`) with enhanced visual design
- Unified debt uploader (`UnifiedDebtUploader`) for CSV/Excel import
- Debt mapping review modal (`DebtMappingReviewModal`, `DebtMappingReviewModalStyles`)
- Firestore integration for debt persistence

### Income Tax Calculator (COMPLETE)
- UK income tax and National Insurance calculations (HMRC 2025/26)
- Salary sacrifice, net pay, qualifying earnings, and relief at source pension schemes
- Bonus/commission excluded from pension contribution base (salary only)
- Take-home comparison chart
- Standardised layout: 24px card padding, 24px grid gaps, all inline styles extracted to CSS classes
- Route: `/income-tax-new` → `IncomeTaxNew.js` → `IncomeTaxCalculator.js`

### Account Settings (COMPLETE)
- User preferences and settings (foundation implemented)

### Landing Page (COMPLETE)
- Net worth overview, module summaries, and navigation

---

## 📁 Project Structure

```
src/
  App.js
  firebase.js
  index.js

  components/
    auth/
      AuthStyles.css
      ForgotPassword.js
      Login.js
      ProtectedRoute.js
      Register.js
    common/
      Button.js
      Card.js
      index.js
      Input.js
      Modal.js
    AuthButtons.js
    Navbar.css
    Navbar.js
    ReportProblemModal.js       ← new

  contexts/
    AuthContext.js
    ReportProblemContext.js     ← new

  context/
    AuthProvider.js             ← legacy

  hooks/
    useFirebaseCollection.js
    useFirebaseDoc.js

  functions/
    index.js

  modules/
    archive/
      MortgageCalc.js
      MortgageCalcStyles.css
    login/
      LoginScreen.css
      LoginScreen.js
    mortgage/
      MortgageChart.js
      MortgageChartStyles.css
      MortgageInputForm.js
      MortgageSchedule.js
      MortgageScheduleStyles.css
      MortgageSummary.js
      MortgageSummaryStyles.css
    utils/
      columnDetection.js
      dataParser.js
      dataValidation.js
      detectDateFormat.js
      incomeTaxUtils.js         ← new
      mortgageUtils.js
      parseNumber.js
      pensionAllowanceUtils.js  ← new
      pensionColumnDetection.js
      pensionContributionParser.js
      pensionDataProcessor.js
      premiumBondsParser.js

    AccountsTable.js
    AccountsTableStyles.css
    AIFinancialAdvisory.js
    AIFinancialAdvisoryStyles.css
    AISavingsAdvisory.js
    ColumnMapper.js
    ColumnMapperStyles.css
    DebtListV2.js               ← new
    DebtListV2Styles.css        ← new
    DebtMappingReviewModal.js   ← new
    DebtMappingReviewModalStyles.css ← new
    FileUploader.js
    FileUploaderStyles.css
    IncomeTaxBreakdownTable.js
    IncomeTaxBreakdownTableStyles.css
    IncomeTaxCalculator.css     ← new
    IncomeTaxCalculator.js      ← new
    IncomeTaxInputs.js
    IncomeTaxInputsStyles.css
    ISALISAUtilization.css
    ISALISAUtilization.js
    ISAUtilizationChart.css
    MonthlyBalanceChangeChart.js
    MonthlyPerformanceChart.js
    NetWorthChart.js
    NetWorthChartStyles.css
    PensionAccountsTable.js
    PensionAccountsTableStyles.css
    PensionAccountsTableV2.js
    PensionAccountsTableV2Styles.css
    PensionAllowanceChart.css
    PensionAllowanceChart.js
    PensionAllowanceUtilization.js    ← new
    PensionAllowanceUtilizationStyles.css ← new
    PensionColumnMapper.js
    PensionGrowthChart.js
    PensionGrowthChartStyles.css
    PensionMetricCards.js
    PensionMetricCardsStyles.css
    PensionPeerComparison.js
    PensionPeerComparisonStyles.css
    PensionPerformanceCards.js
    PensionPerformanceCardsStyles.css
    PensionPotPie.js
    PensionPotPieStyles.css
    PensionReturnsChart.js
    PensionReturnsChartStyles.css
    PensionUploader.js
    PensionUploaderStyles.css
    PortfolioBuilder.js
    PortfolioValueChart.js
    PremiumBondsAnalysis.js
    PremiumBondsAnalysisStyles.css
    SavingsChart.css
    SavingsChart.js
    SavingsPie.js
    SavingsPieStyles.css
    StackedBarChart.css
    TakeHomeComparisonChart.js
    tickerMapping.js
    TimeframeTabs.css
    TimeframeTabs.js
    Trading212Parser.js
    Trading212Uploader.js
    TreemapChart.js
    UnifiedDebtUploader.js      ← new
    utils.js

  pages/
    AccountSettings.js
    AccountSettingsStyles.css
    DebtManager.js
    IncomeTaxNew.js             ← new
    LandingPage.css
    LandingPage.js
    MortgageCalcNEW.js
    MortgageCalcNEWStyles.css
    PensionBuilderNEW.js
    PensionBuilderStyles.css
    PensionPots.js
    PensionPotsStyles.css
    SavingsTracker.js
    SavingsTrackerStyles.css
    Trading212Dashboard.css
    Trading212Dashboard.js

  styles/
    SharedStyles.css
    variables.css

  utils/
    dateUtils.js
    formatters.js

public/
  index.html
  moneymoves-logo-inverted.png
  moneymoves-logo-only.png
  moneymoves-logo2.png
```

---

## 🎨 Design System

- CSS variables in `/src/styles/variables.css` (40+ tokens: colors, spacing, radius, shadows)
- Shared utilities in `/src/styles/SharedStyles.css` (modal, button, input, table, card, chart)
- Consistent color semantics: green = positive/low risk, amber = caution, red = urgent/high cost

---

## 🔥 Firebase Collections

### pensionScenarios
```javascript
{
  salary, bonus, age, retirementAge, currentPot,
  pensionType, currentContrib, futureContrib, employerMatch,
  returnRates: { Low, Medium, High },
  taxPeriod: 'Monthly' | 'Annual' | 'Weekly' | 'Daily',
  createdAt, updatedAt
}
```

### pensionPots
```javascript
{
  entries: [{ provider, accountName, currentValue, source }],
  createdAt, updatedAt
  // subcollection: historical_positions
}
```

### mortgageScenarios
```javascript
{
  loanAmount, termYears, initialRate, initialtermYears, expiryRate,
  regularOverpayment, oneOffOverpayment, oneOffMonth,
  oneOffOverpaymentEnabled, frequency,
  createdAt, updatedAt
}
```

### savingsAccounts
```javascript
{
  uploads, selectedAccounts, userPreferences,
  createdAt, updatedAt
  // subcollection: historical_positions
}
```

### trading212Portfolios
```javascript
{
  transactions, portfolioData, convertTickers,
  createdAt, updatedAt
}
```

### debtAccounts (V2)
```javascript
{
  debts: [{ name, balance, rate, minimumPayment, type }],
  strategy: 'avalanche' | 'snowball',
  createdAt, updatedAt
}
```

---

## 🚀 Potential Next Steps

1. Add Income Tax Calculator results to Landing Page net-worth overview
2. Debt Manager — link payoff milestones to Savings Tracker goals
3. Expand hook usage (`useFirebaseDoc`, `useFirebaseCollection`) where safe to do so
4. Add test coverage for financial utils (income tax, pension allowance, mortgage)
5. Strengthen Firestore security rules before production
6. Module organisation refactor (Phase 6 of refactoring plan)

---

## 📝 Development Commands

```bash
npm start        # Start dev server (CRA, port 3000)
npm run build    # Production build
npm test         # Run tests
```

## ⚙️ Configuration Required

1. Environment Variables (`.env`) — `REACT_APP_FIREBASE_*` keys (see `.env.example`)
2. `.gitignore` configured to exclude `.env`, build artifacts, IDE files
3. Firestore rules configured per environment

---

## 📚 Documentation

- `CLAUDE.md` — Development guidelines, architecture, and module specs
- `REFACTORING_PROJECT.md` — Refactoring phases, completed work, and optional future work
- `V1_PROJECT_STATUS.md` — This file: current project status and structure
