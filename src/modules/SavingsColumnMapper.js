import React, { useState } from "react";
import "./ColumnMapperStyles.css";
import { detectDateFormat } from "./utils/detectDateFormat";
import { detectAccountType, detectBank } from "./utils/columnDetection";
import MappingConfidenceBar from "./MappingConfidenceBar";

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

export default function SavingsColumnMapper({
  data,
  initialMapping,
  onConfirm,
  onCancel,
  fileName,
  totalRows,
  detectedBank,
  confidenceScores,
  aiMetadata,
}) {
  const [mapping, setMapping] = useState(initialMapping || {});
  const [selectedDateFormat, setSelectedDateFormat] = useState(
    initialMapping?.dateFormat || ""
  );
  const [accountName, setAccountName] = useState(detectedBank || "");
  const [showAllRows, setShowAllRows] = useState(false);

  // Use confidence scores if provided, otherwise default to high confidence
  const scores = confidenceScores || {
    date: 90,
    balance: 90,
    amount: 85,
    description: 85,
    overall: 88
  };

  const headers = Object.keys(data[0]);
  const displayRows = showAllRows ? data : data.slice(0, 5);

  const handleSelectChange = (field, value) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    console.log("=== SAVINGS CONFIRM BUTTON CLICKED ===");
    console.log("Current mapping:", mapping);
    console.log("Account name:", accountName);
    console.log("Selected date format:", selectedDateFormat);

    // Basic validation
    if (!mapping.date) {
      alert("Please map the Date field.");
      return;
    }

    if (!mapping.balance && !mapping.amount) {
      alert("Please map either Balance or Amount field.");
      return;
    }

    if (!accountName || accountName.trim() === "") {
      alert("Please enter an account name.");
      return;
    }

    let finalDateFormat = selectedDateFormat;

    try {
      // Try to detect date format if not manually selected
      if (!finalDateFormat) {
        console.log("Attempting to detect date format...");
        const dateValues = data
          .slice(0, 20)
          .map((row) => row[mapping.date])
          .filter(Boolean);

        console.log("Sample date values:", dateValues);
        finalDateFormat = detectDateFormat(dateValues);
        console.log("Detected date format:", finalDateFormat);
      }

      if (!finalDateFormat) {
        console.warn("No date format detected or selected");
        alert(
          "Could not detect a valid date format. Please select one manually."
        );
        return;
      }

      // Detect account type from data
      const accountType = detectAccountType(data, mapping);

      console.log("About to call onConfirm with:", {
        mapping,
        dateFormat: finalDateFormat,
        accountName,
        accountType,
      });

      // Call the parent's onConfirm callback
      if (typeof onConfirm === "function") {
        onConfirm(
          { ...mapping, dateFormat: finalDateFormat },
          detectedBank || accountName,
          accountName.trim(),
          accountType
        );
        console.log("onConfirm called successfully");
      } else {
        console.error("onConfirm is not a function:", onConfirm);
        alert("Configuration error: onConfirm callback is not available");
      }
    } catch (err) {
      console.error("Error in handleConfirm:", err);
      alert(`An error occurred during confirmation: ${err.message}`);
    }
  };

  return (
    <div className="column-mapper-wrapper dark-mode overlay-mode">
      <div className="mapping-header">
        <h3 className="column-mapper-title">Configure Column Mapping</h3>
        <div className="mapping-subtitle">
          {fileName && `File: ${fileName} • `}
          Map your file columns to the required savings account fields
        </div>
      </div>

      {/* Overall Mapping Confidence */}
      {confidenceScores && (
        <div className="confidence-section" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
              Mapping Confidence
            </span>
            {aiMetadata && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Source: {aiMetadata.extractionMethod === 'santander-table' ? 'PDF Table' :
                         aiMetadata.extractionMethod === 'santander-key-value' ? 'TXT File' :
                         aiMetadata.extractionMethod === 'column-headers' ? 'CSV/Excel' : 'Auto-detected'}
              </span>
            )}
          </div>
          <MappingConfidenceBar confidence={scores.overall} showLabel={true} />
          {scores.overall < 65 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--warning)' }}>
              ⚠️ Low confidence - Please review the column mappings carefully
            </div>
          )}
        </div>
      )}

      {/* Account Name Input */}
      <div className="mapper-grid">
        <div className="mapping-field">
          <label className="mapper-label">Account Name</label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="mapper-input"
            placeholder="e.g., Santander ISA"
          />
        </div>
      </div>

      {/* Column Mapping */}
      <div className="mapper-grid">
        <div className="mapping-field">
          <label className="mapper-label">Date Column</label>
          <select
            value={mapping.date || ""}
            onChange={(e) => handleSelectChange("date", e.target.value)}
            className="mapper-input"
          >
            <option value="">-- Select Column --</option>
            {headers.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        <div className="mapping-field">
          <label className="mapper-label">Balance Column (optional)</label>
          <select
            value={mapping.balance || ""}
            onChange={(e) => handleSelectChange("balance", e.target.value)}
            className="mapper-input"
          >
            <option value="">-- Select Column --</option>
            {headers.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        <div className="mapping-field">
          <label className="mapper-label">Amount Column (optional)</label>
          <select
            value={mapping.amount || ""}
            onChange={(e) => handleSelectChange("amount", e.target.value)}
            className="mapper-input"
          >
            <option value="">-- Select Column --</option>
            {headers.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        <div className="mapping-field">
          <label className="mapper-label">Description Column (optional)</label>
          <select
            value={mapping.description || ""}
            onChange={(e) => handleSelectChange("description", e.target.value)}
            className="mapper-input"
          >
            <option value="">-- Select Column --</option>
            {headers.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        <div className="mapping-field">
          <label className="mapper-label">Date Format</label>
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
                <th>Balance</th>
                <th>Amount</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row[mapping.date] ?? ""}</td>
                  <td>{row[mapping.balance] ?? ""}</td>
                  <td>{row[mapping.amount] ?? ""}</td>
                  <td>{row[mapping.description] ?? ""}</td>
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
          className="confirm-button"
          onClick={handleConfirm}
          type="button"
        >
          Confirm Mapping
        </button>
      </div>
    </div>
  );
}
