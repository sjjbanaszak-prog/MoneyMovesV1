import React, { useState } from "react";
import "./ColumnMapperStyles.css";
import { detectDateFormat } from "./utils/detectDateFormat";

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

export default function PensionColumnMapper({
  data,
  initialMapping,
  onConfirm,
  onCancel,
  fileName,
  totalRows,
}) {
  const [mapping, setMapping] = useState(initialMapping);
  const [selectedDateFormat, setSelectedDateFormat] = useState(
    initialMapping?.dateFormat || ""
  );
  const [showAllRows, setShowAllRows] = useState(false);

  const headers = Object.keys(data[0]);
  const displayRows = showAllRows ? data : data.slice(0, 5);

  const handleSelectChange = (field, value) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    console.log("=== CONFIRM BUTTON CLICKED ===");
    console.log("handleConfirm called");
    console.log("Current mapping:", mapping);
    console.log("Selected date format:", selectedDateFormat);
    console.log("onConfirm function:", typeof onConfirm);

    // Basic validation first
    if (!mapping.date || !mapping.amount || !mapping.provider) {
      console.warn("Missing required mappings:", {
        date: mapping.date,
        provider: mapping.provider,
        amount: mapping.amount,
      });
      alert("Please map all required fields: Date, Provider, Amount.");
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

      console.log("About to call onConfirm with:", {
        mapping,
        dateFormat: finalDateFormat,
        rawData: data,
      });

      // Call the parent's onConfirm callback
      if (typeof onConfirm === "function") {
        onConfirm({
          mapping,
          dateFormat: finalDateFormat,
          rawData: data,
        });
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
          Map your file columns to the required pension data fields
        </div>
      </div>

      <div className="mapper-grid">
        {["date", "provider", "amount"].map((field) => (
          <div key={field} className="mapping-field">
            <label className="mapper-label">
              {field.charAt(0).toUpperCase() + field.slice(1)} Column
            </label>
            <select
              value={mapping[field] || ""}
              onChange={(e) => handleSelectChange(field, e.target.value)}
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
        ))}

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
                <th>Provider</th>
                <th>Amount</th>
                <th>Additional Data</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row[mapping.date] ?? ""}</td>
                  <td>{row[mapping.provider] ?? ""}</td>
                  <td>{row[mapping.amount] ?? ""}</td>
                  <td>
                    {Object.entries(row)
                      .filter(
                        ([key]) =>
                          key !== mapping.date &&
                          key !== mapping.provider &&
                          key !== mapping.amount
                      )
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
