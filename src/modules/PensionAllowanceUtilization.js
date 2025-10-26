import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import "./PensionAllowanceUtilizationStyles.css";
import { calculateCarryForwardData } from "./utils/pensionAllowanceUtils";

export default function PensionAllowanceUtilization({ yearlyTotals }) {
  console.log("PensionAllowanceUtilization rendering with yearlyTotals:", yearlyTotals);

  const [currentView, setCurrentView] = useState("overview");
  const [selectedYear, setSelectedYear] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileYearOffset, setMobileYearOffset] = useState(0); // For mobile year window sliding
  const [pendingDrilldown, setPendingDrilldown] = useState(null); // Store pending drilldown after offset change
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
  // On mobile, if a year is selected, show that year as the rightmost + 3 years before it
  const displayData = useMemo(() => {
    if (!carryForwardData.years || carryForwardData.years.length === 0) {
      return carryForwardData;
    }

    if (isMobile) {
      if (mobileYearOffset > 0) {
        // Show 4 years ending at the offset position
        const endIndex = carryForwardData.years.length - mobileYearOffset;
        const startIndex = Math.max(0, endIndex - 4);
        const yearsToShow = carryForwardData.years.slice(startIndex, endIndex);
        return { years: yearsToShow };
      } else {
        // Default: show last 4 years
        const yearsToShow = carryForwardData.years.slice(-4);
        return { years: yearsToShow };
      }
    }

    return carryForwardData;
  }, [carryForwardData, isMobile, mobileYearOffset]);

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
    // Prevent clicking when already in drilldown mode
    if (currentView === "drilldown") {
      return;
    }

    const yearData = displayData.years[yearIndex];

    // Only allow drill-down if there's carry forward
    if (yearData.breakdown.carryForward.length === 0) {
      return;
    }

    // On mobile, if clicking a year that's not the last one (rightmost), adjust the year window
    if (isMobile && yearIndex < displayData.years.length - 1) {
      // Calculate how many years from the end of the full dataset this year is
      // We need to find this year in the full carryForwardData
      const clickedYearLabel = yearData.year;
      const fullDataIndex = carryForwardData.years.findIndex(y => y.year === clickedYearLabel);
      const yearsFromEnd = carryForwardData.years.length - 1 - fullDataIndex;

      // Set offset so this year becomes the rightmost
      setMobileYearOffset(yearsFromEnd);

      // Mark that we have a pending drilldown - the useEffect will handle it
      setPendingDrilldown(true);

      return;
    }

    // If not on mobile or clicking the rightmost year, proceed with drilldown immediately
    performDrilldown(yearIndex);
  };

  const performDrilldown = useCallback((yearIndex) => {
    const yearData = displayData.years[yearIndex];
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

    // Calculate how much of each year's unused allowance was consumed by future years
    const consumedByFuture = displayData.years.map((yearData, index) => {
      let consumed = 0;
      // Check all future years to see if they used this year's unused allowance
      for (let futureIndex = index + 1; futureIndex < displayData.years.length; futureIndex++) {
        const futureYear = displayData.years[futureIndex];
        const usedFromThisYear = futureYear.breakdown.carryForward.find(
          cf => cf.fromYear === yearData.year
        );
        if (usedFromThisYear) {
          consumed += usedFromThisYear.amount;
        }
      }
      return consumed;
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
            seg.style.display = "none";
          } else if (seg.classList.contains("current-year")) {
            seg.style.height = "100%";
            seg.style.display = "block";
          } else {
            // Unused/lost segments should disappear
            seg.style.height = "0px";
            seg.style.display = "none";
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
          // Need to account for what was consumed by future years
          const totalUsedInYear = yd.used;
          const consumedFromThisYear = consumedByFuture[idx];
          const totalLifetimeUtilization = totalUsedInYear + consumedFromThisYear;
          const remaining = yd.allowance - totalLifetimeUtilization;
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
              seg.style.display = "block";
              currentSegment++;
            } else if (currentSegment === 0) {
              // First segment should be carry-forward
              seg.className = "cf-bar-segment carry-forward";
              seg.style.height = `${cfHeight}px`;
              seg.style.display = "block";
              currentSegment++;
            } else if (currentSegment === 1 && unusedHeight > 0) {
              // Second segment is unused/lost
              const allowanceClass = isLostAllowance ? "lost" : "unused";
              seg.className = `cf-bar-segment ${allowanceClass}`;
              seg.style.height = `${unusedHeight}px`;
              seg.style.display = "block";
              currentSegment++;
            } else {
              // Hide other segments
              seg.style.height = "0px";
              seg.style.display = "none";
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
            const consumedFromThisYear = consumedByFuture[idx];
            const totalLifetimeUtilization = totalUsedInYear + consumedFromThisYear;
            const remaining = yd.allowance - totalLifetimeUtilization;

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
                  seg.style.display = "block";
                } else {
                  seg.style.height = "0px";
                  seg.style.display = "none";
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
              segments.forEach((seg) => {
                seg.style.height = "0px";
                seg.style.display = "none";
              });

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
            segments.forEach((seg) => {
              seg.style.height = "0px";
              seg.style.display = "none";
            });

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
  }, [displayData]);

  // Handle pending drilldown after mobile offset changes
  useEffect(() => {
    if (pendingDrilldown !== null && displayData.years.length > 0) {
      // The data has updated, now perform the drilldown on the rightmost year
      const rightmostIndex = displayData.years.length - 1;
      performDrilldown(rightmostIndex);
      setPendingDrilldown(null);
    }
  }, [mobileYearOffset, displayData, pendingDrilldown, performDrilldown]);

  const goBack = () => {
    if (currentView !== "drilldown" || selectedYear === null) return;

    // On mobile, if offset was changed, just reset everything - simpler approach
    if (isMobile && mobileYearOffset !== 0) {
      // Reset all state at once - React will re-render with fresh bars
      setCurrentView("overview");
      setSelectedYear(null);
      setMobileYearOffset(0);
      return;
    }

    // Desktop or mobile with no offset change - do animated DOM restoration
    const container = document.getElementById("carryForwardChart");
    const barsContainer = container.querySelector(".cf-bars-container");
    const allWrappers = Array.from(
      barsContainer.querySelectorAll(".cf-bar-wrapper")
    );

    // Calculate consumed amounts for the +£ labels
    const consumedByFuture = displayData.years.map((yearData, index) => {
      let consumed = 0;
      // Check all future years to see if they used this year's unused allowance
      for (let futureIndex = index + 1; futureIndex < displayData.years.length; futureIndex++) {
        const futureYear = displayData.years[futureIndex];
        const usedFromThisYear = futureYear.breakdown.carryForward.find(
          cf => cf.fromYear === yearData.year
        );
        if (usedFromThisYear) {
          consumed += usedFromThisYear.amount;
        }
      }
      return consumed;
    });

    // Restore original states with animation
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
        segmentsHTML += `<div class="${seg.className}" style="height: ${seg.height}; display: block; transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);"></div>`;
      });
      stack.innerHTML = segmentsHTML;

      // Restore amount label with -£ for carry forward and +£ for consumed by future years
      const consumedFromThisYear = consumedByFuture[idx];
      const carryForwardTotal = yd.breakdown.carryForward.reduce(
        (sum, cf) => sum + cf.amount,
        0
      );

      let labelHTML = `£${Math.round(yd.used).toLocaleString()}`;
      if (carryForwardTotal > 0) {
        labelHTML += `<div class="cf-usage-label">-£${Math.round(carryForwardTotal).toLocaleString()}</div>`;
      }
      if (consumedFromThisYear > 0) {
        labelHTML += `<div class="cf-usage-label">+£${Math.round(consumedFromThisYear).toLocaleString()}</div>`;
      }

      if (carryForwardTotal > 0 || consumedFromThisYear > 0) {
        amountLabel.innerHTML = labelHTML;
      } else {
        amountLabel.textContent = `£${Math.round(yd.used).toLocaleString()}`;
      }
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

    // Calculate how much of each year's unused allowance was consumed by future years
    const consumedByFuture = displayData.years.map((yearData, index) => {
      let consumed = 0;
      // Check all future years to see if they used this year's unused allowance
      for (let futureIndex = index + 1; futureIndex < displayData.years.length; futureIndex++) {
        const futureYear = displayData.years[futureIndex];
        const usedFromThisYear = futureYear.breakdown.carryForward.find(
          cf => cf.fromYear === yearData.year
        );
        if (usedFromThisYear) {
          consumed += usedFromThisYear.amount;
        }
      }
      return consumed;
    });

    return (
      <div className="cf-bars-container" key={`bars-${mobileYearOffset}`}>
        {displayData.years.map((yearData, index) => {
          const hasCarryForward = yearData.breakdown.carryForward.length > 0;

          // Determine if this year's unused allowance is lost
          // Unused allowance can be carried forward for 3 years
          // So it's lost if there are no more years within 3 years that could use it
          // This means: if (currentYearIndex - index) > 3, it's beyond the carry forward window
          const yearsAfterThisYear = currentYearIndex - index;
          const isLostAllowance = yearsAfterThisYear > 3;

          // Calculate actual pixel heights based on max contribution for responsive scaling
          const totalUsed = yearData.used;
          const currentYearAmount = yearData.breakdown.currentYear;

          // Add the amount consumed by future years to show total lifetime utilization
          const consumedFromThisYear = consumedByFuture[index];
          const totalLifetimeUtilization = totalUsed + consumedFromThisYear;
          const carryForwardTotal = yearData.breakdown.carryForward.reduce(
            (sum, cf) => sum + cf.amount,
            0
          );

          // Scale bar heights based on maximum contribution (not allowance)
          // Use totalLifetimeUtilization for height calculation to show full impact
          const totalHeight =
            totalLifetimeUtilization > 0
              ? (totalLifetimeUtilization / maxContribution) * maxHeight
              : 0;

          // Calculate proportional heights for each segment
          const currentYearHeight =
            totalLifetimeUtilization > 0
              ? (currentYearAmount / totalLifetimeUtilization) * totalHeight
              : 0;
          const carryForwardHeight =
            totalLifetimeUtilization > 0
              ? (carryForwardTotal / totalLifetimeUtilization) * totalHeight
              : 0;
          const consumedByFutureHeight =
            totalLifetimeUtilization > 0
              ? (consumedFromThisYear / totalLifetimeUtilization) * totalHeight
              : 0;

          // Calculate remaining unused (not consumed by future years)
          const remainingUnused = Math.max(0, yearData.allowance - totalLifetimeUtilization);
          const unusedHeight =
            remainingUnused > 0
              ? (remainingUnused / maxContribution) * maxHeight
              : 0;

          return (
            <div
              key={index}
              className="cf-bar-wrapper"
              onClick={() => selectYear(index)}
              style={{
                cursor: currentView === "drilldown"
                  ? "default"
                  : hasCarryForward
                    ? "pointer"
                    : "default"
              }}
            >
              <div
                className="cf-bar-stack"
                style={{ height: `${totalHeight + unusedHeight}px` }}
              >
                {/* Using flex-direction: column-reverse means:
                    FIRST DOM element = appears at BOTTOM visually
                    LAST DOM element = appears at TOP visually */}

                {/* Only render segments with actual values > 0 */}

                {/* Add current year FIRST (will appear at BOTTOM) */}
                {currentYearAmount > 0 && (
                  <div
                    className="cf-bar-segment current-year"
                    data-segment-type="current-year-contribution"
                    style={{ height: `${currentYearHeight}px` }}
                    title={`${yearData.year} Contribution: £${Math.round(currentYearAmount).toLocaleString()}`}
                  ></div>
                )}

                {/* Add carry forward SECOND (will appear in MIDDLE) */}
                {carryForwardTotal > 0 && (
                  <div
                    className="cf-bar-segment carry-forward"
                    data-segment-type="carry-forward-received"
                    style={{ height: `${carryForwardHeight}px` }}
                    title={`Carry Forward Received: £${Math.round(carryForwardTotal).toLocaleString()}`}
                  ></div>
                )}

                {/* Add consumed by future years THIRD (will appear above carry forward) */}
                {consumedFromThisYear > 0 && (
                  <div
                    className="cf-bar-segment current-year"
                    data-segment-type="consumed-by-future"
                    style={{ height: `${consumedByFutureHeight}px` }}
                    title={`Used by Future Years: £${Math.round(consumedFromThisYear).toLocaleString()}`}
                  ></div>
                )}

                {/* Add remaining unused/lost LAST (will appear at TOP) */}
                {remainingUnused > 0 && (
                  <div
                    className={`cf-bar-segment ${
                      isLostAllowance ? "lost" : "unused"
                    }`}
                    style={{ height: `${unusedHeight}px` }}
                    title={`${isLostAllowance ? 'Lost' : 'Unused'} Allowance: £${Math.round(remainingUnused).toLocaleString()}`}
                  ></div>
                )}
              </div>
              <div className="cf-year-label">{yearData.year}</div>
              <div className="cf-amount-label">
                £{Math.round(yearData.used).toLocaleString()}
                {carryForwardTotal > 0 && (
                  <div className="cf-usage-label">
                    -£{Math.round(carryForwardTotal).toLocaleString()}
                  </div>
                )}
                {consumedFromThisYear > 0 && (
                  <div className="cf-usage-label">
                    +£{Math.round(consumedFromThisYear).toLocaleString()}
                  </div>
                )}
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

        {/* Summary Stats */}
        <div className="cf-summary">
          <div className="cf-summary-stat">
            <span className="cf-summary-stat-label">Total Contributed</span>
            <span className="cf-summary-stat-value">
              £{Math.round(carryForwardData.years.reduce((sum, y) => sum + y.used, 0)).toLocaleString()}
            </span>
          </div>
          <div className="cf-summary-stat">
            <span className="cf-summary-stat-label">Total Allowance</span>
            <span className="cf-summary-stat-value">
              £{carryForwardData.years.reduce((sum, y) => sum + y.allowance, 0).toLocaleString()}
            </span>
          </div>
          <div className="cf-summary-stat">
            <span className="cf-summary-stat-label">Total Unused Allowance</span>
            <span className="cf-summary-stat-value cf-summary-stat-available">
              £{(() => {
                const currentYearIndex = carryForwardData.years.length - 1;

                // Calculate consumed by future for each year
                const consumedByFuture = carryForwardData.years.map((yearData, index) => {
                  let consumed = 0;
                  for (let futureIndex = index + 1; futureIndex < carryForwardData.years.length; futureIndex++) {
                    const futureYear = carryForwardData.years[futureIndex];
                    const usedFromThisYear = futureYear.breakdown.carryForward.find(
                      cf => cf.fromYear === yearData.year
                    );
                    if (usedFromThisYear) {
                      consumed += usedFromThisYear.amount;
                    }
                  }
                  return consumed;
                });

                // Calculate available allowance = remaining current year + carry forward from previous 3 years
                const currentYear = carryForwardData.years[currentYearIndex];
                const remainingCurrentYear = Math.max(0, currentYear.allowance - currentYear.used);

                // Calculate available carry forward from previous 3 years
                let availableCarryForward = 0;
                for (let i = 1; i <= 3 && (currentYearIndex - i) >= 0; i++) {
                  const yearIndex = currentYearIndex - i;
                  const yearData = carryForwardData.years[yearIndex];
                  const remainingFromYear = Math.max(
                    0,
                    yearData.allowance - yearData.used - consumedByFuture[yearIndex]
                  );
                  availableCarryForward += remainingFromYear;
                }

                const totalAvailable = remainingCurrentYear + availableCarryForward;
                return Math.round(totalAvailable).toLocaleString();
              })()}
            </span>
          </div>
          <div className="cf-summary-stat">
            <span className="cf-summary-stat-label">Total Lost</span>
            <span className="cf-summary-stat-value cf-summary-stat-lost">
              £{(() => {
                const currentYearIndex = carryForwardData.years.length - 1;

                // Calculate consumed by future for each year
                const consumedByFuture = carryForwardData.years.map((yearData, index) => {
                  let consumed = 0;
                  for (let futureIndex = index + 1; futureIndex < carryForwardData.years.length; futureIndex++) {
                    const futureYear = carryForwardData.years[futureIndex];
                    const usedFromThisYear = futureYear.breakdown.carryForward.find(
                      cf => cf.fromYear === yearData.year
                    );
                    if (usedFromThisYear) {
                      consumed += usedFromThisYear.amount;
                    }
                  }
                  return consumed;
                });

                // Calculate total lost allowance
                const totalLost = carryForwardData.years.reduce((sum, yearData, index) => {
                  const yearsAfterThisYear = currentYearIndex - index;
                  const isLostAllowance = yearsAfterThisYear > 3;

                  if (isLostAllowance) {
                    const totalUsedInYear = yearData.used;
                    const consumedFromThisYear = consumedByFuture[index];
                    const totalLifetimeUtilization = totalUsedInYear + consumedFromThisYear;
                    const remainingUnused = Math.max(0, yearData.allowance - totalLifetimeUtilization);
                    return sum + remainingUnused;
                  }

                  return sum;
                }, 0);

                return Math.round(totalLost).toLocaleString();
              })()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
