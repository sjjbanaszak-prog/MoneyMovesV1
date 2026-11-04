# CLAUDE.md

**Version**: 3.0
**Last Updated**: November 2026
**Previous version**: v2.1 (October 2025, desktop-era) is kept in `CLAUDE_v2.1_archive.txt`

Guidance for AI coding assistants working in this repository.

## Project Overview

**Money Moves** is a UK personal finance app that helps people track and plan their pensions, savings, mortgages and income, with UK tax rules (HMRC) built in. It is a solo-built product, deployed on Vercel, in testing with real users, with a Free and Premium plan.

The live product is the **mobile-first app under `src/mobile`**. The older desktop pages (PensionPots, SavingsTracker, Trading212Dashboard, etc.) are archived and no longer routed.

## Commands

```bash
npm install --legacy-peer-deps   # first-time setup (.npmrc also sets legacy-peer-deps)
npm start                        # dev server on http://localhost:3000
npm test                         # Jest watch mode
CI=true npx react-scripts test --watchAll=false   # run all tests once
npm run build                    # production build (run before committing larger changes)
```

## Working Conventions

- **Git**: only commit when asked. When asked, commit and push **directly to `main`** — no feature branches. `main` auto-deploys to production on Vercel.
- Leave unrelated working-tree files alone (e.g. `docs/LINKEDIN_POST.md`, `docs/PLAN_TIERS.md` edits, `*.backup` files) unless asked.
- Match surrounding code: mobile pages use **inline style objects** and the colour tokens below, not CSS modules.
- Keep user-facing copy plain, specific and encouraging ("£6,600 of your ISA allowance left", not "optimise your allowance").
- Run the build and the test suite before reporting a change as done.

## Tech Stack

- **React 19**, Create React App (`react-scripts` 5), React Router **v7**
- **Firebase 11**: Authentication (email/password + Google) and Firestore. **No Cloud Functions** (see Constraints)
- **Recharts 3** for charts, **Day.js** for dates
- **@vercel/analytics** for anonymous, cookie-free usage stats
- File parsing: XLSX, PapaParse, pdfjs-dist, tesseract.js
- Locale: £, dd/mm/yyyy, UK tax year 6 April – 5 April

## Constraints (important)

- **Firebase is on the free Spark plan and will stay there.** Do not propose anything needing billing: Cloud Functions, scheduled functions, Firestore TTL, Admin SDK servers. `src/functions/` exists but is not deployed. Prefer client-side logic or manual Firebase-console steps.
- **Firestore rules are published by hand** in the Firebase console (no firebase/gcloud CLI locally). Editing `firestore.rules` does nothing until the user publishes it — always remind them.
- **The `plan` field on `users/{uid}` is server-managed.** Rules forbid clients from setting or changing it; Premium is granted by editing the document in the Firebase console. Never write `plan` from the client.
- **Not FCA-regulated.** Insights and notifications must stay general guidance ("you have £X allowance left"), never personal product recommendations ("you should switch to lender Y").

## Architecture

### Routing (`src/App.js`)

```
/login, /register, /forgot-password   public auth pages
/privacy, /terms                      public legal pages (same components as in-app)
/mobile/*                             the app (ProtectedRoute → MobileApp)
*                                     → /mobile/dashboard
```

Provider order: `Router > AuthProvider > UserPlanProvider > DemoModeProvider > ReportProblemProvider`. `<Analytics />` (Vercel) is rendered at the root.

### Mobile app (`src/mobile/MobileApp.js`)

Wrapped in `SavingsDataProvider > PensionDataProvider > NotificationsProvider` (+ `NotificationEngine`). Routes: `dashboard`, `pension/*`, `savings/*`, `mortgage/*`, `income/*`, `settings/*`, `upgrade`, `notifications`. `family/*` currently redirects to the dashboard (paused).

### Section pattern

Each section (`pension`, `savings`, `mortgage`, `income`, `family`) follows the same shape:

