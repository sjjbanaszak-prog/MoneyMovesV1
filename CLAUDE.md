# CLAUDE.md

**Version**: 2.0
**Last Updated**: October 2025
**Status**: Active Development

This file provides guidance to AI coding assistants when working with code in this repository.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Development Philosophy](#development-philosophy)
4. [Module Design Process](#module-design-process)
5. [Firestore Data Architecture](#firestore-data-architecture)
6. [Component Architecture](#component-architecture)
7. [Financial Calculations](#financial-calculations)
8. [Testing Strategy](#testing-strategy)
9. [Authentication & Security](#authentication--security)
10. [Deployment & Environment Setup](#deployment--environment-setup)
11. [Cross-Module Integration](#cross-module-integration)
12. [Implementation Workflow](#implementation-workflow)
13. [File Organization](#file-organization)
14. [Implemented Modules](#implemented-modules)
15. [Migration & Troubleshooting](#migration--troubleshooting-notes)
16. [Best Practices Summary](#best-practices-summary)
17. [Version History](#version-history)

## Documentation Philosophy

- Documentation should be updated alongside code changes to maintain accuracy
- All AI assistants (Claude Code, Cursor, etc.) are capable of updating documentation when making relevant changes
- Keep documentation in sync with implementation to prevent drift

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
- Use camelCase for collection names (e.g., `pensionScenarios`, `savingsAccounts`, `mortgageScenarios`)
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

### Testing Framework & Tools

**Primary Testing Stack**:
- **Test Runner**: Jest (included with Create React App)
- **React Testing**: React Testing Library
- **Mocking**: Jest mocks for Firebase and external APIs
- **Coverage**: Jest coverage reports (target: 80% for critical financial logic)

**Test File Structure**:
```
src/
  components/
    Component.js
    Component.test.js           # Co-located with component
  modules/
    utils/
      mortgageUtils.js
      mortgageUtils.test.js     # Co-located with utility
  __tests__/
    integration/                # Integration tests
    e2e/                        # End-to-end tests (future)
```

**Running Tests**:
```bash
npm test                        # Run all tests in watch mode
npm test -- --coverage          # Generate coverage report
npm test -- Component.test.js  # Run specific test file
```

### Financial Logic Testing (Critical)
- **Unit tests for all calculation functions**
  - Pension projection calculations (compound growth, tax relief)
  - Mortgage amortization schedules
  - Income tax and National Insurance calculations
  - ISA/LISA allowance tracking
- **Verify calculations match manual calculations**
  - Test against known scenarios with pre-calculated results
  - Compare with HMRC examples where applicable
- **Test edge cases and boundary conditions**
  - Zero balances, negative values
  - Maximum contribution limits (annual allowance, ISA limits)
  - Minimum payment < interest accrual scenarios
  - Date edge cases (tax year boundaries, leap years)
- **Validate strategy comparisons**
  - Avalanche vs Snowball debt repayment
  - Salary sacrifice vs personal contribution
  - Multiple interest rate scenarios

**Example Test Structure**:
```javascript
// mortgageUtils.test.js
import { calculateMonthlyPayment, generateAmortizationSchedule } from './mortgageUtils';

describe('Mortgage Calculations', () => {
  test('calculates correct monthly payment for fixed rate', () => {
    const payment = calculateMonthlyPayment(200000, 2.5, 25);
    expect(payment).toBeCloseTo(897.33, 2);
  });

  test('handles edge case: zero loan amount', () => {
    const payment = calculateMonthlyPayment(0, 2.5, 25);
    expect(payment).toBe(0);
  });
});
```

### Component Testing
- **Input validation**: Test form validation logic
- **User interactions**: Test button clicks, form submissions
- **Conditional rendering**: Test component states (loading, error, success)
- **Prop handling**: Test component behavior with different props

### Integration Testing
- **Firestore operations**
  - Mock Firestore for consistent test data
  - Test document read/write/update operations
  - Verify data transformation and validation
- **Authentication flow**
  - Mock Firebase Auth
  - Test protected route behavior
  - Verify user data isolation
- **Cross-module data sharing**
  - Test data aggregation (net worth calculation)
  - Verify data consistency across modules
- **Cloud Function triggers** (when implemented)
  - Test function invocation
  - Verify calculations and data updates

### User Flow Testing
- **Complete user journeys**
  - Upload file → map columns → validate data → visualize results
  - Input pension details → calculate projections → view charts
  - Configure mortgage → add overpayments → view savings
- **Real-time recalculation**
  - Test useEffect dependencies
  - Verify debounced saving behavior
  - Test state synchronization
- **File upload and parsing**
  - Test CSV parsing with various formats
  - Test Excel file reading
  - Test column detection and mapping
  - Validate error handling for malformed files
- **Export functionality** (when implemented)
  - Test data export formats
  - Verify exported data accuracy

### Testing Best Practices
- **Test file naming**: `ComponentName.test.js` or `utilityName.test.js`
- **Mock external dependencies**: Firebase, APIs, file system
- **Isolate tests**: Each test should be independent
- **Descriptive test names**: Use clear, behavior-focused descriptions
- **Arrange-Act-Assert pattern**: Structure tests consistently
- **Coverage targets**:
  - Financial calculations: 95%+ coverage required
  - Business logic: 80%+ coverage
  - UI components: 70%+ coverage
  - Utility functions: 90%+ coverage

### Continuous Integration (Future)
- Run tests on every commit
- Block merges if tests fail
- Generate coverage reports
- Automated deployment on passing tests

## Authentication & Security

### Authentication System

**Current Implementation**:
- **Provider**: Firebase Authentication
- **Methods Supported**:
  - Email/Password authentication
  - Google Sign-In (OAuth)
  - Email verification flow
  - Password reset functionality
- **Auth Context**: `src/contexts/AuthContext.js` provides centralized auth state management
- **Protected Routes**: `ProtectedRoute.js` component wraps authenticated pages
- **Auth Components**: Dedicated auth UI in `src/components/auth/`

**Authentication Flow**:
1. User accesses protected route
2. `ProtectedRoute` checks auth state via `AuthContext`
3. If unauthenticated, redirect to `/login`
4. After successful login, redirect to intended destination
5. Auth state persists across sessions (Firebase handles tokens)

### Firestore Security Rules

**Core Security Principles**:
- All data scoped to authenticated users
- Users can only read/write their own data
- Document IDs use `userId` for user isolation
- Server-side validation via Cloud Functions for critical operations

**Example Security Rules**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check authentication
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check user owns document
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Pension Scenarios - user can only access their own data
    match /pensionScenarios/{userId} {
      allow read, write: if isAuthenticated() && isOwner(userId);
    }

    // Pension Pots - user can only access their own data
    match /pensionPots/{userId} {
      allow read, write: if isAuthenticated() && isOwner(userId);

      // Historical positions subcollection
      match /historical_positions/{positionId} {
        allow read, write: if isAuthenticated() && isOwner(userId);
      }
    }

    // Mortgage Scenarios
    match /mortgageScenarios/{userId} {
      allow read, write: if isAuthenticated() && isOwner(userId);
    }

    // Savings Accounts
    match /savingsAccounts/{userId} {
      allow read, write: if isAuthenticated() && isOwner(userId);

      // Historical positions subcollection
      match /historical_positions/{positionId} {
        allow read, write: if isAuthenticated() && isOwner(userId);
      }
    }

    // Trading 212 Portfolios
    match /trading212Portfolios/{userId} {
      allow read, write: if isAuthenticated() && isOwner(userId);
    }

    // Default: deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Data Security Best Practices

**Environment Variables**:
- Firebase credentials stored in `.env` (not committed to git)
- `.env.example` provides template
- Different configs per environment (dev/staging/prod)
- API keys restricted by HTTP referrer and app identifier

**Client-Side Security**:
- Never expose sensitive API keys in client code
- Use environment variables for all credentials
- Firebase security rules enforce server-side authorization
- Validate all user inputs before Firestore writes

**Server-Side Validation** (via Cloud Functions):
- Critical calculations verified server-side
- Input sanitization and validation
- Rate limiting for expensive operations
- Audit logging for sensitive actions

**Data Privacy**:
- User financial data is never shared between users
- Aggregate analytics use anonymized data only
- Peer comparison features use statistical ranges, not raw data
- No personally identifiable information in error logs

### Session Management

- Firebase handles authentication tokens automatically
- Tokens refresh automatically before expiration
- "Remember Me" functionality persists sessions
- Explicit logout clears all local auth state
- Tokens stored in secure httpOnly cookies (Firebase default)

### Security Checklist

- ✅ Firebase Authentication implemented
- ✅ Protected routes enforce authentication
- ✅ User data isolated by `userId`
- ✅ Environment variables for credentials
- ✅ `.env` excluded from git
- ⚠️ Firestore security rules (implement before production)
- ⚠️ Cloud Functions input validation (implement as needed)
- ⚠️ Rate limiting (implement before production)
- ⚠️ Audit logging (implement for compliance)

### Deployment Security

- Deploy MVP to authenticated users only
- Use Firebase Hosting with HTTPS enforced
- Enable Firebase App Check for abuse prevention
- Monitor authentication anomalies via Firebase Console
- Implement security headers (CSP, HSTS, X-Frame-Options)

## Deployment & Environment Setup

### Environment Configuration

**Required Environment Variables** (`.env`):
```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Optional: External API Keys
# REACT_APP_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
# REACT_APP_MARKET_STACK_API_KEY=your_market_stack_key
```

**Setup Steps**:
1. Copy `.env.example` to `.env`
2. Replace placeholder values with your Firebase project credentials
3. Never commit `.env` to version control (already in `.gitignore`)
4. Use different `.env` files for dev/staging/prod environments

### Local Development

**First-Time Setup**:
```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm start

# App will open at http://localhost:3000
```

**Development Scripts**:
```bash
npm start              # Start dev server with hot reload
npm test               # Run tests in watch mode
npm run build          # Create production build
npm run build:analyze  # Analyze bundle size (if configured)
```

**Troubleshooting**:
- **Module resolution errors**: Clear webpack cache with `rm -rf node_modules/.cache && npm start`
- **Peer dependency conflicts**: Use `--legacy-peer-deps` flag for npm install
- **Firebase connection issues**: Verify `.env` variables are loaded correctly

### Production Deployment

**Recommended Platform**: Vercel or Firebase Hosting

**Vercel Deployment**:
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set build command: `npm run build`
4. Set output directory: `build`
5. Deploy automatically on git push to main branch

**Firebase Hosting Deployment**:
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase Hosting
firebase init hosting

# Build production bundle
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

**Build Configuration**:
- React app uses Create React App build system
- Production builds include optimization and minification
- `.npmrc` configured with `legacy-peer-deps=true` for CI/CD
- Source maps generated for debugging (configure for security)

### Environment-Specific Configs

**Development** (`.env.development`):
- Local Firebase emulators (optional)
- Verbose logging enabled
- Source maps enabled
- Hot module replacement

**Production** (`.env.production`):
- Production Firebase project
- Error logging only
- Source maps disabled or limited
- Performance monitoring enabled

### Performance Optimization

**Current Optimizations**:
- Debounced Firestore writes (500ms delay)
- Lazy loading for route components (potential improvement)
- Memoized calculations for expensive operations
- Recharts with optimized re-rendering

**Future Improvements**:
- Code splitting by route
- Image optimization for logos
- Service worker for offline support
- CDN for static assets

### Monitoring & Analytics

**Firebase Analytics** (configured):
- User engagement tracking
- Page view analytics
- Error logging via Firebase Crashlytics
- Performance monitoring

**Custom Events** (implement as needed):
- Module usage tracking
- File upload success/failure rates
- Calculation completion times
- User journey funnel analysis

## Cross-Module Integration

### Implemented Integrations
- **Landing Page ↔ All Modules**: Net worth aggregation and dashboard overview
- **Pension Builder ↔ Pension Pots**: Current pot values feed into retirement projections
- **Savings Tracker ↔ Mortgage Calculator**: Savings can be used for mortgage overpayments
- **Trading 212 ↔ Landing Page**: Investment values contribute to net worth calculation
- **All Modules ↔ Account Settings**: Centralized user preferences and data management

### Planned Integrations (Future)
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
  App.js                              # Main app component with routing
  index.js                            # React entry point
  firebase.js                         # Firebase configuration

  components/
    auth/                             # Authentication components (NEW)
      AuthStyles.css
      ForgotPassword.js
      Login.js
      ProtectedRoute.js
      Register.js
    common/                           # Reusable UI library
      Button.js
      Card.js
      Input.js
      Modal.js
      index.js                        # Barrel export
    AuthButtons.js
    Navbar.js
    Navbar.css
    test.js

  context/
    AuthProvider.js                   # Legacy auth provider

  contexts/
    AuthContext.js                    # Current auth context (NEW)

  hooks/
    useFirebaseCollection.js          # Collection CRUD hook
    useFirebaseDoc.js                 # Document auto-save hook

  functions/
    index.js                          # Cloud Functions

  modules/                            # Feature modules
    # File upload & mapping components
    FileUploader.js
    FileUploaderStyles.css
    IntelligentFileUploader.js        # AI-powered uploader (NEW)
    IntelligentFileUploaderStyles.css
    ColumnMapper.js
    ColumnMapperStyles.css
    MappingConfidenceBar.js           # Upload quality indicator (NEW)
    MappingConfidenceBarStyles.css
    MappingReviewModal.js             # Mapping review UI (NEW)
    MappingReviewModalStyles.css
    MappingReviewTable.js             # Mapping table UI (NEW)
    MappingReviewTableStyles.css
    UploadSummaryCard.js              # Upload summary (NEW)
    UploadSummaryCardStyles.css

    # Account management components
    AccountsTable.js
    AccountsTableStyles.css

    # AI advisory components
    AIFinancialAdvisory.js
    AIFinancialAdvisoryStyles.css
    AISavingsAdvisory.js

    # Income tax components
    IncomeTaxBreakdownTable.js
    IncomeTaxBreakdownTableStyles.css
    IncomeTaxInputs.js
    IncomeTaxInputsStyles.css
    TakeHomeComparisonChart.js

    # Savings-specific components
    ISALISAUtilization.js
    ISALISAUtilization.css
    PremiumBondsAnalysis.js
    PremiumBondsAnalysisStyles.css

    # Chart components
    MonthlyBalanceChangeChart.js
    MonthlyPerformanceChart.js
    NetWorthChart.js
    NetWorthChartStyles.css
    PortfolioValueChart.js
    SavingsChart.js
    SavingsChart.css
    StackedBarChart.css
    TimeframeTabs.js
    TimeframeTabs.css
    TreemapChart.js

    # Pension components
    PensionAccountsTable.js
    PensionAccountsTableStyles.css
    PensionAllowanceChart.js
    PensionAllowanceChart.css
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

    # Investment components
    PortfolioBuilder.js
    Trading212Parser.js
    Trading212Uploader.js
    tickerMapping.js

    # Mortgage components subfolder
    mortgage/
      MortgageChart.js
      MortgageChartStyles.css
      MortgageInputForm.js
      MortgageSchedule.js
      MortgageScheduleStyles.css
      MortgageSummary.js
      MortgageSummaryStyles.css

    # Legacy/archived components
    archive/
      MortgageCalc.js                 # Legacy mortgage calculator
      MortgageCalcStyles.css
    login/
      LoginScreen.js                  # Legacy login (replaced by auth/)
      LoginScreen.css

    # Utility modules
    fetchMarketStackDailySeries.js    # Market data API
    utils.js                          # Legacy utilities
    utils/
      AutoMapper.js                   # AI column mapping (NEW)
      ContextSchemas.js               # Upload context schemas (NEW)
      PatternDetector.js              # Pattern detection (NEW)
      TemplateTrainer.js              # Template learning (NEW)
      columnDetection.js
      dataParser.js
      dataValidation.js
      detectDateFormat.js
      mortgageUtils.js
      parseNumber.js
      pensionColumnDetection.js
      pensionContributionParser.js
      pensionDataProcessor.js         # Pension data processing (NEW)
      premiumBondsParser.js

  pages/                              # Route-level page components
    AccountSettings.js
    AccountSettingsStyles.css
    LandingPage.js
    LandingPage.css
    MortgageCalcNEW.js
    MortgageCalcNEWStyles.css
    PensionBuilderNEW.js
    PensionBuilderStyles.css
    PensionPots.js
    PensionPotsStyles.css
    SavingsTracker.js
    SavingsTrackerStyles.css
    Trading212Dashboard.js
    Trading212Dashboard.css

  styles/
    SharedStyles.css                  # Global shared styles
    variables.css                     # CSS variables (NEW)

  utils/                              # Global utilities
    dateUtils.js
    formatters.js

/public
  index.html
  moneymoves-logo-inverted.png
  moneymoves-logo-only.png
  moneymoves-logo2.png
```

### Organizational Notes
- **Route-level pages**: `/src/pages` - Main application screens
- **Feature modules**: `/src/modules` - Reusable business logic components
- **UI components**: `/src/components/common` - Design system components
- **Auth components**: `/src/components/auth` - Authentication flow (NEW)
- **Global styles**: `/src/styles` - Shared CSS and variables
- **Custom hooks**: `/src/hooks` - Firebase data management hooks
- **Utilities**: `/src/utils` - Global helper functions
- **Module utilities**: `/src/modules/utils` - Feature-specific utilities

### Recent Additions
- Authentication system with dedicated `/components/auth` folder
- Intelligent file upload system with AI-powered column mapping
- Mapping review and confidence scoring components
- CSS variables file for design token management
- Context schemas and pattern detection for smart uploads

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

### Development Principles
- Always prioritize user understanding over technical complexity
- Maintain visual and structural consistency across all modules
- Build incrementally — MVP first, then enhance
- Test edge cases thoroughly
- Implement comprehensive error handling and data validation

### Financial Accuracy
- Document financial calculations with clear assumptions
- Align all tax/financial rules with current HMRC guidance (2025/26 tax year)
- Store monetary values in pounds with proper precision handling
- Maintain UK-specific financial compliance across all modules
- Test financial calculations against manual examples and HMRC guidance

### Data Management
- Use Firebase Authentication for secure user data management
- Use subcollections for time-series data (historical_positions, payment_history, monthly_schedules)
- Implement real-time recalculation with useEffect for dynamic user interactions
- Use debounced saving (500ms) to prevent excessive Firestore writes
- Validate all user inputs before Firestore writes

### User Experience
- Provide comprehensive file upload and data import capabilities
- Implement AI-powered advisory features for enhanced user guidance
- Use real-time updates for better UX with immediate feedback
- Provide clear visual feedback for user actions and data processing
- Use plain, human-readable language in UI (avoid jargon)

### Code Quality
- Follow component single-responsibility principle
- Use custom hooks (useFirebaseDoc, useFirebaseCollection) for data operations
- Maintain consistent naming conventions (camelCase for collections and fields)
- Co-locate component styles with components
- Use shared styles from `/src/styles/SharedStyles.css` for consistency

### Documentation
- Update documentation alongside code changes
- Keep CLAUDE.md in sync with implementation
- Document new features in README and PROJECT_STATUS files
- Include version numbers and last updated dates
- Use clear, descriptive commit messages

### Security
- Never commit sensitive credentials (use .env)
- Implement Firestore security rules before production
- Validate inputs server-side via Cloud Functions for critical operations
- Use environment variables for all API keys
- Isolate user data by userId

## Version History

### Version 2.0 - October 2025 (Current)
**Major Documentation Overhaul**

**Added**:
- Table of contents for easier navigation
- Comprehensive testing strategy section with Jest/React Testing Library
- Expanded authentication & security section with example Firestore rules
- Deployment & environment setup section with detailed instructions
- Version tracking and last updated metadata
- Documentation philosophy section
- Updated file organization tree reflecting current structure
- New authentication components (`/src/components/auth`)
- Intelligent file upload system with AI mapping
- CSS variables file for design tokens
- Cross-module integration split into Implemented vs Planned

**Fixed**:
- Corrected Firestore naming convention from snake_case to camelCase
- Removed reference to deleted `alphavantage.env` file
- Verified React Router version (v7 confirmed)
- Updated organizational notes to reflect new auth structure

**Improved**:
- Restructured for better readability
- Added code examples for testing and security rules
- Clarified environment variable setup process
- Enhanced security documentation with detailed examples
- Better organization of cross-module integrations

### Version 1.0 - Initial Release
**Foundation Documentation**

- Initial project overview and mission statement
- Tech stack documentation (React 19, Firebase 11, Recharts 3)
- Development philosophy and core principles
- Module design process with AI Product Team personas
- Firestore data architecture for all modules
- Component architecture patterns
- Financial calculation requirements
- User experience patterns and microcopy guidelines
- Implementation workflow (6-phase approach)
- File organization structure
- Documentation of 6 implemented modules:
  - Pension Builder
  - Pension Pots
  - Mortgage Calculator
  - Savings Tracker
  - Trading 212 Dashboard
  - Account Settings
- Best practices summary

---

**End of CLAUDE.md** - Last updated: October 2025
