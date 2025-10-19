import React from "react";
import "./MappingConfidenceBarStyles.css";

/**
 * MappingConfidenceBar - Visual confidence indicator for field mappings
 *
 * Uses traffic-light color system:
 * - Green (85-100%): High confidence
 * - Amber (65-84%): Medium confidence
 * - Red (<65%): Low confidence
 */

export default function MappingConfidenceBar({ confidence, showLabel = true }) {
  const getConfidenceLevel = () => {
    if (confidence >= 85) return "high";
    if (confidence >= 65) return "medium";
    return "low";
  };

  const getConfidenceColor = () => {
    if (confidence >= 85) return "#10b981"; // Green
    if (confidence >= 65) return "#f59e0b"; // Amber
    return "#ef4444"; // Red
  };

  const getConfidenceLabel = () => {
    if (confidence >= 85) return "High";
    if (confidence >= 65) return "Medium";
    return "Low";
  };

  const level = getConfidenceLevel();
  const color = getConfidenceColor();
  const label = getConfidenceLabel();

  return (
    <div className="confidence-bar-container">
      <div className="confidence-bar-track">
        <div
          className={`confidence-bar-fill confidence-${level}`}
          style={{ width: `${confidence}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <div className="confidence-bar-label">
          <span className="confidence-percentage">{confidence}%</span>
          <span className={`confidence-level confidence-level-${level}`}>
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for inline display
 */
export function CompactConfidenceIndicator({ confidence }) {
  const getConfidenceLevel = () => {
    if (confidence >= 85) return "high";
    if (confidence >= 65) return "medium";
    return "low";
  };

  const level = getConfidenceLevel();

  return (
    <span className={`confidence-badge confidence-badge-${level}`}>
      {confidence}%
    </span>
  );
}