```
src/mobile/<section>/
  <Section>App.js           nested routes for the section
  <Section>DataContext.js   loads/saves Firestore data; swaps in demo data in demo mode
  <Section>Layout.js        page shell: MobileNavDrawer (top) + UniversalNavbar (bottom tabs)
  <Section>DetailLayout.js  shell for detail/add pages (back button)
  pages/                    one file per screen
  utils/                    pure calculation helpers (+ co-located tests)
```

- **`components/MobileNavDrawer.js`** — top bar + slide-out menu. Items can be `disabled: true` (greyed out, not clickable).
- **`components/UniversalNavbar.js`** — shared bottom tabs: Overview / Calculator / Compare / Insights / AI, mapped to `/mobile/<section><segment>`. `ENABLED_SEGMENTS` limits tabs per section; the `disabledSegments` prop disables tabs at runtime (e.g. Income Overview).
- **`components/PremiumGate.js`** + `contexts/UserPlanContext.js` (`isPremium`) gate Premium screens. `UpgradeSheet.js` / `upgrade/MobileUpgradePage.js` handle upsell.
- **`pages/MobileDashboard.js`** — net worth hero, Net Worth History chart (1Y/5Y/AT, % pill follows the timeframe), section summaries.

### Demo mode

`contexts/DemoModeContext.js` toggles demo mode (persisted in `localStorage` as `moneyMovesDemoMode`) and exposes `demoData` from `src/data/demoData.js`. Each DataContext checks `isDemoMode` and uses demo data instead of Firestore; nothing is written in demo mode.

The demo household comes from **`src/data/demoHousehold.js` → `buildDemoHousehold(today)`**: a deterministic (seeded PRNG) 5-year history simulated month by month up to today — 3 pensions, 4 savings accounts (Cash ISA, S&S ISA, Emergency Fund, Premium Bonds), a residential mortgage with a switch + overpayments, and a buy-to-let. Demo notifications (`notifications/demoNotifications.js`) and savings goals must stay consistent with these numbers. Tests in `demoHousehold.test.js`.

### Notifications

`notifications/notificationRules.js` evaluates rules (ISA/pension allowance, fixed-rate end, LTV bands, etc.) against section metrics; `NotificationEngine.js` writes new ones to `notifications/{uid}/items` once per session. Demo mode uses `demoNotifications.js`.

### Shared calculation code

- `src/modules/utils/incomeTaxUtils.js` — income tax, NI, student loan; per-tax-year tables (`TAX_YEAR_DATA`, 2022/23–2026/27)
- `src/modules/utils/mortgageUtils.js` — amortisation helpers
- `src/mobile/mortgage/utils/mortgageHistory.js` — switch-aware historical balance reconstruction (handles overpayments and fees added to the loan)
- `src/mobile/mortgage/utils/propertyLookup.js` — Land Registry + postcodes.io lookup with **embedded ONS/UKHPI data** (live APIs 404; update the constants quarterly from ONS bulletins — also duplicated in `MortgageInsights.js`)
- `src/mobile/savings/utils/savingsHistory.js` — month-end savings balances for the net worth chart
- `src/utils/formatters.js`, `src/utils/dateUtils.js`

## Firestore Data

Every user document is keyed by `uid`. All access is owner-only (`firestore.rules`); anything unlisted is denied.

