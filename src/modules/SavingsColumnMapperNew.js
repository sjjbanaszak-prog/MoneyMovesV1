import React, { useState, useCallback, useMemo, useEffect } from "react";
import { detectAccountType } from "./utils/columnDetection";
import { detectDateFormat } from "./utils/detectDateFormat";
import "./MappingReviewModalStyles.css";

/**
 * SavingsColumnMapperNew - Matches pension MappingReviewModal layout exactly
 */

export default function SavingsColumnMapperNew({
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
  const [bankName, setBankName] = useState(detectedBank || "");
  const [accountName, setAccountName] = useState(detectedBank || "");
  const [accountType, setAccountType] = useState("");
  const [dateFormat, setDateFormat] = useState(initialMapping?.dateFormat || "DD/MM/YYYY");
  const [confirming, setConfirming] = useState(false);

  // Auto-detect account type on mount
  useEffect(() => {
    if (data && data.length > 0 && mapping.description) {
      const detected = detectAccountType(data, mapping);
      if (detected) {
        setAccountType(detected);
      }
    }
  }, [data, mapping.description]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const headers = Object.keys(data[0]);

  // Schema for savings accounts - matches pension format
  const schema = {
    requiredFields: [
      { key: 'date', label: 'Date' },
    ],
    optionalFields: [
      { key: 'description', label: 'Description' },
      { key: 'balance', label: 'Balance' },
      { key: 'amount', label: 'Amount' },
    ]
  };

  // Check if required fields are mapped
  // Either balance OR amount must be mapped (but not both required)
  const hasBalanceOrAmount = mapping.balance || mapping.amount;
  const allRequiredMapped = mapping.date &&
    bankName.trim() !== "" &&
    accountName.trim() !== "" &&
    accountType !== "" &&
    hasBalanceOrAmount;

  // Get sample data for preview
  const sampleRows = useMemo(() => data.slice(0, 5), [data]);

  const handleMappingChange = useCallback((field, columnName) => {
    setMapping((prev) => ({
      ...prev,
      [field]: columnName || undefined,
    }));
  }, []);

  const handleConfirm = useCallback(async () => {
    console.log("=== SAVINGS CONFIRM BUTTON CLICKED ===");
    console.log("Current mapping:", mapping);
    console.log("Bank name:", bankName);
    console.log("Account name:", accountName);
    console.log("Account type:", accountType);
    console.log("Selected date format:", dateFormat);

    // Basic validation
    if (!mapping.date) {
      alert("Please map the Date field.");
      return;
    }

    if (!mapping.balance && !mapping.amount) {
      alert("Please map either the Balance field or the Amount field.");
      return;
    }

    if (!bankName || bankName.trim() === "") {
      alert("Please enter a bank name.");
      return;
    }

    if (!accountName || accountName.trim() === "") {
      alert("Please enter an account name.");
      return;
    }

    if (!accountType || accountType === "") {
      alert("Please select an account type.");
      return;
    }

    setConfirming(true);

    try {
      let finalDateFormat = dateFormat;

      // Try to detect date format if not manually selected
      if (!finalDateFormat || finalDateFormat === "DD/MM/YYYY") {
        console.log("Attempting to detect date format...");
        const dateValues = data
          .slice(0, 20)
          .map((row) => row[mapping.date])
          .filter(Boolean);

        console.log("Sample date values:", dateValues);
        const detected = detectDateFormat(dateValues);
        if (detected) {
          finalDateFormat = detected;
          console.log("Detected date format:", finalDateFormat);
        }
      }

      if (!finalDateFormat) {
        console.warn("No date format detected or selected");
        alert("Could not detect a valid date format. Please select one manually.");
        setConfirming(false);
        return;
      }

      console.log("About to call onConfirm with:", {
        mapping,
        dateFormat: finalDateFormat,
        bankName,
        accountName,
        accountType,
      });

      // Call the parent's onConfirm callback
      if (typeof onConfirm === "function") {
        onConfirm(
          { ...mapping, dateFormat: finalDateFormat },
          bankName.trim(),
          accountName.trim(),
          accountType
        );
        console.log("onConfirm called successfully");
      } else {
        console.error("onConfirm is not a function:", onConfirm);
        alert("Configuration error: onConfirm callback is not available");
        setConfirming(false);
      }
    } catch (err) {
      console.error("Error in handleConfirm:", err);
      alert(`An error occurred during confirmation: ${err.message}`);
      setConfirming(false);
    }
  }, [
    mapping,
    bankName,
    accountName,
    accountType,
    dateFormat,
    data,
    onConfirm,
  ]);

  const getConfidenceBadge = (field) => {
    if (!confidenceScores) return null;

    const percentage = confidenceScores[field] || 0;

    let badgeClass = "confidence-badge-low";
    let icon = "🔍";

    if (aiMetadata?.source === "pdf-parser" && percentage >= 85) {
      badgeClass = "confidence-badge-high";
      icon = "✓";
    } else if (percentage >= 80) {
      badgeClass = "confidence-badge-high";
      icon = "✓";
    } else if (percentage >= 65) {
      badgeClass = "confidence-badge-medium";
      icon = "🔍";
    }

    return (
      <span className={`confidence-badge ${badgeClass}`}>
        {icon} {percentage}%
      </span>
    );
  };

  // Bank confidence badge
  const bankConfidencePercent = confidenceScores?.overall || 90;

  return (
    <div className="mapper-modal-overlay">
      <div className="mapper-modal-container">
        <div className="mapper-modal-content">
          {/* Compact Header */}
          <div className="mapper-header-compact">
            <div>
              <h2 className="mapper-title-compact">Confirm Column Mapping</h2>
              <div className="mapper-file-info-compact">
                <span>📄 {fileName.length > 25 ? fileName.substring(0, 25) + '...' : fileName}</span>
                <span>•</span>
                <span>{data.length} rows</span>
              </div>
            </div>
          </div>

          {/* Bank Name with Auto-Detection */}
          <div className="provider-section-compact">
            <label className="form-label-compact">
              <span className="form-label-text">
                Bank <span className="required-star">*</span>
              </span>
              {detectedBank && bankConfidencePercent > 0 && (
                <span
                  className={`confidence-badge ${
                    bankConfidencePercent >= 80
                      ? "confidence-badge-high"
                      : bankConfidencePercent >= 50
                      ? "confidence-badge-medium"
                      : "confidence-badge-low"
                  }`}
                >
                  {bankConfidencePercent >= 80 ? "✓" : "🔍"} {bankConfidencePercent}%
                </span>
              )}
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g., Santander, Barclays, HSBC"
              className="form-input-compact"
            />
            <p className="form-helper-text">
              Enter the bank or financial institution name
            </p>
          </div>

          {/* Account Type Selection */}
          <div className="provider-section-compact">
            <label className="form-label-compact">
              <span className="form-label-text">
                Account Type <span className="required-star">*</span>
              </span>
            </label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="form-input-compact"
            >
              <option value="">Select account type...</option>
              <option value="Current Account">Current Account</option>
              <option value="Savings">Savings Account</option>
              <option value="ISA">ISA</option>
              <option value="LISA">LISA</option>
              <option value="Premium Bonds">Premium Bonds</option>
            </select>
            <p className="form-helper-text">
              Select the type of account being uploaded
            </p>
          </div>

          {/* Account Name */}
          <div className="provider-section-compact">
            <label className="form-label-compact">
              <span className="form-label-text">
                Account Name <span className="required-star">*</span>
              </span>
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g., Santander ISA, Main Savings"
              className="form-input-compact"
            />
            <p className="form-helper-text">
              Enter a friendly name to identify this account
            </p>
          </div>

          {/* Compact Column Mappings - Custom Order */}
          <div className="mapping-section-compact">
            {/* Top Row: Date, Date Format */}
            <div className="mapping-field-compact">
              <label className="form-label-compact">
                <span className="form-label-text">
                  Date <span className="required-star">*</span>
                </span>
                {getConfidenceBadge('date')}
              </label>
              <select
                value={mapping.date || ""}
                onChange={(e) => handleMappingChange('date', e.target.value)}
                className="form-select-compact"
              >
                <option value="">Select column...</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div className="mapping-field-compact">
              <label className="form-label-compact">
                <span className="form-label-text">
                  Date Format
                </span>
                {aiMetadata?.dateFormatConfidence > 0 && (
                  <span
                    className={`confidence-badge ${
                      aiMetadata.dateFormatConfidence >= 0.8
                        ? "confidence-badge-high"
                        : aiMetadata.dateFormatConfidence >= 0.5
                        ? "confidence-badge-medium"
                        : "confidence-badge-low"
                    }`}
                  >
                    {aiMetadata.dateFormatConfidence >= 0.8
                      ? "✓"
                      : aiMetadata.dateFormatConfidence >= 0.5
                      ? "🔍"
                      : "⚠️"}{" "}
                    {Math.min(100, Math.round(aiMetadata.dateFormatConfidence * 100))}%
                  </span>
                )}
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="form-select-compact"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                <option value="DD MMM YYYY">DD MMM YYYY</option>
                <option value="DD/MM/YY">DD/MM/YY</option>
              </select>
            </div>

            {/* Bottom Row: Description, Balance, Amount (3 columns) */}
            <div className="mapping-field-compact">
              <label className="form-label-compact">
                <span className="form-label-text">
                  Description
                </span>
                {getConfidenceBadge('description')}
              </label>
              <select
                value={mapping.description || ""}
                onChange={(e) => handleMappingChange('description', e.target.value)}
                className="form-select-compact"
              >
                <option value="">Select column...</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div className="mapping-field-compact">
              <label className="form-label-compact">
                <span className="form-label-text">
                  Balance
                </span>
                {getConfidenceBadge('balance')}
              </label>
              <select
                value={mapping.balance || ""}
                onChange={(e) => handleMappingChange('balance', e.target.value)}
                className="form-select-compact"
              >
                <option value="">Select column...</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div className="mapping-field-compact">
              <label className="form-label-compact">
                <span className="form-label-text">
                  Amount
                </span>
                {getConfidenceBadge('amount')}
              </label>
              <select
                value={mapping.amount || ""}
                onChange={(e) => handleMappingChange('amount', e.target.value)}
                className="form-select-compact"
              >
                <option value="">Select column...</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Helper text for Balance vs Amount */}
          <p className="form-helper-text" style={{ marginTop: '8px' }}>
            Map either Balance (running balance) or Amount (transaction amount), or both if available
          </p>

          {/* Compact Data Preview */}
          <div className="preview-section-compact">
            <h3 className="preview-title-compact">Preview (first 5 rows)</h3>
            <div className="preview-table-wrapper">
              <table className="preview-table-compact">
                <thead>
                  <tr>
                    {headers.map((header) => {
                      const isMapped = Object.values(mapping).includes(header);
                      const purpose = Object.keys(mapping).find((key) => mapping[key] === header);

                      return (
                        <th key={header} className={isMapped ? "mapped-header" : ""}>
                          {header}
                          {purpose && <div className="header-tag">({purpose})</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((row, idx) => (
                    <tr key={idx}>
                      {headers.map((header) => {
                        const isMapped = Object.values(mapping).includes(header);
                        return (
                          <td key={header} className={isMapped ? "mapped-cell" : ""}>
                            {String(row[header] || "")}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Footer - Matches pension mapper */}
          <div className="modal-footer">
            <button
              onClick={onCancel}
              className="modal-btn modal-btn-secondary"
              disabled={confirming}
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`modal-btn modal-btn-primary ${!allRequiredMapped ? 'modal-btn-disabled' : ''}`}
              disabled={!allRequiredMapped || confirming}
              type="button"
            >
              {confirming ? 'Confirming...' : 'Confirm Mapping'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
