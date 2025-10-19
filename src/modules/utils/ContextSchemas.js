/**
 * ContextSchemas - Defines expected data structures and validation rules
 * for each Money Moves module context
 */

export const CONTEXT_TYPES = {
  PENSIONS: "pensions",
  SAVINGS: "savings",
  DEBTS: "debts",
  INVESTMENTS: "investments",
};

/**
 * Module context configurations
 */
export const CONTEXT_SCHEMAS = {
  pensions: {
    label: "Pensions",
    description: "Pension contribution and provider data",
    icon: "piggy-bank",
    requiredFields: [
      {
        key: "date",
        label: "Date Column",
        description: "Date when the pension contribution was made",
        type: "date",
        examples: ["01/04/2024", "2024-04-01", "1 Apr 2024"],
      },
      {
        key: "amount",
        label: "Amount Column",
        description: "Total contribution amount (£)",
        type: "currency",
        examples: ["£250.00", "250", "250.00"],
      },
    ],
    optionalFields: [
      {
        key: "description",
        label: "Description Column",
        description: "Optional description or reference for the contribution",
        type: "text",
      },
    ],
    firestoreCollection: "pensionPots",
    processingNotes:
      "Groups contributions by pension year (April 6 - April 5) and provider",
  },

  savings: {
    label: "Savings",
    description: "Bank account transactions and balances",
    icon: "wallet",
    requiredFields: [
      {
        key: "date",
        label: "Transaction Date",
        description: "Date of the transaction",
        type: "date",
        examples: ["01/04/2024", "2024-04-01"],
      },
    ],
    optionalFields: [
      {
        key: "description",
        label: "Transaction Description",
        description: "Details of the transaction",
        type: "text",
        examples: ["Direct Debit to UTILITY CO", "SALARY PAYMENT"],
      },
      {
        key: "debit",
        label: "Debit (Money Out)",
        description: "Amount withdrawn or spent",
        type: "currency",
        examples: ["£50.00", "50", "50.00"],
      },
      {
        key: "credit",
        label: "Credit (Money In)",
        description: "Amount deposited or received",
        type: "currency",
        examples: ["£1500.00", "1500", "1500.00"],
      },
      {
        key: "balance",
        label: "Account Balance",
        description: "Balance after transaction",
        type: "currency",
        examples: ["£2450.00", "2450", "2450.00"],
      },
      {
        key: "amount",
        label: "Transaction Amount",
        description: "Absolute transaction value",
        type: "currency",
        examples: ["£50.00", "-£50.00", "50"],
      },
    ],
    firestoreCollection: "savingsTracker",
    processingNotes:
      "Requires either balance OR debit/credit columns to track account movement",
  },

  debts: {
    label: "Debts",
    description: "Debt account transactions and balances",
    icon: "credit-card",
    requiredFields: [
      {
        key: "date",
        label: "Payment Date",
        description: "Date of payment or transaction",
        type: "date",
        examples: ["01/04/2024", "2024-04-01"],
      },
      {
        key: "payment",
        label: "Payment Amount",
        description: "Amount paid towards debt",
        type: "currency",
        examples: ["£100.00", "100", "100.00"],
      },
      {
        key: "balance",
        label: "Outstanding Balance",
        description: "Remaining debt balance",
        type: "currency",
        examples: ["£2500.00", "2500", "2500.00"],
      },
    ],
    optionalFields: [
      {
        key: "description",
        label: "Transaction Description",
        description: "Payment type or transaction details",
        type: "text",
        examples: ["Monthly Payment", "Additional Payment", "Purchase"],
      },
      {
        key: "interestCharged",
        label: "Interest Charged",
        description: "Interest added to balance",
        type: "currency",
        examples: ["£15.50", "15.50"],
      },
      {
        key: "fees",
        label: "Fees Charged",
        description: "Any additional fees",
        type: "currency",
        examples: ["£5.00", "5.00"],
      },
    ],
    firestoreCollection: "debts",
    processingNotes:
      "Tracks debt reduction over time and calculates interest costs",
  },

  investments: {
    label: "Investments",
    description: "Investment transactions (buy, sell, dividends)",
    icon: "trending-up",
    requiredFields: [
      {
        key: "date",
        label: "Transaction Date",
        description: "Date of the investment transaction",
        type: "date",
        examples: ["01/04/2024", "2024-04-01"],
      },
      {
        key: "action",
        label: "Action Type",
        description: "Type of transaction",
        type: "select",
        options: ["Buy", "Sell", "Dividend", "Interest"],
        examples: ["Market buy", "Limit sell", "Dividend payment"],
      },
      {
        key: "ticker",
        label: "Ticker Symbol",
        description: "Stock or fund identifier",
        type: "text",
        examples: ["VUSA", "AAPL", "VWRL"],
      },
      {
        key: "shares",
        label: "Number of Shares",
        description: "Quantity bought or sold",
        type: "number",
        examples: ["10", "2.5", "100"],
      },
      {
        key: "pricePerShare",
        label: "Price Per Share",
        description: "Share price at transaction",
        type: "currency",
        examples: ["£85.50", "85.50"],
      },
      {
        key: "total",
        label: "Total Value",
        description: "Total transaction value",
        type: "currency",
        examples: ["£855.00", "855.00"],
      },
    ],
    optionalFields: [
      {
        key: "currency",
        label: "Currency",
        description: "Transaction currency",
        type: "text",
        examples: ["GBP", "USD", "EUR"],
      },
      {
        key: "exchangeRate",
        label: "Exchange Rate",
        description: "FX rate if currency conversion occurred",
        type: "number",
        examples: ["1.27", "1.1"],
      },
      {
        key: "fees",
        label: "Transaction Fees",
        description: "Broker fees or charges",
        type: "currency",
        examples: ["£0.00", "5.00"],
      },
    ],
    firestoreCollection: "investments",
    processingNotes:
      "Calculates portfolio performance, cost basis, and realized gains/losses",
  },
};

