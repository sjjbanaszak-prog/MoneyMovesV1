# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development & Documentation Responsibilities

**Claude Code (claude.ai/code)**: Responsible for all code development, implementation, and technical work
- Feature development and implementation
- Bug fixes and code optimization
- Component creation and modification
- Data processing and calculations
- Integration and testing

**Cursor**: Responsible for all documentation updates and maintenance
- Updating .md files (README, CLAUDE.md, PROJECT_STATUS, etc.)
- Maintaining project documentation
- Updating feature documentation
- Keeping documentation in sync with code changes
- Ensuring documentation accuracy and completeness

**Important**: When Claude Code makes any code changes, it should notify Cursor to update relevant documentation files to maintain consistency between code and documentation.

## Project Overview

**Money Moves** is a UK-based personal finance and financial literacy platform designed to help users make smarter financial decisions across key money areas: Pensions, Mortgages, Savings, Investments, Debt Management, and Financial Education.

## Mission

Help UK users make informed financial decisions through:
- Pension planning and optimization
- Mortgage calculations and comparisons
- Savings tracking and goal setting
- Investment analysis
- Debt management and repayment strategies
- Financial education and literacy tools

## Tech Stack

- **Frontend**: React 19 with Create React App build system
- **Styling**: Custom CSS modules with responsive design patterns
- **Backend**: Firebase 11 (Firestore for data storage, Authentication for user management)
- **Routing**: React Router v7
- **Charts/Visualization**: Recharts 3 for interactive data visualization
- **Data Processing**: XLSX for Excel file parsing, PapaParse for CSV processing
- **Date Handling**: Day.js for date manipulation and formatting
- **Utilities**: Lodash for data processing, Axios for API calls
- **Locale**: UK-specific (£ currency, dd/mm/yyyy dates, HMRC 2025/26 tax rules, UK tax year April 6-April 5)

### Refactoring Phases Applied (1–3)
- **Phase 1: Foundation**
  - Centralized utilities: `/src/utils/formatters.js`, `/src/utils/dateUtils.js`
  - Shared styles: `/src/styles/SharedStyles.css`
  - Archived legacy mortgage files in `/src/modules/archive/`
- **Phase 2: Security + Hooks**
  - Environment variables: `.env`, `.env.example`, `.gitignore`
  - `src/firebase.js` now reads from `REACT_APP_FIREBASE_*` variables
  - Custom hooks created: `useFirebaseDoc`, `useFirebaseCollection`
- **Phase 3: Components + Pages**
  - Reusable UI library in `src/components/common/`
  - Route-level pages moved to `src/pages/`
  - Import paths updated; webpack cache guidance added

## Development Philosophy

### Core Principles
1. **Visual and structural consistency** across all modules (PensionBuilder, MortgageCalc, SavingsTracker, DebtManager, etc.)
2. **Plain, human-readable naming conventions** — avoid jargon, optimize for user understanding
3. **Modular React architecture** — self-contained, reusable components
4. **Progressive build-up** — conceptual design → UX → data structure → engineering detail
5. **MVP-first approach** — incremental implementation with clear prioritization
6. **Financial accuracy** — all calculations aligned with current HMRC rules (2025/26 tax year)

### Module Design Process

When building any new feature or module, follow this structured approach:

1. **Define module purpose** — identify the user problem and value proposition
2. **Describe user journeys** — map key interactions and workflows
3. **List data inputs/outputs** — both user-provided and system-calculated fields
4. **Design Firestore schema** — collections, subcollections, field types
5. **Outline UI components** — component breakdown with clear responsibilities
6. **Specify visualizations** — charts, progress indicators, summary cards
7. **Document financial logic** — UK-specific calculations, tax rules, regulatory compliance
8. **Provide implementation steps** — concrete, incremental tasks prioritizing MVP

### The AI Product Team

Simulate collaboration among three expert personas when planning features:

**Finley (Financial Advisor)**
- Ensures financial accuracy and tax compliance
- Validates calculations against HMRC rules
- Identifies regulatory considerations
- Recommends UK-specific financial best practices

**Riley (Product Designer)**
- Defines UX/UI structure and visual clarity
- Ensures consistency with design system
- Optimizes user flows for understanding
- Specifies microcopy and user-facing messaging

**Devon (Engineer)**
- Specifies component architecture and data flow
- Plans Firestore schema and integration logic
- Identifies technical dependencies
- Recommends implementation patterns

Each persona contributes insights within planning documents to enrich context.

## Module Structure Template

