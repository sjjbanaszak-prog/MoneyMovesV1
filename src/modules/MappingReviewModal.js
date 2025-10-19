import React, { useState, useCallback, useMemo } from "react";
import { saveTemplate } from "./utils/TemplateTrainer";
import { getContextSchema } from "./utils/ContextSchemas";
import { auth } from "../firebase";
import "./MappingReviewModalStyles.css";

/**
 * MappingReviewModal - Compact review modal for column mapping
 */

export default function MappingReviewModal({
  uploadResult,
  context = "pensions",
  onConfirm,
  onCancel,
}) {
  const currentUser = auth.currentUser;
  const schema = getContextSchema(context);
  const {
    rawData,
    headers,
    initialMapping,
    fileName,
    detectedProvider,
    suggestions,
    confidenceScores,
    aiMetadata,
  } = uploadResult;

  const [mapping, setMapping] = useState(initialMapping);
  const [providerName, setProviderName] = useState(detectedProvider.name || "");
  const [dateFormat, setDateFormat] = useState(initialMapping.dateFormat || "DD/MM/YYYY");
  const [confirming, setConfirming] = useState(false);

  // Check if required fields are mapped
  const requiredFields = schema.requiredFields.map((f) => f.key);
  const allRequiredMapped = requiredFields.every((field) => mapping[field]) && providerName;

  // Get sample data for preview
  const sampleRows = useMemo(() => rawData.slice(0, 5), [rawData]);

  const handleMappingChange = useCallback((field, columnName) => {
    setMapping((prev) => ({
      ...prev,
      [field]: columnName || undefined,
    }));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!allRequiredMapped) {
      alert("Please ensure all required fields are mapped and provider is set.");
      return;
    }

    setConfirming(true);

    try {
      // Save template for future uploads
      if (currentUser && providerName && providerName !== "Unknown Provider") {
        await saveTemplate(
          currentUser.uid,
          providerName,
          context,
          mapping,
          confidenceScores,
          dateFormat,
          aiMetadata.frequency,
          headers
        );
        console.log("✅ Template saved successfully for", providerName);
      }

      // Pass confirmed data back to parent
      onConfirm({
        rawData,
        mapping: { ...mapping, dateFormat },
        dateFormat,
        provider: providerName,
        fileName,
        aiMetadata: {
          ...aiMetadata,
          templateSaved: Boolean(currentUser && providerName),
        },
      });
    } catch (error) {
      console.error("Error saving template:", error);
      onConfirm({
        rawData,
        mapping: { ...mapping, dateFormat },
        dateFormat,
        provider: providerName,
        fileName,
        aiMetadata,
      });
    }
  }, [
    allRequiredMapped,
    currentUser,
    providerName,
    context,
    mapping,
    confidenceScores,
    dateFormat,
    aiMetadata,
    headers,
    rawData,
    fileName,
    onConfirm,
  ]);

  const getConfidenceBadge = (field) => {
    if (!suggestions || !suggestions[field]) return null;

    const suggestion = suggestions[field];
    const percentage = Math.min(100, Math.round((suggestion.confidence || 0) * 100));

    let badgeClass = "confidence-badge-low";
    let icon = "🔍";

    if (suggestion.source === "learned") {
      badgeClass = "confidence-badge-learned";
      icon = "🧠";
    } else if (percentage >= 80) {
      badgeClass = "confidence-badge-high";
      icon = "✓";
    }

    return (
      <span className={`confidence-badge ${badgeClass}`}>
        {icon} {percentage}%
      </span>
    );
  };

  // Provider confidence badge
  const providerConfidencePercent = Math.min(
    100,
    Math.round((detectedProvider.confidence || 0) * 100)
  );

  return (
    <div className="mapper-modal-overlay">
      <div className="mapper-modal-container">
        <div className="mapper-modal-content">
          {/* Compact Header */}
          <div className="mapper-header-compact">
            <div>
              <h2 className="mapper-title-compact">Confirm Column Mapping</h2>
              <div className="mapper-file-info-compact">
                <span>📄 {fileName}</span>
                <span>•</span>
                <span>{rawData.length} rows</span>
              </div>
            </div>
          </div>

          {/* Provider Name with Auto-Detection */}
          <div className="provider-section-compact">
            <label className="form-label-compact">
              Pension Provider <span className="required-star">*</span>
              {detectedProvider && detectedProvider.confidence > 0 && (
                <span
                  className={`confidence-badge ${
                    providerConfidencePercent >= 80
                      ? "confidence-badge-high"
                      : providerConfidencePercent >= 50
                      ? "confidence-badge-medium"
                      : "confidence-badge-low"
                  }`}
                >
                  {providerConfidencePercent >= 80 ? "✓" : "🔍"} {providerConfidencePercent}%
                </span>
              )}
            </label>
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="e.g., Aviva, Scottish Widows, Nest"
              className="form-input-compact"
            />
          </div>

          {/* Compact Column Mappings */}
          <div className="mapping-section-compact">
            {/* Required Fields */}
            {schema.requiredFields.map((fieldDef) => (
              <div key={fieldDef.key} className="mapping-field-compact">
                <label className="form-label-compact">
                  {fieldDef.label} <span className="required-star">*</span>
                  {getConfidenceBadge(fieldDef.key)}
                </label>
                <select
                  value={mapping[fieldDef.key] || ""}
                  onChange={(e) => handleMappingChange(fieldDef.key, e.target.value)}
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
            ))}

            {/* Optional Fields */}
            {schema.optionalFields.map((fieldDef) => (
              <div key={fieldDef.key} className="mapping-field-compact">
                <label className="form-label-compact">
                  {fieldDef.label}
                  {getConfidenceBadge(fieldDef.key)}
                </label>
                <select
                  value={mapping[fieldDef.key] || ""}
                  onChange={(e) => handleMappingChange(fieldDef.key, e.target.value)}
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
            ))}

            {/* Date Format */}
            <div className="mapping-field-compact">
              <label className="form-label-compact">
                Date Format
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
                <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                <option value="DD-MM-YYYY">DD-MM-YYYY (31-12-2024)</option>
                <option value="DD MMM YYYY">DD MMM YYYY (31 Dec 2024)</option>
                <option value="DD/MM/YY">DD/MM/YY (31/12/24)</option>
              </select>
            </div>
          </div>

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

          {/* Modal Footer - Matches AccountSettings */}
          <div className="modal-footer">
            <button onClick={onCancel} className="modal-btn modal-btn-secondary" disabled={confirming}>
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!allRequiredMapped || confirming}
              className="modal-btn modal-btn-primary"
            >
              {confirming ? (
                <>
                  <span className="btn-spinner"></span>
                  Importing...
                </>
              ) : allRequiredMapped ? (
                "✓ Confirm & Import"
              ) : (
                "⚠️ Complete Required Fields"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
