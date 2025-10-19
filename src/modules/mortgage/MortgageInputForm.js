// /modules/MortgageInputForm.js
import React from "react";
import "../IncomeTaxInputsStyles.css"; // assuming same CSS for mapper-grid, mapper-label, mapper-input, checkbox-label etc.

export default function MortgageInputForm({
  inputs,
  updateInput,
  frequencyOptions,
  repaymentMethodOptions,
}) {
  // same stripLeadingZeros function for consistent numeric input
  const stripLeadingZeros = (value) => value.replace(/^0+(?!\.)/, "") || "0";

  return (
    <div className="input-wrapper">
      <div className="tax-table-header">
        <h3 className="tax-table-title">Mortgage Details</h3>
      </div>

      <div className="mapper-grid">
        <div>
          <label className="mapper-label">Loan Amount (£)</label>
          <input
            type="number"
            className="mapper-input"
            value={inputs.loanAmount}
            onChange={(e) =>
              updateInput("loanAmount", +stripLeadingZeros(e.target.value))
            }
          />
        </div>
        <div>
          <label className="mapper-label">Term (Years)</label>
          <input
            type="number"
            className="mapper-input"
            value={inputs.termYears}
            onChange={(e) =>
              updateInput("termYears", +stripLeadingZeros(e.target.value))
            }
          />
        </div>
        <div>
          <label className="mapper-label">Initial Rate (%)</label>
          <input
            type="number"
            step="0.01"
            className="mapper-input"
            value={inputs.initialRate}
            onChange={(e) =>
              updateInput("initialRate", +stripLeadingZeros(e.target.value))
            }
          />
        </div>
        <div>
          <label className="mapper-label">Initial Term (Years)</label>
          <input
            type="number"
            className="mapper-input"
            value={inputs.initialtermYears}
            onChange={(e) =>
              updateInput(
                "initialtermYears",
                +stripLeadingZeros(e.target.value)
              )
            }
          />
        </div>
        <div>
          <label className="mapper-label">Expiry Rate (%)</label>
          <input
            type="number"
            step="0.01"
            className="mapper-input"
            value={inputs.expiryRate}
            onChange={(e) =>
              updateInput("expiryRate", +stripLeadingZeros(e.target.value))
            }
          />
        </div>
      </div>

      <div className="tax-table-header" style={{ marginTop: "32px" }}>
        <h3 className="tax-table-title">Overpayment Options</h3>
      </div>

      <div className="mapper-grid">
        <div>
          <label className="mapper-label">Frequency</label>
          <select
            className="mapper-input"
            value={inputs.frequency}
            onChange={(e) => updateInput("frequency", e.target.value)}
          >
            {frequencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mapper-label">Regular Overpayment (£/period)</label>
          <input
            type="number"
            className="mapper-input"
            value={inputs.regularOverpayment}
            onChange={(e) =>
              updateInput(
                "regularOverpayment",
                +stripLeadingZeros(e.target.value)
              )
            }
          />
        </div>
      </div>

      <label className="checkbox-label" style={{ marginTop: "1rem" }}>
        <input
          type="checkbox"
          checked={inputs.oneOffOverpaymentEnabled || false}
          onChange={(e) =>
            updateInput("oneOffOverpaymentEnabled", e.target.checked)
          }
        />
        One-off Overpayment
      </label>

      {inputs.oneOffOverpaymentEnabled && (
        <div className="mapper-grid" style={{ marginTop: "1rem" }}>
          <div>
            <label className="mapper-label">One-off Overpayment (£)</label>
            <input
              type="number"
              className="mapper-input"
              value={inputs.oneOffOverpayment}
              onChange={(e) =>
                updateInput(
                  "oneOffOverpayment",
                  +stripLeadingZeros(e.target.value)
                )
              }
            />
          </div>
          <div>
            <label className="mapper-label">Overpayment Month</label>
            <input
              type="number"
              className="mapper-input"
              min="1"
              max={inputs.termYears * 12}
              value={inputs.oneOffMonth}
              onChange={(e) =>
                updateInput("oneOffMonth", +stripLeadingZeros(e.target.value))
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