| Collection | Contents |
|---|---|
| `users` | profile: `displayName`, `fullName`, `dob`, `industry`, `plan` (server-managed), `termsAcceptedAt`, `termsVersion` |
| `pensionPots` (+ `historical_positions`) | `pensions` (legacy: `entries`), `yearlyTotals`, `currentAge`, `retirementAge` |
| `pensionScenarios` | pension calculator inputs |
| `savingsTracker` (+ `historical_positions`) | `uploads` (accounts with `rawData`, `mapping`, `currentBalance`, `balanceHistory`), `selectedAccounts` |
| `savingsAccounts` (+ `historical_positions`) | legacy savings data |
| `mortgagePots` | `mortgages` (incl. `paymentHistory`, `switchHistory`) |
| `mortgageCalculations` | mortgage calculator inputs |
| `incomePots` | `incomes` (saved employers/income history), `calculatorParams` |
| `households` | Family section data (paused) |
| `notifications/{uid}/items` | generated notifications |
| `userDebts`, `trading212Portfolios`, `dashboardPreferences`, `userPreferences` | legacy/minor |
| `problem_reports` | create-only from client; has `expireAt` = sent + 12 months |

### Adding a new collection — checklist

1. Add an owner-only `match` block to `firestore.rules`, then **ask the user to publish the rules** in the Firebase console.
2. Add it to `USER_COLLECTIONS` in `src/contexts/AuthContext.js` (with any subcollections) so **Delete Account** removes it.
3. If it stores a new kind of personal data, update `src/mobile/settings/PrivacyPolicyPage.js` and bump `LAST_UPDATED`.
4. Load demo data for it in demo mode; never write to Firestore in demo mode.

## Privacy & UK GDPR

Already implemented — keep these working:

- **Privacy Policy / Terms**: `src/mobile/settings/PrivacyPolicyPage.js`, `TermsOfUsePage.js`, served in-app and publicly (`/privacy`, `/terms`). When adding any third-party service, add it to the policy's *Third-Party Services* list (and to the CSP in `vercel.json` if it loads scripts or makes requests).
- **Sign-up agreement**: required 18+/Terms/Privacy checkbox on Register; Google sign-in on Login shows an agreement notice. Accepted version recorded via `termsAcceptance()` / `TERMS_VERSION` in `AuthContext.js` — bump `TERMS_VERSION` when the Terms or Privacy Policy change materially.
- **Delete Account**: Settings → Data & Legal. Re-authenticates (password or Google popup), deletes every `USER_COLLECTIONS` doc + subcollections, then the auth user.
- **Problem reports**: 12-month retention via `expireAt` (`src/utils/problemReports.js`); deleted **manually** monthly (no TTL on Spark).
- **Analytics**: Vercel Analytics only (cookie-free, no consent banner needed). Google Analytics was deliberately removed — don't re-add without a consent mechanism.
- Policy states data is in Firestore region `eur3` (EEA).
- Still outstanding (user-side): controller legal name/address in "Who We Are", ICO fee, Google Cloud DPA.

## Visual Design System (mobile)

Dark theme, inline styles. Core tokens:

| Token | Value | Use |
|---|---|---|
| Background | `#0b1326` | page |
| Card | `#171f33` | cards, sheets, sections |
| Text | `#dae2fd` | headings / primary |
| Muted | `#bbcabf` (`#64748b` for hints) | body / secondary |
| Green | `#4edea3` | positive, assets, primary actions |
| Blue | `#adc6ff` | neutral accents, icons |
| Amber | `#ffb95f` | warnings, medium priority |
| Red | `#ffb4ab` (dark `#93000a`) | liabilities, negative, destructive |

- Fonts: **Manrope** (800/900) for headings, **Inter** for body; icons are **Material Symbols Outlined** (`<span className="material-symbols-outlined">`). All loaded from Google Fonts in `public/index.html`.
- Shared classes in `src/mobile/mobile.css` / `mobile-theme.css` (`mobile-screen`, `nav-btn`, cards, pills).
- Charts: Recharts; currency in tooltips via compact formatters (e.g. `fmtK` → `£412k`, `£1,235k` — never `£1.2m`).

## UK Financial Rules

All calculations follow current HMRC rules; tax-year tables live in `incomeTaxUtils.js`.

