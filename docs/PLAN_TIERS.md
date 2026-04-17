# MoneyMoves — Free vs Premium Plan Architecture

**Version**: 1.0  
**Last Updated**: April 2026  
**Status**: In Progress — UserPlanContext implemented, full gate UI pending

---

## 1. Plan Definitions

### Free Plan — £0/month
Designed for users who want to begin tracking their finances with no commitment. Core tools are fully functional; limits exist on account count and advanced features.

| Feature | Free Allowance |
|---|---|
| Pension accounts | 1 provider |
| Mortgage tracking | 1 mortgage |
| Savings accounts | 1 account |
| Income calculator | Full access |
| Dashboard | Full access |
| Standard support | ✅ |

### Premium Plan — £4.16/month (annual) · £5.99/month
Unlocks unlimited accounts, AI-powered analysis, and advanced scenario modelling tools.

| Feature | Premium |
|---|---|
| Pension accounts | Unlimited |
| Mortgage tracking | Unlimited |
| Savings accounts | Unlimited |
| Income calculator | Full access |
| Dashboard | Full access |
| Mortgage scenario modelling | ✅ |
| Mortgage Compare tab | ✅ |
| Mortgage AI Analysis | ✅ |
| Pension Insights tab | ✅ |
| Pension AI Analysis | ✅ |
| Pension Comparisons | ✅ |
| Real-time property valuation alerts | ✅ (future) |
| Priority support | ✅ |
| Ad-free experience | ✅ |

---

## 2. Feature Gate Patterns

### Pattern A — Locked Tab with Badge
Used for: Pension Insights tab, Mortgage Compare tab, Mortgage AI tab, Pension AI tab, Pension Comparisons tab.

The tab is visible in the bottom nav but marked with a `lock` icon badge. Tapping it opens an **Upgrade Sheet** (bottom sheet modal) instead of navigating to the page. The sheet shows the feature name, a brief description, and a "Upgrade to Premium" CTA button linking to `/mobile/upgrade`.

```
[ Overview ] [ 🔒 Insights ] [ 🔒 AI ]
```

**Implementation note**: In the respective `*Navbar.js` component, check `isPremium` from `UserPlanContext`. If false and the tab is premium-only, intercept `onPress` and show the upgrade sheet instead of navigating.

---

### Pattern B — Account Limit Gate on "Add" Button
Used for: Add Pension (2nd+ provider), Add Savings Account (2nd+ account), Add Mortgage (2nd+).

When a free user taps "Add" and has already reached their limit:
- Show a bottom sheet titled **"Upgrade to add more"**
- Display their current usage: *"1 of 1 pension accounts used"*
- "Upgrade to Premium" CTA + "Cancel" dismiss

Free users can still fully use their one existing account — existing data is never hidden.

---

### Pattern C — Blurred Content Overlay
Used for: full-page premium features (Pension Insights, AI pages, Comparisons) if a free user navigates there directly (e.g. via deep link).

The page renders with a blurred/low-opacity overlay covering the main content, with a centred card:
- Lock icon (`lock`)
- Feature name headline
- One-line description
- "Upgrade to Premium →" button

The background content is intentionally partially visible to convey value without giving it away.

```
┌──────────────────────────────┐
│  [blurred chart content]     │
│  ┌────────────────────┐      │
│  │  🔒 Premium Feature │     │
│  │  Unlock Pension     │     │
│  │  Insights           │     │
│  │  [Upgrade →]        │     │
│  └────────────────────┘      │
└──────────────────────────────┘
```

---

### Pattern D — In-Card Teaser (partial lock)
Used for: AI teaser cards on the Pension Overview page (already exists as a static card linking to `/mobile/pension/ai`).

For free users, the existing "Optimize Your Future" teaser card remains visible but the CTA button becomes **"Unlock AI Insights"** linking to `/mobile/upgrade` instead of `/mobile/pension/ai`.

For premium users, the CTA reads **"See Deeper Insights"** and navigates normally.

---

## 3. Page-by-Page Gate Map