/**
 * Get schema for a specific context
 *
 * @param {string} context - Context type
 * @returns {Object} Context schema
 */
export function getContextSchema(context) {
  return CONTEXT_SCHEMAS[context] || CONTEXT_SCHEMAS.savings;
}

/**
 * Get all field definitions for a context (required + optional)
 *
 * @param {string} context - Context type
 * @returns {Array} All field definitions
 */
export function getAllFields(context) {
  const schema = getContextSchema(context);
  return [...schema.requiredFields, ...schema.optionalFields];
}

/**
 * Get field definition by key
 *
 * @param {string} context - Context type
 * @param {string} fieldKey - Field key
 * @returns {Object|null} Field definition
 */
export function getFieldDefinition(context, fieldKey) {
  const allFields = getAllFields(context);
  return allFields.find((f) => f.key === fieldKey) || null;
}

/**
 * Check if a field is required in a context
 *
 * @param {string} context - Context type
 * @param {string} fieldKey - Field key
 * @returns {boolean}
 */
export function isRequiredField(context, fieldKey) {
  const schema = getContextSchema(context);
  return schema.requiredFields.some((f) => f.key === fieldKey);
}

/**
 * Data type validators
 */
export const VALIDATORS = {
  date: (value) => {
    if (!value) return false;
    const str = String(value).trim();
    // Check for date-like patterns
    return (
      /\d{1,4}[\s,.\-/]\d{1,2}[\s,.\-/]\d{1,4}/.test(str) || // DD/MM/YYYY, YYYY-MM-DD, etc.
      /\d{1,2}\s+[A-Za-z]{3}/.test(str) || // DD MMM YYYY
      /[A-Za-z]{3}\s+\d{1,2}/.test(str) // MMM DD YYYY
    );
  },

  currency: (value) => {
    if (!value) return true; // Empty values allowed for optional fields
    const str = String(value).trim();
    // Match currency formats: £100, 100.50, -£50.00, etc.
    return /^-?[£$€]?\s*\d+([,\.]\d{3})*(\.\d{2})?$/.test(str);
  },

  number: (value) => {
    if (!value) return true;
    const str = String(value).trim();
    return /^-?\d+(\.\d+)?$/.test(str);
  },

  text: (value) => {
    return value && String(value).trim().length > 0;
  },

  select: (value, options = []) => {
    if (!value) return false;
    const str = String(value).toLowerCase().trim();
    return options.some((opt) => opt.toLowerCase().includes(str) || str.includes(opt.toLowerCase()));
  },
};

/**
 * Validate a data value against a field definition
 *
 * @param {*} value - Value to validate
 * @param {Object} fieldDef - Field definition from schema
 * @returns {boolean}
 */
export function validateFieldValue(value, fieldDef) {
  const validator = VALIDATORS[fieldDef.type];
  if (!validator) return true; // No validator = always valid

  if (fieldDef.type === "select") {
    return validator(value, fieldDef.options);
  }

  return validator(value);
}

/**
 * Get human-readable field type description
 *
 * @param {string} type - Field type
 * @returns {string}
 */
export function getTypeDescription(type) {
  const descriptions = {
    date: "Date (e.g., DD/MM/YYYY, 01 Jan 2024)",
    currency: "Currency amount (e.g., £100.00, 100)",
    number: "Numeric value (e.g., 10, 2.5)",
    text: "Text description",
    select: "Predefined option",
  };

  return descriptions[type] || "Text";
}
