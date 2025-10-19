import React, { useMemo } from "react";
import "./PremiumBondsAnalysisStyles.css";
import { parseNumber } from "./utils/parseNumber";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

const MAX_PREMIUM_BONDS_HOLDING = 50000;

const formatCurrency = (amount) => {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const HISTORICAL_SAVINGS_RATES = {
  2020: 0.5,
  2021: 0.3,
  2022: 1.8,
  2023: 4.2,
  2024: 5.0,
  2025: 4.8,
};

const getSavingsRateForYear = (year) => {
  return HISTORICAL_SAVINGS_RATES[year] || 1.5;
};

const getAverageSavingsRate = (startYear, endYear) => {
  const years = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(getSavingsRateForYear(year));
  }
  return years.reduce((sum, rate) => sum + rate, 0) / years.length;
};

const getDiffInYears = (endDate, startDate) => {
  if (!endDate || !startDate) return 0;
  return (
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
};

const calculateTimeWeightedReturn = (transactions) => {
  if (transactions.length === 0) return 0;

  const endDate = new Date();
  let totalWeightedAmount = 0;
  let totalPrizes = 0;

  transactions.forEach((transaction) => {
    const deposit = transaction.deposit || 0;
    const prize = transaction.wins || 0;
    const description = transaction.description.toLowerCase();

    // Only count actual deposits for weighted investment calculation
    if (deposit > 0 && description.includes("deposit")) {
      const yearsHeld = getDiffInYears(endDate, transaction.date);
      totalWeightedAmount += deposit * Math.max(yearsHeld, 0.01);
    }

    // Count prizes - both for return calculation AND as new principal from reinvestment date
    const isPrize =
      description.includes("auto") ||
      description.includes("reinvest") ||
      description.includes("prize") ||
      description.includes("payout");

    if (prize > 0 && isPrize) {
      const yearsHeld = getDiffInYears(endDate, transaction.date);
      // Only reinvested prizes increase the principal base
      if (description.includes("auto") || description.includes("reinvest")) {
        totalWeightedAmount += prize * Math.max(yearsHeld, 0.01);
      }
      totalPrizes += prize;
    }
  });

  if (totalWeightedAmount === 0 || totalPrizes === 0) return 0;

  // Annual return = Total Prizes / Time-Weighted Investment * 100
  const annualizedReturn = (totalPrizes / totalWeightedAmount) * 100;
  return Math.max(0, annualizedReturn);
};

const calculateTimeWeightedSavingsInterest = (transactions) => {
  if (transactions.length === 0) return 0;

  const endDate = new Date();
  let totalSavingsInterest = 0;

  transactions.forEach((transaction) => {
    const deposit = transaction.deposit || 0;
    const prize = transaction.wins || 0;
    const description = transaction.description.toLowerCase();
    const transactionDate = transaction.date;

    // Calculate interest for actual deposits
    if (deposit > 0 && description.includes("deposit")) {
      const yearsHeld = getDiffInYears(endDate, transactionDate);

      // Calculate interest year by year using historical rates
      let currentDate = new Date(transactionDate);
      let remainingYears = yearsHeld;
      let accumulatedInterest = 0;
      let principal = deposit;

      while (remainingYears > 0) {
        const currentYear = currentDate.getFullYear();
        const savingsRate = getSavingsRateForYear(currentYear);
        const yearsInThisPeriod = Math.min(remainingYears, 1);

        const interestForPeriod =
          principal * (savingsRate / 100) * yearsInThisPeriod;
        accumulatedInterest += interestForPeriod;
        principal += interestForPeriod; // Compound the interest

        currentDate.setFullYear(currentDate.getFullYear() + 1);
        remainingYears -= yearsInThisPeriod;
      }

      totalSavingsInterest += accumulatedInterest;
    }

    // Calculate interest for reinvested prizes (they become new principal)
    const isPrize =
      description.includes("auto") ||
      description.includes("reinvest") ||
      description.includes("prize") ||
      description.includes("payout");

    if (prize > 0 && isPrize) {
      const yearsHeld = getDiffInYears(endDate, transactionDate);

      // Calculate interest year by year using historical rates
      let currentDate = new Date(transactionDate);
      let remainingYears = yearsHeld;
      let accumulatedInterest = 0;
      let principal = prize;

      while (remainingYears > 0) {
        const currentYear = currentDate.getFullYear();
        const savingsRate = getSavingsRateForYear(currentYear);
        const yearsInThisPeriod = Math.min(remainingYears, 1);

        const interestForPeriod =
          principal * (savingsRate / 100) * yearsInThisPeriod;
        accumulatedInterest += interestForPeriod;
        principal += interestForPeriod; // Compound the interest

        currentDate.setFullYear(currentDate.getFullYear() + 1);
        remainingYears -= yearsInThisPeriod;
      }

      totalSavingsInterest += accumulatedInterest;
    }
  });

  return totalSavingsInterest;
};

const formatDate = (date) => {
  if (!date) return "";
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear();
  return `${month} ${year}`;
};

export default function PremiumBondsAnalysis({ uploads = [] }) {
  const analysis = useMemo(() => {
    if (!uploads || uploads.length === 0) return null;

    const allTransactions = [];
    let totalCurrentHolding = 0;

    uploads.forEach((upload) => {
      const { rawData, mapping, dateFormat } = upload;

      rawData.forEach((row) => {
        const dateValue = row[mapping.date];
        const parsedDate = dayjs(dateValue, dateFormat, true);

        if (!parsedDate.isValid()) return;

        const description = row[mapping.description] || row.Description || "";
        const descLower = description.toLowerCase();

        // The CSV has all amounts in the Wins column, need to categorize by description
        const amountValue = parseNumber(
          row[mapping.wins] ||
            row.Wins ||
            row[mapping.amount] ||
            row.Amount ||
            0
        );

        let deposit = 0;
        let wins = 0;
        let withdrawal = 0;

        // Categorize based on description
        if (descLower.includes("deposit") && !descLower.includes("prize")) {
          deposit = amountValue;
        } else if (
          descLower.includes("auto") ||
          descLower.includes("reinvest")
        ) {
          wins = amountValue;
        } else if (
          descLower.includes("prize") ||
          descLower.includes("payout")
        ) {
          wins = amountValue;
        } else if (descLower.includes("withdrawal")) {
          withdrawal = amountValue;
        }

        const transaction = {
          date: parsedDate.toDate(),
          deposit: deposit,
          wins: wins,
          withdrawals: withdrawal,
          balance: parseNumber(row[mapping.balance] || row.Balance || 0),
          description: description,
        };

        allTransactions.push(transaction);
      });

      const sortedData = rawData
        .filter((row) => dayjs(row[mapping.date], dateFormat, true).isValid())
        .sort((a, b) =>
          dayjs(b[mapping.date], dateFormat, true).diff(
            dayjs(a[mapping.date], dateFormat, true)
          )
        );

      if (sortedData.length > 0) {
        totalCurrentHolding += parseNumber(
          sortedData[0][mapping.balance] || sortedData[0].balance || 0
        );
      }
    });

    if (allTransactions.length === 0) return null;

    allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate totals - ONLY count wins from prize transactions
    let totalPrizesWon = 0;
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let autoReinvestments = 0;
    let prizePayouts = 0;

    allTransactions.forEach((transaction) => {
      const desc = transaction.description.toLowerCase();

      // Categorize based on description since CSV has all amounts in one column
      if (desc.includes("deposit") && !desc.includes("prize")) {
        totalDeposits += transaction.deposit;
      }

      totalWithdrawals += transaction.withdrawals;

      // ONLY count wins from actual prize transactions
      if (desc.includes("auto") || desc.includes("reinvest")) {
        autoReinvestments += transaction.wins;
        totalPrizesWon += transaction.wins;
      } else if (desc.includes("prize") || desc.includes("payout")) {
        prizePayouts += transaction.wins;
        totalPrizesWon += transaction.wins;
      }
    });

    const firstPurchaseDate = allTransactions[0].date;
    const lastTransactionDate =
      allTransactions[allTransactions.length - 1].date;

    const totalHoldingPeriodYears = getDiffInYears(
      lastTransactionDate,
      firstPurchaseDate
    );

    const totalInvested = totalDeposits + autoReinvestments;

    // Use time-weighted return calculation for accurate performance measurement
    const annualReturn = calculateTimeWeightedReturn(allTransactions);

    const startYear = firstPurchaseDate.getFullYear();
    const endYear = lastTransactionDate.getFullYear();
    const averageSavingsRate = getAverageSavingsRate(startYear, endYear);

    // Calculate time-weighted savings interest (proper comparison)
    const estimatedSavingsInterest =
      calculateTimeWeightedSavingsInterest(allTransactions);

    const prizesVsSavingsDifference = totalPrizesWon - estimatedSavingsInterest;

    const remainingAllowance = MAX_PREMIUM_BONDS_HOLDING - totalCurrentHolding;
    const utilizationPercentage =
      (totalCurrentHolding / MAX_PREMIUM_BONDS_HOLDING) * 100;

    return {
      totalCurrentHolding,
      totalPrizesWon,
      totalDeposits,
      totalWithdrawals,
      totalInvested,
      autoReinvestments,
      prizePayouts,
      remainingAllowance,
      utilizationPercentage,
      annualReturn: Math.max(0, annualReturn),
      averageSavingsRate,
      estimatedSavingsInterest,
      prizesVsSavingsDifference,
      holdingPeriodYears: totalHoldingPeriodYears,
      firstPurchaseDate,
      lastTransactionDate,
      transactionCount: allTransactions.length,
      isMaxReached: totalCurrentHolding >= MAX_PREMIUM_BONDS_HOLDING,
    };
  }, [uploads]);

  if (!analysis) {
    return (
      <div className="premium-bonds-wrapper">
        <h3 className="premium-bonds-title">Premium Bonds Analysis</h3>
        <p className="premium-bonds-error">No Premium Bonds data available</p>
      </div>
    );
  }

  const getUtilizationMessage = () => {
    if (analysis.isMaxReached) {
      return `You have reached the maximum Premium Bonds holding of £${formatCurrency(
        MAX_PREMIUM_BONDS_HOLDING
      )}`;
    } else if (analysis.utilizationPercentage > 80) {
      return `You're close to your maximum Premium Bonds allowance - £${formatCurrency(
        analysis.remainingAllowance
      )} remaining`;
    } else {
      return `You have £${formatCurrency(
        analysis.remainingAllowance
      )} remaining of your £${formatCurrency(
        MAX_PREMIUM_BONDS_HOLDING
      )} allowance`;
    }
  };

  const getPerformanceMessage = () => {
    if (analysis.prizesVsSavingsDifference > 0) {
      return `Your Premium Bonds have outperformed savings accounts by £${formatCurrency(
        analysis.prizesVsSavingsDifference
      )}`;
    } else {
      return `Your Premium Bonds have underperformed savings accounts by £${formatCurrency(
        Math.abs(analysis.prizesVsSavingsDifference)
      )}`;
    }
  };

  const getGradientColor = (percentage) => {
    if (percentage <= 50) {
      const ratio = percentage / 50;
      const red = 239;
      const green = Math.round(68 + 217 * ratio);
      const blue = Math.round(68 + 28 * ratio);
      return `rgb(${red}, ${green}, ${blue})`;
    } else {
      const ratio = (percentage - 50) / 50;
      const red = Math.round(251 - 235 * ratio);
      const green = Math.round(191 + 4 * ratio);
      const blue = Math.round(36 + 93 * ratio);
      return `rgb(${red}, ${green}, ${blue})`;
    }
  };

  const getProgressGradient = (percentage) => {
    const color1 = getGradientColor(Math.max(0, percentage - 10));
    const color2 = getGradientColor(percentage);
    return `linear-gradient(90deg, ${color1}, ${color2})`;
  };

  return (
    <div className="premium-bonds-wrapper">
      <div className="premium-bonds-header">
        <h3 className="premium-bonds-title">Premium Bonds</h3>
        <div className="premium-bonds-date-badge">
          Since {formatDate(analysis.firstPurchaseDate)}
        </div>
      </div>

      <div className="premium-bonds-overview">
        <div className="premium-bonds-balance">
          <span className="premium-bonds-label">Current Holding:</span>
          <span
            className="premium-bonds-amount"
            style={{ color: getGradientColor(analysis.utilizationPercentage) }}
          >
            £{formatCurrency(analysis.totalCurrentHolding)} / £
            {formatCurrency(MAX_PREMIUM_BONDS_HOLDING)}
          </span>
        </div>
        <div className="premium-bonds-progress-container">
          <div className="premium-bonds-progress-bar">
            <div
              className="premium-bonds-progress-fill"
              style={{
                width: `${Math.min(analysis.utilizationPercentage, 100)}%`,
                background: getProgressGradient(analysis.utilizationPercentage),
              }}
            />
          </div>
          <div className="premium-bonds-progress-label">
            {analysis.utilizationPercentage.toFixed(1)}% of maximum allowance
            used
          </div>
        </div>
        <div
          className={`premium-bonds-message ${
            analysis.isMaxReached
              ? "at-limit"
              : analysis.utilizationPercentage > 80
              ? "near-limit"
              : ""
          }`}
        >
          {getUtilizationMessage()}
        </div>
      </div>

      <div className="premium-bonds-prizes-card">
        <div className="premium-bonds-prizes-header">
          <h4 className="premium-bonds-prizes-title">Prize Winnings Summary</h4>
          <div className="premium-bonds-prizes-amount">
            £{formatCurrency(analysis.totalPrizesWon)}
          </div>
        </div>
        <div className="premium-bonds-prizes-breakdown">
          <div className="premium-bonds-prizes-item">
            <span className="premium-bonds-prizes-label">
              Annual Return Rate:
            </span>
            <span className="premium-bonds-prizes-value">
              {analysis.annualReturn.toFixed(2)}%
            </span>
          </div>
          <div className="premium-bonds-prizes-item">
            <span className="premium-bonds-prizes-label">Holding Period:</span>
            <span className="premium-bonds-prizes-value">
              {analysis.holdingPeriodYears.toFixed(1)} years
            </span>
          </div>
        </div>
      </div>

      <div className="premium-bonds-grid">
        <div className="premium-bonds-card">
          <div className="premium-bonds-card-header">
            <div className="premium-bonds-card-info">
              <div className="premium-bonds-card-title">
                Performance vs Savings
              </div>
              <div className="premium-bonds-card-badge">
                Comparison Analysis
              </div>
            </div>
            <div
              className="premium-bonds-card-amount"
              style={{
                color:
                  analysis.prizesVsSavingsDifference >= 0
                    ? "#10b981"
                    : "#ef4444",
              }}
            >
              {analysis.prizesVsSavingsDifference >= 0 ? "+" : ""}£
              {formatCurrency(analysis.prizesVsSavingsDifference)}
            </div>
          </div>

          <div className="premium-bonds-stats">
            <div className="premium-bonds-stat-row">
              <span className="premium-bonds-stat-label">
                Premium Bonds Winnings:
              </span>
              <span className="premium-bonds-stat-value">
                £{formatCurrency(analysis.totalPrizesWon)}
              </span>
            </div>
            <div className="premium-bonds-stat-row">
              <span className="premium-bonds-stat-label">
                Est. Savings Interest:
              </span>
              <span className="premium-bonds-stat-value">
                £{formatCurrency(analysis.estimatedSavingsInterest)}
              </span>
            </div>
            <div className="premium-bonds-stat-row">
              <span className="premium-bonds-stat-label">
                Average Savings Rate:
              </span>
              <span className="premium-bonds-stat-value">
                {analysis.averageSavingsRate.toFixed(2)}%
              </span>
            </div>
            <div className="premium-bonds-stat-row">
              <span className="premium-bonds-stat-label">
                Performance Difference:
              </span>
              <span
                className="premium-bonds-stat-value"
                style={{
                  color:
                    analysis.prizesVsSavingsDifference < 0
                      ? "#ef4444"
                      : "#f3f4f6",
                  fontWeight:
                    analysis.prizesVsSavingsDifference < 0 ? "600" : "500",
                }}
              >
                {analysis.prizesVsSavingsDifference >= 0 ? "+" : ""}£
                {formatCurrency(analysis.prizesVsSavingsDifference)}
              </span>
            </div>
          </div>

          <div className="premium-bonds-performance-message">
            {getPerformanceMessage()}
          </div>
        </div>

        <div className="premium-bonds-card">
          <div className="premium-bonds-card-header">
            <div className="premium-bonds-card-info">
              <div className="premium-bonds-card-title">
                Premium Bonds Account
              </div>
              <div className="premium-bonds-card-badge">Premium Bonds</div>
            </div>
            <div
              className="premium-bonds-card-amount"
              style={{ color: "#10b981" }}
            >
              £{formatCurrency(analysis.totalCurrentHolding)}
            </div>
          </div>

          <div className="premium-bonds-account-details">
            <div className="premium-bonds-account-name">NS&I</div>
            <div className="premium-bonds-account-balances">
              <div className="premium-bonds-balance-row">
                <span className="premium-bonds-balance-label">Current:</span>
                <span className="premium-bonds-balance-value">
                  £{formatCurrency(analysis.totalCurrentHolding)}
                </span>
              </div>
              <div className="premium-bonds-balance-row">
                <span className="premium-bonds-balance-label">Prizes Won:</span>
                <span className="premium-bonds-balance-value premium-bonds-prizes-highlight">
                  £{formatCurrency(analysis.totalPrizesWon)}
                </span>
              </div>
            </div>
          </div>

          <div className="premium-bonds-stats">
            <div className="premium-bonds-stat-row">
              <span className="premium-bonds-stat-label">Annual Return:</span>
              <span className="premium-bonds-stat-value">
                {analysis.annualReturn.toFixed(2)}%
              </span>
            </div>
            <div className="premium-bonds-stat-row">
              <span className="premium-bonds-stat-label">Holding Period:</span>
              <span className="premium-bonds-stat-value">
                {analysis.holdingPeriodYears.toFixed(1)} years
              </span>
            </div>
            <div className="premium-bonds-stat-row">
              <span className="premium-bonds-stat-label">Transactions:</span>
              <span className="premium-bonds-stat-value">
                {analysis.transactionCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
