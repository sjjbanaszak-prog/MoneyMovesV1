import React from "react";
import MappingConfidenceBar from "./MappingConfidenceBar";
import "./UploadSummaryCardStyles.css";

/**
 * UploadSummaryCard - Compact summary banner showing upload detection results
 *
 * Displays:
 * - Detected provider
 * - Date format
 * - Payment frequency
 * - Overall confidence score
 * - Total records count
 */

export default function UploadSummaryCard({
  fileName,
  fileSize,
  totalRecords,
  provider,
  providerConfidence,
  dateFormat,
  formatConfidence,
  frequency,
  frequencyLabel,
  frequencyConfidence,
  overallConfidence,
}) {
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="upload-summary-card">
      {/* File Info */}
      <div className="upload-summary-section file-info-section">
        <div className="file-icon">📄</div>
        <div className="file-details">
          <div className="file-name">{fileName}</div>
          <div className="file-meta">
            {formatFileSize(fileSize)} • {totalRecords.toLocaleString()} records
          </div>
        </div>
      </div>

      {/* Detection Results */}
      <div className="upload-summary-section detection-results">
        <div className="detection-grid">
          {/* Provider */}
          {provider && provider !== "Unknown" && (
            <div className="detection-item">
              <div className="detection-label">Provider</div>
              <div className="detection-value">
                <span className="detection-value-main">{provider}</span>
                {providerConfidence > 0 && (
                  <span className="detection-confidence">
                    {providerConfidence}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Date Format */}
          {dateFormat && (
            <div className="detection-item">
              <div className="detection-label">Date Format</div>
              <div className="detection-value">
                <span className="detection-value-main">{dateFormat}</span>
                {formatConfidence > 0 && (
                  <span className="detection-confidence">
                    {formatConfidence}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Frequency */}
          {frequency && frequency !== "insufficient_data" && (
            <div className="detection-item">
              <div className="detection-label">Frequency</div>
              <div className="detection-value">
                <span className="detection-value-main">{frequencyLabel}</span>
                {frequencyConfidence > 0 && (
                  <span className="detection-confidence">
                    {frequencyConfidence}%
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overall Confidence */}
      <div className="upload-summary-section confidence-section">
        <div className="confidence-header">
          <span className="confidence-title">Overall Confidence</span>
          <span className="confidence-score">{overallConfidence}%</span>
        </div>
        <MappingConfidenceBar
          confidence={overallConfidence}
          showLabel={false}
        />
      </div>
    </div>
  );
}
