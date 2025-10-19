// tickerMapping.js

const exchangeSuffix = ".LSE"; // Default to London Stock Exchange for Trading 212 tickers

// Example manual overrides for known tickers (expand as needed)
const manualTickerMap = {
  VUSA: "VUSA.LSE",
  IUSA: "IUSA.LSE",
  CSP1: "CSP1.LSE",
  ISF: "ISF.LSE",
  EQQQ: "EQQQ.LSE",
  VUAG: "VUAG.LSE",
  AGBP: "AGBP.LSE",
  "3OIL": "3OIL.LSE",
  "3UKS": "3UKS.LSE",
  // Add more as needed
};

// Basic debounce + in-memory cache
const cache = {};

/**
 * Maps Trading212 ticker to MarketStack format with .LSE suffix.
 * Uses manual overrides for known tickers.
 * Debounced cache ensures we don't resolve the same ticker multiple times.
 */
export const mapToMarketStackTicker = (ticker) => {
  if (!ticker) return null;

  if (cache[ticker]) {
    return cache[ticker];
  }

  const resolved = manualTickerMap[ticker] || `${ticker}${exchangeSuffix}`;
  cache[ticker] = resolved;
  return resolved;
};