- Tax year runs **6 April – 5 April** (payment on 5 April belongs to the earlier year).
- **Pension annual allowance**: £40,000 to 2022/23, **£60,000** from 2023/24. **Carry forward** up to 3 previous years, used oldest-first (FIFO); unused allowance older than 3 years is lost.
- **ISA allowance** £20,000 (LISA £4,000 within it); **JISA** £9,000.
- Mortgage history must be switch-aware: a remortgage overwrites the active fields and archives the old deal in `switchHistory`; reconstruct balances per provider segment, adding back overpayments/lump sums when amortising backwards.
- Validate formulas against worked examples; add co-located tests for any calculation change.

## Testing

Jest + React Testing Library via `react-scripts`. Tests are co-located (`*.test.js`):

- `src/data/demoHousehold.test.js` — demo data determinism, allowances, balances
- `src/mobile/mortgage/utils/mortgageHistory.test.js`
- `src/mobile/savings/utils/savingsHistory.test.js`
- `src/modules/utils/debtUtils.test.js`
- `src/utils/problemReports.test.js`

Financial logic changes need tests; UI-only changes need a build check at minimum.

## Deployment

- **Vercel** builds from `main` (`vercel.json`: SPA rewrite + security headers incl. a strict **CSP**). Any new external script/API domain must be added to the CSP or the browser will block it.
- Environment variables (`REACT_APP_FIREBASE_*`) live in `.env` locally (never committed; template in `.env.example`) and in Vercel's project settings for production.
- Firestore rules: published manually in the Firebase console (see Constraints).

## Paused / Disabled Features

- **Family** (`src/mobile/family/`): nav item disabled, routes redirect to dashboard, JISA notifications off, privacy wording hidden behind `SHOW_FAMILY_SECTION` in `PrivacyPolicyPage.js`. Re-enable steps are in the comment in `MobileApp.js`. The Upgrade page still advertises Family features.
- **Income Overview**: Income defaults to the Calculator. Overview is only available to users who have saved income entries (`hasSavedIncomes` in `IncomeDataContext.js`).
- **Debt**: nav item disabled.
- Savings: only Overview tab enabled; Income: Overview + Calculator (`ENABLED_SEGMENTS` in `UniversalNavbar.js`).

## Legacy Code

Not routed; avoid extending it:

- `src/archive/web-pages/` — old desktop pages
- most of `src/modules/` — old desktop components (only `modules/utils/incomeTaxUtils.js` and `mortgageUtils.js` are used by the mobile app)
- `src/context/AuthProvider.js` — legacy auth provider still wrapping `<App />` in `src/index.js` and used by `components/ReportProblemModal.js`; new code should use `src/contexts/AuthContext.js`
- `src/mobile/income/IncomeNavbar.js` and `src/hooks/useFirebase*.js` — unused
- `src/data/demoDataGenerator.js`, and the pensionBuilder/mortgage/trading212 parts of `demoData.js` (archived pages only)

## Planning New Features

For anything substantial, think it through from these five angles before coding:

- **Finley (financial accuracy)** — correct against HMRC rules? edge cases (tax-year boundaries, zero balances, allowance limits)? stays clear of regulated advice?
- **Riley (product/UX)** — consistent with existing sections and tokens? plain, specific copy? readable contrast, decent tap targets and labelled controls?
- **Devon (engineering)** — which DataContext owns it? Firestore shape? testable pure helpers, with tests for any calculation change?
- **Priya (privacy & security)** — new personal data → privacy policy + Delete Account (`USER_COLLECTIONS`)? Firestore rules updated and the user reminded to publish them? new third-party service → policy list + CSP in `vercel.json` + does it need consent? could a user change something they shouldn't (e.g. `plan`)?
- **Mo (plan & cost)** — Free or Premium (`docs/PLAN_TIERS.md`, `PremiumGate`)? needs anything paid (Firebase billing, Cloud Functions, paid APIs)? → find a free route or flag it. Does it showcase well in demo mode? Does the Upgrade page still match what's live?

Related docs: `docs/PLAN_TIERS.md` (Free vs Premium feature split).
