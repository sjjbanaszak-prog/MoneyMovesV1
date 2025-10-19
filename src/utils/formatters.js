/**
 * Currency and Number Formatting Utilities
 * Centralized formatting functions for the Money Moves application
 */

/**
 * Format currency with full precision (£1,234.56)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return "£0.00";
  return amount.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Format currency with no decimal places (£1,235)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string with no decimals
 */
export const formatCurrencyRounded = (amount) => {
  if (amount == null || isNaN(amount)) return "£0";
  return amount.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

/**
 * Format currency with detailed precision, returns "-" for zero/null
 * Useful for tables where empty values should show as dash
 * @param {number} value - The value to format
 * @returns {string} Formatted currency or "-"
 */
export const formatCurrencyDetailed = (value) => {
  if (!value || value === 0) return "-";
  return `£${Number(value).toFixed(2)}`;
};

/**
 * Format currency compactly for large values (£1.2m, £450k)
 * @param {number} value - The value to format
 * @returns {string} Compact formatted currency
 */
export const formatCurrencyCompact = (value) => {
  if (!value || value === 0) return "£0";

  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(2)}m`;
  } else if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}k`;
  } else {
    return `£${value.toFixed(0)}`;
  }
};

/**
 * Format tick values for chart Y-axis labels (e.g., £1200 => "£1k")
 * @param {number} value - The tick value
 * @returns {string} Formatted tick label
 */
export const formatTick = (value) => {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}m`;
  } else if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}k`;
  } else {
    return `£${value}`;
  }
};

/**
 * Strip leading zeros from input strings (useful for input fields)
 * Handles edge cases like "0", "00", "0123" => "123"
 * @param {string} value - The input value
 * @returns {string} Value with leading zeros stripped
 */
export const stripLeadingZeros = (value) => {
  if (!value) return value;

  // If it's just zeros, return "0"
  if (/^0+$/.test(value)) return "0";

  // If it has a decimal, preserve it
  if (value.includes(".")) {
    const [whole, decimal] = value.split(".");
    return `${parseInt(whole, 10) || 0}.${decimal}`;
  }

  // Otherwise just parse and stringify to remove leading zeros
  return String(parseInt(value, 10) || 0);
};

/**
 * Format a percentage value
 * @param {number} value - The percentage value
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value == null || isNaN(value)) return "0%";
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format a number with thousands separators
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number
 */
export const formatNumber = (value, decimals = 0) => {
  if (value == null || isNaN(value)) return "0";
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
