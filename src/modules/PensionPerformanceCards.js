import React, { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import "./PensionPerformanceCardsStyles.css";

// Sum all yearly contributions
const sumYearlyContributions = (yearlyTotals = {}) =>
  Object.values(yearlyTotals).reduce((sum, value) => sum + value, 0);

// IRR calculation using Newton-Raphson method
function calculateIRR(cashflows, guess = 0.05) {
  if (cashflows.length < 2) return null;

  const maxIterations = 100;
  const precision = 1e-6;
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivative = 0;

    for (let t = 0; t < cashflows.length; t++) {
      const divisor = Math.pow(1 + rate, t);
      npv += cashflows[t] / divisor;

      if (t !== 0) {
        derivative -= (t * cashflows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(derivative) < precision) break;

    const newRate = rate - npv / derivative;
    if (Math.abs(newRate - rate) < precision) return newRate;
    rate = newRate;
  }

  return isFinite(rate) ? rate : null;
}

// Calculate portfolio IRR using payment history from selected accounts
function calculatePortfolioIRR(pensionAccounts, selectedPensions, totalValue) {
  if (!Array.isArray(pensionAccounts) || !Array.isArray(selectedPensions))
    return null;

  // Get selected accounts with payment history
  const selectedAccounts = pensionAccounts.filter(
    (account) =>
      selectedPensions.includes(account.provider) &&
      account.paymentHistory &&
      Array.isArray(account.paymentHistory)
  );

  if (selectedAccounts.length === 0) return null;

  try {
    // Combine all payment histories
    const allPayments = [];
    selectedAccounts.forEach((account) => {
      if (account.paymentHistory) {
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

export default function PensionPerformanceCards({
  pensionAccounts,
  selectedPensions,
  yearlyTotals,
}) {
  const [showCAGRTooltip, setShowCAGRTooltip] = useState(false);
  const [showIRRTooltip, setShowIRRTooltip] = useState(false);
  const [cagrTooltipPosition, setCAGRTooltipPosition] =
    useState("tooltip-center");
  const [irrTooltipPosition, setIRRTooltipPosition] =
    useState("tooltip-center");

  // Function to calculate optimal tooltip position
  const calculateTooltipPosition = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipWidth =
      window.innerWidth <= 480 ? 200 : window.innerWidth <= 640 ? 240 : 280;
    const viewportWidth = window.innerWidth;

    // Calculate if tooltip would overflow on the right
    const rightEdge = rect.left + tooltipWidth / 2;
    const leftEdge = rect.left - tooltipWidth / 2;

    if (rightEdge > viewportWidth - 20) {
      return "tooltip-left"; // Position tooltip to the left
    } else if (leftEdge < 20) {
      return "tooltip-right"; // Position tooltip to the right
    }
    return "tooltip-center"; // Default center position
  };

  const handleCAGRMouseEnter = (event) => {
    setCAGRTooltipPosition(calculateTooltipPosition(event));
    setShowCAGRTooltip(true);
  };

  const handleIRRMouseEnter = (event) => {
    setIRRTooltipPosition(calculateTooltipPosition(event));
    setShowIRRTooltip(true);
  };

  const deposits = useMemo(() => {
    if (!Array.isArray(pensionAccounts) || !Array.isArray(selectedPensions))
      return 0;
    return pensionAccounts
      .filter((account) => selectedPensions.includes(account.provider))
      .reduce((sum, account) => sum + (account?.deposits || 0), 0);
  }, [pensionAccounts, selectedPensions]);

  const totalValue = useMemo(() => {
    if (!Array.isArray(pensionAccounts) || !Array.isArray(selectedPensions))
      return 0;
    return pensionAccounts
      .filter((account) => selectedPensions.includes(account.provider))
      .reduce((sum, account) => sum + (account?.currentValue || 0), 0);
  }, [pensionAccounts, selectedPensions]);

  const numberOfYears = useMemo(
    () => Object.keys(yearlyTotals || {}).length,
    [yearlyTotals]
  );

  const gainLoss = totalValue - deposits;
  const gainLossPercent = deposits > 0 ? (gainLoss / deposits) * 100 : 0;
  const isPositive = gainLoss >= 0;

  // Enhanced CAGR calculation using actual payment timing
  const averageAnnualReturn = useMemo(() => {
    // Get selected accounts with payment history for more accurate timing
    const selectedAccounts = pensionAccounts.filter(
      (account) =>
        selectedPensions.includes(account.provider) &&
        account.paymentHistory &&
        Array.isArray(account.paymentHistory)
    );

    if (selectedAccounts.length > 0 && deposits > 0 && totalValue > 0) {
      // Find the earliest payment date from selected accounts
      let earliestDate = null;
      selectedAccounts.forEach((account) => {
        if (account.paymentHistory && account.paymentHistory.length > 0) {
          const sortedPayments = [...account.paymentHistory].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          );
          const firstPayment = new Date(sortedPayments[0].date);
          if (!earliestDate || firstPayment < earliestDate) {
            earliestDate = firstPayment;
          }
        }
      });

      if (earliestDate) {
        const yearsElapsed =
          (new Date() - earliestDate) / (1000 * 60 * 60 * 24 * 365.25);
        if (yearsElapsed > 0) {
          return Math.pow(totalValue / deposits, 1 / yearsElapsed) - 1;
        }
      }
    }

    // Fallback to original calculation
    if (deposits > 0 && numberOfYears > 0) {
      return Math.pow(totalValue / deposits, 1 / numberOfYears) - 1;
    }
    return 0;
  }, [deposits, totalValue, numberOfYears, pensionAccounts, selectedPensions]);

  // Calculate true IRR using payment history
  const irr = useMemo(() => {
    const portfolioIRR = calculatePortfolioIRR(
      pensionAccounts,
      selectedPensions,
      totalValue
    );
    return portfolioIRR !== null ? portfolioIRR : averageAnnualReturn;
  }, [pensionAccounts, selectedPensions, totalValue, averageAnnualReturn]);

  const depositWidth =
    deposits > 0 ? (deposits / (deposits + Math.abs(gainLoss))) * 100 : 50;
  const gainLossWidth = 100 - depositWidth;

  const formatCurrency = (value) =>
    value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatPercentage = (value) =>
    value.toFixed(2).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="performance-cards-container">
      <div className="performance-card responsive-card">
        <h3>Summary</h3>

        <div className="value-pair">
          <span>Deposits:</span>
          <span>£{formatCurrency(deposits)}</span>
        </div>

        <div className="value-pair">
          <span>Current Value:</span>
          <span>£{formatCurrency(totalValue)}</span>
        </div>

        <div className="value-pair">
          <span>Gain/Loss (£):</span>
          <span className={isPositive ? "gain-text" : "loss-text"}>
            {isPositive ? "+" : "−"}£{formatCurrency(Math.abs(gainLoss))}
          </span>
        </div>

        <div className="value-pair">
          <span>Gain/Loss (%):</span>
          <span className={isPositive ? "gain-text" : "loss-text"}>
            {isPositive ? "+" : "−"}
            {formatPercentage(Math.abs(gainLossPercent))}%
          </span>
        </div>

        <div className="value-pair">
          <span>
            CAGR
            <span
              className="info-icon-wrapper"
              onMouseEnter={handleCAGRMouseEnter}
              onMouseLeave={() => setShowCAGRTooltip(false)}
            >
              <AlertCircle className="info-icon-inline" />
              {showCAGRTooltip && (
                <div className={`info-tooltip ${cagrTooltipPosition}`}>
                  <strong>Compound Annual Growth Rate (CAGR)</strong>
                  <br />
                  The average yearly return required to grow your deposits to
                  the current value over {numberOfYears} year
                  {numberOfYears !== 1 ? "s" : ""}.
                </div>
              )}
            </span>
            :
          </span>

          <span
            className={averageAnnualReturn >= 0 ? "gain-text" : "loss-text"}
          >
            {averageAnnualReturn >= 0 ? "+" : "−"}
            {formatPercentage(Math.abs(averageAnnualReturn * 100))}%
          </span>
        </div>

        <div className="value-pair">
          <span>
            IRR
            <span
              className="info-icon-wrapper"
              onMouseEnter={handleIRRMouseEnter}
              onMouseLeave={() => setShowIRRTooltip(false)}
            >
              <AlertCircle className="info-icon-inline" />
              {showIRRTooltip && (
                <div className={`info-tooltip ${irrTooltipPosition}`}>
                  <strong>Internal Rate of Return (IRR)</strong>
                  <br />
                  Considers timing of each deposit, not just total and duration.
                  May better reflect actual investment performance.
                </div>
              )}
            </span>
            :
          </span>
          <span className={irr >= 0 ? "gain-text" : "loss-text"}>
            {irr >= 0 ? "+" : "−"}
            {formatPercentage(Math.abs(irr * 100))}%
          </span>
        </div>

        <div
          className="performance-bar"
          role="img"
          aria-label={`Performance bar showing deposits and ${
            isPositive ? "gains" : "losses"
          }`}
        >
          <div
            className="deposit-bar animated-bar"
            style={{ width: `${depositWidth}%` }}
            title={`Deposits: £${formatCurrency(deposits)}`}
          />
          <div
            className={`gainloss-bar animated-bar ${
              isPositive ? "gain" : "loss"
            }`}
            style={{ width: `${gainLossWidth}%` }}
            title={`${isPositive ? "Gain" : "Loss"}: £${formatCurrency(
              Math.abs(gainLoss)
            )}`}
          />
        </div>

        <div className="timestamp">As of {new Date().toLocaleDateString()}</div>
      </div>
    </div>
  );
}
