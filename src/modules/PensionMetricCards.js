import React, { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import "./PensionMetricCardsStyles.css";

export default function PensionMetricCards({
  pensionAccounts,
  selectedPensions,
  yearlyTotals,
}) {
  const [showIRRTooltip, setShowIRRTooltip] = useState(false);
  const [irrTooltipPosition, setIRRTooltipPosition] = useState("tooltip-center");

  // Calculate optimal tooltip position
  const calculateTooltipPosition = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipWidth = window.innerWidth <= 480 ? 200 : window.innerWidth <= 640 ? 240 : 280;
    const viewportWidth = window.innerWidth;

    const rightEdge = rect.left + tooltipWidth / 2;
    const leftEdge = rect.left - tooltipWidth / 2;

    if (rightEdge > viewportWidth - 20) {
      return "tooltip-left";
    } else if (leftEdge < 20) {
      return "tooltip-right";
    }
    return "tooltip-center";
  };

  const handleIRRMouseEnter = (event) => {
    setIRRTooltipPosition(calculateTooltipPosition(event));
    setShowIRRTooltip(true);
  };

  // Calculate deposits
  const deposits = useMemo(() => {
    if (!Array.isArray(pensionAccounts) || !Array.isArray(selectedPensions)) return 0;
    return pensionAccounts
      .filter((account) => selectedPensions.includes(account.provider))
      .reduce((sum, account) => sum + (account?.deposits || 0), 0);
  }, [pensionAccounts, selectedPensions]);

  // Calculate total current value
  const totalValue = useMemo(() => {
    if (!Array.isArray(pensionAccounts) || !Array.isArray(selectedPensions)) return 0;
    return pensionAccounts
      .filter((account) => selectedPensions.includes(account.provider))
      .reduce((sum, account) => sum + (account?.currentValue || 0), 0);
  }, [pensionAccounts, selectedPensions]);

  // Check if user has entered current values
  const hasCurrentValue = totalValue > 0;

  // Calculate gain/loss
  const gainLoss = totalValue - deposits;
  const gainLossPercent = deposits > 0 ? (gainLoss / deposits) * 100 : 0;
  const isPositive = gainLoss >= 0;

  // Calculate IRR using Newton-Raphson method
  const calculateIRR = (cashflows, guess = 0.05) => {
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
  };

  // Calculate portfolio IRR
  const irr = useMemo(() => {
    if (!Array.isArray(pensionAccounts) || !Array.isArray(selectedPensions)) return null;

    const selectedAccounts = pensionAccounts.filter(
      (account) =>
        selectedPensions.includes(account.provider) &&
        account.paymentHistory &&
        Array.isArray(account.paymentHistory)
    );

    if (selectedAccounts.length === 0) return null;

    try {
      const allPayments = [];
      selectedAccounts.forEach((account) => {
        if (account.paymentHistory) {
          allPayments.push(...account.paymentHistory);
        }
      });

      if (allPayments.length === 0) return null;

      allPayments.sort((a, b) => new Date(a.date) - new Date(b.date));

      const paymentsByYear = {};
      const startYear = new Date(allPayments[0].date).getFullYear();
      const currentYear = new Date().getFullYear();

      for (let year = startYear; year <= currentYear; year++) {
        paymentsByYear[year] = 0;
      }

      allPayments.forEach((payment) => {
        const year = new Date(payment.date).getFullYear();
        paymentsByYear[year] += payment.amount;
      });

      const cashflows = [];
      for (let year = startYear; year <= currentYear; year++) {
        if (paymentsByYear[year] > 0) {
          cashflows.push(-paymentsByYear[year]);
        } else if (year < currentYear) {
          cashflows.push(0);
        }
      }

      cashflows.push(totalValue);

      return calculateIRR(cashflows);
    } catch (error) {
      console.warn("Error calculating portfolio IRR:", error);
      return null;
    }
  }, [pensionAccounts, selectedPensions, totalValue]);

  // Calculate current tax year's allowance usage
  const currentYearAllowanceData = useMemo(() => {
    // Get current UK tax year (April 6 - April 5)
    const now = new Date();
    const currentYear = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    // If we're before April 6, we're still in the previous tax year
    const taxYear = (month > 3 || (month === 3 && day >= 6)) ? currentYear : currentYear - 1;

    // Get the annual allowance for this tax year (£60k from 2023/24 onwards, £40k before)
    const annualAllowance = taxYear >= 2023 ? 60000 : 40000;

    // Get the contributions for this tax year from yearlyTotals
    const used = yearlyTotals?.[taxYear] || 0;

    // Calculate percentage used
    const percentUsed = annualAllowance > 0 ? (used / annualAllowance) * 100 : 0;

    return {
      taxYear,
      used,
      annualAllowance,
      percentUsed,
    };
  }, [yearlyTotals]);

  const formatPercentage = (value) =>
    value.toFixed(2).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatCurrency = (value) =>
    Math.round(value).toLocaleString();

  // Calculate progress bar widths
  const depositWidth =
    deposits > 0 ? (deposits / (deposits + Math.abs(gainLoss))) * 100 : 50;
  const gainLossWidth = 100 - depositWidth;

  return (
    <>
      <div className="pension-metrics-grid">
        {/* Card 1: Current Value */}
        <div className="pension-metric-card">
          <div className="pension-metric-label">Current Value</div>
          <div className="pension-metric-value">
            £{totalValue.toLocaleString()}
          </div>
          <div className="pension-metric-subtitle">
            Deposits: £{Math.round(deposits).toLocaleString()}
          </div>
        </div>

        {/* Card 2: Growth */}
        <div className="pension-metric-card">
          <div className="pension-metric-label">Growth</div>
          <div
            className="pension-metric-value"
            style={{ color: hasCurrentValue ? (isPositive ? "#10b981" : "#ef4444") : "#fff" }}
          >
            {hasCurrentValue ? (
              <>
                {isPositive ? "+" : "-"}£{Math.round(Math.abs(gainLoss)).toLocaleString()}
              </>
            ) : (
              "£0"
            )}
          </div>
          {hasCurrentValue && (
            <div
              className="pension-metric-change"
              style={{ color: isPositive ? "#10b981" : "#ef4444" }}
            >
              {isPositive ? "▲" : "▼"} {Math.abs(gainLossPercent).toFixed(2)}%
            </div>
          )}
        </div>

        {/* Card 3: IRR */}
        <div className="pension-metric-card">
          <div className="pension-metric-label">
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
          </div>
          <div
            className="pension-metric-value"
            style={{
              color: !hasCurrentValue
                ? "#fff"
                : (irr !== null && irr >= 0 ? "#10b981" : "#ef4444")
            }}
          >
            {!hasCurrentValue
              ? "-"
              : irr !== null
              ? `${irr >= 0 ? "+" : ""}${formatPercentage(irr * 100)}%`
              : "N/A"}
          </div>
        </div>

        {/* Card 4: Annual Allowance Used */}
        <div className="pension-metric-card">
          <div className="pension-metric-label">Annual Allowance Used</div>
          <div className="pension-metric-value">
            £{formatCurrency(currentYearAllowanceData.used)}
          </div>
          <div className="pension-metric-subtitle">
            {currentYearAllowanceData.percentUsed.toFixed(1)}% of £{formatCurrency(currentYearAllowanceData.annualAllowance)}
          </div>
        </div>
      </div>

      {/* Progress Bar Card - Full Width */}
      <div className="pension-progress-card">
        <div className="progress-card-content">
          <div className="progress-legend">
            <div className="progress-legend-item">
              <div className="progress-legend-color deposit-color"></div>
              <span className="progress-legend-label">
                Deposits: £{formatCurrency(deposits)}
              </span>
            </div>
            <div className="progress-legend-item">
              <div
                className={`progress-legend-color ${
                  isPositive ? "gain-color" : "loss-color"
                }`}
              ></div>
              <span className="progress-legend-label">
                Growth: {isPositive ? "" : "-"}£{formatCurrency(Math.abs(gainLoss))}
              </span>
            </div>
          </div>
          <div
            className="pension-performance-bar"
            role="img"
            aria-label={`Performance bar showing deposits and growth`}
          >
            <div
              className="pension-deposit-bar animated-bar"
              style={{ width: `${depositWidth}%` }}
              title={`Deposits: £${formatCurrency(deposits)}`}
            />
            <div
              className={`pension-gainloss-bar animated-bar ${
                isPositive ? "gain" : "loss"
              }`}
              style={{ width: `${gainLossWidth}%` }}
              title={`Growth: ${isPositive ? "" : "-"}£${formatCurrency(Math.abs(gainLoss))}`}
            />
          </div>
        </div>
      </div>
    </>
  );
}
