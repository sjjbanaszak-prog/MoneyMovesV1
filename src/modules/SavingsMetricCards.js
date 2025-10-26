import React, { useMemo } from "react";
import dayjs from "dayjs";
import { parseNumber } from "./utils/parseNumber";
import "./SavingsMetricCardsStyles.css";

export default function SavingsMetricCards({ uploads, selectedAccounts }) {
  // Process all upload data to extract account metrics
  const accountsData = useMemo(() => {
    if (!Array.isArray(uploads) || !Array.isArray(selectedAccounts)) return [];

    return uploads
      .filter((upload) => selectedAccounts.includes(upload.accountName))
      .map((upload) => {
        const { rawData, mapping, dateFormat, accountName, accountType } = upload;

        // Filter and sort data
        const sorted = rawData
          .filter((row) => {
            if (!row || !mapping || !mapping.date) return false;
            const dateValue = row[mapping.date];
            if (!dateValue) return false;
            const parsed = dayjs(dateValue, dateFormat, true);
            return parsed.isValid();
          })
          .sort((a, b) => {
            const dateA = dayjs(a[mapping.date], dateFormat, true);
            const dateB = dayjs(b[mapping.date], dateFormat, true);
            return dateA.diff(dateB);
          });

        if (sorted.length === 0) {
          return {
            accountName,
            accountType,
            deposits: 0,
            currentValue: 0,
            growth: 0,
            isValid: false,
          };
        }

        const endRow = sorted[sorted.length - 1];
        const currentValue = mapping.balance ? parseNumber(endRow[mapping.balance]) : 0;

        // Calculate total deposits (sum of credit transactions excluding interest/prizes)
        // and total withdrawals (sum of debit transactions)
        let totalDeposits = 0;
        let totalWithdrawals = 0;
        let totalPrizes = 0;

        sorted.forEach((row) => {
          // Get description to check transaction type
          const description = mapping.description ? String(row[mapping.description] || row.Description || "").toLowerCase() : "";

          if (accountType === "Premium Bonds") {
            // Premium Bonds logic - matches PremiumBondsAnalysis.js exactly
            const amountValue = parseNumber(
              row[mapping.wins] ||
              row.Wins ||
              row[mapping.amount] ||
              row.Amount ||
              0
            );

            // Categorize based on description (same as PremiumBondsAnalysis)
            if (description.includes("deposit") && !description.includes("prize")) {
              totalDeposits += amountValue;
            } else if (description.includes("auto") || description.includes("reinvest")) {
              totalPrizes += amountValue;
            } else if (description.includes("prize") || description.includes("payout")) {
              totalPrizes += amountValue;
            } else if (description.includes("withdrawal")) {
              totalWithdrawals += amountValue;
            }
          } else {
            // Regular savings account logic
            const isInterest = description.includes("interest") ||
                             description.includes("int paid") ||
                             description.includes("int credit") ||
                             description.includes("credit interest") ||
                             description.includes("gross interest") ||
                             description.includes("int pmt") ||
                             description.match(/\bint\b/);

            // Calculate deposits (credits excluding interest)
            if (mapping.credit) {
              const creditAmount = parseNumber(row[mapping.credit]);
              if (creditAmount > 0 && !isInterest) {
                totalDeposits += creditAmount;
              }
            } else if (mapping.amount) {
              const amount = parseNumber(row[mapping.amount]);
              if (amount > 0 && !isInterest) {
                totalDeposits += amount;
              }
            }

            // Calculate interest as growth
            if (mapping.credit) {
              const creditAmount = parseNumber(row[mapping.credit]);
              if (creditAmount > 0 && isInterest) {
                totalPrizes += creditAmount;
              }
            } else if (mapping.amount) {
              const amount = parseNumber(row[mapping.amount]);
              if (amount > 0 && isInterest) {
                totalPrizes += amount;
              }
            }

            // Calculate withdrawals
            if (mapping.debit) {
              const debitAmount = parseNumber(row[mapping.debit]);
              if (debitAmount > 0) {
                totalWithdrawals += debitAmount;
              }
            } else if (mapping.amount) {
              const amount = parseNumber(row[mapping.amount]);
              if (amount < 0) {
                totalWithdrawals += Math.abs(amount);
              }
            }
          }
        });

        // Growth calculation:
        // - For Premium Bonds: Growth = Total Prizes Won
        // - For other accounts: Growth = Current Value - Deposits + Withdrawals
        let growth;
        if (accountType === "Premium Bonds") {
          growth = totalPrizes;
        } else {
          growth = currentValue - totalDeposits + totalWithdrawals;
        }

        // Debug logging
        console.log(`[${accountName}] Type: ${accountType}, Current: £${currentValue}, Deposits: £${totalDeposits}, Withdrawals: £${totalWithdrawals}, Prizes: £${totalPrizes}, Growth: £${growth}`);

        return {
          accountName,
          accountType,
          deposits: totalDeposits,
          withdrawals: totalWithdrawals,
          currentValue,
          growth,
          isValid: true,
        };
      })
      .filter((account) => account.isValid);
  }, [uploads, selectedAccounts]);

  // Calculate total current value
  const totalBalance = useMemo(() => {
    return accountsData.reduce((sum, account) => sum + account.currentValue, 0);
  }, [accountsData]);

  // Calculate total deposits
  const totalDeposits = useMemo(() => {
    return accountsData.reduce((sum, account) => sum + account.deposits, 0);
  }, [accountsData]);

  // Calculate total withdrawals
  const totalWithdrawals = useMemo(() => {
    return accountsData.reduce((sum, account) => sum + account.withdrawals, 0);
  }, [accountsData]);

  // Calculate net deposits (deposits - withdrawals)
  const netDeposits = totalDeposits - totalWithdrawals;

  // Calculate total growth (sum of individual account growth, which already excludes withdrawals)
  const totalGrowth = useMemo(() => {
    return accountsData.reduce((sum, account) => sum + account.growth, 0);
  }, [accountsData]);

  const growthPercent = totalDeposits > 0 ? (totalGrowth / totalDeposits) * 100 : 0;
  const isPositiveGrowth = totalGrowth >= 0;

  // Count number of accounts
  const accountCount = accountsData.length;

  // Calculate ISA/LISA allowance usage for current tax year
  const isaLisaData = useMemo(() => {
    // Get current UK tax year (April 6 - April 5)
    const now = new Date();
    const currentYear = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    // If we're before April 6, we're still in the previous tax year
    const taxYear = (month > 3 || (month === 3 && day >= 6)) ? currentYear : currentYear - 1;

    // Filter ISA and LISA accounts
    const isaAccounts = accountsData.filter(
      (account) => account.accountType === "ISA" || account.accountType === "LISA"
    );

    if (isaAccounts.length === 0) {
      return null;
    }

    // Calculate total deposits to ISA/LISA accounts (not including interest)
    const totalIsaLisaDeposits = isaAccounts.reduce((sum, account) => sum + account.deposits, 0);

    // ISA limit is always £20,000
    const isaLimit = 20000;

    // Calculate percentage used
    const percentUsed = (totalIsaLisaDeposits / isaLimit) * 100;

    return {
      taxYear,
      depositsUsed: totalIsaLisaDeposits,
      limit: isaLimit,
      percentUsed,
    };
  }, [accountsData]);

  const formatCurrency = (value) => {
    return Math.round(value).toLocaleString();
  };

  // Calculate progress bar widths
  const depositsWidth = totalDeposits > 0
    ? (totalDeposits / (totalDeposits + Math.abs(totalGrowth))) * 100
    : 50;
  const growthWidth = 100 - depositsWidth;

  return (
    <>
      <div className="savings-metrics-grid">
        {/* Card 1: Total Balance */}
        <div className="savings-metric-card">
          <div className="savings-metric-label">Total Balance</div>
          <div className="savings-metric-value">
            £{Math.round(totalBalance).toLocaleString()}
          </div>
          <div className="savings-metric-subtitle">
            Net Deposits: £{formatCurrency(netDeposits)}
          </div>
        </div>

        {/* Card 2: Growth */}
        <div className="savings-metric-card">
          <div className="savings-metric-label">Growth</div>
          <div
            className="savings-metric-value"
            style={{ color: totalBalance > 0 ? (isPositiveGrowth ? "#10b981" : "#ef4444") : "#fff" }}
          >
            {totalBalance > 0 ? (
              <>
                {isPositiveGrowth ? "+" : "-"}£{formatCurrency(Math.abs(totalGrowth))}
              </>
            ) : (
              "£0"
            )}
          </div>
          {totalBalance > 0 && (
            <div
              className="savings-metric-change"
              style={{ color: isPositiveGrowth ? "#10b981" : "#ef4444" }}
            >
              {isPositiveGrowth ? "▲" : "▼"} {Math.abs(growthPercent).toFixed(2)}%
            </div>
          )}
        </div>

        {/* Card 3: Number of Accounts */}
        <div className="savings-metric-card">
          <div className="savings-metric-label">Accounts</div>
          <div className="savings-metric-value">
            {accountCount}
          </div>
          <div className="savings-metric-subtitle">
            {accountCount === 1 ? "Selected account" : "Selected accounts"}
          </div>
        </div>

        {/* Card 4: ISA Allowance Used or Total Accounts */}
        <div className="savings-metric-card">
          {isaLisaData ? (
            <>
              <div className="savings-metric-label">ISA Allowance Used</div>
              <div className="savings-metric-value">
                £{formatCurrency(isaLisaData.depositsUsed)}
              </div>
              <div className="savings-metric-subtitle">
                {isaLisaData.percentUsed.toFixed(1)}% of £{formatCurrency(isaLisaData.limit)}
              </div>
            </>
          ) : (
            <>
              <div className="savings-metric-label">Total Accounts</div>
              <div className="savings-metric-value">
                {uploads.length}
              </div>
              <div className="savings-metric-subtitle">
                {uploads.length === 1 ? "Total account" : "Total accounts"}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar Card - Full Width */}
      {totalBalance > 0 && (
        <div className="savings-progress-card">
          <div className="progress-card-content">
            <div className="progress-legend">
              <div className="progress-legend-item">
                <div className="progress-legend-color start-color"></div>
                <span className="progress-legend-label">
                  Net Deposits: £{formatCurrency(netDeposits)}
                </span>
              </div>
              <div className="progress-legend-item">
                <div
                  className={`progress-legend-color ${
                    isPositiveGrowth ? "gain-color" : "loss-color"
                  }`}
                ></div>
                <span className="progress-legend-label">
                  Growth: {isPositiveGrowth ? "+" : "-"}£{formatCurrency(Math.abs(totalGrowth))}
                </span>
              </div>
            </div>
            <div
              className="savings-performance-bar"
              role="img"
              aria-label={`Performance bar showing net deposits and growth`}
            >
              <div
                className="savings-start-bar animated-bar"
                style={{ width: `${depositsWidth}%` }}
                title={`Net Deposits: £${formatCurrency(netDeposits)}`}
              />
              <div
                className={`savings-growth-bar animated-bar ${
                  isPositiveGrowth ? "gain" : "loss"
                }`}
                style={{ width: `${growthWidth}%` }}
                title={`Growth: ${isPositiveGrowth ? "+" : "-"}£${formatCurrency(Math.abs(totalGrowth))}`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
