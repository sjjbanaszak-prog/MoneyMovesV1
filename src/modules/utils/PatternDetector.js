import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * PatternDetector - Intelligent date format and payment frequency detection
 *
 * Analyzes date columns to determine:
 * 1. Date format (DD/MM/YYYY vs MM/DD/YYYY, etc.)
 * 2. Payment frequency (weekly, monthly, quarterly, annual, irregular)
 * 3. Confidence scores for detected patterns
 */

// Known date formats to test (ordered by commonality in UK financial data)
const DATE_FORMATS = [
  "DD/MM/YYYY",
  "DD-MM-YYYY",
  "DD.MM.YYYY",
  "D/M/YYYY",
  "D-M-YYYY",
  "DD/MM/YY",
  "D/M/YY",
  "YYYY-MM-DD", // ISO format
  "MM/DD/YYYY", // US format
  "M/D/YYYY",
  "DD MMM YYYY", // 15 Jan 2024
  "D MMM YYYY", // 5 Jan 2024
  "DD MMMM YYYY", // 15 January 2024
  "MMMM D, YYYY", // January 15, 2024
  "MMM D, YYYY", // Jan 15, 2024
  "YYYY/MM/DD",
  "DD/MM/YYYY HH:mm:ss",
  "YYYY-MM-DD HH:mm:ss",
  "DD/MM/YYYY HH:mm",
];

// Frequency thresholds in days (with tolerance)
const FREQUENCY_PATTERNS = {
  weekly: { target: 7, tolerance: 2, label: "Weekly" },
  biweekly: { target: 14, tolerance: 3, label: "Bi-weekly" },
  monthly: { target: 30, tolerance: 5, label: "Monthly" },
  quarterly: { target: 91, tolerance: 10, label: "Quarterly" },
  annual: { target: 365, tolerance: 15, label: "Annual" },
};

/**
 * Detect date format from an array of date values
 *
 * @param {string[]} dateValues - Array of date strings to analyze
 * @param {number} sampleSize - Number of dates to test (default: 20)
 * @returns {Object} { format, confidence, parsedDates }
 */
export function detectDateFormat(dateValues, sampleSize = 20) {
  if (!dateValues || dateValues.length === 0) {
    return { format: null, confidence: 0, parsedDates: [], method: "none" };
  }

  // Clean and filter valid date-like strings
  const cleanDates = dateValues
    .filter(Boolean)
    .map((d) => String(d).trim())
    .filter((d) => d.length > 0)
    .slice(0, sampleSize);

  if (cleanDates.length === 0) {
    return { format: null, confidence: 0, parsedDates: [], method: "none" };
  }

  // Test each format and count successful parses
  const formatScores = {};

  DATE_FORMATS.forEach((format) => {
    let validParses = 0;
    let chronologicallyValid = 0;
    const parsedDates = [];

    cleanDates.forEach((dateStr) => {
      const parsed = dayjs(dateStr, format, true);

      if (parsed.isValid()) {
        const year = parsed.year();
        // Validate reasonable year range (1900-2100)
        if (year >= 1900 && year <= 2100) {
          validParses++;
          parsedDates.push(parsed);
        }
      }
    });

    // Check chronological consistency (dates should be in reasonable order)
    if (parsedDates.length >= 2) {
      for (let i = 1; i < parsedDates.length; i++) {
        const diff = Math.abs(parsedDates[i].diff(parsedDates[i - 1], "day"));
        // If dates are within 5 years of each other, consider chronologically valid
        if (diff < 1825) {
          chronologicallyValid++;
        }
      }
    }

    const parseRate = validParses / cleanDates.length;
    const chronologyRate =
      parsedDates.length >= 2
        ? chronologicallyValid / (parsedDates.length - 1)
        : 1;

    // Combined score: 70% parse success, 30% chronological consistency
    formatScores[format] = {
      score: parseRate * 0.7 + chronologyRate * 0.3,
      validParses,
      parsedDates,
    };
  });

  // Find best format
  const sortedFormats = Object.entries(formatScores).sort(
    (a, b) => b[1].score - a[1].score
  );

  if (sortedFormats.length === 0 || sortedFormats[0][1].score < 0.5) {
    return { format: null, confidence: 0, parsedDates: [], method: "none" };
  }

  const [bestFormat, bestScore] = sortedFormats[0];
  const confidence = Math.round(bestScore.score * 100);

  // Additional ambiguity detection for DD/MM vs MM/DD
  let method = "pattern_matching";
  if (
    (bestFormat.includes("DD/MM") || bestFormat.includes("MM/DD")) &&
    confidence < 95
  ) {
    method = "ambiguity_resolved";
    // Use numeric analysis to disambiguate
    const disambiguation = disambiguateDDMMvsMMDD(cleanDates);
    if (disambiguation.format) {
      return {
        format: disambiguation.format,
        confidence: disambiguation.confidence,
        parsedDates: disambiguation.parsedDates,
        method: "numeric_analysis",
      };
    }
  }

  return {
    format: bestFormat,
    confidence,
    parsedDates: bestScore.parsedDates,
    method,
  };
}

