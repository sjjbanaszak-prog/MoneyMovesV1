import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

// Enhanced common formats to test
const knownFormats = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "DD-MM-YYYY",
  "MM-DD-YYYY",
  "YYYY/MM/DD",
  "D/M/YYYY",
  "M/D/YYYY",
  "D/MM/YYYY",
  "DD/MM/YY",
  "MM/DD/YY",
  "YYYY-MM-DD HH:mm:ss",
  "DD/MM/YYYY HH:mm:ss",
  "D MMM YYYY",
  "DD MMM YYYY",
  "MMM D, YYYY",
  "MMMM D, YYYY",
];

export function detectDateFormat(values) {
  if (!values || values.length === 0) return null;

  const formatCounts = {};
  const sampleSize = Math.min(values.length, 20);

  for (let i = 0; i < sampleSize; i++) {
    const val = values[i];
    if (!val) continue;

    for (const fmt of knownFormats) {
      const parsed = dayjs(val, fmt, true);
      if (parsed.isValid()) {
        const year = parsed.year();
        if (year >= 1900 && year <= 2100) {
          formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
          break;
        }
      }
    }
  }

  const sortedFormats = Object.entries(formatCounts).sort(
    (a, b) => b[1] - a[1]
  );

  return sortedFormats.length > 0 ? sortedFormats[0][0] : null;
}

/**
 * Check if a date format includes time component
 * @param {string} dateFormat - The date format string
 * @returns {boolean} - True if format includes time
 */
export function hasTimeComponent(dateFormat) {
  if (!dateFormat) return false;
  // Check if format contains time indicators (H, h, m, s, A, a)
  return /[HhmsAa]/.test(dateFormat);
}

/**
 * Strip time component from date strings and convert to date-only format
 * @param {Array} data - Array of row objects
 * @param {string} dateColumn - Name of the date column
 * @param {string} detectedFormat - The detected date format with time
 * @returns {Object} - {data: modified data, dateFormat: new date-only format}
 */
export function stripTimeFromDates(data, dateColumn, detectedFormat) {
  if (!hasTimeComponent(detectedFormat)) {
    return { data, dateFormat: detectedFormat };
  }

  console.log(`Stripping time from date column "${dateColumn}" with format "${detectedFormat}"`);

  // Determine the date-only format to use
  let dateOnlyFormat = detectedFormat.split(' ')[0]; // Get part before space

  // If the format uses different separators, preserve them
  if (detectedFormat.includes('DD/MM/YYYY')) {
    dateOnlyFormat = 'DD/MM/YYYY';
  } else if (detectedFormat.includes('MM/DD/YYYY')) {
    dateOnlyFormat = 'MM/DD/YYYY';
  } else if (detectedFormat.includes('YYYY-MM-DD')) {
    dateOnlyFormat = 'YYYY-MM-DD';
  } else if (detectedFormat.includes('DD-MM-YYYY')) {
    dateOnlyFormat = 'DD-MM-YYYY';
  }

  // Create new data array with dates stripped of time
  const modifiedData = data.map(row => {
    const dateValue = row[dateColumn];
    if (!dateValue) return row;

    // Parse with full format and reformat to date-only
    const parsed = dayjs(dateValue, detectedFormat, true);
    if (!parsed.isValid()) return row;

    const dateOnly = parsed.format(dateOnlyFormat);

    return {
      ...row,
      [dateColumn]: dateOnly
    };
  });

  console.log(`Converted ${modifiedData.length} dates from "${detectedFormat}" to "${dateOnlyFormat}"`);

  return {
    data: modifiedData,
    dateFormat: dateOnlyFormat
  };
}
