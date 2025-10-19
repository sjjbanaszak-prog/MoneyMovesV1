/**
 * AutoMapper - Intelligent field mapping with fuzzy matching and confidence scoring
 *
 * Features:
 * - Levenshtein distance for string similarity
 * - Synonym dictionaries for financial terms
 * - Context-aware field matching (pensions vs savings)
 * - Pattern-based validation (dates, amounts, etc.)
 * - Provider template learning and application
 */

/**
 * Calculate Levenshtein distance between two strings
 * Lower distance = more similar
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const matrix = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[s2.length][s1.length];
}

/**
 * Calculate string similarity score (0-100)
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-100)
 */
function stringSimilarity(str1, str2) {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;

  const distance = levenshteinDistance(str1, str2);
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

/**
 * Field synonym dictionaries for different contexts
 */
const FIELD_SYNONYMS = {
  pensions: {
    date: [
      "date",
      "contribution date",
      "payment date",
      "transaction date",
      "effective date",
      "date paid",
      "payment_date",
      "contrib_date",
      "trans_date",
    ],
    provider: [
      "provider",
      "pension provider",
      "scheme",
      "pension scheme",
      "company",
      "employer",
      "fund",
      "pension fund",
      "scheme name",
      "provider name",
      "plan name",
    ],
    amount: [
      "amount",
      "contribution",
      "payment",
      "amount paid",
      "contribution amount",
      "gross contribution",
      "net contribution",
      "total contribution",
      "value",
      "payment amount",
      "contrib_amount",
      "gross",
      "net",
      "total",
    ],
    employeeContribution: [
      "employee contribution",
      "employee",
      "member contribution",
      "personal contribution",
      "your contribution",
      "ee contribution",
      "ee_contrib",
    ],
    employerContribution: [
      "employer contribution",
      "employer",
      "company contribution",
      "matched contribution",
      "er contribution",
      "er_contrib",
    ],
  },
  savings: {
    date: [
      "date",
      "transaction date",
      "posting date",
      "value date",
      "date_posted",
      "trans_date",
    ],
    description: [
      "description",
      "transaction description",
      "details",
      "narrative",
      "memo",
      "payee",
      "reference",
      "trans_desc",
    ],
    debit: [
      "debit",
      "money out",
      "withdrawal",
      "debit amount",
      "paid out",
      "spent",
      "debits",
    ],
    credit: [
      "credit",
      "money in",
      "deposit",
      "credit amount",
      "paid in",
      "received",
      "credits",
    ],
    balance: [
      "balance",
      "account balance",
      "running balance",
      "current balance",
      "closing balance",
      "available balance",
    ],
    amount: [
      "amount",
      "transaction amount",
      "value",
      "total",
      "trans_amount",
    ],
  },
  debts: {
    date: [
      "date",
      "payment date",
      "transaction date",
      "due date",
      "date_paid",
    ],
    description: [
      "description",
      "transaction type",
      "payment type",
      "details",
      "reference",
    ],
    payment: [
      "payment",
      "amount paid",
      "payment amount",
      "value",
      "total payment",
    ],
    balance: [
      "balance",
      "outstanding balance",
      "remaining balance",
      "balance outstanding",
      "amount owed",
    ],
    interestCharged: [
      "interest",
      "interest charged",
      "interest rate",
      "apr",
      "charges",
    ],
  },
};

/**
 * Get expected fields for a given context
 *
 * @param {string} context - Context type (pensions, savings, debts, etc.)
 * @returns {Object} Expected field schema
 */
export function getContextSchema(context) {
  const schemas = {
    pensions: {
      required: ["date", "provider", "amount"],
      optional: ["employeeContribution", "employerContribution"],
      validation: {
        date: (value) => /\d/.test(value), // Contains digits
        amount: (value) =>
          /^[£$€]?\s*\d+([,\.]\d+)*(\.\d{2})?$/.test(String(value).trim()),
      },
    },
    savings: {
      required: ["date"],
      optional: ["description", "debit", "credit", "balance", "amount"],
      validation: {
        date: (value) => /\d/.test(value),
        balance: (value) =>
          /^-?[£$€]?\s*\d+([,\.]\d+)*(\.\d{2})?$/.test(String(value).trim()),
        debit: (value) =>
          !value || /^[£$€]?\s*\d+([,\.]\d+)*(\.\d{2})?$/.test(String(value).trim()),
        credit: (value) =>
          !value || /^[£$€]?\s*\d+([,\.]\d+)*(\.\d{2})?$/.test(String(value).trim()),
      },
    },
    debts: {
      required: ["date", "payment", "balance"],
      optional: ["description", "interestCharged"],
      validation: {
        date: (value) => /\d/.test(value),
        payment: (value) =>
          /^[£$€]?\s*\d+([,\.]\d+)*(\.\d{2})?$/.test(String(value).trim()),
        balance: (value) =>
          /^-?[£$€]?\s*\d+([,\.]\d+)*(\.\d{2})?$/.test(String(value).trim()),
      },
    },
  };

  return schemas[context] || schemas.savings;
}

/**
 * Match a header to possible field types using fuzzy matching and synonyms
 *
 * @param {string} header - CSV header to match
 * @param {string} context - Context type (pensions, savings, etc.)
 * @param {Array} data - Sample data rows for pattern validation
 * @returns {Array} Sorted array of matches: [{field, confidence, method}]
 */
export function matchHeader(header, context, data = []) {
  const synonyms = FIELD_SYNONYMS[context] || FIELD_SYNONYMS.savings;
  const headerLower = header.toLowerCase().trim();
  const matches = [];

  // Test each field type
  Object.entries(synonyms).forEach(([fieldType, fieldSynonyms]) => {
    let bestScore = 0;
    let matchMethod = "none";

    // Check for exact match
    if (fieldSynonyms.includes(headerLower)) {
      bestScore = 100;
      matchMethod = "exact_match";
    }
    // Check for substring match
    else if (
      fieldSynonyms.some((syn) => headerLower.includes(syn) || syn.includes(headerLower))
    ) {
      const matchingSynonym = fieldSynonyms.find(
        (syn) => headerLower.includes(syn) || syn.includes(headerLower)
      );
      bestScore = 85;
      matchMethod = `substring_match:${matchingSynonym}`;
    }
    // Fuzzy string similarity
    else {
      fieldSynonyms.forEach((synonym) => {
        const similarity = stringSimilarity(headerLower, synonym);
        if (similarity > bestScore) {
          bestScore = similarity;
          matchMethod = `fuzzy_match:${synonym}`;
        }
      });
    }

    // Pattern validation bonus
    if (data.length > 0 && bestScore > 0) {
      const schema = getContextSchema(context);
      const validator = schema.validation?.[fieldType];

      if (validator) {
        const sampleValues = data.slice(0, 10).map((row) => row[header]);
        const validCount = sampleValues.filter((val) => validator(val)).length;
        const validRate = validCount / sampleValues.length;

        if (validRate > 0.7) {
          bestScore = Math.min(100, bestScore + validRate * 15);
          matchMethod += "+pattern_validation";
        } else if (validRate < 0.3) {
          bestScore = Math.max(0, bestScore - 20);
          matchMethod += "-pattern_mismatch";
        }
      }
    }

    if (bestScore > 40) {
      // Only include reasonable matches
      matches.push({
        field: fieldType,
        confidence: Math.round(bestScore),
        method: matchMethod,
      });
    }
  });

  // Sort by confidence (descending)
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Auto-map all headers in a CSV file to field types
 *
 * @param {Array} headers - Array of CSV headers
 * @param {string} context - Context type (pensions, savings, etc.)
 * @param {Array} data - Sample data rows
 * @param {Object} providerTemplate - Optional provider-specific template
 * @returns {Object} { mapping, confidence, suggestions }
 */
export function autoMapHeaders(
  headers,
  context,
  data = [],
  providerTemplate = null
) {
  const mapping = {};
  const confidenceScores = {};
  const suggestions = {};
  const unmappedHeaders = [];

  // Apply provider template if available
  if (providerTemplate?.fieldMappings) {
    providerTemplate.fieldMappings.forEach((pm) => {
      const matchingHeader = headers.find(
        (h) => h.toLowerCase() === pm.originalHeader.toLowerCase()
      );

      if (matchingHeader) {
        mapping[pm.mappedField] = matchingHeader;
        confidenceScores[pm.mappedField] = Math.min(
          100,
          pm.confidence + 10 // Template bonus
        );
        suggestions[pm.mappedField] = [
          {
            field: pm.mappedField,
            confidence: confidenceScores[pm.mappedField],
            method: "provider_template",
          },
        ];
      }
    });
  }

  // Map remaining headers
  headers.forEach((header) => {
    // Skip if already mapped via template
    if (Object.values(mapping).includes(header)) return;

    const matches = matchHeader(header, context, data);

    if (matches.length > 0) {
      const bestMatch = matches[0];

      // Only auto-assign if confidence is high and field not already mapped
      if (bestMatch.confidence >= 65 && !mapping[bestMatch.field]) {
        mapping[bestMatch.field] = header;
        confidenceScores[bestMatch.field] = bestMatch.confidence;
      }

      // Store all suggestions for user review
      suggestions[header] = matches;
    } else {
      unmappedHeaders.push(header);
    }
  });

  // Calculate overall confidence
  const scores = Object.values(confidenceScores);
  const overallConfidence =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  // Check if required fields are mapped
  const schema = getContextSchema(context);
  const missingRequired = schema.required.filter(
    (field) => !mapping[field]
  );

  return {
    mapping,
    confidenceScores,
    overallConfidence,
    suggestions,
    unmappedHeaders,
    missingRequired,
    isComplete: missingRequired.length === 0,
  };
}

/**
 * Validate a mapping against data
 *
 * @param {Object} mapping - Field mapping {field: header}
 * @param {Array} data - Data rows
 * @param {string} context - Context type
 * @returns {Object} Validation results
 */
export function validateMapping(mapping, data, context) {
  const schema = getContextSchema(context);
  const validationResults = {};
  const errors = [];
  const warnings = [];

  Object.entries(mapping).forEach(([field, header]) => {
    const validator = schema.validation?.[field];
    if (!validator) return;

    const values = data.slice(0, 20).map((row) => row[header]);
    const validValues = values.filter(validator);
    const validRate = validValues.length / values.length;

    validationResults[field] = {
      validCount: validValues.length,
      totalCount: values.length,
      validRate: Math.round(validRate * 100),
    };

    if (validRate < 0.5) {
      errors.push({
        field,
        header,
        message: `Only ${Math.round(validRate * 100)}% of values appear valid for ${field}`,
        severity: "error",
      });
    } else if (validRate < 0.8) {
      warnings.push({
        field,
        header,
        message: `${Math.round(validRate * 100)}% of values appear valid for ${field}. Some data may be malformed.`,
        severity: "warning",
      });
    }
  });

  // Check for missing required fields
  schema.required.forEach((field) => {
    if (!mapping[field]) {
      errors.push({
        field,
        message: `Required field '${field}' is not mapped`,
        severity: "error",
      });
    }
  });

  const isValid = errors.length === 0;
  const score = isValid
    ? 100 - warnings.length * 10
    : Math.max(0, 50 - errors.length * 15);

  return {
    isValid,
    score,
    validationResults,
    errors,
    warnings,
  };
}

/**
 * Generate mapping suggestions for unmapped fields
 *
 * @param {Array} unmappedHeaders - Headers that couldn't be auto-mapped
 * @param {Array} unmappedFields - Required fields not yet mapped
 * @param {string} context - Context type
 * @param {Array} data - Sample data
 * @returns {Array} Suggestions
 */
export function generateSuggestions(
  unmappedHeaders,
  unmappedFields,
  context,
  data
) {
  const suggestions = [];

  unmappedFields.forEach((field) => {
    const fieldSuggestions = unmappedHeaders
      .map((header) => {
        const matches = matchHeader(header, context, data);
        const fieldMatch = matches.find((m) => m.field === field);
        return fieldMatch
          ? { header, confidence: fieldMatch.confidence }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.confidence - a.confidence);

    if (fieldSuggestions.length > 0) {
      suggestions.push({
        field,
        suggestions: fieldSuggestions,
      });
    }
  });

  return suggestions;
}