/**
 * Disambiguate between DD/MM/YYYY and MM/DD/YYYY formats
 * Uses numeric range analysis: if first number >12, must be DD/MM
 *
 * @param {string[]} dateValues - Array of date strings
 * @returns {Object} { format, confidence, parsedDates }
 */
function disambiguateDDMMvsMMDD(dateValues) {
  let ddmmScore = 0;
  let mmddScore = 0;

  dateValues.slice(0, 30).forEach((dateStr) => {
    // Extract first two numeric parts
    const parts = dateStr.split(/[\s,.\-/]+/).filter((p) => /^\d+$/.test(p));

    if (parts.length >= 2) {
      const first = parseInt(parts[0], 10);
      const second = parseInt(parts[1], 10);

      // If first number > 12, must be DD/MM
      if (first > 12 && second <= 12) {
        ddmmScore += 2;
      }
      // If second number > 12, must be MM/DD
      else if (second > 12 && first <= 12) {
        mmddScore += 2;
      }
      // Both <= 12: use UK preference (DD/MM more common)
      else if (first <= 12 && second <= 12) {
        ddmmScore += 0.5; // Slight preference for DD/MM in UK context
      }
    }
  });

  const total = ddmmScore + mmddScore;
  if (total === 0) {
    return { format: null, confidence: 0, parsedDates: [] };
  }

  const isDDMM = ddmmScore > mmddScore;
  const format = isDDMM ? "DD/MM/YYYY" : "MM/DD/YYYY";
  const confidence = Math.round(
    (Math.max(ddmmScore, mmddScore) / total) * 100
  );

  // Parse dates with determined format
  const parsedDates = dateValues
    .slice(0, 30)
    .map((d) => dayjs(d, format, true))
    .filter((d) => d.isValid());

  return { format, confidence, parsedDates };
}

/**
 * Detect payment frequency from parsed dates
 *
 * @param {dayjs[]} dates - Array of parsed dayjs objects (should be sorted)
 * @param {number} minSamples - Minimum samples needed for reliable detection
 * @returns {Object} { frequency, confidence, averageInterval, pattern }
 */
export function detectFrequency(dates, minSamples = 3) {
  if (!dates || dates.length < minSamples) {
    return {
      frequency: "insufficient_data",
      label: "Insufficient Data",
      confidence: 0,
      averageInterval: null,
      pattern: null,
    };
  }

  // Sort dates chronologically
  const sortedDates = [...dates].sort((a, b) => a.unix() - b.unix());

  // Calculate intervals between consecutive dates
  const intervals = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = sortedDates[i].diff(sortedDates[i - 1], "day");
    if (diff > 0) {
      intervals.push(diff);
    }
  }

  if (intervals.length === 0) {
    return {
      frequency: "irregular",
      label: "Irregular",
      confidence: 0,
      averageInterval: null,
      pattern: null,
    };
  }

  // Calculate average interval
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  // Calculate standard deviation for consistency check
  const variance =
    intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - avgInterval, 2);
    }, 0) / intervals.length;
  const stdDev = Math.sqrt(variance);

  // Match to known frequency patterns
  let bestMatch = null;
  let bestMatchScore = 0;

  Object.entries(FREQUENCY_PATTERNS).forEach(([key, pattern]) => {
    const deviation = Math.abs(avgInterval - pattern.target);

    if (deviation <= pattern.tolerance) {
      // Score based on how close to target and how consistent intervals are
      const proximityScore = 1 - deviation / pattern.tolerance;
      const consistencyScore = Math.max(
        0,
        1 - stdDev / (pattern.tolerance * 2)
      );
      const score = proximityScore * 0.6 + consistencyScore * 0.4;

      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestMatch = {
          frequency: key,
          label: pattern.label,
          confidence: Math.round(score * 100),
          averageInterval: Math.round(avgInterval),
          pattern: pattern.target,
          standardDeviation: Math.round(stdDev * 10) / 10,
        };
      }
    }
  });

  // If no pattern matched, classify as irregular or custom
  if (!bestMatch) {
    // Check if consistent but non-standard frequency
    const isConsistent = stdDev < avgInterval * 0.3;

    if (isConsistent) {
      return {
        frequency: "custom",
        label: `Every ${Math.round(avgInterval)} days`,
        confidence: Math.round(
          Math.max(0, 1 - stdDev / avgInterval) * 100
        ),
        averageInterval: Math.round(avgInterval),
        pattern: Math.round(avgInterval),
        standardDeviation: Math.round(stdDev * 10) / 10,
      };
    }

    return {
      frequency: "irregular",
      label: "Irregular",
      confidence: 50,
      averageInterval: Math.round(avgInterval),
      pattern: null,
      standardDeviation: Math.round(stdDev * 10) / 10,
    };
  }

  return bestMatch;
}

