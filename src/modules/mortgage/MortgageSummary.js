import React from "react";
import "./MortgageSummaryStyles.css";
import {
  formatCurrency,
  calculateCompoundSavings,
} from "../utils/mortgageUtils";

const MortgageSummary = ({
  monthlyPayment,
  expiryPayment,
  oneOffOverpayment,
  oneOffOverpaymentType,
  oneOffOverpaymentAmount,
  amortizationWithOverpay,
  oneOffMonthIndex,
  interestSaved,
  timeSaved,
  totalPaidNoOverpay,
  totalPaidWithOverpay,
  savingsRate,
  regularOverpaymentAmount,
  mortgageTermYears,
  mortgageTermMonths,
  recommendation,
  handleChange,
}) => {
  const actualOverpayMonths = amortizationWithOverpay?.length || 0;

  const savingsInterestPotential = calculateCompoundSavings(
    regularOverpaymentAmount || 0,
    savingsRate || 0,
    actualOverpayMonths
  );

  return (
    <div className="mortgage-summary-wrapper">
      <div className="mortgage-summary-section">
        <h3 className="mortgage-summary-title">Summary</h3>

        <div className="summary-card-grid">
          <div className="summary-card">
            <span className="card-label">Current Repayments</span>
            <span className="card-value">£{monthlyPayment?.toFixed(2)}</span>
          </div>
          <div className="summary-card">
            <span className="card-label">Future Repayments</span>
            <span className="card-value">£{expiryPayment?.toFixed(2)}</span>
          </div>
          <div className="summary-card">
            <span className="card-label">Interest Saved</span>
            <span className="card-value">{formatCurrency(interestSaved)}</span>
          </div>
          <div className="summary-card">
            <span className="card-label">Time Saved</span>
            <span className="card-value">{timeSaved}</span>
          </div>
          <div className="summary-card">
            <span className="card-label">Total - No Overpayments</span>
            <span className="card-value">
              {formatCurrency(totalPaidNoOverpay)}
            </span>
          </div>
          <div className="summary-card">
            <span className="card-label">Total - With Overpayments</span>
            <span className="card-value">
              {formatCurrency(totalPaidWithOverpay)}
            </span>
          </div>
        </div>

        {oneOffOverpayment && (
          <p>
            <span className="mortgage-summary-label">One-off Overpayment:</span>
            <span className="mortgage-summary-value">
              {oneOffOverpaymentType === "%" ? (
                <>
                  {oneOffOverpaymentAmount}% of balance (
                  {formatCurrency(
                    (oneOffOverpaymentAmount / 100) *
                      (amortizationWithOverpay?.[oneOffMonthIndex - 1]
                        ?.balance || 0)
                  )}
                  )
                </>
              ) : (
                formatCurrency(oneOffOverpaymentAmount)
              )}
            </span>
          </p>
        )}
      </div>

      <div className="mortgage-summary-section">
        <h2 className="mortgage-summary-title">Savings Comparison</h2>

        <div className="summary-card-grid">
          <div>
            <label className="mortgage-summary-label">
              Assumed Savings Interest Rate (%)
            </label>
            <input
              name="savingsRate"
              type="number"
              className="mortgage-summary-input"
              value={savingsRate}
              onChange={handleChange}
            />
          </div>

          <div className="summary-card">
            <span className="card-label">Savings Potential</span>
            <span className="card-value">
              {formatCurrency(savingsInterestPotential)}
            </span>
          </div>
        </div>

        {(() => {
          const hasOverpayment = regularOverpaymentAmount > 0;
          const hasSavingsRate = savingsRate > 0;

          if (!hasOverpayment || !hasSavingsRate) return null;

          let recommendationText = "";

          if (savingsInterestPotential > interestSaved) {
            const netGain = savingsInterestPotential - interestSaved;
            recommendationText = `You would save more by investing the money in savings, which could grow to ${formatCurrency(
              savingsInterestPotential
            )} — more than the mortgage interest saved of ${formatCurrency(
              interestSaved
            )}. A net gain of ${formatCurrency(netGain)}.`;
          } else {
            const netGain = interestSaved - savingsInterestPotential;
            recommendationText = `You would save more by overpaying your mortgage, avoiding interest of ${formatCurrency(
              interestSaved
            )} — which is more than the potential savings growth of ${formatCurrency(
              savingsInterestPotential
            )}. A net gain of ${formatCurrency(netGain)}.`;
          }

          return (
            <p className="mortgage-summary-recommendation">
              Recommendation: {recommendationText}
            </p>
          );
        })()}
      </div>
    </div>
  );
};

export default MortgageSummary;