All modules should follow this JSON blueprint format:

```json
{
  "module_name": "",
  "purpose": "",
  "user_journeys": [],
  "data_inputs": [],
  "data_outputs": [],
  "firestore_schema": {},
  "core_components": [],
  "visual_elements": [],
  "financial_logic": "",
  "example_microcopy": [],
  "example_next_steps": [],
  "notes_from_team": {
    "Finley": "",
    "Riley": "",
    "Devon": ""
  }
}
```

## Firestore Data Architecture

### Current Collections

**pensionScenarios** - User pension planning scenarios
- Document ID: `userId`
- Fields: salary, bonus, age, retirementAge, currentPot, pensionType, currentContrib, futureContrib, employerMatch, returnRates, taxPeriod, createdAt, updatedAt

**pensionPots** - User pension account data
- Document ID: `userId`
- Fields: entries (array of pension accounts), createdAt, updatedAt
- Subcollections: `historical_positions` for monthly balance data

**mortgageScenarios** - User mortgage calculations
- Document ID: `userId`
- Fields: loanAmount, termYears, initialRate, initialtermYears, expiryRate, regularOverpayment, oneOffOverpayment, frequency, createdAt, updatedAt

**savingsAccounts** - User savings account data
- Document ID: `userId`
- Fields: uploads (array of uploaded files), selectedAccounts, userPreferences, createdAt, updatedAt
- Subcollections: `historical_positions` for monthly balance data

**trading212Portfolios** - User investment portfolio data
- Document ID: `userId`
- Fields: transactions, portfolioData, convertTickers, createdAt, updatedAt

### Naming Conventions
- Use snake_case for collection names
- Use camelCase for field names within documents
- Include `userId` reference for user-scoped data
- Include `createdAt` and `updatedAt` timestamps on all documents

### Schema Consistency
All modules follow consistent structural patterns:
- Main collections for primary entities (e.g., `pensionScenarios`, `mortgageScenarios`, `savingsAccounts`)
- Subcollections for related time-series data (e.g., `historical_positions`)
- User-scoped data isolation using `userId` as document ID
- Consistent timestamp fields for audit trails

### Data Storage Best Practices
- Store monetary values in pounds (floating point) with proper precision handling
- Display values as £ with proper formatting using `toLocaleString`
- Use ISO date strings for date fields
- Validate all user inputs before Firestore writes
- Implement debounced saving to prevent excessive writes

### Environment Variables & Security (Phase 2)
- Credentials stored in `.env` (not committed); template in `.env.example`
- `.gitignore` excludes `.env`, build artifacts, and IDE files
- `src/firebase.js` reads config via `process.env.REACT_APP_FIREBASE_*`
- Different configs supported per environment (dev/staging/prod)

## Component Architecture

### Component Organization
Components are organized by module and follow single-responsibility principle:

**Input Components**: Handle data collection and validation
- Example: `IncomeTaxInputs.js`, `FileUploader.js`, `ColumnMapper.js`, `MortgageInputForm.js`

**Display Components**: Show data in structured views
- Example: `AccountsTable.js`, `PensionAccountsTable.js`, `IncomeTaxBreakdownTable.js`

**Visualization Components**: Render charts and graphs using Recharts
- Example: `PensionReturnsChart.js`, `MortgageChart.js`, `SavingsChart.js`, `NetWorthChart.js`, `TreemapChart.js`, `MonthlyPerformanceChart.js`

**Control Components**: Enable user interactions and strategy selection
- Example: `TimeframeTabs.js`, `PensionColumnMapper.js`, `ISALISAUtilization.js`

**Summary Components**: Provide dashboard-style overviews
- Example: `PensionPerformanceCards.js`, `MortgageSummary.js`, `PremiumBondsAnalysis.js`

**Upload/Parser Components**: Handle file processing and data parsing
- Example: `Trading212Uploader.js`, `Trading212Parser.js`, `PensionUploader.js`

**Advisory Components**: Provide AI-powered financial guidance
- Example: `AIFinancialAdvisory.js`, `AISavingsAdvisory.js`

### Reusable UI Library (Phase 3)
- Location: `src/components/common/`
- Components: `Modal`, `Button`, `Input`, `Card`, and barrel `index.js`
- Benefits: Consistent UI, reduced duplication, cleaner imports

### Custom React Hooks (Phase 2)
- `useFirebaseDoc(collectionName, options)`
  - Manages a single Firestore document; auto-load/save with debounce
  - Returns `data`, `setData`, `updateData`, `loading`, `error`, `isSaving`, `save`, `reload`