/**
 * Analyze a column of dates and return comprehensive pattern information
 *
 * @param {string[]} dateValues - Array of date strings
 * @returns {Object} Complete pattern analysis
 */
export function analyzePatterns(dateValues) {
  // Detect date format
  const formatResult = detectDateFormat(dateValues);

  if (!formatResult.format || formatResult.parsedDates.length === 0) {
    return {
      dateFormat: null,
      confidence: 0,
      frequency: null,
      summary: "Unable to detect date pattern",
      details: {
        totalDates: dateValues.length,
        validDates: 0,
        dateRange: null,
      },
    };
  }

  // Detect frequency
  const frequencyResult = detectFrequency(formatResult.parsedDates);

  // Calculate date range
  const sortedDates = [...formatResult.parsedDates].sort(
    (a, b) => a.unix() - b.unix()
  );
  const dateRange = {
    earliest: sortedDates[0].format("YYYY-MM-DD"),
    latest: sortedDates[sortedDates.length - 1].format("YYYY-MM-DD"),
    span: sortedDates[sortedDates.length - 1].diff(sortedDates[0], "day"),
  };

  // Create summary
  const summary = `Detected ${formatResult.format} format (${formatResult.confidence}% confidence) with ${frequencyResult.label.toLowerCase()} payments`;

  return {
    dateFormat: formatResult.format,
    formatConfidence: formatResult.confidence,
    formatMethod: formatResult.method,
    frequency: frequencyResult.frequency,
    frequencyLabel: frequencyResult.label,
    frequencyConfidence: frequencyResult.confidence,
    averageInterval: frequencyResult.averageInterval,
    summary,
    details: {
      totalDates: dateValues.length,
      validDates: formatResult.parsedDates.length,
      dateRange,
      standardDeviation: frequencyResult.standardDeviation,
    },
  };
}

/**
 * Detect provider from file name or headers
 *
 * @param {string} fileName - Uploaded file name
 * @param {string[]} headers - CSV headers
 * @returns {Object} { provider, confidence, method }
 */
export function detectProvider(fileName = "", headers = []) {
  const providerSignatures = {
    Aviva: {
      fileKeywords: ["aviva"],
      headerKeywords: ["aviva", "policy number", "scheme name"],
      confidence: 95,
    },
    "Scottish Widows": {
      fileKeywords: ["scottish", "widows", "sw"],
      headerKeywords: ["scottish widows", "plan number", "policy ref"],
      confidence: 95,
    },
    "Standard Life": {
      fileKeywords: ["standard", "life", "sl"],
      headerKeywords: ["standard life", "policy id"],
      confidence: 95,
    },
    "Nest Pension": {
      fileKeywords: ["nest", "nest pension"],
      headerKeywords: ["nest", "contribution id", "member id"],
      confidence: 95,
    },
    "The People's Pension": {
      fileKeywords: ["peoples", "people's pension"],
      headerKeywords: ["people's pension", "member number"],
      confidence: 95,
    },
    "Royal London": {
      fileKeywords: ["royal", "london"],
      headerKeywords: ["royal london", "plan ref"],
      confidence: 95,
    },
    "Legal & General": {
      fileKeywords: ["legal", "general", "l&g"],
      headerKeywords: ["legal & general", "l&g", "policy number"],
      confidence: 95,
    },
  };

  const fileNameLower = fileName.toLowerCase();
  const headersLower = headers.map((h) => h.toLowerCase());

  let bestMatch = null;
  let bestScore = 0;

  Object.entries(providerSignatures).forEach(([provider, signatures]) => {
    let score = 0;
    let matchMethod = [];

    // Check file name
    const fileMatch = signatures.fileKeywords.some((keyword) =>
      fileNameLower.includes(keyword)
    );
    if (fileMatch) {
      score += 60;
      matchMethod.push("filename");
    }

    // Check headers
    const headerMatch = signatures.headerKeywords.some((keyword) =>
      headersLower.some((header) => header.includes(keyword))
    );
    if (headerMatch) {
      score += 40;
      matchMethod.push("headers");
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        provider,
        confidence: Math.min(signatures.confidence, score),
        method: matchMethod.join(" + "),
      };
    }
  });

  if (!bestMatch) {
    return { provider: "Unknown", confidence: 0, method: "none" };
  }

  return bestMatch;
}
