import React, { useState, useEffect } from "react";
import "./ColumnMapperStyles.css";
import { detectDateFormat } from "./utils/detectDateFormat";
import { detectAccountType, detectBank } from "./utils/columnDetection";
import { calculateDataQualityScore } from "./utils/dataValidation";

const banks = [
  "Barclays",
  "Halifax",
  "HSBC",
  "Lloyds",
  "Monzo",
  "NatWest",
  "Santander",
  "Starling",
  "First Direct",
  "Nationwide",
  "NS&I",
  "Trading212",
  "Vanguard",
  "AJ Bell",
  "Other",
];

const accountTypes = [
  "Current Account",
  "Savings",
  "ISA",
  "LISA",
  "Premium Bonds",
  "Investment Account",
  "Pension",
  "Other",
];

const knownDateFormats = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "DD-MM-YYYY",
  "MM-DD-YYYY",
  "YYYY/MM/DD",
  "D/M/YYYY",
  "M/D/YYYY",
  "D/MM/YYYY",
];

export default function ColumnMapper({
  data,
  initialMapping,
  onConfirm,
  onCancel,
  fileName,
  totalRows,
}) {
  const [mapping, setMapping] = useState(initialMapping);
  const [bank, setBank] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [selectedDateFormat, setSelectedDateFormat] = useState(
    initialMapping?.dateFormat || ""
  );
  const [showAllRows, setShowAllRows] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [autoDetectedInfo, setAutoDetectedInfo] = useState({});
  const [dataQuality, setDataQuality] = useState(null);

  const headers = Object.keys(data[0]);
  const displayRows = showAllRows ? data : data.slice(0, 5);

  useEffect(() => {
    const detectedBank = detectBank(data, mapping, fileName);
    const detectedAccountType = detectAccountType(data, mapping);
    const detectedDateFormat = mapping.date
      ? detectDateFormat(
          data
            .slice(0, 10)
            .map((row) => row[mapping.date])
            .filter(Boolean)
        )
      : null;

    const detected = {
      bank: detectedBank,
      accountType: detectedAccountType,
      dateFormat: detectedDateFormat,
    };

    setAutoDetectedInfo(detected);

    if (detectedBank && !bank) setBank(detectedBank);
    if (detectedAccountType && !accountType)
      setAccountType(detectedAccountType);
    if (detectedDateFormat && !selectedDateFormat)
      setSelectedDateFormat(detectedDateFormat);

    if (!accountName && detectedBank && detectedAccountType) {
      setAccountName(`${detectedBank} ${detectedAccountType}`);
    }
  }, [
    data,
    mapping,
    fileName,
    bank,
    accountType,
    selectedDateFormat,
    accountName,
  ]);

  useEffect(() => {
    const errors = {};

    if (!mapping.date) errors.date = "Date column is required";
    if (!mapping.balance && !mapping.amount) {
      errors.balance = "Either Balance or Amount column is required";
    }

    if (mapping.date && selectedDateFormat) {
      const dateValues = data
        .slice(0, 5)
        .map((row) => row[mapping.date])
        .filter(Boolean);
      const validDates = dateValues.filter((val) => {
        return (
          /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(val) ||
          /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(val)
        );
      });

      if (validDates.length === 0) {
        errors.date = "Selected column doesn't contain recognizable dates";
      }
    }

    ["debit", "credit", "balance", "amount"].forEach((field) => {
      if (mapping[field]) {
        const values = data
          .slice(0, 5)
          .map((row) => row[mapping[field]])
          .filter((val) => val !== "" && val != null);
        const numericValues = values.filter(
          (val) => !isNaN(parseFloat(String(val).replace(/[£$,]/g, "")))
        );

        if (numericValues.length === 0 && values.length > 0) {
          errors[field] = `Selected column doesn't contain numeric values`;
        }
      }
    });

    setValidationErrors(errors);

    if (
      mapping.date &&
      selectedDateFormat &&
      Object.keys(errors).length === 0
    ) {
      const quality = calculateDataQualityScore(
        data,
        mapping,
        selectedDateFormat
      );
      setDataQuality(quality);
    }
  }, [mapping, data, selectedDateFormat]);

  const handleSelectChange = (field, value) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    if (!mapping.date || !bank || !accountName || !accountType) {
      alert(
        "Please fill in all required fields: Date column, Bank, Account Name, and Account Type."
      );
      return;
    }

    if (Object.keys(validationErrors).length > 0) {
      alert("Please fix the validation errors before continuing.");
      return;
    }

    let finalDateFormat = selectedDateFormat;
    if (!finalDateFormat && mapping.date) {
      const dateValues = data
        .slice(0, 20)
        .map((row) => row[mapping.date])
        .filter(Boolean);
      finalDateFormat = detectDateFormat(dateValues);
    }

    if (!finalDateFormat) {
      alert(
        "Could not detect a valid date format. Please select one manually."
      );
      return;
    }

    if (dataQuality && dataQuality.score < 70) {
      const proceed = window.confirm(
        `Data quality score is ${dataQuality.score}/100. Issues found:\n\n` +
          dataQuality.recommendations.join("\n") +
          "\n\nContinue anyway?"
      );
      if (!proceed) return;
    }

    onConfirm(
      {
        ...mapping,
        dateFormat: finalDateFormat,
      },
      bank,
      accountName,
      accountType
    );
  };

  const getFieldStatus = (field) => {
    if (validationErrors[field]) return "error";
    if (mapping[field]) return "valid";
    return "empty";
  };

  const renderFieldMapping = (field, label, required = false) => (
    <div key={field} className="mapping-field">
      <label className={`mapper-label ${required ? "required" : ""}`}>
        {label}
        {autoDetectedInfo[field] && (
          <span className="auto-detected">
            (Auto-detected: {autoDetectedInfo[field]})
          </span>
        )}
      </label>
      <select
        value={mapping[field] || ""}
        onChange={(e) => handleSelectChange(field, e.target.value)}
        className={`mapper-input ${getFieldStatus(field)}`}
      >
        <option value="">-- Select Column --</option>
        {headers.map((col) => (
          <option key={col} value={col}>
            {col}
          </option>
        ))}
      </select>
      {validationErrors[field] && (
        <div className="field-error">{validationErrors[field]}</div>
      )}
    </div>
  );

  return (
    <div className="column-mapper-wrapper dark-mode overlay-mode">
      <div className="mapping-header">
        <h3 className="column-mapper-title">Configure Column Mapping</h3>
        <div className="mapping-subtitle">
          {fileName && `File: ${fileName} • `}
          Map your file columns to the required bank statement fields
        </div>
      </div>

      <div className="mapper-grid">
        {renderFieldMapping("date", "Date Column", true)}
        {renderFieldMapping("description", "Description/Narrative Column")}
        {renderFieldMapping("debit", "Debit/Money Out Column")}
        {renderFieldMapping("credit", "Credit/Money In Column")}
        {renderFieldMapping("balance", "Balance Column")}
        {renderFieldMapping("amount", "Amount/Transaction Value Column")}

        <div className="mapping-field">
          <label className="mapper-label">
            Date Format
            {autoDetectedInfo.dateFormat && (
              <span className="auto-detected">
                (Auto-detected: {autoDetectedInfo.dateFormat})
              </span>
            )}
          </label>
          <select
            value={selectedDateFormat}
            onChange={(e) => setSelectedDateFormat(e.target.value)}
            className="mapper-input"
          >
            <option value="">-- Auto Detect or Select --</option>
            {knownDateFormats.map((fmt) => (
              <option key={fmt} value={fmt}>
                {fmt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mapper-grid">
        <div className="mapping-field">
          <label className="mapper-label required">Bank Name *</label>
          <select
            className="mapper-input"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          >
            <option value="">-- Select Bank --</option>
            {banks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="mapping-field">
          <label className="mapper-label required">Account Name *</label>
          <input
            type="text"
            className="mapper-input"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="e.g. Main Current Account"
          />
        </div>
        <div className="mapping-field">
          <label className="mapper-label required">Account Type *</label>
          <select
            className="mapper-input"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
          >
            <option value="">-- Select Account Type --</option>
            {accountTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="data-quality-section">
        <h4 className="preview-title">Data Quality Check</h4>
        <div className="quality-indicators">
          <div className={`quality-item ${mapping.date ? "valid" : "invalid"}`}>
            ✓ Date column identified
          </div>
          <div
            className={`quality-item ${
              mapping.balance || mapping.amount ? "valid" : "invalid"
            }`}
          >
            ✓ Balance/Amount column identified
          </div>
          <div
            className={`quality-item ${
              Object.keys(validationErrors).length === 0 ? "valid" : "invalid"
            }`}
          >
            ✓ No validation errors
          </div>
          {dataQuality && (
            <div
              className={`quality-item ${
                dataQuality.score >= 70 ? "valid" : "invalid"
              }`}
            >
              ✓ Data quality: {dataQuality.score}/100
            </div>
          )}
        </div>
      </div>

      <div className="preview-section">
        <h4 className="preview-title">
          Data Preview (showing {displayRows.length} of{" "}
          {totalRows || data.length} rows)
        </h4>
        <div className="preview-table-container">
          <table className="preview-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Balance</th>
                <th>Amount</th>
                <th>Additional Data</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row[mapping.date] ?? ""}</td>
                  <td>{row[mapping.description] ?? ""}</td>
                  <td>{row[mapping.debit] ?? ""}</td>
                  <td>{row[mapping.credit] ?? ""}</td>
                  <td>{row[mapping.balance] ?? ""}</td>
                  <td>{row[mapping.amount] ?? ""}</td>
                  <td>
                    {Object.entries(row)
                      .filter(([key]) => !Object.values(mapping).includes(key))
                      .slice(0, 2)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!showAllRows && data.length > 5 && (
          <div className="show-more" onClick={() => setShowAllRows(true)}>
            Show all {data.length} rows...
          </div>
        )}
      </div>

      <div className="mapper-actions">
        <button onClick={onCancel} className="cancel-button" type="button">
          Cancel
        </button>
        <button
          className={`confirm-button ${
            Object.keys(validationErrors).length > 0 ? "disabled" : ""
          }`}
          onClick={handleConfirm}
          disabled={Object.keys(validationErrors).length > 0}
          type="button"
        >
          Confirm Mapping
        </button>
      </div>
    </div>
  );
}
