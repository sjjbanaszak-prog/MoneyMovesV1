import React, { useMemo, useState, useEffect } from "react";
import { calculateISAAllowanceData } from "./utils/isaAllowanceUtils";
import "./ISAUtilizationChart.css";

export default function ISAUtilizationChart({ uploads }) {
  const [visibleYearStart, setVisibleYearStart] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Calculate ISA allowance data
  const allowanceData = useMemo(() => {
    return calculateISAAllowanceData(uploads);
  }, [uploads]);

  const { years } = allowanceData;

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Calculate visible years for mobile
  const visibleYears = useMemo(() => {
    if (!isMobile || years.length <= 4) {
      return years;
    }
    return years.slice(visibleYearStart, visibleYearStart + 4);
  }, [years, visibleYearStart, isMobile]);

  // Navigation handlers for mobile
  const handlePrevYears = () => {
    setVisibleYearStart((prev) => Math.max(0, prev - 1));
  };

  const handleNextYears = () => {
    setVisibleYearStart((prev) => Math.min(years.length - 4, prev + 1));
  };

  if (years.length === 0) {
    return (
      <div className="isa-utilization-container">
        <div className="isa-utilization-header">
          <h3 className="isa-utilization-title">ISA Allowance Utilization</h3>
        </div>
        <div className="isa-utilization-empty">
          <p>No ISA or LISA accounts found. Upload ISA/LISA statements to see allowance utilization.</p>
        </div>
      </div>
    );
  }

  const maxAllowance = Math.max(...years.map((y) => y.allowance));

  // Determine current tax year (April 6 - April 5)
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();
  const currentTaxYearStart = currentMonth < 3 || (currentMonth === 3 && now.getDate() < 6)
    ? currentYear - 1
    : currentYear;
  const currentTaxYear = `${currentTaxYearStart}/${String(currentTaxYearStart + 1).slice(2)}`;

  return (
    <div className="isa-utilization-container">
      <div className="isa-utilization-header">
        <div>
          <h3 className="isa-utilization-title">ISA Allowance Utilization</h3>
        </div>
      </div>

      {/* Mobile navigation */}
      {isMobile && years.length > 4 && (
        <div className="isa-utilization-mobile-nav">
          <button
            className="isa-utilization-nav-btn"
            onClick={handlePrevYears}
            disabled={visibleYearStart === 0}
          >
            ← Previous
          </button>
          <span className="isa-utilization-nav-info">
            Showing {visibleYearStart + 1}-{Math.min(visibleYearStart + 4, years.length)} of {years.length}
          </span>
          <button
            className="isa-utilization-nav-btn"
            onClick={handleNextYears}
            disabled={visibleYearStart + 4 >= years.length}
          >
            Next →
          </button>
        </div>
      )}

      {/* Chart */}
      <div className="isa-utilization-chart">
        {visibleYears.map((yearData, idx) => {
          const { year, allowance, used, unused } = yearData;

          // Calculate percentages for height - each bar represents 100% of the allowance
          const usedPercentage = (used / allowance) * 100;
          const unusedPercentage = (unused / allowance) * 100;

          // Determine if allowance is over-utilized
          const isOverUtilized = used > allowance;

          // Determine if this is the current tax year
          const isCurrentYear = year === currentTaxYear;

          return (
            <div key={year} className="isa-utilization-year-column">
              {/* Bar container */}
              <div className="isa-utilization-bar-container">
                {/* Used allowance segment */}
                {used > 0 && (
                  <div
                    className="isa-utilization-segment isa-utilization-used"
                    style={{ height: `${usedPercentage}%` }}
                  />
                )}

                {/* Unused allowance segment - current year vs lost */}
                {unused > 0 && (
                  <div
                    className={`isa-utilization-segment ${
                      isCurrentYear ? "isa-utilization-unused" : "isa-utilization-lost"
                    }`}
                    style={{ height: `${unusedPercentage}%` }}
                  />
                )}

                {/* Over-utilization warning (if applicable) */}
                {isOverUtilized && (
                  <div className="isa-utilization-warning">
                    Over limit
                  </div>
                )}
              </div>

              {/* Year label */}
              <div className="isa-utilization-year-label">{year}</div>

              {/* Amount label below year */}
              <div className="isa-utilization-amount-label">
                £{used.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="isa-utilization-legend">
        <div className="isa-utilization-legend-item">
          <div className="isa-utilization-legend-box isa-utilization-legend-used"></div>
          <span>Used Allowance</span>
        </div>
        <div className="isa-utilization-legend-item">
          <div className="isa-utilization-legend-box isa-utilization-legend-unused"></div>
          <span>Unused Allowance</span>
        </div>
        <div className="isa-utilization-legend-item">
          <div className="isa-utilization-legend-box isa-utilization-legend-lost"></div>
          <span>Lost Allowance</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="isa-utilization-summary">
        <div className="isa-utilization-stat">
          <span className="isa-utilization-stat-label">Total Contributed</span>
          <span className="isa-utilization-stat-value">
            £{years.reduce((sum, y) => sum + y.used, 0).toLocaleString()}
          </span>
        </div>
        <div className="isa-utilization-stat">
          <span className="isa-utilization-stat-label">Total Allowance</span>
          <span className="isa-utilization-stat-value">
            £{years.reduce((sum, y) => sum + y.allowance, 0).toLocaleString()}
          </span>
        </div>
        <div className="isa-utilization-stat">
          <span className="isa-utilization-stat-label">Total Lost</span>
          <span className="isa-utilization-stat-value isa-utilization-stat-lost">
            £{years.reduce((sum, y) => sum + y.unused, 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
