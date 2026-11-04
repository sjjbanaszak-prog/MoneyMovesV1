# Outstanding Review Items

**Created**: 4 November 2026 (from an app-wide consistency review)
**Status**: To pick up next session

## Done

- [x] "AI" wording removed everywhere users see it: bottom tab is now **Analyse**, pages are "Analysis", teaser and upgrade copy reworded (no AI claims; "recommendations" → "insights")
- [x] Terms of Use tax-year line: now "based on current HMRC rates for the tax year shown"

> The AI wording and Terms changes are **not yet committed**.

## Functional (do first)

1. **Savings empty state points to a dead page.** `src/mobile/savings/pages/SavingsOverview.js` says "Add data on the desktop Savings Tracker page", which is archived. Point to Add Account instead.
2. **Free plan 1-mortgage limit isn't enforced.** `docs/PLAN_TIERS.md` says Free = 1 pension / 1 savings account / 1 mortgage. Pension and Savings check `isPremium` before adding; `MortgageOverview.js` / `AddMortgage.js` don't.
3. **Income Calculator tax year is hard-coded.** `src/mobile/income/pages/IncomeCalculator.js` defaults to `'2026/27'` and has a fixed year list ending 2026/27. Default to the current tax year and build the list from `TAX_YEAR_DATA` in `incomeTaxUtils.js`.
4. **Demo income is out of step with the demo household.** `DEMO_INCOMES` in `src/mobile/income/IncomeDataContext.js` is hard-coded and ends in 2025; the demo household (`src/data/demoHousehold.js`, `ACCENTURE_SALARY`) runs to 2026 at £65k. Generate demo income from `buildDemoHousehold`.

## Design consistency

5. **Four reds.** `#ff6b6b` (×50), `#ffb4ab` (×35), `#ff4d4d` (×10), `#f87171` (×7). Standardise on `#ffb4ab` (the token in CLAUDE.md).
6. **£1.2m formatting still present** in Mortgage Insights, Mortgage Calculator and Income Calculator (charts use `£1,235k`). There are 22 `fmt`, 8 `fmtK`, 8 `fmtShort` copies across files. Move to shared mobile formatters (with `−£` for negatives).
7. **Hovers that still resize:** Net Worth History (`MobileDashboard.js`), Growth History (`PensionInsights.js`), Employer income (`EmployerDetail.js`), Savings Goals (`SavingsGoalsSection.js`). Match the fixed 160px tooltip used on the Contributions / Savings History / Payments charts.
8. **Greyed-out tabs.** Savings shows 4 disabled tabs, Income shows 3 (`ENABLED_SEGMENTS` in `UniversalNavbar.js`). Hide them or label "Soon".
9. **No demo toggle on the Income Calculator**, which is now Income's default page.
10. **Upgrade page advertises the paused Family features** ("Family Hub & partner tracking", "Up to 6 family members") in `src/mobile/upgrade/MobileUpgradePage.js`.

## Clean-up (no visible effect)

11. **Unused files:** `PensionNavbar.js`, `SavingsNavbar.js`, `MortgageNavbar.js`, `IncomeNavbar.js`, `components/MobileLayout.js`, `components/MobileNavbar.js`.
12. **Duplicate mortgage route:** `/compare` and `/comparisons` both render `MortgageCompare` (`MortgageApp.js`).
13. **CLAUDE.md says charts use Recharts**; mobile charts are hand-built SVG/HTML. Correct it.

## Improvements suggested

- **One shared monthly bar chart component** for the pension Contributions, Savings History and mortgage Payments charts (currently three near-copies with the same bars, hover, legend and summary cards).
- **Clear "Upgrade to add more" prompt** when a Free user hits an account limit.
- **‹ › year switcher** on the FY/CY detail charts so past years can be viewed (data and demo cover 5 years).

## Still pending from earlier

- Privacy policy "Who We Are": legal name / company and contact address (and a non-test contact email) — waiting on details.
- Publish the updated `firestore.rules` in the Firebase console (if not already done).
- Monthly: delete `problem_reports` whose `expireAt` has passed.
