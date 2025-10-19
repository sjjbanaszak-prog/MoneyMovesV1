// /modules/IncomeTaxInputs.js
import React from "react";
import "../modules/IncomeTaxInputsStyles.css";

const pensionTypes = [
  "Salary Sacrifice",
  "Net Pay",
  "Relief at Source",
  "Qualifying Earnings",
];

export default function IncomeTaxInputs({
  salary,
  bonus,
  age,
  retirementAge,
  currentPot,
  pensionType,
  unitType,
  currentContrib,
  futureContrib,
  employerMatchEnabled,
  employerMatch,
  setSalary,
  setBonus,
  setAge,
  setRetirementAge,
  setCurrentPot,
  setPensionType,
  setUnitType,
  setCurrentContrib,
  setFutureContrib,
  setEmployerMatchEnabled,
  setEmployerMatch,
}) {
  const stripLeadingZeros = (value) => value.replace(/^0+(?!\.)/, "") || "0";

  return (
    <div className="input-wrapper">
      <div className="tax-table-header">
        <h3 className="tax-table-title">Income Tax Inputs</h3>
      </div>
      <div className="mapper-grid">
        <div>
          <label className="mapper-label">Annual Salary (£)</label>
          <input
            type="number"
            className="mapper-input"
            value={salary}
            onChange={(e) => setSalary(+stripLeadingZeros(e.target.value))}
          />
        </div>
        <div>
          <label className="mapper-label">Bonus/Commission (£)</label>
          <input
            type="number"
            className="mapper-input"
            value={bonus}
            onChange={(e) => setBonus(+stripLeadingZeros(e.target.value))}
          />
        </div>
        <div>
          <label className="mapper-label">Current Age</label>
          <input
            type="number"
            className="mapper-input"
            value={age}
            onChange={(e) => setAge(+stripLeadingZeros(e.target.value))}
          />
        </div>
        <div>
          <label className="mapper-label">Retirement Age</label>
          <input
            type="number"
            className="mapper-input"
            value={retirementAge}
            onChange={(e) =>
              setRetirementAge(+stripLeadingZeros(e.target.value))
            }
          />
        </div>
        <div>
          <label className="mapper-label">Current Pot (£)</label>
          <input
            type="number"
            className="mapper-input"
            value={currentPot}
            onChange={(e) => setCurrentPot(+stripLeadingZeros(e.target.value))}
          />
        </div>
      </div>

      <div className="tab-group">
        {pensionTypes.map((t) => (
          <button
            key={t}
            className={pensionType === t ? "active" : ""}
            onClick={() => setPensionType(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mapper-grid">
        <div>
          <label className="mapper-label">Input Type</label>
          <select
            className="mapper-input"
            value={unitType}
            onChange={(e) => setUnitType(e.target.value)}
          >
            <option value="percent">%</option>
            <option value="amount">£</option>
          </select>
        </div>

        <div>
          <label className="mapper-label">Current Monthly Contribution</label>
          <input
            type="number"
            className="mapper-input"
            value={currentContrib}
            onChange={(e) =>
              setCurrentContrib(+stripLeadingZeros(e.target.value))
            }
          />
        </div>

        <div>
          <label className="mapper-label">Future Monthly Contribution</label>
          <input
            type="number"
            className="mapper-input"
            value={futureContrib}
            onChange={(e) =>
              setFutureContrib(+stripLeadingZeros(e.target.value))
            }
          />
        </div>
      </div>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={employerMatchEnabled}
          onChange={(e) => setEmployerMatchEnabled(e.target.checked)}
        />
        Employer Match
      </label>

      {employerMatchEnabled && (
        <div className="mapper-grid">
          <div>
            <label className="mapper-label">Employer Match (%)</label>
            <input
              type="number"
              className="mapper-input"
              value={employerMatch}
              onChange={(e) =>
                setEmployerMatch(+stripLeadingZeros(e.target.value))
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
