# Security Audit Report — MoneyMoves V1

**Date:** April 2026  
**Audited by:** Claude Code (Anthropic)  
**Scope:** Full codebase static analysis  
**Branch:** `fix/income-tax-layout-spacing`

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 1 | ✅ Resolved |
| 🟠 High | 3 | ✅ Resolved |
| 🟡 Medium | 3 | Open |
| 🔵 Low | 2 | Open |
| **Total** | **9** | |

---

## 🔴 Critical

---

### ~~C-1 — Hardcoded API Key in Source Code~~ ✅ RESOLVED

**File:** `src/modules/fetchMarketStackDailySeries.js`  
**Resolved:** MarketStack integration removed entirely. The file now exports a no-op stub. The hardcoded key no longer exists in the codebase.

> ⚠️ The old key (`a5552525afedba5df4e41a13c19324a6`) was previously committed to git history. If this repository is or ever becomes public, rotate the key in the MarketStack dashboard as a precaution. To scrub from history:
> ```bash
> # Using BFG Repo Cleaner (recommended)
> bfg --replace-text secrets.txt
> git reflog expire --expire=now --all && git gc --prune=now --aggressive
> ```

---

## 🟠 High

---

### ~~H-1 — CORS Wildcard on Cloud Function (Accepts Any Origin)~~ ✅ RESOLVED

**File:** `src/functions/index.js`  
**Resolved:** Replaced `origin: true` with an explicit `ALLOWED_ORIGINS` allowlist. Requests from unlisted origins are rejected with a CORS error. Add your production Vercel domain to the `ALLOWED_ORIGINS` array in `src/functions/index.js` before deploying the function.

---

### ~~H-2 — Unvalidated Query Parameter Passed Directly into External URL (SSRF)~~ ✅ RESOLVED

**File:** `src/functions/index.js`  
**Resolved:** Added regex whitelist validation (`/^[A-Za-z0-9.,\-]+$/`) before use, and `encodeURIComponent()` when interpolating into the Yahoo Finance URL. Invalid values return HTTP 400.

---

### ~~H-3 — No Firestore Security Rules Deployed~~ ✅ RESOLVED

**Files created:** `firestore.rules`, `firebase.json`  
**Resolved:** Security rules created covering all 11 collections found in the codebase. Every user-scoped collection enforces `request.auth.uid == userId`. `problem_reports` allows authenticated create-only (no client reads). A catch-all denies everything not explicitly listed.

**To deploy the rules**, run once:
```bash
firebase login        # if not already authenticated
firebase use --add    # select your project (money-6a32f)
firebase deploy --only firestore:rules
```

Test locally first with the emulator:
```bash
firebase emulators:start --only firestore
```

---

## 🟡 Medium

---

### M-1 — User UID and User Object Logged to Browser Console

**File:** `src/pages/LandingPage.js`  
**Lines:** 11, 29, 30, 37, 44

**Vulnerable code:**
```js
console.log("=== LANDINGPAGE.JS FILE LOADED - VERSION 2.0 ==="); // line 11
console.log("User object:", user);   // line 29 — exposes full user object
console.log("User UID:", user?.uid); // line 30
console.log("User UID check:", user?.uid); // line 37
console.log("USER UID EXISTS:", user.uid); // line 44
```

Also present in:
- `src/pages/SavingsTracker.js:84` — `console.log("Loading data from Firebase for user:", user.uid)`

**Risk:** Browser console output is readable by any JavaScript running on the page (XSS) and by anyone with DevTools access. UIDs are permanent identifiers — once leaked they cannot be rotated and could be used to craft targeted attacks if rules are misconfigured.

**Fix:** Remove all debug `console.log` statements before deploying to production, or gate them:
```js
if (process.env.NODE_ENV === 'development') {
  console.log("User UID:", user?.uid);
}
```

---

### M-2 — No Input Validation Before Firestore Writes

**Files and representative lines:**
- `src/mobile/settings/EditProfilePage.js` — `fullName`, `dob`, `industry` written without validation
- `src/mobile/settings/ReportProblemPage.js` — `subject`, `description` written without sanitisation
- `src/mobile/mortgage/MortgageDataContext.js` — arbitrary `fields` merged via `updateMortgage`

**Risk:** No length limits or type checks mean a user could submit excessively large strings (storage exhaustion), unexpected data types, or values that break downstream rendering.

**Fix:** Add lightweight validation at the write boundary. Example for `EditProfilePage`:
```js
async function handleSave() {
  if (fullName.trim().length === 0 || fullName.length > 100) {
    setError('Full name must be between 1 and 100 characters.');
    return;
  }
  if (description && description.length > 5000) {
    setError('Description is too long.');
    return;
  }
  // ... proceed with setDoc
}
```

