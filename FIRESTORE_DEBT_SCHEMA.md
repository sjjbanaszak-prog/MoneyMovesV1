# Firestore Schema for Debt Management Module

## Collection: `userDebts`

User debt data with repayment strategies and tracking.

### Document Structure

**Document ID**: `{userId}` (matches Firebase Auth UID)

```javascript
{
  // User reference
  userId: "string",                    // Firebase Auth UID

  // Debts array
  debts: [
    {
      debtName: "string",              // e.g., "Barclaycard Visa"
      debtType: "string",              // "Credit Card", "Personal Loan", "Car Finance", etc.
      balance: number,                 // Current outstanding balance in £
      originalBalance: number,         // Original debt amount for progress tracking
      interestRate: number,            // Annual percentage rate (APR)
      minimumPayment: number,          // Minimum monthly payment in £
      currentPayment: number,          // Actual monthly payment in £
      createdAt: "timestamp",          // ISO date string
      updatedAt: "timestamp"           // ISO date string
    }
  ],

  // Strategy settings
  selectedStrategy: "string",          // "snowball", "avalanche", "custom"
  monthlyBudget: number,               // Total monthly repayment budget in £

  // User preferences
  preferences: {
    showComparison: boolean,           // Show strategy comparison
    notificationsEnabled: boolean,     // Enable progress notifications
    currency: "string"                 // Default: "GBP"
  },

  // Metadata
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

## Subcollection: `repayment_schedules`

**Path**: `/userDebts/{userId}/repayment_schedules/{scheduleId}`

Calculated repayment schedules for each strategy.

```javascript
{
  strategy: "string",                  // "snowball" or "avalanche"
  calculatedAt: "timestamp",           // When this schedule was generated
  debtFreeDate: "string",              // Projected debt-free date
  monthsToPayoff: number,              // Total months until debt-free
  totalInterest: number,               // Total interest to be paid
  totalPaid: number,                   // Total amount to be paid

  // Monthly payment schedule
  schedule: [
    {
      month: number,                   // Month number (1-based)
      date: "string",                  // Month/Year string
      payments: [
        {
          debtName: "string",
          payment: number,
          interest: number,
          principal: number,
          remainingBalance: number,
          type: "string"               // "minimum" or "extra"
        }
      ],
      totalPayment: number,
      totalInterest: number,
      totalPrincipal: number,
      remainingDebts: number
    }
  ],

  // Per-debt summary
  debtDetails: [
    {
      debtName: "string",
      originalBalance: number,
      interestRate: number,
      totalInterestPaid: number,
      payoffMonth: number,
      payoffDate: "string"
    }
  ]
}
```

## Subcollection: `statements` (Phase 2 - Future)

**Path**: `/userDebts/{userId}/statements/{statementId}`

Uploaded debt provider statements for spending analysis.

```javascript
{
  provider: "string",                  // "Barclaycard", "Amex", etc.
  debtName: "string",                  // Link to debt in main document
  uploadDate: "timestamp",
  fileType: "string",                  // "csv", "xlsx", "pdf"
  fileName: "string",
  parsed: boolean,
  categoriesGenerated: boolean,
  dateRange: {
    start: "timestamp",
    end: "timestamp"
  },
  summary: {
    totalTransactions: number,
    totalSpending: number,
    categoryCounts: object             // { "Groceries": 45, "Travel": 12, ... }
  }
}
```

## Subcollection: `transactions` (Phase 2 - Future)

**Path**: `/userDebts/{userId}/transactions/{transactionId}`

Individual transactions from uploaded statements.

```javascript
{
  sourceStatementId: "string",         // Reference to statement document
  debtName: "string",                  // Which debt this transaction is on
  transactionDate: "timestamp",
  description: "string",               // Merchant/description
  amount: number,                      // Transaction amount in £
  type: "string",                      // "purchase", "payment", "interest", "fee"
  category: "string",                  // AI-categorized or user-defined
  categoryConfidence: number,          // 0-1 confidence score for auto-categorization
  userEdited: boolean,                 // Did user manually edit category?
  merchant: "string",                  // Extracted merchant name
  createdAt: "timestamp"
}
```

## Category Taxonomy (Phase 2 - Future)

Standardized spending categories for transaction classification:

```javascript
const SPENDING_CATEGORIES = {
  // Essential
  "Groceries": { icon: "🛒", type: "essential" },
  "Utilities": { icon: "💡", type: "essential" },
  "Housing": { icon: "🏠", type: "essential" },
  "Transport": { icon: "🚗", type: "essential" },
  "Healthcare": { icon: "🏥", type: "essential" },

  // Discretionary
  "Dining Out": { icon: "🍔", type: "discretionary" },
  "Entertainment": { icon: "🎬", type: "discretionary" },
  "Shopping": { icon: "🛍️", type: "discretionary" },
  "Travel": { icon: "✈️", type: "discretionary" },
  "Subscriptions": { icon: "📱", type: "discretionary" },

  // Financial
  "Debt Payment": { icon: "💳", type: "financial" },
  "Savings": { icon: "💰", type: "financial" },
  "Investments": { icon: "📈", type: "financial" },

  // Other
  "Income": { icon: "💷", type: "income" },
  "Fees": { icon: "⚠️", type: "fees" },
  "Other": { icon: "📋", type: "other" }
};
```

## Data Access Patterns

### Read Operations
1. **Get user debts**: `userDebts/{userId}`
2. **Get repayment schedule**: `userDebts/{userId}/repayment_schedules/{strategy}`
3. **Get statements**: `userDebts/{userId}/statements` (ordered by uploadDate)
4. **Get transactions by category**: `userDebts/{userId}/transactions` (where category == X)

### Write Operations
1. **Add/Update debts**: Update `userDebts/{userId}.debts` array
2. **Save repayment schedule**: Write to `repayment_schedules` subcollection
3. **Upload statement**: Add document to `statements` subcollection
4. **Categorize transactions**: Batch write to `transactions` subcollection

### Aggregate Queries (Phase 2)
1. **Spending by category**: Aggregate `transactions` by category
2. **Monthly spending trends**: Group transactions by month
3. **Top merchants**: Count transactions by merchant

## Example Document

```javascript
// /userDebts/abc123xyz
{
  userId: "abc123xyz",
  debts: [
    {
      debtName: "Barclaycard Visa",
      debtType: "Credit Card",
      balance: 5000.00,
      originalBalance: 8000.00,
      interestRate: 18.9,
      minimumPayment: 150.00,
      currentPayment: 200.00,
      createdAt: "2025-10-01T10:00:00.000Z",
      updatedAt: "2025-10-20T14:30:00.000Z"
    },
    {
      debtName: "HSBC Personal Loan",
      debtType: "Personal Loan",
      balance: 12000.00,
      originalBalance: 15000.00,
      interestRate: 6.9,
      minimumPayment: 350.00,
      currentPayment: 350.00,
      createdAt: "2024-03-15T09:00:00.000Z",
      updatedAt: "2025-10-20T14:30:00.000Z"
    }
  ],
  selectedStrategy: "avalanche",
  monthlyBudget: 600.00,
  preferences: {
    showComparison: true,
    notificationsEnabled: false,
    currency: "GBP"
  },
  createdAt: "2025-10-01T10:00:00.000Z",
  updatedAt: "2025-10-20T14:30:00.000Z"
}
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // User Debts - main collection
    match /userDebts/{userId} {
      allow read: if isAuthenticated() && isOwner(userId);
      allow write: if isAuthenticated() && isOwner(userId);

      // Repayment Schedules subcollection
      match /repayment_schedules/{scheduleId} {
        allow read: if isAuthenticated() && isOwner(userId);
        allow write: if isAuthenticated() && isOwner(userId);
      }

      // Statements subcollection (Phase 2)
      match /statements/{statementId} {
        allow read: if isAuthenticated() && isOwner(userId);
        allow write: if isAuthenticated() && isOwner(userId);
      }

      // Transactions subcollection (Phase 2)
      match /transactions/{transactionId} {
        allow read: if isAuthenticated() && isOwner(userId);
        allow write: if isAuthenticated() && isOwner(userId);
      }
    }
  }
}
```

## Data Migration Notes

1. **From localStorage to Firestore**: If implementing local storage first, provide migration utility
2. **Schema versioning**: Include `schemaVersion` field for future migrations
3. **Backwards compatibility**: Maintain support for older data structures during transitions

## Performance Considerations

1. **Denormalization**: Store calculated totals in main document to avoid subcollection reads
2. **Pagination**: Implement pagination for transactions list (Phase 2)
3. **Caching**: Use Firestore offline persistence for debts data
4. **Batch writes**: Use batch operations when saving multiple debts or schedules
5. **Indexes**: Create composite indexes for transaction queries by category + date

## Privacy & Compliance

1. **Data retention**: Implement user data deletion on account closure
2. **PII handling**: Debt names may contain sensitive information - encrypt if needed
3. **FCA compliance**: Transaction categorization must be read-only (Open Banking principles)
4. **Audit trail**: Log all debt modifications with timestamps

---

**Status**: Phase 1 schema (debts + repayment_schedules) ready for implementation
**Next**: Phase 2 will add statements + transactions for spending analysis
