// fetchMarketStackDailySeries.js
import axios from "axios";

const API_KEY = "a5552525afedba5df4e41a13c19324a6";
const BASE_URL = "https://api.marketstack.com/v1/eod";

export const fetchMarketStackDailySeries = async (ticker) => {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        access_key: API_KEY,
        symbols: ticker,
        limit: 365,
      },
    });

    const data = response.data?.data;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response format from MarketStack");
    }

    const prices = {};
    for (const entry of data) {
      if (entry.close && entry.date) {
        const dateOnly = entry.date.split("T")[0];
        prices[dateOnly] = Number(entry.close);
      }
    }

    return prices;
  } catch (error) {
    console.error(
      `[MarketStack] Error fetching prices for ${ticker}:`,
      error.message
    );
    return {};
  }
};
