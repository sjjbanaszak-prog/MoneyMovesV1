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
