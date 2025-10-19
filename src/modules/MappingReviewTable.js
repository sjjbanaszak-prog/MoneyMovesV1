import React, { useState } from "react";
import { CompactConfidenceIndicator } from "./MappingConfidenceBar";
import {
  getContextSchema,
  getFieldDefinition,
  isRequiredField,
  getTypeDescription,
} from "./utils/ContextSchemas";
import "./MappingReviewTableStyles.css";

/**
 * MappingReviewTable - Interactive UI for reviewing and adjusting field mappings
 *
 * Features:
 * - Shows detected mappings with confidence scores
 * - Allows manual override via dropdown
 * - Displays sample data for verification
 * - Visual distinction for required vs optional fields
 * - Traffic-light confidence indicators
 */

export default function MappingReviewTable({
  headers,
  mapping,
  confidenceScores,
  context,
  data,
  onMappingChange,
  suggestions = {},
}) {
  const [expandedRows, setExpandedRows] = useState({});

  const schema = getContextSchema(context);
  const allFields = [...schema.requiredFields, ...schema.optionalFields];

  // Create rows for each expected field
  const fieldRows = allFields.map((fieldDef) => {
    const mappedHeader = mapping[fieldDef.key];
    const confidence = confidenceScores[fieldDef.key] || 0;
    const isRequired = isRequiredField(context, fieldDef.key);
    const isMapped = Boolean(mappedHeader);

    // Get sample data if mapped
    const sampleData = isMapped
      ? data.slice(0, 3).map((row) => row[mappedHeader])
      : [];

    return {
      field: fieldDef.key,
      label: fieldDef.label,
      description: fieldDef.description,
      type: fieldDef.type,
      isRequired,
      mappedHeader,
      confidence,
      isMapped,
      sampleData,
    };
  });

  // Unmapped headers
  const mappedHeaders = Object.values(mapping);
  const unmappedHeaders = headers.filter((h) => !mappedHeaders.includes(h));

  const handleMappingChange = (field, newHeader) => {
    if (newHeader === "none") {
      // Remove mapping
      const newMapping = { ...mapping };
      delete newMapping[field];
      onMappingChange(newMapping);
    } else {
      // Update mapping
      onMappingChange({ ...mapping, [field]: newHeader });
    }
  };

  const toggleRowExpansion = (field) => {
    setExpandedRows((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Calculate overall status
  const requiredFieldCount = schema.requiredFields.length;
  const mappedRequiredCount = fieldRows.filter(
    (r) => r.isRequired && r.isMapped
  ).length;
  const isComplete = mappedRequiredCount === requiredFieldCount;

  return (
    <div className="mapping-review-container">
      {/* Header */}
      <div className="mapping-review-header">
        <div>
          <h3 className="mapping-review-title">Review Field Mappings</h3>
          <p className="mapping-review-subtitle">
            {isComplete ? (
              <span className="status-complete">
                ✓ All required fields mapped ({mappedRequiredCount}/
                {requiredFieldCount})
              </span>
            ) : (
              <span className="status-incomplete">
                ⚠ {mappedRequiredCount}/{requiredFieldCount} required fields
                mapped
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Mapping Table */}
      <div className="mapping-table-wrapper">
        <table className="mapping-table">
          <thead>
            <tr>
              <th className="col-field">Expected Field</th>
              <th className="col-detected">Detected Column</th>
              <th className="col-confidence">Confidence</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fieldRows.map((row) => (
              <React.Fragment key={row.field}>
                <tr
                  className={`mapping-row ${
                    row.isMapped ? "mapped" : "unmapped"
                  } ${row.isRequired ? "required" : "optional"}`}
                >
                  {/* Field Column */}
                  <td className="col-field">
                    <div className="field-info">
                      <div className="field-header">
                        <span className="field-label">{row.label}</span>
                        {row.isRequired && (
                          <span className="required-badge">Required</span>
                        )}
                      </div>
                      <div className="field-meta">
                        <span className="field-type">
                          {getTypeDescription(row.type)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Detected Column */}
                  <td className="col-detected">
                    {row.isMapped ? (
                      <div className="detected-header">
                        <span className="header-name">{row.mappedHeader}</span>
                        <button
                          className="expand-button"
                          onClick={() => toggleRowExpansion(row.field)}
                          aria-label="View sample data"
                        >
                          {expandedRows[row.field] ? "▼" : "▶"}
                        </button>
                      </div>
                    ) : (
                      <span className="not-mapped">Not mapped</span>
                    )}
                  </td>

                  {/* Confidence */}
                  <td className="col-confidence">
                    {row.isMapped && row.confidence > 0 ? (
                      <CompactConfidenceIndicator confidence={row.confidence} />
                    ) : (
                      <span className="no-confidence">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="col-actions">
                    <select
                      value={row.mappedHeader || "none"}
                      onChange={(e) =>
                        handleMappingChange(row.field, e.target.value)
                      }
                      className="mapping-select"
                    >
                      <option value="none">— Not mapped —</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>

                {/* Expanded row: sample data */}
                {expandedRows[row.field] && row.isMapped && (
                  <tr className="sample-data-row">
                    <td colSpan="4">
                      <div className="sample-data-container">
                        <div className="sample-data-header">
                          <strong>Sample data:</strong>
                        </div>
                        <div className="sample-data-values">
                          {row.sampleData.map((val, idx) => (
                            <div key={idx} className="sample-data-item">
                              <span className="sample-data-index">
                                Row {idx + 1}:
                              </span>
                              <span className="sample-data-value">
                                {val || <em>(empty)</em>}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unmapped Headers */}
      {unmappedHeaders.length > 0 && (
        <div className="unmapped-headers-section">
          <h4 className="unmapped-headers-title">
            Unmapped Columns ({unmappedHeaders.length})
          </h4>
          <div className="unmapped-headers-list">
            {unmappedHeaders.map((header) => (
              <span key={header} className="unmapped-header-chip">
                {header}
              </span>
            ))}
          </div>
          <p className="unmapped-headers-note">
            These columns will be ignored during import.
          </p>
        </div>
      )}
    </div>
  );
}
