// Trading212Parser.js
import Papa from "papaparse";

export const parseTrading212CSV = (csvText) => {
  const { data, errors } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    throw new Error("CSV parsing error");
  }

  const transactions = data.map((row) => {
    const action = row["Action"]?.trim();
    const time = new Date(row["Time"]);
    const ticker = row["Ticker"];
    const name = row["Name"];
    const shares = parseFloat(row["No. of shares"]) || 0;
    const pricePerShare = parseFloat(row["Price / share"]) || 0;
    const total = parseFloat(row["Total"]) || 0;
    const currency = row["Currency (Total)"] || "GBP";

    return {
      action,
      time,
      ticker,
      name,
      shares,
      pricePerShare,
      total,
      currency,
    };
  });

  // Filter out non-investment actions if needed (e.g., dividends, fees later)
  const investmentTransactions = transactions.filter((t) =>
    ["Market buy", "Limit buy", "Market sell", "Limit sell"].includes(t.action)
  );

  return investmentTransactions;
};
