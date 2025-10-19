// Trading212Dashboard.js
import React, { useState } from "react";
import Trading212Uploader from "../modules/Trading212Uploader";
import { buildPortfolio } from "../modules/PortfolioBuilder";
import PortfolioValueChart from "../modules/PortfolioValueChart";
import TreemapChart from "../modules/TreemapChart";
import MonthlyPerformanceChart from "../modules/MonthlyPerformanceChart";
import "./Trading212Dashboard.css";

const Trading212Dashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [portfolioData, setPortfolioData] = useState(null);
  const [convertTickers, setConvertTickers] = useState(false);

  // handleDataParsed must be async because buildPortfolio is async
  const handleDataParsed = async (parsedTxs) => {
    setTransactions(parsedTxs);
    try {
      const portfolio = await buildPortfolio(parsedTxs);
      setPortfolioData(portfolio);
    } catch (error) {
      console.error("Error building portfolio:", error);
      setPortfolioData(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-semibold text-gray-800">
          📊 Trading 212 Portfolio Dashboard
        </h1>

        <div className="card">
          <h2 className="card-title">Upload Your Trading 212 CSV File</h2>
          <label className="inline-flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              checked={convertTickers}
              onChange={() => setConvertTickers(!convertTickers)}
              className="form-checkbox"
            />
            <span>Convert Tickers (append '.LON')</span>
          </label>
          <Trading212Uploader
            onDataParsed={handleDataParsed}
            convertTickers={convertTickers}
          />
        </div>

        {portfolioData && (
          <>
            <div className="card">
              <h2 className="card-title">Portfolio Value Over Time</h2>
              <PortfolioValueChart data={portfolioData.dailyValues} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="card">
                <h2 className="card-title">Current Holdings (Treemap)</h2>
                <TreemapChart data={portfolioData.latestHoldings} />
              </div>

              <div className="card">
                <h2 className="card-title">
                  Monthly Performance (Excl. Deposits)
                </h2>
                <MonthlyPerformanceChart transactions={transactions} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Trading212Dashboard;