- `useFirebaseCollection(collectionName, options)`
  - Manages a collection with optional realtime updates and CRUD helpers
  - Returns `documents`, `loading`, `error`, `refetch`, `add`, `update`, `remove`

### Visual Design System

**Color Semantics** (maintain consistency across all modules):
- **Green**: Progress, positive outcomes, low interest/risk
- **Amber**: Medium priority, warnings, moderate interest/risk
- **Red**: High interest/cost, urgent attention needed, negative outcomes

**UI Patterns**:
- Numeric summary cards for key metrics
- Toggle switches for strategy/scenario selection
- Sortable tables with column headers
- Stacked area charts for timeline projections
- Bar/line charts for comparisons
- Progress bars and percentage indicators
- Dynamic recalculation on user input changes
- Celebratory animations for milestone achievements

## Financial Calculations

### UK-Specific Requirements
- All tax calculations must align with HMRC 2025/26 tax year rules
- Use effective annual rates (EAR) rather than nominal APR where applicable
- UK credit cards typically use daily compounding — model accurately
- Pension annual allowance, lifetime allowance, and tax relief rules
- ISA allowances and tax-free savings limits
- Stamp duty, capital gains tax, and inheritance tax thresholds

### Calculation Accuracy
- Validate all financial formulas against manual calculations
- Test edge cases (zero balance, minimum payment < interest accrual, etc.)
- Document assumptions clearly (e.g., "assumes monthly compounding")
- Provide transparency in how numbers are derived

## User Experience Patterns

### Microcopy Guidelines
User-facing messages should be:
- **Encouraging and actionable** (not judgmental or overwhelming)
- **Specific with numbers** ("save £1,250" not "save money")
- **Time-oriented** ("debt-free by July 2029")
- **Progress-focused** ("43% paid off")

Examples:
- "You're on track to be debt-free by July 2029."
- "Switching to the Avalanche method could save you £1,250 in interest."
- "You've paid off 43% of your total debt."

### Progressive Disclosure
- Start with simple views, allow drill-down for details
- Provide tooltips and help text for complex concepts
- Offer comparison views (current vs optimized scenarios)
- Enable export functionality for offline analysis

## Testing Strategy

### Financial Logic Testing
- Unit tests for all calculation functions
- Verify calculations match manual amortization schedules
- Test edge cases and boundary conditions
- Validate strategy comparisons (e.g., Avalanche minimizes interest vs Snowball)

### Integration Testing
- Test Firestore read/write operations
- Verify authentication and user data isolation
- Test cross-module data sharing
- Validate Cloud Function triggers

### User Flow Testing
- Test complete user journeys from data input to visualization
- Verify real-time recalculation on input changes
- Test CSV/file upload and parsing
- Validate export functionality

## Authentication & Security

- Firebase Authentication required for all module access
- User data isolated by `userId` in Firestore security rules
- Deploy MVP to authenticated users only
- Never expose sensitive financial data in client-side code
- Validate all inputs server-side via Cloud Functions

## Cross-Module Integration

Money Moves modules should integrate where logical:
- **DebtManager ↔ SavingsTracker**: Link debt payoff to savings goal milestones
- **DebtManager ↔ PensionBuilder**: Show trade-offs between debt repayment and pension contributions
- **DebtManager ↔ BudgetPlanner**: Pull monthly budget constraints from central budget module
- **SavingsTracker ↔ InvestmentAnalyzer**: Compare savings growth vs investment returns
- **All modules ↔ FinancialEducation**: Contextual learning resources

## Implementation Workflow

When building a new module:

1. **Planning Phase**
   - Generate module blueprint using the JSON template
   - Review with all three personas (Finley, Riley, Devon)
   - Validate financial logic and UK compliance

2. **Data Layer**
   - Design Firestore schema
   - Implement security rules
   - Create Cloud Functions if needed for calculations

3. **Component Development**
   - Build input components first
   - Implement calculation logic and test thoroughly
   - Create visualization components
   - Build summary/dashboard components

4. **Integration**
   - Connect components to Firestore
   - Implement authentication checks
   - Add real-time recalculation logic
   - Test complete user flows

5. **Polish**
   - Add animations and transitions
   - Implement microcopy and help text
   - Add export functionality
   - Optimize performance

6. **Deployment**
   - Deploy to authenticated users only for MVP
   - Monitor usage and errors
   - Iterate based on feedback

## File Organization

