// Trading212Uploader.js
import React, { useState } from "react";
import { parseTrading212CSV } from "./Trading212Parser";

const Trading212Uploader = ({ onDataParsed, convertTickers }) => {
  const [fileName, setFileName] = useState("");
  const [previewRows, setPreviewRows] = useState([]);
  const [fullRowsWithBuySell, setFullRowsWithBuySell] = useState([]);
  const [error, setError] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const csvText = event.target.result;
      try {
        let parsed = parseTrading212CSV(csvText);

        // If convertTickers is true, append '.US' to all tickers
        if (convertTickers) {
          parsed = parsed.map((tx) => ({
            ...tx,
            ticker: tx.ticker.endsWith(".LON") ? tx.ticker : tx.ticker + ".LON",
          }));
        }

        // Add Bought and Sold fields to all rows
        const enriched = parsed.map((tx) => {
          const action = tx.action.toLowerCase();
          return {
            ...tx,
            Bought: action.includes("buy") ? tx.total : null,
            Sold: action.includes("sell") ? tx.total : null,
          };
        });

        setFullRowsWithBuySell(enriched);
        setPreviewRows(enriched.slice(0, 5));
        onDataParsed(enriched); // Send enriched full data to parent
        setError(null);
      } catch (err) {
        setError("Failed to parse CSV. Please check the file format.");
        console.error(err);
      }
    };

    reader.readAsText(file);
  };

  const totalBought = fullRowsWithBuySell.reduce(
    (sum, row) => sum + (row.Bought || 0),
    0
  );
  const totalSold = fullRowsWithBuySell.reduce(
    (sum, row) => sum + (row.Sold || 0),
    0
  );

  return (
    <div className="p-4 border rounded-xl bg-white shadow-md space-y-4">
      <h2 className="text-xl font-semibold">Upload Trading212 CSV</h2>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="block"
      />
      {fileName && (
        <p className="text-sm text-gray-600">Uploaded: {fileName}</p>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {previewRows.length > 0 && (
        <div className="mt-4 overflow-auto">
          <h3 className="font-medium text-sm mb-1">
            Preview (first 5 transactions):
          </h3>
          <table className="text-sm w-full border border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Action</th>
                <th className="border px-2 py-1">Ticker</th>
                <th className="border px-2 py-1">Shares</th>
                <th className="border px-2 py-1">Total (£)</th>
                <th className="border px-2 py-1">Bought</th>
                <th className="border px-2 py-1">Sold</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((tx, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">
                    {tx.time.toLocaleDateString()}
                  </td>
                  <td className="border px-2 py-1">{tx.action}</td>
                  <td className="border px-2 py-1">{tx.ticker}</td>
                  <td className="border px-2 py-1">{tx.shares.toFixed(2)}</td>
                  <td className="border px-2 py-1">£{tx.total.toFixed(2)}</td>
                  <td className="border px-2 py-1 text-green-700">
                    {tx.Bought != null ? `£${tx.Bought.toFixed(2)}` : ""}
                  </td>
                  <td className="border px-2 py-1 text-red-700">
                    {tx.Sold != null ? `£${tx.Sold.toFixed(2)}` : ""}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={5} className="border px-2 py-1 text-right">
                  Total for all transactions:
                </td>
                <td className="border px-2 py-1 text-green-700">
                  £{totalBought.toFixed(2)}
                </td>
                <td className="border px-2 py-1 text-red-700">
                  £{totalSold.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Trading212Uploader;
