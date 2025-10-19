import React, { useMemo } from "react";
import "./AIFinancialAdvisoryStyles.css";

// Utility function to format currency
const formatCurrency = (value) => {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(2)}m`;
  } else if (value >= 1000) {
    return `£${(value / 1000).toFixed(2)}k`;
  } else {
    return `£${Math.round(value).toLocaleString()}`;
  }
};

// Utility function to get current tax year
const getCurrentTaxYear = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const isAfterApril5 =
    today.getMonth() > 3 || (today.getMonth() === 3 && today.getDate() >= 6);
  return isAfterApril5 ? currentYear : currentYear - 1;
};

// Calculate days until end of tax year
const getDaysUntilTaxYearEnd = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const isAfterApril5 =
    today.getMonth() > 3 || (today.getMonth() === 3 && today.getDate() >= 6);

  let taxYearEnd;
  if (isAfterApril5) {
    taxYearEnd = new Date(currentYear + 1, 3, 5); // April 5th next year
  } else {
    taxYearEnd = new Date(currentYear, 3, 5); // April 5th this year
  }

  const diffTime = taxYearEnd.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Calculate months remaining until tax year end
const getMonthsRemainingInTaxYear = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const isAfterApril5 =
    today.getMonth() > 3 || (today.getMonth() === 3 && today.getDate() >= 6);

  let taxYearEnd;
  if (isAfterApril5) {
    taxYearEnd = new Date(currentYear + 1, 3, 5); // April 5th next year
  } else {
    taxYearEnd = new Date(currentYear, 3, 5); // April 5th this year
  }

  const monthsRemaining =
    (taxYearEnd.getFullYear() - today.getFullYear()) * 12 +
    (taxYearEnd.getMonth() - today.getMonth());

  // Include current month since salary is paid at end of month
  // Only exclude current month if we're past April 5th in April (end of tax year)
  if (today.getMonth() === 3 && today.getDate() > 5) {
    return Math.max(0, monthsRemaining);
  }

  return Math.max(0, monthsRemaining);
};

// Calculate IRR (Internal Rate of Return)
function calculateIRR(cashflows, guess = 0.05) {
  const maxIterations = 100;
  const precision = 1e-6;
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivative = 0;
    for (let t = 0; t < cashflows.length; t++) {
      npv += cashflows[t] / Math.pow(1 + rate, t);
      if (t !== 0) {
        derivative -= (t * cashflows[t]) / Math.pow(1 + rate, t + 1);
      }
    }
    const newRate = rate - npv / derivative;
    if (Math.abs(newRate - rate) < precision) return newRate;
    rate = newRate;
  }
  return NaN;
}

// Calculate portfolio IRR using payment history from pension accounts
function calculatePortfolioIRR(pensionAccounts, totalValue) {
  if (!Array.isArray(pensionAccounts)) return null;

  try {
    // Combine all payment histories
    const allPayments = [];
    pensionAccounts.forEach((account) => {
      if (account.paymentHistory && Array.isArray(account.paymentHistory)) {
        allPayments.push(...account.paymentHistory);
      }
    });

    if (allPayments.length === 0) return null;

    // Sort payments by date
    allPayments.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group payments by year for annual cashflows
    const paymentsByYear = {};
    const startYear = new Date(allPayments[0].date).getFullYear();
    const currentYear = new Date().getFullYear();

    // Initialize all years with 0
    for (let year = startYear; year <= currentYear; year++) {
      paymentsByYear[year] = 0;
    }

    // Sum payments by year
    allPayments.forEach((payment) => {
      const year = new Date(payment.date).getFullYear();
      paymentsByYear[year] += payment.amount;
    });

    // Convert to cashflow array (negative for payments)
    const cashflows = [];
    for (let year = startYear; year <= currentYear; year++) {
      if (paymentsByYear[year] > 0) {
        cashflows.push(-paymentsByYear[year]);
      } else if (year < currentYear) {
        cashflows.push(0);
      }
    }

    // Add current value as final inflow
    cashflows.push(totalValue);

    return calculateIRR(cashflows);
  } catch (error) {
    console.warn("Error calculating portfolio IRR:", error);
    return null;
  }
}

// Calculate market average IRR for the same period
function calculateMarketAverageIRR(numberOfYears) {
  // UK market average annual return: approximately 7% over long term
  // Using FTSE All-Share historical data as benchmark
  const marketAverageAnnualReturn = 0.07;
  return marketAverageAnnualReturn;
}

// Calculate what growth would be with market average using actual payment history
function calculateMarketAverageGrowth(pensionAccounts, marketIRR, totalValue) {
  if (!Array.isArray(pensionAccounts) || pensionAccounts.length === 0) return 0;

  try {
    // Combine all payment histories
    const allPayments = [];
    pensionAccounts.forEach((account) => {
      if (account.paymentHistory && Array.isArray(account.paymentHistory)) {
        allPayments.push(...account.paymentHistory);
      }
    });

    if (allPayments.length === 0) return 0;

    // Sort payments by date
    allPayments.sort((a, b) => new Date(a.date) - new Date(b.date));

    const today = new Date();
    let projectedMarketValue = 0;

    // Apply market growth to each payment based on time held
    allPayments.forEach((payment) => {
      const paymentDate = new Date(payment.date);
      const yearsHeld = (today - paymentDate) / (1000 * 60 * 60 * 24 * 365.25);

      if (yearsHeld > 0) {
        const growthFactor = Math.pow(1 + marketIRR, yearsHeld);
        projectedMarketValue += payment.amount * growthFactor;
      } else {
        // For future-dated payments (shouldn't happen but handle gracefully)
        projectedMarketValue += payment.amount;
      }
    });

    // Calculate total deposits for comparison
    const totalDeposits = allPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    // Return the growth (projected value minus deposits)
    return Math.max(0, projectedMarketValue - totalDeposits);
  } catch (error) {
    console.warn("Error calculating market average growth:", error);
    return 0;
  }
}

export default function AIFinancialAdvisory({
  pensionAccounts,
  yearlyTotals,
  pensionBuilderData,
  isExpanded = false,
  onToggleExpanded,
}) {
  const aiAnalysis = useMemo(() => {
    console.log("=== AI ANALYSIS STARTING ===");
    console.log("pensionAccounts:", pensionAccounts);
    console.log("yearlyTotals keys:", Object.keys(yearlyTotals || {}));

    if (!pensionAccounts?.length || !Object.keys(yearlyTotals || {}).length) {
      console.log("AI Analysis: No data available");
      return null;
    }

    // Calculate total deposits and current value
    let totalDeposits = 0;
    let totalValue = 0;

    if (pensionAccounts.length > 0) {
      totalDeposits = pensionAccounts.reduce(
        (sum, pot) => sum + (pot?.deposits || 0),
        0
      );
      totalValue = pensionAccounts.reduce(
        (sum, pot) => sum + (pot?.currentValue || 0),
        0
      );
    } else {
      totalDeposits = Object.values(yearlyTotals).reduce(
        (sum, value) => sum + value,
        0
      );
    }

    const gainLoss = totalValue - totalDeposits;
    const numberOfYears = Object.keys(yearlyTotals).length;

    // Calculate portfolio IRR using payment history
    const portfolioIRR = calculatePortfolioIRR(pensionAccounts, totalValue);

    // Calculate market average IRR for comparison
    const marketAverageIRR = calculateMarketAverageIRR(numberOfYears);
    const marketAverageGrowth = calculateMarketAverageGrowth(
      pensionAccounts,
      marketAverageIRR,
      totalValue
    );

    // Enhanced Allowance Logic - replicate PensionAllowanceChart calculations
    const currentTaxYear = getCurrentTaxYear();

    // Process allowance data exactly like PensionAllowanceChart
    const parseStartYear = (yearStr) => {
      const match = yearStr.match(/^(\d{4})/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const sortedYears = Object.keys(yearlyTotals).sort(
      (a, b) => parseStartYear(a) - parseStartYear(b)
    );

    const processedData = {};
    const carryForwardAvailable = {};
    const carryForwardConsumedFromYear = {};
    const latestYear = Math.max(...sortedYears.map(parseStartYear));

    // First pass: process each year chronologically
    sortedYears.forEach((yearKey) => {
      const startYear = parseStartYear(yearKey);
      const allowance = startYear >= 2023 ? 60000 : 40000;
      const directContribution = yearlyTotals[yearKey];
      const unusedAllowance = Math.max(0, allowance - directContribution);

      let carryForwardUsed = 0;
      let excessAfterCarryForward = Math.max(0, directContribution - allowance);
      const carryForwardSources = [];

      if (excessAfterCarryForward > 0) {
        const availableYears = sortedYears
          .filter((y) => {
            const yStartYear = parseStartYear(y);
            return (
              yStartYear >= startYear - 3 &&
              yStartYear < startYear &&
              carryForwardAvailable[y] > 0
            );
          })
          .sort((a, b) => parseStartYear(a) - parseStartYear(b));

        let remainingExcess = excessAfterCarryForward;

        availableYears.forEach((cfYear) => {
          if (remainingExcess > 0 && carryForwardAvailable[cfYear] > 0) {
            const cfUsed = Math.min(
              remainingExcess,
              carryForwardAvailable[cfYear]
            );
            carryForwardUsed += cfUsed;
            carryForwardAvailable[cfYear] -= cfUsed;
            remainingExcess -= cfUsed;

            carryForwardSources.push({
              fromYear: cfYear,
              amount: cfUsed,
            });

            if (!carryForwardConsumedFromYear[cfYear]) {
              carryForwardConsumedFromYear[cfYear] = [];
            }
            carryForwardConsumedFromYear[cfYear].push({
              usedByYear: yearKey,
              amount: cfUsed,
            });
          }
        });

        excessAfterCarryForward = remainingExcess;
      }

      carryForwardAvailable[yearKey] = unusedAllowance;
      const isCarryForwardExpired = startYear < latestYear - 3;

      processedData[yearKey] = {
        directContribution,
        carryForwardUsed,
        carryForwardSources,
        allowance,
        unusedCarryForward: unusedAllowance,
        originalUnusedCarryForward: unusedAllowance,
        excessAfterCarryForward,
        totalWithCarryForward: directContribution,
        isExpired: isCarryForwardExpired,
      };
    });

    // Second pass: calculate remaining carry forward
    sortedYears.forEach((yearKey) => {
      const yearData = processedData[yearKey];
      yearData.carryForwardConsumedBy =
        carryForwardConsumedFromYear[yearKey] || [];

      if (yearData.isExpired) {
        const totalConsumed = yearData.carryForwardConsumedBy.reduce(
          (sum, usage) => sum + usage.amount,
          0
        );
        yearData.carryForwardLost = Math.max(
          0,
          yearData.originalUnusedCarryForward - totalConsumed
        );
        yearData.remainingCarryForward = 0;
      } else {
        const totalConsumed = yearData.carryForwardConsumedBy.reduce(
          (sum, usage) => sum + usage.amount,
          0
        );
        yearData.remainingCarryForward = Math.max(
          0,
          yearData.originalUnusedCarryForward - totalConsumed
        );
        yearData.carryForwardLost = 0;
      }
    });

    // Get current year data and calculate expected FY contributions
    const currentYearKey = currentTaxYear.toString();
    const currentYearData = processedData[currentYearKey];
    const currentYearContributions = currentYearData?.directContribution || 0;

    // Calculate months remaining and expected contributions using pension builder data
    const monthsRemaining = getMonthsRemainingInTaxYear();

    // Calculate monthly total contributions exactly like PensionBuilderNEW.js
    let futureMonthly = 0;
    let employerMonthly = 0;

    if (pensionBuilderData) {
      const totalSalaryForCalc =
        (pensionBuilderData.salary || 0) + (pensionBuilderData.bonus || 0);

      // Calculate futureMonthly exactly like PensionBuilderNEW.js
      if (pensionBuilderData.futureContrib) {
        futureMonthly =
          pensionBuilderData.unitType === "percent"
            ? ((pensionBuilderData.futureContrib / 100) * totalSalaryForCalc) /
              12
            : pensionBuilderData.futureContrib / 12;
      }

      // Calculate employerMonthly exactly like PensionBuilderNEW.js
      if (
        pensionBuilderData.employerMatchEnabled &&
        pensionBuilderData.employerMatch
      ) {
        employerMonthly =
          pensionBuilderData.unitType === "percent"
            ? ((pensionBuilderData.employerMatch / 100) * totalSalaryForCalc) /
              12
            : pensionBuilderData.employerMatch / 12;
      }
    }

    // Total monthly contributions going forward (sum of personal + employer)
    const monthlyTotalContribution = futureMonthly + employerMonthly;

    // Calculate expected remaining contributions and total FY contributions
    const expectedRemainingContributions =
      monthlyTotalContribution * monthsRemaining;
    const expectedFYContributions =
      currentYearContributions + expectedRemainingContributions;

    // Calculate expected carry forward (ONLY current year remaining allowance)
    const currentYearAllowance = currentTaxYear >= 2023 ? 60000 : 40000;
    const expectedCarryForward = Math.max(
      0,
      currentYearAllowance - expectedFYContributions
    );

    // Calculate % of current FY allowance used
    const expectedFYContributionpc =
      (expectedFYContributions / currentYearAllowance) * 100;

    // Calculate total remaining carry forward from previous 3 years
    let totalCarryForward = 0;
    let expiringCarryForward = 0;

    sortedYears.forEach((yearKey) => {
      const startYear = parseStartYear(yearKey);
      if (startYear >= currentTaxYear - 3 && startYear < currentTaxYear) {
        const yearData = processedData[yearKey];
        if (yearData && !yearData.isExpired) {
          totalCarryForward += yearData.remainingCarryForward || 0;

          if (startYear === currentTaxYear - 3) {
            expiringCarryForward += yearData.remainingCarryForward || 0;
          }
        }
      }
    });

    // Income Tax Integration - Calculate tax and NI savings
    let effectiveTaxRate = 0;
    let incomeTaxSaving = 0;
    let niSaving = 0;
    let totalSalary = 0;

    if (pensionBuilderData && pensionBuilderData.salary) {
      totalSalary =
        (pensionBuilderData.salary || 0) + (pensionBuilderData.bonus || 0);

      // Helper function to calculate tapered personal allowance
      const calculateTaperedPersonalAllowance = (
        grossIncome,
        baseAllowance = 12570
      ) => {
        if (grossIncome <= 100000) return baseAllowance;
        const excess = grossIncome - 100000;
        const reduction = Math.floor(excess / 2);
        const adjustedAllowance = baseAllowance - reduction;
        return adjustedAllowance > 0 ? adjustedAllowance : 0;
      };

      // Helper function to calculate income tax
      const calculateIncomeTax = (grossIncome, pensionContribution) => {
        const taperedAllowance = calculateTaperedPersonalAllowance(
          grossIncome - pensionContribution
        );
        const taxableIncome = Math.max(
          0,
          grossIncome - pensionContribution - taperedAllowance
        );

        let tax = 0;
        const basicRateLimit = 50270;
        const higherRateLimit = 125140;
        const basicRateBand = basicRateLimit - taperedAllowance;
        const higherRateBand = higherRateLimit - basicRateLimit;

        let remaining = taxableIncome;

        if (remaining > 0) {
          const basicRateAmount = Math.min(remaining, basicRateBand);
          tax += basicRateAmount * 0.2;
          remaining -= basicRateAmount;
        }

        if (remaining > 0) {
          const higherRateAmount = Math.min(remaining, higherRateBand);
          tax += higherRateAmount * 0.4;
          remaining -= higherRateAmount;
        }

        if (remaining > 0) {
          tax += remaining * 0.45;
        }

        return tax;
      };

      // Helper function to calculate National Insurance
      const calculateNI = (grossIncome, pensionContribution) => {
        const niableIncome = grossIncome - pensionContribution;
        if (niableIncome <= 12570) return 0;

        const PT = 12570;
        const UEL = 50270;

        if (niableIncome <= UEL) {
          return (niableIncome - PT) * 0.08;
        }
        return (UEL - PT) * 0.08 + (niableIncome - UEL) * 0.02;
      };

      // Calculate annual contributions
      const futureAnnualContributions = futureMonthly * 12;

      // Calculate tax and NI with 0% contribution (baseline)
      const incomeTaxZeroContrib = calculateIncomeTax(totalSalary, 0);
      const niZeroContrib = calculateNI(totalSalary, 0);

      // Calculate tax and NI with future contributions
      const incomeTaxWithContrib = calculateIncomeTax(
        totalSalary,
        futureAnnualContributions
      );
      const niWithContrib = calculateNI(totalSalary, futureAnnualContributions);

      // Calculate savings
      incomeTaxSaving = incomeTaxZeroContrib - incomeTaxWithContrib;
      niSaving = niZeroContrib - niWithContrib;

      // Calculate effective tax rate (on gross salary)
      const totalTaxWithContrib = incomeTaxWithContrib + niWithContrib;
      effectiveTaxRate =
        totalSalary > 0 ? totalTaxWithContrib / totalSalary : 0;
    }

    // Calculate potential tax savings from unused allowance
    const hasSignificantUnusedAllowance = expectedCarryForward > 10000;
    const potentialTaxSavings =
      hasSignificantUnusedAllowance && totalSalary > 0
        ? (() => {
            // Calculate what tax rate would apply to additional contributions
            const currentAnnualContributions = futureMonthly * 12;
            const currentTaxableIncome =
              totalSalary - currentAnnualContributions;
            let marginalTaxRate = 0;

            if (currentTaxableIncome > 125140) {
              marginalTaxRate = 0.45; // Additional rate
            } else if (currentTaxableIncome > 50270) {
              marginalTaxRate = 0.4; // Higher rate
            } else if (currentTaxableIncome > 12570) {
              marginalTaxRate = 0.2; // Basic rate
            }

            // Add NI savings (8% or 2% depending on income level)
            const niRate = currentTaxableIncome > 50270 ? 0.02 : 0.08;

            return expectedCarryForward * (marginalTaxRate + niRate);
          })()
        : 0;

    // Calculate retirement projection - FIXED to use correct monthly amounts
    let retirementProjection = null;
    if (pensionBuilderData) {
      const { age, retirementAge, currentPot } = pensionBuilderData;

      const totalMonthlyContrib = futureMonthly + employerMonthly;
      const yearsToSave = Math.max(0, (retirementAge || 65) - (age || 30));

      // Simple projection at 4% annual return
      const annualReturn = 0.04;
      const monthlyReturn = annualReturn / 12;
      const totalMonths = yearsToSave * 12;

      const futureValue =
        (currentPot || totalValue) * Math.pow(1 + annualReturn, yearsToSave) +
        (totalMonthlyContrib * (Math.pow(1 + monthlyReturn, totalMonths) - 1)) /
          monthlyReturn;

      retirementProjection = {
        projectedValue: futureValue,
        monthlyContribution: totalMonthlyContrib,
        yearsToSave,
        targetAge: retirementAge || 65,
      };
    }

    return {
      totalValue,
      totalDeposits,
      gainLoss,
      portfolioIRR: portfolioIRR || 0,
      marketAverageIRR,
      marketAverageGrowth,
      expectedFYContributions,
      expectedFYContributionpc,
      expectedCarryForward,
      totalCarryForward,
      expiringCarryForward,
      effectiveTaxRate,
      incomeTaxSaving,
      niSaving,
      retirementProjection,
      totalSalary,
      daysRemaining: getDaysUntilTaxYearEnd(),
      numberOfYears,
      potentialTaxSavings,
    };
  }, [pensionAccounts, yearlyTotals, pensionBuilderData]);

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
            <div className="ai-title">AI Financial Advisory</div>
            <div className="ai-subtitle">
              Upload pension data to get personalized insights
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
              Add pension providers and upload contribution statements to
              receive AI-powered financial advice.
            </p>
          </div>
        )}
      </div>
    );
  }

  const {
    totalValue,
    totalDeposits,
    gainLoss,
    portfolioIRR,
    marketAverageIRR,
    marketAverageGrowth,
    expectedFYContributions,
    expectedCarryForward,
    expectedFYContributionpc,
    totalCarryForward,
    expiringCarryForward,
    effectiveTaxRate,
    incomeTaxSaving,
    niSaving,
    retirementProjection,
    totalSalary,
    daysRemaining,
    numberOfYears,
    potentialTaxSavings,
  } = aiAnalysis;

  const isPerformingWell = portfolioIRR > marketAverageIRR;
  const hasSignificantUnusedAllowance = expectedCarryForward > 10000;
  const hasExpiringCarryForward = expiringCarryForward > 0;

  // UK average pension pot value (approximate)
  const ukAveragePensionPot = 50000; // This is a rough estimate, should be updated with real data

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
              Personalized insights based on your pension data
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
            {/* Performance Analysis */}
            <div className="ai-insight-card">
              <div className="insight-header">
                <div className="insight-icon performance">📈</div>
                <div className="insight-title">Pension Performance</div>
              </div>
              <div className="insight-content">
                Your pension pots are generating{" "}
                <span className="insight-value">
                  {(portfolioIRR * 100).toFixed(1)}% IRR
                </span>
                ,{isPerformingWell ? " outperforming" : " underperforming"} the
                market average of {(marketAverageIRR * 100).toFixed(1)}% over
                the past {numberOfYears} years.
              </div>
              <div className="insight-metric">
                <span className="metric-label">Total Growth:</span>
                <span
                  className={`metric-value ${
                    gainLoss >= 0 ? "positive" : "danger"
                  }`}
                >
                  {gainLoss >= 0 ? "+" : ""}
                  {formatCurrency(gainLoss)}
                </span>
              </div>
              <div className="insight-metric">
                <span className="metric-label">Avg. Market Growth:</span>
                <span className="metric-value positive">
                  +{formatCurrency(marketAverageGrowth)}
                </span>
              </div>
            </div>

            {/* Optimization Opportunity */}
            <div className="ai-insight-card">
              <div className="insight-header">
                <div className="insight-icon optimization">⚡</div>
                <div className="insight-title">Allowance Utilization</div>
              </div>
              <div className="insight-content">
                Based on your current contribution rate, you're expected to
                contribute{" "}
                <span className="insight-value">
                  {expectedFYContributionpc.toFixed(2)}%
                </span>{" "}
                this financial year.
                {hasSignificantUnusedAllowance
                  ? " Consider increasing contributions to maximize tax efficiency."
                  : " Good utilization of your annual allowance."}
              </div>
              <div className="insight-metric">
                <span className="metric-label">Expected FY Contributions:</span>
                <span className="metric-value positive">
                  {formatCurrency(expectedFYContributions)}
                </span>
              </div>
              <div className="insight-metric">
                <span className="metric-label">Expected Carry Forward:</span>
                <span
                  className={`metric-value ${
                    hasSignificantUnusedAllowance ? "warning" : "positive"
                  }`}
                >
                  {formatCurrency(expectedCarryForward)}
                </span>
              </div>
            </div>

            {/* Tax Efficiency */}
            <div className="ai-insight-card">
              <div className="insight-header">
                <div className="insight-icon tax">💰</div>
                <div className="insight-title">Tax Efficiency</div>
              </div>
              <div className="insight-content">
                {effectiveTaxRate > 0 ? (
                  <>
                    Your effective tax rate after pension contributions is{" "}
                    <span className="insight-value">
                      {(effectiveTaxRate * 100).toFixed(1)}%
                    </span>
                    , providing significant tax efficiency benefits.
                  </>
                ) : (
                  <>
                    Your contributions provide valuable tax relief through
                    salary sacrifice arrangements.
                  </>
                )}
              </div>
              <div className="insight-metric">
                <span className="metric-label">Income Tax Savings:</span>
                <span className="metric-value positive">
                  {formatCurrency(incomeTaxSaving)}
                </span>
              </div>
              <div className="insight-metric">
                <span className="metric-label">NI Savings:</span>
                <span className="metric-value positive">
                  {formatCurrency(niSaving)}
                </span>
              </div>
            </div>

            {/* Projection Analysis */}
            <div className="ai-insight-card">
              <div className="insight-header">
                <div className="insight-icon projection">🎯</div>
                <div className="insight-title">Retirement Projection</div>
              </div>
              <div className="insight-content">
                {retirementProjection ? (
                  <>
                    At your current rate, you're projected to have{" "}
                    <span className="insight-value">
                      {formatCurrency(retirementProjection.projectedValue)}
                    </span>{" "}
                    by age {retirementProjection.targetAge}.
                  </>
                ) : (
                  <>
                    Based on your current pension value of{" "}
                    <span className="insight-value">
                      {formatCurrency(totalValue)}
                    </span>
                    , continue regular contributions for long-term growth.
                  </>
                )}
              </div>
              <div className="insight-metric">
                <span className="metric-label">UK Average Pension Pot:</span>
                <span className="metric-value positive">
                  {formatCurrency(ukAveragePensionPot)}
                </span>
              </div>
              <div className="insight-metric">
                <span className="metric-label">Target Pension Value:</span>
                <span className="metric-value positive">TBD</span>
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="ai-recommendations">
            <div className="recommendations-header">
              <span>💡</span>
              <div className="recommendations-title">Smart Recommendations</div>
            </div>

            {hasSignificantUnusedAllowance && (
              <div className="recommendation-item">
                <div className="recommendation-title">
                  Maximize Annual Allowance
                </div>
                <div className="recommendation-content">
                  Based on your current contribution pattern, you're expected to
                  have {formatCurrency(expectedCarryForward)} in unused
                  allowance. Consider increasing contributions to fully utilize
                  your annual allowance.
                </div>
                <div className="recommendation-impact">
                  Impact: {formatCurrency(potentialTaxSavings)} additional tax
                  savings this year
                </div>
              </div>
            )}

            {pensionAccounts.length > 2 && (
              <div className="recommendation-item">
                <div className="recommendation-title">
                  Portfolio Consolidation
                </div>
                <div className="recommendation-content">
                  Consider consolidating your {pensionAccounts.length} pension
                  pots to reduce fees and improve management efficiency.
                </div>
                <div className="recommendation-impact">
                  Impact: Potential annual fee savings + simplified management
                </div>
              </div>
            )}

            {hasExpiringCarryForward && (
              <div className="recommendation-item">
                <div className="recommendation-title">
                  Carry Forward Opportunity
                </div>
                <div className="recommendation-content">
                  You have {formatCurrency(expiringCarryForward)} in carry
                  forward allowance expiring in {daysRemaining} days. Consider a
                  one-time additional contribution to capture this tax relief.
                </div>
                <div className="recommendation-impact">
                  Impact: {formatCurrency(expiringCarryForward * 0.4)} immediate
                  tax relief (before expiry)
                </div>
              </div>
            )}

            {!hasSignificantUnusedAllowance && !hasExpiringCarryForward && (
              <div className="recommendation-item">
                <div className="recommendation-title">
                  Excellent Optimization
                </div>
                <div className="recommendation-content">
                  You're making excellent use of your annual allowances.
                  Continue your current strategy and monitor performance
                  regularly.
                </div>
                <div className="recommendation-impact">
                  Impact: Maintaining optimal tax efficiency
                </div>
              </div>
            )}
          </div>

          <div className="ai-status">
            <div className="status-dot"></div>
            <div className="status-text">
              AI analysis updated based on your latest pension data
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