Current project structure:
```
/src
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
    AccountsTable.js
    AccountsTableStyles.css
    AIFinancialAdvisory.js
    AIFinancialAdvisoryStyles.css
    AISavingsAdvisory.js
    archive/
      MortgageCalc.js
      MortgageCalcStyles.css
    ColumnMapper.js
    ColumnMapperStyles.css
    fetchMarketStackDailySeries.js
    FileUploader.js
    FileUploaderStyles.css
    IncomeTaxBreakdownTable.js
    IncomeTaxBreakdownTableStyles.css
    IncomeTaxInputs.js
    IncomeTaxInputsStyles.css
    ISALISAUtilization.css
    ISALISAUtilization.js
    login/
      LoginScreen.css
      LoginScreen.js
    MonthlyBalanceChangeChart.js
    MonthlyPerformanceChart.js
    mortgage/
      MortgageChart.js
      MortgageChartStyles.css
      MortgageInputForm.js
      MortgageSchedule.js
      MortgageScheduleStyles.css
      MortgageSummary.js
      MortgageSummaryStyles.css
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
/public
  index.html
  moneymoves-logo-inverted.png
  moneymoves-logo-only.png
  moneymoves-logo2.png
```

Notes:
- Route-level pages live in `/src/pages` (Phase 3)
- Feature modules remain in `/src/modules`
- Reusable UI components live in `/src/components/common`
- Shared global styles in `/src/styles/SharedStyles.css`

## Implemented Modules

### Pension Builder (✅ Complete)
- **Purpose**: Comprehensive pension planning with salary sacrifice calculations, tax optimization, and retirement projections
- **Key Components**: PensionBuilderNEW, IncomeTaxInputs, PensionReturnsChart, IncomeTaxBreakdownTable, PensionAllowanceChart, PensionGrowthChart, PensionPeerComparison, PensionPerformanceCards, PensionPotPie, PensionReturnsChart
- **Features**: 
  - Salary sacrifice vs personal contribution calculations
  - UK tax relief optimization (20%, 40%, 45% tax brackets)
  - Employer matching scenarios
  - Multiple return rate scenarios (Low/Medium/High)
  - Annual allowance tracking and optimization
  - Retirement age projections with compound growth
  - Peer comparison analysis
  - Interactive charts for contribution vs growth visualization
- **UK-Specific**: HMRC tax relief rules, annual allowance limits, lifetime allowance considerations
- **Data Storage**: `pensionScenarios` collection with user-specific pension planning data

### Pension Pots (✅ Complete)
- **Purpose**: Track and manage multiple pension accounts with upload functionality
- **Key Components**: PensionPots, PensionUploader, PensionColumnMapper, PensionAccountsTable
- **Features**: 
  - CSV/Excel file upload for pension statements
  - Automatic column detection and mapping
  - Multiple pension account management
  - Account type classification (Workplace, Personal, SIPP, etc.)
  - Historical balance tracking
  - Account performance analysis
- **Data Storage**: `pensionPots` collection with account details and historical data

### Mortgage Calculator (✅ Complete)
- **Purpose**: Advanced mortgage calculations with overpayment scenarios and savings analysis
- **Key Components**: MortgageCalcNEW, MortgageInputForm, MortgageSummary, MortgageChart, MortgageSchedule
- **Features**:
  - Fixed-rate mortgage calculations with rate changes
  - Regular and one-off overpayment scenarios
  - Amortization schedule generation
  - Interest savings calculations
  - Multiple payment frequencies (monthly, weekly, yearly)
  - Visual timeline charts showing principal vs interest
  - Overpayment impact analysis
- **UK-Specific**: UK mortgage market rates, stamp duty considerations
- **Data Storage**: `mortgageScenarios` collection with calculation parameters and results

### Savings Tracker (✅ Complete)
- **Purpose**: Comprehensive savings account management with file upload and analysis
- **Key Components**: SavingsTracker, FileUploader, ColumnMapper, SavingsChart, AccountsTable, MonthlyBalanceChangeChart, ISALISAUtilization, PremiumBondsAnalysis, AISavingsAdvisory
- **Features**:
  - CSV/Excel file upload for bank statements
  - Automatic account type detection (Current, Savings, ISA, LISA, Premium Bonds)
  - ISA and LISA allowance tracking
  - Premium Bonds analysis and optimization
  - Monthly balance change visualization
  - AI-powered savings advisory
  - Data quality scoring and validation
  - Historical trend analysis
- **UK-Specific**: ISA (£20k limit), LISA (£4k limit), Premium Bonds analysis, tax year tracking
- **Data Storage**: `savingsAccounts` collection with account details and historical positions

