/**
 * Date and Tax Year Utilities
 * Centralized date functions for UK tax year (April 6 - April 5)
 */

import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

/**
 * Get the current UK tax year start year
 * UK tax year runs from April 6th to April 5th
 * @returns {number} The start year of the current tax year
 */
export const getCurrentTaxYear = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const isAfterApril5 =
    today.getMonth() > 3 || (today.getMonth() === 3 && today.getDate() >= 6);
  return isAfterApril5 ? currentYear : currentYear - 1;
};

/**
 * Get the current UK financial year with start date, end date, and label
 * Returns dayjs objects for start and end dates
 * @returns {Object} { start: dayjs, end: dayjs, label: string }
 */
export const getCurrentFinancialYear = () => {
  const now = dayjs();
  const currentYear = now.year();
  const aprilFifth = dayjs(`${currentYear}-04-05`);

  if (now.isBefore(aprilFifth)) {
    // We're in the period Jan-Apr 4th, so financial year started previous calendar year
    return {
      start: dayjs(`${currentYear - 1}-04-05`),
      end: dayjs(`${currentYear}-04-04`),
      label: `${currentYear - 1}/${currentYear.toString().slice(2)}`,
      startYear: currentYear - 1,
      endYear: currentYear,
    };
  } else {
    // We're after Apr 5th, so financial year started this calendar year
    return {
      start: dayjs(`${currentYear}-04-05`),
      end: dayjs(`${currentYear + 1}-04-04`),
      label: `${currentYear}/${(currentYear + 1).toString().slice(2)}`,
      startYear: currentYear,
      endYear: currentYear + 1,
    };
  }
};

/**
 * Get the tax year for a specific date
 * @param {string|Date} dateString - The date to check
 * @returns {number} The start year of the tax year
 */
export const getTaxYear = (dateString) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Tax year starts April 6th
  // Month is 0-indexed, so April is 3
  const isAfterApril5 = month > 3 || (month === 3 && day >= 6);

  return isAfterApril5 ? year : year - 1;
};

/**
 * Get a financial year object for a specific year
 * @param {number} startYear - The start year of the tax year (e.g., 2024 for 2024/25)
 * @returns {Object} { start: dayjs, end: dayjs, label: string }
 */
export const getFinancialYear = (startYear) => {
  return {
    start: dayjs(`${startYear}-04-05`),
    end: dayjs(`${startYear + 1}-04-04`),
    label: `${startYear}/${(startYear + 1).toString().slice(2)}`,
    startYear: startYear,
    endYear: startYear + 1,
  };
};

/**
 * Calculate days until end of current tax year
 * @returns {number} Number of days remaining
 */
export const getDaysUntilTaxYearEnd = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const isAfterApril5 =
    today.getMonth() > 3 || (today.getMonth() === 3 && today.getDate() >= 6);

  let taxYearEnd;
  if (isAfterApril5) {
    // Tax year ends next calendar year on Apr 5
    taxYearEnd = new Date(currentYear + 1, 3, 5); // Month 3 = April
  } else {
    // Tax year ends this calendar year on Apr 5
    taxYearEnd = new Date(currentYear, 3, 5);
  }

  const diffTime = taxYearEnd - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Calculate months remaining in current tax year
 * @returns {number} Number of months remaining (rounded)
 */
export const getMonthsRemainingInTaxYear = () => {
  const daysRemaining = getDaysUntilTaxYearEnd();
  return Math.ceil(daysRemaining / 30);
};

/**
 * Check if a date falls within a specific financial year
 * @param {string|Date|dayjs} date - The date to check
 * @param {number} startYear - The start year of the financial year
 * @param {string} dateFormat - Optional date format for parsing
 * @returns {boolean} True if date is within the financial year
 */
export const isDateInFinancialYear = (date, startYear, dateFormat = null) => {
  const fy = getFinancialYear(startYear);
  const dateObj = dateFormat ? dayjs(date, dateFormat, true) : dayjs(date);

  return (
    dateObj.isValid() &&
    dateObj.isSameOrAfter(fy.start) &&
    dateObj.isSameOrBefore(fy.end)
  );
};

/**
 * Check if a date falls within the current financial year
 * @param {string|Date|dayjs} date - The date to check
 * @param {string} dateFormat - Optional date format for parsing
 * @returns {boolean} True if date is in current financial year
 */
export const isDateInCurrentFinancialYear = (date, dateFormat = null) => {
  const currentFY = getCurrentFinancialYear();
  const dateObj = dateFormat ? dayjs(date, dateFormat, true) : dayjs(date);

  return (
    dateObj.isValid() &&
    dateObj.isSameOrAfter(currentFY.start) &&
    dateObj.isSameOrBefore(currentFY.end)
  );
};

/**
 * Format a financial year label from a start year
 * @param {number} startYear - The start year (e.g., 2024)
 * @returns {string} Formatted label (e.g., "2024/25")
 */
export const formatFinancialYearLabel = (startYear) => {
  return `${startYear}/${(startYear + 1).toString().slice(2)}`;
};

/**
 * Parse a financial year label to get the start year
 * @param {string} label - The label (e.g., "2024/25" or "2024-25")
 * @returns {number} The start year
 */
export const parseFinancialYearLabel = (label) => {
  const match = label.match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : 0;
};

/**
 * Get an array of recent financial years for dropdowns/selectors
 * @param {number} count - Number of years to include (default: 5)
 * @param {boolean} includeFuture - Include next year (default: true)
 * @returns {Array} Array of financial year objects
 */
export const getRecentFinancialYears = (count = 5, includeFuture = true) => {
  const currentTaxYear = getCurrentTaxYear();
  const years = [];

  const startOffset = includeFuture ? 1 : 0;
  const endOffset = includeFuture ? count - 1 : count;

  for (let i = startOffset; i >= -endOffset; i--) {
    const year = currentTaxYear + i;
    years.push(getFinancialYear(year));
  }

  return years;
};
