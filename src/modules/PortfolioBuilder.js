// PortfolioBuilder.js
import { fetchMarketStackDailySeries } from "./fetchMarketStackDailySeries";
import { mapToMarketStackTicker } from "./tickerMapping";

function formatDate(dateObj) {
  return dateObj.toISOString().split("T")[0];
}

function getDatesBetween(startDate, endDate) {
  const dates = [];
  let current = new Date(startDate);
  while (current <= endDate) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export const buildPortfolio = async (transactions) => {
  if (!transactions || transactions.length === 0) {
    return {
      dailyValues: [],
      latestHoldings: {},
      totalPortfolioValue: 0,
    };
  }

  const sortedTxs = [...transactions].sort((a, b) => a.time - b.time);
  console.log("[buildPortfolio] sortedTxs sample:", sortedTxs.slice(0, 3));

  const firstDate = new Date(sortedTxs[0].time);
  const lastDate = new Date(sortedTxs[sortedTxs.length - 1].time);
  const allDates = getDatesBetween(firstDate, lastDate);
  console.log(
    "[buildPortfolio] Date range:",
    allDates[0],
    "to",
    allDates[allDates.length - 1]
  );

  const uniqueTickers = [...new Set(sortedTxs.map((tx) => tx.ticker))];

  const txsByDateTicker = {};
  for (const tx of sortedTxs) {
    const ticker = tx.ticker;
    const dateKey = formatDate(new Date(tx.time));
    if (!txsByDateTicker[dateKey]) txsByDateTicker[dateKey] = {};
    if (!txsByDateTicker[dateKey][ticker]) txsByDateTicker[dateKey][ticker] = 0;

    const action = tx.action?.toLowerCase().trim() || "";
    const isBuy = action.includes("buy");
    const isSell = action.includes("sell");
    let sharesDelta = 0;
    if (isBuy) sharesDelta = tx.shares;
    else if (isSell) sharesDelta = -tx.shares;
    else
      console.warn(`[buildPortfolio] Unknown action "${tx.action}" in tx`, tx);

    txsByDateTicker[dateKey][ticker] += sharesDelta;
  }

  const tickers = [...new Set(uniqueTickers)];
  const sharesHeldByDateTicker = {};
  const cumulativeShares = {};
  for (const ticker of tickers) cumulativeShares[ticker] = 0;

  for (const date of allDates) {
    sharesHeldByDateTicker[date] = {};
    for (const ticker of tickers) {
      if (txsByDateTicker[date]?.[ticker]) {
        cumulativeShares[ticker] += txsByDateTicker[date][ticker];
        if (cumulativeShares[ticker] < 0) cumulativeShares[ticker] = 0;
      }
      sharesHeldByDateTicker[date][ticker] = cumulativeShares[ticker];
    }
  }

  console.log(
    "[buildPortfolio] Sample sharesHeldByDateTicker:",
    Object.entries(sharesHeldByDateTicker).slice(0, 3)
  );

  const pricesByTicker = {};
  for (const ticker of tickers) {
    const marketStackTicker = mapToMarketStackTicker(ticker);
    try {
      const priceData = await fetchMarketStackDailySeries(marketStackTicker);
      pricesByTicker[ticker] = priceData || {}; // still use original ticker as key

      if (
        !pricesByTicker[ticker] ||
        Object.keys(pricesByTicker[ticker]).length === 0
      ) {
        console.warn(`[buildPortfolio] No price data for ticker: ${ticker}`);
      }
    } catch (e) {
      console.warn(`Failed to fetch daily series for ${ticker}: ${e.message}`);
      pricesByTicker[ticker] = {};
    }
  }

  function getLastAvailablePriceDate(tickerPrices) {
    const dates = Object.keys(tickerPrices).sort();
    return dates.length > 0 ? dates[dates.length - 1] : null;
  }

  const dailyValues = allDates.map((date) => {
    let totalValue = 0;
    for (const ticker of tickers) {
      const shares = sharesHeldByDateTicker[date][ticker] || 0;
      const price = pricesByTicker[ticker][date] || 0;
      totalValue += shares * price;
    }
    return {
      date,
      totalValue: Number(totalValue.toFixed(2)),
    };
  });

  const latestHoldings = {};
  let totalPortfolioValue = 0;

  for (const ticker of tickers) {
    const shares =
      sharesHeldByDateTicker[lastDate.toISOString().slice(0, 10)][ticker] || 0;
    const lastPriceDate = getLastAvailablePriceDate(pricesByTicker[ticker]);
    const price = lastPriceDate ? pricesByTicker[ticker][lastPriceDate] : 0;
    const value = Number((shares * price).toFixed(2));
    const lastTx = [...sortedTxs].reverse().find((tx) => tx.ticker === ticker);
    const name = lastTx?.name || ticker;

    latestHoldings[ticker] = {
      ticker,
      name,
      shares,
      value,
    };

    totalPortfolioValue += value;
  }

  console.log("[buildPortfolio] dailyValues sample:", dailyValues.slice(0, 3));
  console.log("[buildPortfolio] latestHoldings:", latestHoldings);
  console.log("[buildPortfolio] totalPortfolioValue:", totalPortfolioValue);

  return {
    dailyValues,
    latestHoldings,
    totalPortfolioValue: Number(totalPortfolioValue.toFixed(2)),
  };
};
