# Money Moves V1 - Project Status

## ✅ Completed Implementation

The Money Moves V1 application includes multiple production-ready modules and shared infrastructure.

### 1. Core Infrastructure
- ✅ React 19 with Create React App build system
- ✅ Custom CSS with shared styles (`/src/styles/SharedStyles.css`)
- ✅ React Router v7 for navigation
- ✅ Firebase 11 integration (Auth + Firestore)
- ✅ Recharts 3 for data visualization
- ✅ Centralized utilities (`/src/utils/*`)
- ✅ Custom React hooks for Firestore (`useFirebaseDoc`, `useFirebaseCollection`)

### 2. Authentication
- ✅ Firebase Authentication configured
- ✅ Google Sign-In via `AuthProvider`
- ✅ Auth context provider and hooks (`useAuth`)

### 3. Pages and Layout
- ✅ Route-level pages in `/src/pages/` (Landing, Pension Pots, Pension Builder, Mortgage, Savings, Trading212, Account Settings)
- ✅ Global shared styles available to all pages
- ✅ Navbar with navigation

### 4. Utilities & Hooks
- ✅ `/src/utils/formatters.js` (currency/number formatting)
- ✅ `/src/utils/dateUtils.js` (UK tax year/date helpers)
- ✅ `useFirebaseDoc` for document CRUD + debounced auto-save
- ✅ `useFirebaseCollection` for collection CRUD + optional realtime

### 5. Shared UI Components
- ✅ Reusable components in `/src/components/common/`: Modal, Button, Input, Card (+ barrel export)
- ✅ Consistent styling via shared CSS classes (btn-*, modal-*, input-*, card-*)

## 📁 Project Structure

```
src/
  App.js
  components/
    alphavantage.env
    AuthButtons.js
    common/
      Button.js
      Card.js
      index.js
      Input.js
      Modal.js
    Navbar.css
    Navbar.js
    test.js
  context/
    AuthProvider.js
  firebase.js
  functions/
    index.js
  hooks/
    useFirebaseCollection.js
    useFirebaseDoc.js
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
      mortgageUtils.js
      parseNumber.js
      pensionColumnDetection.js
      pensionContributionParser.js
      premiumBondsParser.js
    AccountsTable.js
    AccountsTableStyles.css
    AIFinancialAdvisory.js
    AIFinancialAdvisoryStyles.css
    AISavingsAdvisory.js
    ColumnMapper.js
    ColumnMapperStyles.css
    FileUploader.js
    FileUploaderStyles.css
    IncomeTaxBreakdownTable.js
    IncomeTaxBreakdownTableStyles.css
    IncomeTaxInputs.js
    IncomeTaxInputsStyles.css
    ISALISAUtilization.css
    ISALISAUtilization.js
    MonthlyBalanceChangeChart.js
    MonthlyPerformanceChart.js
    NetWorthChart.js
    NetWorthChartStyles.css
    PensionAccountsTable.js
    PensionAccountsTableStyles.css
    PensionAllowanceChart.css
    PensionAllowanceChart.js
    PensionColumnMapper.js
    PensionGrowthChart.js
    PensionGrowthChartStyles.css
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
    StackedBarChart.css
    TakeHomeComparisonChart.js
    tickerMapping.js
    TimeframeTabs.css
    TimeframeTabs.js
    Trading212Parser.js
    Trading212Uploader.js
    TreemapChart.js
    utils.js
  pages/
    AccountSettings.js
    AccountSettingsStyles.css
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
  utils/
    dateUtils.js
    formatters.js
public/
  index.html
  moneymoves-logo-inverted.png
  moneymoves-logo-only.png
  moneymoves-logo2.png
```

## 🎨 Design System

### Shared Styles
- Shared CSS in `/src/styles/SharedStyles.css` for modal, button, input, table, card, and utility classes
- Consistent color semantics (success/warning/danger) used across modules

### Components
- Reusable `Modal`, `Button`, `Input`, `Card` in `/src/components/common/`
- Barrel export via `/src/components/common/index.js`

## 🔥 Firebase Collections (Implemented in V1)

### pensionScenarios
```javascript
{
  salary: number,
  bonus: number,
  age: number,
  retirementAge: number,
  currentPot: number, // pounds
  pensionType: string,
  currentContrib: number,
  futureContrib: number,
  employerMatch: number,
  returnRates: { Low: number, Medium: number, High: number },
  taxPeriod: 'Monthly' | 'Annual' | 'Weekly' | 'Daily',
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### pensionPots
```javascript
{
  entries: Array<{
    provider: string,
    accountName: string,
    currentValue: number, // pounds
    source: 'upload' | 'manual'
  }>,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### mortgageScenarios
```javascript
{
  loanAmount: number,
  termYears: number,
  initialRate: number,
  initialtermYears: number,
  expiryRate: number,
  regularOverpayment: number,
  oneOffOverpayment: number,
  oneOffMonth: number,
  oneOffOverpaymentEnabled: boolean,
  frequency: 'monthly' | 'weekly' | 'yearly',
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### savingsAccounts
```javascript
{
  uploads: Array<any>,
  selectedAccounts: Array<string>,
  userPreferences: object,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### trading212Portfolios
```javascript
{
  transactions: Array<any>,
  portfolioData: object | null,
  convertTickers: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## ✅ Completed Modules

### Pension Pots (COMPLETE)
- File upload (CSV/Excel), column detection, mapping
- Multi-account tracking with historical analysis and visuals

### Pension Builder (COMPLETE)
- Salary sacrifice vs personal contribution, employer match, tax optimization
- Growth projections with multiple return scenarios; UK tax logic

### Mortgage Calculator (COMPLETE)
- Fixed-term + revert-rate modelling, overpayments, amortization schedule
- Savings vs overpayment comparisons

### Savings Tracker (COMPLETE)
- File upload and parsing, account detection, ISA/LISA tracking, premium bonds analysis

### Trading 212 Dashboard (COMPLETE)
- CSV ingestion, portfolio building, value chart, treemap, monthly performance

### Account Settings (COMPLETE)
- User preferences and settings (foundation implemented)

### Landing Page (COMPLETE)
- Net worth overview, module summaries, and navigation

## 🚀 Next Steps

### Potential Enhancements
1. Expand hook usage across all modules (`useFirebaseDoc`, `useFirebaseCollection`)
2. Introduce Storybook for components in `/components/common`
3. Unify upload/mapping pipeline across modules
4. Add test coverage for utils and hooks
5. Strengthen Firestore security rules and validation

## 📝 Development Commands

```bash
# Start development server (CRA)
npm start

# Build for production
npm run build

# Run tests
npm test
```

## ⚙️ Configuration Required

1. Environment Variables (.env)
   - `REACT_APP_FIREBASE_*` keys required (see `.env.example`)
2. `.gitignore` configured to exclude `.env`, build artifacts, IDE files
3. Firestore rules configured per environment

## 📚 Documentation

- `CLAUDE.md` - Development guidelines, architecture, and modules
- `PHASE_1_SUMMARY.md`, `PHASE_2_SUMMARY.md`, `PHASE_3_SUMMARY.md` - Refactor phases
- `V1_PROJECT_STATUS.md` (this file) - Current project status

## 🎯 Current State

- Multiple feature modules complete and integrated with shared styles and hooks
- Centralized utilities and reusable UI components
- Firebase-backed persistence with debounced auto-save patterns

---

**Last Updated**: October 19, 2025
**Status**: Active Development ✅
**Live Modules**: Pension Pots, Pension Builder, Mortgage Calculator, Savings Tracker, Trading 212, Account Settings