| Page / Feature | Free | Premium | Gate Pattern |
|---|---|---|---|
| `/mobile/dashboard` | ✅ Full | ✅ Full | — |
| `/mobile/pension` (Overview) | ✅ Full | ✅ Full | — |
| `/mobile/pension` (Insights tab) | 🔒 | ✅ | Pattern A (locked tab) |
| `/mobile/pension` (AI tab) | 🔒 | ✅ | Pattern A (locked tab) |
| `/mobile/pension` (Comparisons tab) | 🔒 | ✅ | Pattern A (locked tab) |
| `/mobile/pension/add` (1st account) | ✅ | ✅ | — |
| `/mobile/pension/add` (2nd+ account) | 🔒 | ✅ | Pattern B (add gate) |
| `/mobile/pension/calculator` | ✅ Full | ✅ Full | — |
| `/mobile/mortgage` (Overview) | ✅ Full | ✅ Full | — |
| `/mobile/mortgage` (Compare tab) | 🔒 | ✅ | Pattern A (locked tab) |
| `/mobile/mortgage` (AI tab) | 🔒 | ✅ | Pattern A (locked tab) |
| `/mobile/savings` (Overview) | ✅ Full | ✅ Full | — |
| `/mobile/savings/add` (1st account) | ✅ | ✅ | — |
| `/mobile/savings/add` (2nd+ account) | 🔒 | ✅ | Pattern B (add gate) |
| `/mobile/income` | ✅ Full | ✅ Full | — |
| AI teaser cards | 🔒 → Upgrade CTA | ✅ → AI page | Pattern D |

---

## 4. Plan Management Architecture

### 4.1 Firestore Schema

Plan state lives on the existing `users/{uid}` document:

```
users/{uid}/
  plan:             'free' | 'premium'     // required; defaults to 'free'
  planActivatedAt:  Timestamp | null
  planExpiresAt:    Timestamp | null       // null = no expiry (annual/lifetime)
  planInterval:     'monthly' | 'annual' | null
```

This keeps plan data co-located with existing user metadata (`fullName`, etc.) already read in `MobileSettingsPage.js`.

### 4.2 React Context — `UserPlanContext`

**File**: `src/contexts/UserPlanContext.js`

Reads `users/{uid}.plan` on auth state change. Exposes:

```js
const { isPremium, plan, planLoading } = useUserPlan();
```

All components replace the hardcoded `IS_PREMIUM` constant with `isPremium` from this context.

**Wrapped in**: `App.js` (or `MobileApp.js`) inside `AuthProvider`, so it's available app-wide.

### 4.3 Security Consideration

In the current implementation, Firestore rules allow users to write their own `users/{uid}` document. This means a sophisticated user could upgrade their own plan client-side. For MVP this is acceptable.

**Before public launch**: add a Firestore rule that prevents users from writing the `plan` field:

```js
match /users/{userId} {
  allow read: if isAuthenticated() && isOwner(userId);
  allow write: if isAuthenticated() && isOwner(userId)
    && !('plan' in request.resource.data.diff(resource.data).affectedKeys());
}
```

Plan updates would then only be possible via Firebase Admin SDK (backend/Cloud Functions).

### 4.4 Upgrading a User (Admin)

Use the script at `scripts/upgrade-user.js`. Pass the user's UID (found in Firebase Console → Authentication → Users):

```bash
node scripts/upgrade-user.js <uid> premium
```

Alternatively, set it manually in the **Firebase Console**:
1. Go to [console.firebase.google.com](https://console.firebase.google.com) → Project `money-6a32f`
2. Firestore Database → `users` collection
3. Find the document for the target user (document ID = UID, visible in Authentication tab)
4. Add/edit field: `plan` → `"premium"`

---

## 5. Implementation Roadmap

| Phase | Task | Status |
|---|---|---|
| 1 | `UserPlanContext.js` — reads plan from Firestore | ✅ Done |
| 1 | Replace `IS_PREMIUM` in `MobileSettingsPage.js` | ✅ Done |
| 1 | Replace `IS_PREMIUM` in `MobileNavDrawer.js` | ✅ Done |
| 1 | `scripts/upgrade-user.js` — admin upgrade tool | ✅ Done |
| 2 | Locked tab badges (Pattern A) on Pension + Mortgage navbars | ✅ Done |
| 2 | Add account gate (Pattern B) on Add Pension / Add Savings | ✅ Done |
| 2 | Blurred overlay gate (Pattern C) on premium pages | ✅ Done |
| 2 | AI teaser card CTA swap (Pattern D) | ✅ Done |
| 3 | Firestore security rule — prevent client-side plan writes | ⏳ Pre-launch |
| 3 | Backend plan management via Cloud Functions + payment provider | ⏳ Future |