### Trading 212 Dashboard (✅ Complete)
- **Purpose**: Investment portfolio analysis and performance tracking
- **Key Components**: Trading212Dashboard, Trading212Uploader, Trading212Parser, PortfolioBuilder, PortfolioValueChart, TreemapChart, MonthlyPerformanceChart
- **Features**:
  - Trading 212 CSV export parsing
  - Portfolio value tracking over time
  - Asset allocation visualization (treemap charts)
  - Monthly performance analysis
  - Ticker symbol conversion (UK market)
  - Transaction history analysis
  - Portfolio growth projections
- **Data Storage**: `trading212Portfolios` collection with portfolio data and transactions

### Account Settings (✅ Complete)
- **Purpose**: User account management and preferences
- **Key Components**: AccountSettings
- **Features**:
  - User profile management
  - Application preferences
  - Data export/import functionality
  - Account security settings

### Landing Page (✅ Complete)
- **Purpose**: Dashboard overview with net worth tracking and module navigation
- **Key Components**: LandingPage, NetWorthChart
- **Features**:
  - Net worth calculation across all modules
  - Quick access to all financial modules
  - Summary cards for key metrics
  - Visual net worth progression charts
- **Data Integration**: Aggregates data from pension, savings, and investment modules

## Migration & Troubleshooting Notes

### Legacy Mortgage Files (Phase 1)
- Archived legacy `MortgageCalc.js` and `MortgageCalcStyles.css` in `/src/modules/archive/`
- Redirect old route `/MortgageCalc` to `/MortgageCalcNEW` for continuity

### Webpack Cache Issues After Reorg (Phase 3)
- If module resolution errors occur after large file moves:
  1. Stop the dev server
  2. Clear cache: `rm -rf node_modules/.cache`
  3. Restart: `npm start`

## Key Features & Capabilities

### File Upload & Processing
- **CSV/Excel Support**: All modules support file upload for data import
- **Automatic Column Detection**: Smart detection of date, balance, and account type columns
- **Data Validation**: Quality scoring and validation for uploaded financial data
- **Multiple Format Support**: Handles various bank statement formats and date formats

### AI-Powered Advisory
- **Savings Advisory**: AI-powered recommendations for savings optimization
- **Financial Advisory**: General financial guidance and planning recommendations
- **Contextual Insights**: Module-specific advice based on user data

### Advanced Analytics
- **Premium Bonds Analysis**: Optimization recommendations for Premium Bonds holdings
- **ISA/LISA Utilization**: Tracking and optimization of tax-free savings allowances
- **Portfolio Analysis**: Comprehensive investment portfolio tracking and analysis
- **Peer Comparison**: Benchmarking against similar users (anonymized)

### UK Financial Compliance
- **Tax Calculations**: Accurate UK income tax and National Insurance calculations
- **Pension Rules**: Annual allowance, lifetime allowance, and tax relief compliance
- **ISA Limits**: Real-time tracking of ISA and LISA contribution limits
- **Mortgage Regulations**: UK-specific mortgage calculations and regulations

## Cross-Module Integration

Money Moves modules integrate seamlessly:
- **Landing Page ↔ All Modules**: Net worth aggregation and dashboard overview
- **Pension Builder ↔ Pension Pots**: Current pot values feed into retirement projections
- **Savings Tracker ↔ Mortgage Calculator**: Savings can be used for mortgage overpayments
- **Trading 212 ↔ Landing Page**: Investment values contribute to net worth calculation
- **All Modules ↔ Account Settings**: Centralized user preferences and data management

## Best Practices Summary

- Always prioritize user understanding over technical complexity
- Maintain visual and structural consistency across all modules
- Document financial calculations with clear assumptions
- Test edge cases thoroughly
- Use real-time updates for better UX with debounced saving
- Provide comprehensive file upload and data import capabilities
- Implement AI-powered advisory features for enhanced user guidance
- Align all tax/financial rules with current HMRC guidance
- Build incrementally — MVP first, then enhance
- **Update all .md documentation files when implementing new features** (README, PROJECT_STATUS, feature-specific docs)
- Store monetary values in pounds with proper precision handling
- Use subcollections for time-series data (historical_positions, payment_history, monthly_schedules)
- Implement real-time recalculation with useEffect for dynamic user interactions
- Use Firebase Authentication for secure user data management
- Implement comprehensive error handling and data validation
- Provide clear visual feedback for user actions and data processing
- Maintain UK-specific financial compliance across all modules
