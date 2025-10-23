import React, { useState, useRef, useMemo, useEffect } from "react";
import "./PensionAllowanceUtilizationStyles.css";
import { calculateCarryForwardData } from "./utils/pensionAllowanceUtils";

export default function PensionAllowanceUtilization({ yearlyTotals }) {
  console.log("PensionAllowanceUtilization rendering with yearlyTotals:", yearlyTotals);

  const [currentView, setCurrentView] = useState("overview");
  const [selectedYear, setSelectedYear] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const originalStatesRef = useRef(null);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate carry forward data from yearlyTotals
  const carryForwardData = useMemo(
    () => calculateCarryForwardData(yearlyTotals),
    [yearlyTotals]
  );

  // Filter years for mobile (current year + previous 3 years = 4 years total)
  const displayData = useMemo(() => {
    if (!carryForwardData.years || carryForwardData.years.length === 0) {
      return carryForwardData;
    }

    if (isMobile) {
      const yearsToShow = carryForwardData.years.slice(-4); // Last 4 years
      return { years: yearsToShow };
    }

    return carryForwardData;
  }, [carryForwardData, isMobile]);

  console.log("Calculated carryForwardData:", carryForwardData);
  console.log("Display data (filtered for mobile):", displayData);

  // If no data, show empty state
  if (!carryForwardData.years || carryForwardData.years.length === 0) {
    console.log("Showing empty state - no years data");
    return (
      <div className="cf-card">
        <div className="cf-card-header">
          <h3 className="cf-card-title">Allowance Utilization</h3>
        </div>
        <div className="no-data">
          <p>No contribution data available to calculate allowance utilization.</p>
        </div>
      </div>
    );
  }

  console.log("Rendering chart with", displayData.years.length, "years");

  const selectYear = (yearIndex) => {
    const yearData = displayData.years[yearIndex];

    // Only allow drill-down if there's carry forward
    if (yearData.breakdown.carryForward.length === 0) {
      return;
    }

    const container = document.getElementById("carryForwardChart");
    const barsContainer = container.querySelector(".cf-bars-container");
    const allWrappers = Array.from(
      barsContainer.querySelectorAll(".cf-bar-wrapper")
    );

    // Store original states for each year before animation
    const originalStates = displayData.years.map((yd, idx) => {
      const wrapper = allWrappers[idx];
      const stack = wrapper.querySelector(".cf-bar-stack");
      return {
        height: stack.style.height,
        segments: Array.from(stack.querySelectorAll(".cf-bar-segment")).map(
          (seg) => ({
            className: seg.className,
            height: seg.style.height,
          })
        ),
      };
    });

    // Calculate new heights based on drill-down logic
    const maxContribution = Math.max(
      ...displayData.years.map((y) => y.used)
    );
    const maxHeight = 200;
    const currentYearIndex = displayData.years.length - 1;

    // Animate each bar
    displayData.years.forEach((yd, idx) => {
      const wrapper = allWrappers[idx];
      const stack = wrapper.querySelector(".cf-bar-stack");
      const segments = stack.querySelectorAll(".cf-bar-segment");
      const amountLabel = wrapper.querySelector(".cf-amount-label");

      if (idx === yearIndex) {
        // This is the clicked year - shrink to just current year allowance
        const newHeight =
          (yearData.breakdown.currentYear / maxContribution) * maxHeight;

        // Animate the stack height
        stack.style.height = `${newHeight}px`;

        // Fade out carry forward segment if exists, keep current year
        segments.forEach((seg) => {
          if (seg.classList.contains("carry-forward")) {
            seg.style.height = "0px";
          } else if (seg.classList.contains("current-year")) {
            seg.style.height = "100%";
          } else {
            // Unused/lost segments should disappear
            seg.style.height = "0px";
          }
        });

        // Update amount label
        amountLabel.style.transition = "opacity 0.3s ease-out";
        amountLabel.style.opacity = "0";
        setTimeout(() => {
          amountLabel.textContent = `£${Math.round(yearData.breakdown.currentYear).toLocaleString()}`;
          amountLabel.style.opacity = "1";
        }, 300);
      } else {
        // Check if this year provided carry forward to the clicked year
        const amountUsedFromThisYear = yearData.breakdown.carryForward.find(
          (cf) => cf.fromYear === yd.year
        );

        if (amountUsedFromThisYear) {
          // This year contributed to the carry forward
          const cfAmount = amountUsedFromThisYear.amount;
          const cfHeight = (cfAmount / maxContribution) * maxHeight;

          // Calculate remaining unused allowance for this year
          const totalUsedInYear = yd.used;
          const remaining = yd.allowance - totalUsedInYear;
          const unusedHeight =
            remaining > 0 ? (remaining / maxContribution) * maxHeight : 0;

          // Determine if unused is "lost" - check relative to CURRENT year (not clicked year)
          const yearsBeforeCurrent = currentYearIndex - idx;
          const isLostAllowance = yearsBeforeCurrent > 3;

          // Set total height
          stack.style.height = `${cfHeight + unusedHeight}px`;

          // Animate existing segments to new sizes and colors
          let currentSegment = 0;
          segments.forEach((seg) => {
            if (currentSegment === 0 && seg.classList.contains("current-year")) {
              // Convert current-year to carry-forward
              seg.classList.remove("current-year");
              seg.classList.add("carry-forward");
              seg.style.height = `${cfHeight}px`;
              currentSegment++;
            } else if (currentSegment === 0) {
              // First segment should be carry-forward
              seg.className = "cf-bar-segment carry-forward";
              seg.style.height = `${cfHeight}px`;
              currentSegment++;
            } else if (currentSegment === 1 && unusedHeight > 0) {
              // Second segment is unused/lost
              const allowanceClass = isLostAllowance ? "lost" : "unused";
              seg.className = `cf-bar-segment ${allowanceClass}`;
              seg.style.height = `${unusedHeight}px`;
              currentSegment++;
            } else {
              // Hide other segments
              seg.style.height = "0px";
            }
          });

          // Update amount label
          amountLabel.style.transition = "opacity 0.3s ease-out";
          amountLabel.style.opacity = "0";
          setTimeout(() => {
            amountLabel.textContent = `£${Math.round(cfAmount).toLocaleString()}`;
            amountLabel.style.opacity = "1";
          }, 300);
        } else {
          // This year did not contribute - check if it's within carry forward window
          const yearsBeforeClicked = yearIndex - idx;
          const yearsBeforeCurrent = currentYearIndex - idx;
          const isInCarryForwardWindow =
            yearsBeforeClicked <= 3 && yearsBeforeClicked > 0;

          if (isInCarryForwardWindow) {
            // Show unused/lost allowance for years in the 3-year window
            const totalUsedInYear = yd.used;
            const remaining = yd.allowance - totalUsedInYear;

            if (remaining > 0) {
              const unusedHeight = (remaining / maxContribution) * maxHeight;
              // Determine if lost relative to CURRENT year
              const isLostAllowance = yearsBeforeCurrent > 3;

              stack.style.height = `${unusedHeight}px`;

              // Convert all segments to unused/lost
              segments.forEach((seg, segIdx) => {
                if (segIdx === 0) {
                  const allowanceClass = isLostAllowance ? "lost" : "unused";
                  seg.className = `cf-bar-segment ${allowanceClass}`;
                  seg.style.height = "100%";
                } else {
                  seg.style.height = "0px";
                }
              });

              amountLabel.style.transition = "opacity 0.3s ease-out";
              amountLabel.style.opacity = "0";
              setTimeout(() => {
                amountLabel.textContent = `£0`;
                amountLabel.style.opacity = "1";
              }, 300);
            } else {
              // No remaining allowance
              stack.style.height = "0px";
              segments.forEach((seg) => (seg.style.height = "0px"));

              amountLabel.style.transition = "opacity 0.3s ease-out";
              amountLabel.style.opacity = "0";
              setTimeout(() => {
                amountLabel.textContent = `£0`;
                amountLabel.style.opacity = "1";
              }, 300);
            }
          } else {
            // Outside carry forward window or after clicked year - hide completely
            stack.style.height = "0px";
            segments.forEach((seg) => (seg.style.height = "0px"));

            amountLabel.style.transition = "opacity 0.3s ease-out";
            amountLabel.style.opacity = "0";
            setTimeout(() => {
              amountLabel.textContent = `£0`;
              amountLabel.style.opacity = "1";
            }, 300);
          }
        }
      }
    });

    // Mark current view and show back button
    setCurrentView("drilldown");
    setSelectedYear(yearIndex);

    // Store original states for reverse animation
    originalStatesRef.current = originalStates;
  };

  const goBack = () => {
    if (currentView !== "drilldown" || selectedYear === null) return;

    const container = document.getElementById("carryForwardChart");
    const barsContainer = container.querySelector(".cf-bars-container");
    const allWrappers = Array.from(
      barsContainer.querySelectorAll(".cf-bar-wrapper")
    );

    // Restore original states
    displayData.years.forEach((yd, idx) => {
      const wrapper = allWrappers[idx];
      const stack = wrapper.querySelector(".cf-bar-stack");
      const amountLabel = wrapper.querySelector(".cf-amount-label");
      const originalState = originalStatesRef.current[idx];

      // Restore height
      stack.style.height = originalState.height;
      stack.style.transition = "height 0.8s cubic-bezier(0.4, 0, 0.2, 1)";

      // Restore segments
      let segmentsHTML = "";
      originalState.segments.forEach((seg) => {
        segmentsHTML += `<div class="${seg.className}" style="height: ${seg.height}; transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);"></div>`;
      });
      stack.innerHTML = segmentsHTML;

      // Restore amount label
      amountLabel.textContent = `£${Math.round(yd.used).toLocaleString()}`;
    });

    // Reset view state
    setCurrentView("overview");
    setSelectedYear(null);
  };

  const renderOverviewChart = () => {
    const maxHeight = 200; // max height in pixels

    // Find the maximum contribution amount across all years for scaling
    const maxContribution = Math.max(
      ...displayData.years.map((y) => y.used)
    );

    // Determine current year index (last year in array)
    const currentYearIndex = displayData.years.length - 1;

    return (
      <div className="cf-bars-container">
        {displayData.years.map((yearData, index) => {
          const hasCarryForward = yearData.breakdown.carryForward.length > 0;

          // Determine if this year's unused allowance is lost (more than 3 years before current)
          const yearsBeforeCurrent = currentYearIndex - index;
          const isLostAllowance = yearsBeforeCurrent > 3;

          // Calculate actual pixel heights based on max contribution for responsive scaling
          const totalUsed = yearData.used;
          const currentYearAmount = yearData.breakdown.currentYear;
          const carryForwardTotal = yearData.breakdown.carryForward.reduce(
            (sum, cf) => sum + cf.amount,
            0
          );

          // Scale bar heights based on maximum contribution (not allowance)
          const totalHeight =
            totalUsed > 0 ? (totalUsed / maxContribution) * maxHeight : 0;
          const currentYearHeight =
            totalUsed > 0 ? (currentYearAmount / totalUsed) * totalHeight : 0;
          const carryForwardHeight =
            totalUsed > 0 ? (carryForwardTotal / totalUsed) * totalHeight : 0;
          const unusedHeight =
            totalUsed < yearData.allowance
              ? ((yearData.allowance - totalUsed) / maxContribution) * maxHeight
              : 0;

          return (
            <div
              key={index}
              className="cf-bar-wrapper"
              onClick={() => selectYear(index)}
              style={{ cursor: hasCarryForward ? "pointer" : "default" }}
            >
              <div
                className="cf-bar-stack"
                style={{ height: `${totalHeight + unusedHeight}px` }}
              >
                {/* Using flex-direction: column-reverse means:
                    FIRST DOM element = appears at BOTTOM visually
                    LAST DOM element = appears at TOP visually */}

                {/* Only render bars if there's actual contribution */}
                {totalUsed > 0 && (
                  <>
                    {/* Add current year FIRST (will appear at BOTTOM) */}
                    <div
                      className="cf-bar-segment current-year"
                      style={{ height: `${currentYearHeight}px` }}
                      title={`Current Year: £${Math.round(currentYearAmount).toLocaleString()}`}
                    ></div>

                    {/* Add carry forward SECOND (will appear in MIDDLE) */}
                    {hasCarryForward && (
                      <div
                        className="cf-bar-segment carry-forward"
                        style={{ height: `${carryForwardHeight}px` }}
                        title={`Carry Forward: £${Math.round(carryForwardTotal).toLocaleString()}`}
                      ></div>
                    )}
                  </>
                )}

                {/* Add unused/lost LAST (will appear at TOP) */}
                {unusedHeight > 0 && (
                  <div
                    className={`cf-bar-segment ${
                      isLostAllowance ? "lost" : "unused"
                    }`}
                    style={{ height: `${unusedHeight}px` }}
                    title={`${isLostAllowance ? 'Lost' : 'Unused'} Allowance: £${Math.round(yearData.allowance - totalUsed).toLocaleString()}`}
                  ></div>
                )}
              </div>
              <div className="cf-year-label">{yearData.year}</div>
              <div className="cf-amount-label">
                £{Math.round(yearData.used).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="cf-card">
      <div className="cf-card-header">
        <h3 className="cf-card-title">Allowance Utilization</h3>
        {currentView === "drilldown" && (
          <button id="backBtn" className="cf-back-btn" onClick={goBack}>
            Reset
          </button>
        )}
      </div>

      <div id="carryForwardChart" className="cf-chart">
        {renderOverviewChart()}

        {/* Legend */}
        <div className="cf-legend">
          <div className="cf-legend-item">
            <div
              className="cf-legend-color"
              style={{
                background: "linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)",
              }}
            ></div>
            <span>Allowance Used</span>
          </div>
          <div className="cf-legend-item">
            <div
              className="cf-legend-color"
              style={{
                background: "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)",
              }}
            ></div>
            <span>Carry Forward Used</span>
          </div>
          <div className="cf-legend-item">
            <div
              className="cf-legend-color"
              style={{
                background: "rgba(99, 102, 241, 0.2)",
                border: "1px dashed rgba(99, 102, 241, 0.4)",
              }}
            ></div>
            <span>Unused Allowance</span>
          </div>
          <div className="cf-legend-item">
            <div
              className="cf-legend-color"
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px dashed rgba(239, 68, 68, 0.4)",
              }}
            ></div>
            <span>Lost Allowance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