For `ReportProblemPage`, enforce before `addDoc`:
```js
if (subject.trim().length > 200) {
  setError('Subject must be 200 characters or fewer.');
  return;
}
if (description.trim().length > 5000) {
  setError('Description must be 5000 characters or fewer.');
  return;
}
```

---

### M-3 — No Client-Side Rate Limiting on Auth Forms

**Files:**
- `src/components/auth/Login.js`
- `src/components/auth/ForgotPassword.js`
- `src/components/auth/Register.js`

**Risk:** Firebase enforces server-side limits, but there is no client-side guard. Rapid repeated submissions can generate noise in Firebase logs and increase costs, and error messages could be used to enumerate valid email addresses.

**Fix:** Add a simple cooldown using a ref:
```js
const lastSubmitRef = useRef(0);

async function handleSubmit(e) {
  e.preventDefault();
  const now = Date.now();
  if (now - lastSubmitRef.current < 3000) return; // 3-second cooldown
  lastSubmitRef.current = now;
  // ... proceed
}
```

---

## 🔵 Low

---

### L-1 — Extensive Debug Console Logs Throughout the Codebase

**Files with notable debug output:**
- `src/pages/PensionPots.js` — 20+ `console.log` calls including data payloads
- `src/pages/SavingsTracker.js` — 15+ calls logging Firebase data and user IDs
- `src/pages/AccountSettings.js` — logs on profile save and report submission

**Risk:** Debug logs increase the information available to an attacker via XSS or devtools inspection. They also degrade performance in production.

**Fix:** Remove before each production deployment, or use a build-time strip:
```js
// In production builds, react-scripts already strips dead code,
// but console.log is not stripped automatically. Use:
if (process.env.NODE_ENV !== 'production') {
  console.log(...);
}
```
Alternatively add the `babel-plugin-transform-remove-console` package and configure in `.babelrc` for production.

---

### L-2 — Demo Mode State Persisted in localStorage

**File:** `src/contexts/DemoModeContext.js`  
**Lines:** 17, 23

**Vulnerable code:**
```js
const saved = localStorage.getItem('moneyMovesDemoMode');
localStorage.setItem('moneyMovesDemoMode', JSON.stringify(isDemoMode));
```

**Risk:** Low — the value stored (`true`/`false`) is not sensitive. However, demo mode is not cleared on logout, meaning a subsequent user on a shared device would see demo data by default.

**Fix:** Clear the value on logout in `AuthContext.js`:
```js
async function logout() {
  localStorage.removeItem('moneyMovesDemoMode');
  return firebaseSignOut(auth);
}
```

---

## Findings Investigated but Not Confirmed as Issues

| Finding | Outcome |
|---------|---------|
| `.env` committed to git | ✅ Not an issue — `.env` is in `.gitignore` and not tracked (`git ls-files .env` returns empty) |
| Firebase config keys in `firebase.js` | ✅ Acceptable — Firebase web SDK keys are designed to be public; access is controlled by Firestore rules and Firebase Auth |
| Auth tokens in localStorage | ✅ Not found — Firebase SDK manages token storage internally via `browserLocalPersistence`; no manual `localStorage` token writes detected |
| IDOR via URL params | ✅ Low risk in current architecture — all Firestore document IDs use `user.uid` directly; no user-controlled ID lookups found that skip ownership checks |

---

## Remediation Priority

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | Rotate MarketStack API key | 10 min | Critical |
| 2 | Move API key to env var | 10 min | Critical |
| 3 | Deploy Firestore security rules | 30 min | High |
| 4 | Sanitise `tickers` param in Cloud Function | 15 min | High |
| 5 | Restrict CORS to known origins | 15 min | High |
| 6 | Remove sensitive `console.log` statements | 30 min | Medium |
| 7 | Add input length validation on Firestore writes | 1 hr | Medium |
| 8 | Add auth form cooldown | 30 min | Medium |
| 9 | Clear demo mode flag on logout | 5 min | Low |

---

## Notes for Future Audits

- Re-run this audit after any new Cloud Function is added (check CORS + input validation)
- Re-run after any new Firestore collection is introduced (check security rules)
- Use `firebase emulators:start` with `--only firestore` to test security rules locally before deploying
- Consider adding `eslint-plugin-no-secrets` to the lint pipeline to catch hardcoded keys at commit time
- Consider Firebase App Check to bind the client app to Firebase, preventing API abuse from outside the app

---

*Generated by static analysis — no runtime testing performed. Some issues may have additional context not visible from source alone.*
