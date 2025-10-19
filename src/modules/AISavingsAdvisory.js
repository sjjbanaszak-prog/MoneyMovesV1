import React, { useMemo } from "react";
import "./AIFinancialAdvisoryStyles.css";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { parseNumber } from "./utils/parseNumber";

dayjs.extend(customParseFormat);

// UK Savings Benchmarks (based on ONS and Bank of England data)
const UK_BENCHMARKS = {
  medianSavings: {
    "18-24": 2000,
    "25-34": 5000,
    "35-44": 11000,
    "45-54": 20000,
    "55-64": 35000,
    "65+": 50000,
  },
  averageSavings: {
    "18-24": 5000,
    "25-34": 12000,
    "35-44": 25000,
    "45-54": 45000,
    "55-64": 75000,
    "65+": 100000,
  },
  emergencyFundMonths: 3,
  savingsRate: {
    poor: 0.05,
    fair: 0.1,
    good: 0.15,
    excellent: 0.2,
  },
};

// Utility function to format currency
const formatCurrency = (value) => {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(2)}m`;
  } else if (value >= 1000) {
    return `£${(value / 1000).toFixed(1)}k`;
  } else {
    return `£${Math.round(value).toLocaleString()}`;
  }
};

// Get age group for benchmarking
const getAgeGroup = (age) => {
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  if (age < 65) return "55-64";
  return "65+";
};

// Calculate monthly growth from transaction history
const calculateMonthlyGrowth = (uploads) => {
  const monthlyBalances = {};

  uploads.forEach((upload) => {
    const { rawData, mapping, dateFormat } = upload;

    rawData.forEach((row) => {
      const dateValue = row[mapping.date];
      const parsed = dayjs(dateValue, dateFormat, true);
      if (!parsed.isValid()) return;

      const monthKey = parsed.format("YYYY-MM");
      const balance = parseNumber(row[mapping.balance]);

      if (!monthlyBalances[monthKey]) {
        monthlyBalances[monthKey] = 0;
      }
      monthlyBalances[monthKey] += balance;
    });
  });

  const months = Object.keys(monthlyBalances).sort();
  if (months.length < 2) return 0;

  const growthRates = [];
  for (let i = 1; i < Math.min(months.length, 13); i++) {
    const current = monthlyBalances[months[months.length - i]];
    const previous = monthlyBalances[months[months.length - i - 1]];
    if (previous > 0) {
      growthRates.push(current - previous);
    }
  }

  return growthRates.length > 0
    ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
    : 0;
};

export default function AISavingsAdvisory({
  uploads,
  selectedAccounts,
  userAge = 35,
  monthlyIncome = 0,
  isExpanded = false,
  onToggleExpanded,
}) {
  const aiAnalysis = useMemo(() => {
    console.log("=== AI SAVINGS ANALYSIS STARTING ===");
    console.log("uploads:", uploads);
    console.log("selectedAccounts:", selectedAccounts);

    if (!uploads?.length) {
      console.log("AI Analysis: No data available");
      return null;
    }

    // Filter to selected accounts
    const activeUploads = uploads.filter(
      (u) =>
        selectedAccounts.length === 0 ||
        selectedAccounts.includes(u.accountName)
    );

    if (activeUploads.length === 0) {
      console.log("AI Analysis: No active accounts");
      return null;
    }

    // Calculate total savings and balances by account type
    let totalSavings = 0;
    let isaBalance = 0;
    let lisaBalance = 0;
    let premiumBondsBalance = 0;
    let regularSavingsBalance = 0;

    activeUploads.forEach((upload) => {
      const { rawData, mapping, dateFormat } = upload;

      // Get latest balance
      const sortedData = rawData
        .filter((row) => {
          const dateValue = row[mapping.date];
          return dayjs(dateValue, dateFormat, true).isValid();
        })
        .sort((a, b) => {
          const dateA = dayjs(a[mapping.date], dateFormat, true);
          const dateB = dayjs(b[mapping.date], dateFormat, true);
          return dateB.diff(dateA);
        });

      if (sortedData.length > 0) {
        const latestBalance = parseNumber(sortedData[0][mapping.balance]);
        totalSavings += latestBalance;

        // Categorize by account type
        if (upload.accountType === "ISA") {
          isaBalance += latestBalance;
        } else if (upload.accountType === "LISA") {
          lisaBalance += latestBalance;
        } else if (upload.accountType === "Premium Bonds") {
          premiumBondsBalance += latestBalance;
        } else {
          regularSavingsBalance += latestBalance;
        }
      }
    });

    // Get age-appropriate benchmarks
    const ageGroup = getAgeGroup(userAge);
    const medianForAge = UK_BENCHMARKS.medianSavings[ageGroup];
    const averageForAge = UK_BENCHMARKS.averageSavings[ageGroup];

    // Calculate percentile
    let percentile = 50;
    if (totalSavings >= averageForAge) {
      percentile = 50 + ((totalSavings - averageForAge) / averageForAge) * 25;
      percentile = Math.min(percentile, 95);
    } else if (totalSavings >= medianForAge) {
      percentile =
        25 +
        ((totalSavings - medianForAge) / (averageForAge - medianForAge)) * 25;
    } else {
      percentile = (totalSavings / medianForAge) * 25;
    }

    // Calculate monthly growth rate
    const monthlyGrowth = calculateMonthlyGrowth(activeUploads);
    const annualizedGrowth = monthlyGrowth * 12;

    // Calculate savings rate if income provided
    let savingsRate = 0;
    let savingsRateCategory = "unknown";
    if (monthlyIncome > 0 && monthlyGrowth > 0) {
      savingsRate = (monthlyGrowth / monthlyIncome) * 100;
      if (savingsRate >= 20) savingsRateCategory = "excellent";
      else if (savingsRate >= 15) savingsRateCategory = "good";
      else if (savingsRate >= 10) savingsRateCategory = "fair";
      else savingsRateCategory = "poor";
    }

    // Emergency fund calculation (3 months expenses recommended)
    const estimatedMonthlyExpenses =
      monthlyIncome > 0 ? monthlyIncome - monthlyGrowth : totalSavings * 0.1;
    const emergencyFundTarget = estimatedMonthlyExpenses * 3;
    const emergencyFundCoverage = totalSavings / emergencyFundTarget;

    // Tax efficiency score
    const taxEfficientBalance = isaBalance + lisaBalance + premiumBondsBalance;
    const taxEfficiencyScore =
      totalSavings > 0 ? (taxEfficientBalance / totalSavings) * 100 : 0;

    // Calculate diversification
    const accountTypes = new Set(activeUploads.map((u) => u.accountType));
    const diversificationScore = (accountTypes.size / 6) * 100;

    return {
      totalSavings,
      isaBalance,
      lisaBalance,
      premiumBondsBalance,
      regularSavingsBalance,
      taxEfficientBalance,
      medianForAge,
      averageForAge,
      percentile,
      monthlyGrowth,
      annualizedGrowth,
      savingsRate,
      savingsRateCategory,
      emergencyFundTarget,
      emergencyFundCoverage,
      taxEfficiencyScore,
      diversificationScore,
      accountCount: activeUploads.length,
      ageGroup,
    };
  }, [uploads, selectedAccounts, userAge, monthlyIncome]);

  if (!aiAnalysis) {
    return (
      <div className="ai-advisory-module">
        <div
          className="ai-advisory-header"
          onClick={onToggleExpanded}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            cursor: "pointer",
          }}
        >
          <div
            className="ai-icon"
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "1.5rem",
            }}
          >
            🤖
          </div>
          <div style={{ flex: 1 }}>
            <div className="ai-title">AI Savings Advisory</div>
            <div className="ai-subtitle">
              Upload savings data to get personalized insights
            </div>
          </div>
          <div
            className="expand-collapse-btn"
            style={{
              background: "none",
              border: "none",
              fontSize: "1.2rem",
              cursor: "pointer",
              color: "#64748b",
              padding: "0.5rem",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            {isExpanded ? "▼" : "▶"}
          </div>
        </div>
        {isExpanded && (
          <div className="ai-advisory-content">
            <p
              style={{
                textAlign: "center",
                color: "#94a3b8",
                fontStyle: "italic",
              }}
            >
              Upload your bank statements to receive AI-powered savings advice
              and benchmarking against UK averages.
            </p>
          </div>
        )}
      </div>
    );
  }

  const {
    totalSavings,
    taxEfficientBalance,
    medianForAge,
    averageForAge,
    percentile,
    monthlyGrowth,
    annualizedGrowth,
    savingsRate,
    savingsRateCategory,
    emergencyFundTarget,
    emergencyFundCoverage,
    taxEfficiencyScore,
    diversificationScore,
    accountCount,
    ageGroup,
  } = aiAnalysis;

  const isAboveMedian = totalSavings >= medianForAge;
  const isAboveAverage = totalSavings >= averageForAge;
  const hasSignificantUnusedAllowance = taxEfficiencyScore < 50;
  const hasLowEmergencyFund = emergencyFundCoverage < 1;

  return (
    <div className="ai-advisory-module">
      <div
        className="ai-advisory-header"
        onClick={onToggleExpanded}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flex: 1,
          }}
        >
          <div
            className="ai-icon"
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "1.5rem",
            }}
          >
            🤖
          </div>
          <div>
            <div className="ai-title">AI Analysis</div>
            <div className="ai-subtitle">
              Personalized insights based on your savings data
            </div>
          </div>
        </div>
        <div
          className="expand-collapse-btn"
          style={{
            background: "none",
            border: "none",
            fontSize: "1.2rem",
            cursor: "pointer",
            color: "#64748b",
            padding: "0.5rem",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {isExpanded ? "▼" : "▶"}
        </div>
      </div>

      {isExpanded && (
        <div className="ai-advisory-content">
          <div className="ai-insights-grid">
            {/* Peer Comparison Card */}
            <div className="ai-insight-card">
              <div className="insight-header">
                <div className="insight-icon performance">📊</div>
                <div className="insight-title">Peer Comparison</div>
              </div>
              <div className="insight-content">
                Your savings of{" "}
                <span className="insight-value">
                  {formatCurrency(totalSavings)}
                </span>{" "}
                place you in the{" "}
                <span className="insight-value">
                  {Math.round(percentile)}th percentile
                </span>{" "}
                for your age group ({ageGroup}).
              </div>
              <div className="insight-metric">
                <span className="metric-label">UK Median ({ageGroup}):</span>
                <span className="metric-value">
                  {formatCurrency(medianForAge)}
                </span>
              </div>
              <div className="insight-metric">
                <span className="metric-label">UK Average ({ageGroup}):</span>
                <span
                  className={`metric-value ${
                    isAboveAverage ? "positive" : "warning"
                  }`}
                >
                  {formatCurrency(averageForAge)}
                </span>
              </div>
            </div>

            {/* Savings Growth Card */}
            <div className="ai-insight-card">
              <div className="insight-header">
                <div className="insight-icon optimization">📈</div>
                <div className="insight-title">Savings Growth</div>
              </div>
              <div className="insight-content">
                {monthlyGrowth > 0 ? (
                  <>
                    You're saving an average of{" "}
                    <span className="insight-value">
                      {formatCurrency(monthlyGrowth)}
                    </span>{" "}
                    per month.
                    {savingsRateCategory !== "unknown" && (
                      <>
                        {" "}
                        That's a{" "}
                        <span className="insight-value">
                          {savingsRateCategory}
                        </span>{" "}
                        savings rate of {savingsRate.toFixed(1)}%.
                      </>
                    )}
                  </>
                ) : (
                  "Your savings growth rate needs improvement. Consider setting up regular contributions."
                )}
              </div>
              <div className="insight-metric">
                <span className="metric-label">Projected Annual Growth:</span>
                <span className="metric-value positive">
                  {formatCurrency(annualizedGrowth)}
                </span>
              </div>
              {savingsRateCategory !== "unknown" && (
                <div className="insight-metric">
                  <span className="metric-label">Savings Rate Category:</span>
                  <span
                    className={`metric-value ${
                      savingsRateCategory === "excellent"
                        ? "positive"
                        : savingsRateCategory === "good"
                        ? "positive"
                        : savingsRateCategory === "fair"
                        ? "warning"
                        : "danger"
                    }`}
                  >
                    {savingsRateCategory.charAt(0).toUpperCase() +
                      savingsRateCategory.slice(1)}
                  </span>
                </div>
              )}
            </div>

            {/* Emergency Fund Card */}
            <div className="ai-insight-card">
              <div className="insight-header">
                <div className="insight-icon tax">🛡️</div>
                <div className="insight-title">Emergency Fund</div>
              </div>
              <div className="insight-content">
                {emergencyFundCoverage >= 1 ? (
                  <>
                    You have {emergencyFundCoverage.toFixed(1)}x your
                    recommended emergency fund. Excellent financial security!
                  </>
                ) : emergencyFundCoverage >= 0.5 ? (
                  <>
                    You're {Math.round(emergencyFundCoverage * 100)}% of the way
                    to your 3-month emergency fund target.
                  </>
                ) : (
                  <>
                    Your emergency fund needs attention. Aim to build up 3
                    months of expenses.
                  </>
                )}
              </div>
              <div className="insight-metric">
                <span className="metric-label">Target (3 months):</span>
                <span className="metric-value">
                  {formatCurrency(emergencyFundTarget)}
                </span>
              </div>
              <div className="insight-metric">
                <span className="metric-label">Coverage:</span>
                <span
                  className={`metric-value ${
                    emergencyFundCoverage >= 1
                      ? "positive"
                      : emergencyFundCoverage >= 0.5
                      ? "warning"
                      : "danger"
                  }`}
                >
                  {Math.round(emergencyFundCoverage * 100)}%
                </span>
              </div>
            </div>

            {/* Tax Efficiency Card */}
            <div className="ai-insight-card">
              <div className="insight-header">
                <div className="insight-icon projection">💰</div>
                <div className="insight-title">Tax Efficiency</div>
              </div>
              <div className="insight-content">
                <span className="insight-value">
                  {taxEfficiencyScore.toFixed(0)}%
                </span>{" "}
                of your savings are in tax-efficient accounts (ISAs, LISAs,
                Premium Bonds).
              </div>
              <div className="insight-metric">
                <span className="metric-label">Tax-Efficient Balance:</span>
                <span className="metric-value positive">
                  {formatCurrency(taxEfficientBalance)}
                </span>
              </div>
              <div className="insight-metric">
                <span className="metric-label">Efficiency Score:</span>
                <span
                  className={`metric-value ${
                    taxEfficiencyScore >= 70
                      ? "positive"
                      : taxEfficiencyScore >= 40
                      ? "warning"
                      : "danger"
                  }`}
                >
                  {taxEfficiencyScore.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="ai-recommendations">
            <div className="recommendations-header">
              <span>💡</span>
              <div className="recommendations-title">Smart Recommendations</div>
            </div>

            {!isAboveMedian && (
              <div className="recommendation-item">
                <div className="recommendation-title">
                  Build Towards the UK Median
                </div>
                <div className="recommendation-content">
                  Your savings are below the UK median for your age group.
                  Consider increasing your monthly contributions by{" "}
                  {formatCurrency((medianForAge - totalSavings) / 12)} to reach
                  the median within a year.
                </div>
                <div className="recommendation-impact">
                  Impact: Reach {formatCurrency(medianForAge)} within 12 months
                </div>
              </div>
            )}

            {hasLowEmergencyFund && (
              <div className="recommendation-item">
                <div className="recommendation-title">
                  Prioritize Emergency Fund
                </div>
                <div className="recommendation-content">
                  You need{" "}
                  {formatCurrency(
                    Math.max(0, emergencyFundTarget - totalSavings)
                  )}{" "}
                  more to reach a 3-month emergency fund. This should be your
                  top priority before other investments.
                </div>
                <div className="recommendation-impact">
                  Impact: Peace of mind and financial security
                </div>
              </div>
            )}

            {hasSignificantUnusedAllowance && (
              <div className="recommendation-item">
                <div className="recommendation-title">
                  Maximize Tax-Free Savings
                </div>
                <div className="recommendation-content">
                  Only {taxEfficiencyScore.toFixed(0)}% of your savings are
                  tax-efficient. Consider moving funds into ISAs (£20,000 annual
                  allowance) to protect your interest from tax.
                </div>
                <div className="recommendation-impact">
                  Impact: Save approximately £
                  {Math.round(
                    (totalSavings - taxEfficientBalance) * 0.04 * 0.2
                  )}{" "}
                  per year in tax at basic rate
                </div>
              </div>
            )}

            {diversificationScore < 40 && accountCount < 3 && (
              <div className="recommendation-item">
                <div className="recommendation-title">
                  Consider Account Diversification
                </div>
                <div className="recommendation-content">
                  You're using {accountCount} account type(s). Consider
                  diversifying across regular savings, ISAs, and Premium Bonds
                  to optimize returns and tax efficiency.
                </div>
                <div className="recommendation-impact">
                  Impact: Better rates and risk distribution
                </div>
              </div>
            )}

            {isAboveAverage && emergencyFundCoverage >= 1 && (
              <div className="recommendation-item">
                <div className="recommendation-title">
                  Excellent Savings Position
                </div>
                <div className="recommendation-content">
                  You're in the top tier of UK savers for your age! Consider
                  exploring investment opportunities (stocks & shares ISAs,
                  pensions) to grow wealth beyond savings accounts.
                </div>
                <div className="recommendation-impact">
                  Impact: Potential for higher long-term returns (7-10% annually
                  vs 4% in savings)
                </div>
              </div>
            )}

            {savingsRateCategory === "poor" && monthlyIncome > 0 && (
              <div className="recommendation-item">
                <div className="recommendation-title">
                  Increase Your Savings Rate
                </div>
                <div className="recommendation-content">
                  At {savingsRate.toFixed(1)}% of income, your savings rate is
                  below recommended levels. Try the 50/30/20 rule: 50% needs,
                  30% wants, 20% savings. Aim to save at least 10% of your
                  income.
                </div>
                <div className="recommendation-impact">
                  Impact: Reaching {formatCurrency(medianForAge)} in{" "}
                  {Math.ceil(
                    (medianForAge - totalSavings) / (monthlyIncome * 0.1) / 12
                  )}{" "}
                  years at 10% rate
                </div>
              </div>
            )}

            {!hasSignificantUnusedAllowance &&
              !hasLowEmergencyFund &&
              !!isAboveMedian &&
              !(savingsRateCategory === "poor" && monthlyIncome > 0) && (
                <div className="recommendation-item">
                  <div className="recommendation-title">
                    Excellent Financial Health
                  </div>
                  <div className="recommendation-content">
                    You're making excellent use of your savings strategies.
                    Continue your current approach and monitor performance
                    regularly.
                  </div>
                  <div className="recommendation-impact">
                    Impact: Maintaining optimal financial wellness
                  </div>
                </div>
              )}
          </div>

          <div className="ai-status">
            <div className="status-dot"></div>
            <div className="status-text">
              AI analysis based on UK Office for National Statistics data and
              Bank of England benchmarks
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
