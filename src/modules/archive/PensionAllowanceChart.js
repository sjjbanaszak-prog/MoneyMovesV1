import React, { useEffect, useState, useMemo } from "react";
import "./PensionAllowanceChart.css";

function AnimatedBar({ yearData, yearKey, isExpanded = true }) {
  const [fillWidth, setFillWidth] = useState(0);
  const [carryForwardFillWidth, setCarryForwardFillWidth] = useState(0);

  const startYear = parseInt(yearKey.slice(0, 4));
  const displayYear = `${startYear}/${(startYear + 1).toString().slice(-2)}`;

  const {
    directContribution,
    carryForwardUsed,
    carryForwardSources,
    allowance,
    unusedCarryForward,
    remainingCarryForward,
    excessAfterCarryForward,
    totalWithCarryForward,
    carryForwardConsumedBy,
    isExpired,
    carryForwardLost,
  } = yearData;

  const directPct = Math.min((directContribution / allowance) * 100, 100);
  const carryForwardPct = Math.min((carryForwardUsed / allowance) * 100, 100);
  const totalPct = Math.min((totalWithCarryForward / allowance) * 100, 100);

  const isExcess = excessAfterCarryForward > 0;

  useEffect(() => {
    if (!isExpanded) return;

    const timeout1 = setTimeout(() => {
      setFillWidth(directPct);
    }, 100);

    const timeout2 = setTimeout(() => {
      setCarryForwardFillWidth(carryForwardPct);
    }, 600);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [directPct, carryForwardPct, isExpanded]);

  // Reset animations when collapsed
  useEffect(() => {
    if (!isExpanded) {
      setFillWidth(0);
      setCarryForwardFillWidth(0);
    }
  }, [isExpanded]);

  if (!isExpanded) return null;

  return (
    <div className="year-row" key={yearKey}>
      <div className="year-header">
        <div className="year-label">{displayYear}</div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar">
          {/* Direct contribution fill */}
          <div
            className={`progress-fill direct ${
              isExcess ? "over-contributed" : ""
            }`}
            style={{
              width: `${fillWidth}%`,
              transition: "width 1s ease-out",
            }}
          />

          {/* Carry forward usage fill */}
          {carryForwardUsed > 0 && (
            <div
              className="progress-fill carry-forward"
              style={{
                width: `${carryForwardFillWidth}%`,
                transition: "width 1s ease-out",
                marginLeft: `${fillWidth}%`,
                position: "absolute",
                top: 0,
                height: "100%",
              }}
            />
          )}

          {/* Show consumed carry forward from this year */}
          {carryForwardConsumedBy.length > 0 && (
            <div
              className="progress-fill consumed-cf-yellow"
              style={{
                width: `${Math.min(
                  (carryForwardConsumedBy.reduce(
                    (sum, usage) => sum + usage.amount,
                    0
                  ) /
                    allowance) *
                    100,
                  100
                )}%`,
                transition: "width 1.5s ease-out",
                marginLeft: `${Math.min(
                  ((directContribution + carryForwardUsed) / allowance) * 100,
                  100
                )}%`,
                position: "absolute",
                top: 0,
                height: "100%",
              }}
            />
          )}
        </div>
      </div>

      {/* Additional information */}

      <div className="year-details">
        <div className="contribution-breakdown">
          <div className="breakdown-item allowance">
            <span className="breakdown-label">Allowance:</span>
            <span className="breakdown-value">
              £
              {allowance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div className="breakdown-item direct">
            <span className="breakdown-label">Contributions:</span>
            <span className="breakdown-value">
              £
              {directContribution.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          {carryForwardUsed > 0 && (
            <div className="breakdown-item carry-forward">
              <span className="breakdown-label">Carry Forward:</span>
              <span className="breakdown-value">
                £
                {carryForwardUsed.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          {/* Show different cards based on expiry status */}
          {isExpired ? (
            <>
              {/* Show Carried Forward card if any was used from this expired year */}
              {carryForwardConsumedBy.length > 0 && (
                <div className="breakdown-item carried-forward">
                  <span className="breakdown-label">Carried Forward:</span>
                  <span className="breakdown-value">
                    £
                    {carryForwardConsumedBy
                      .reduce((sum, usage) => sum + usage.amount, 0)
                      .toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                  </span>
                </div>
              )}

              {/* Show Carry Forward Lost card if any expired unused */}
              {carryForwardLost > 0 && (
                <div className="breakdown-item carry-forward-lost">
                  <span className="breakdown-label">Lost Allowance:</span>
                  <span className="breakdown-value">
                    £
                    {carryForwardLost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
            </>
          ) : (
            /* Show Unused Allowance card only for non-expired years */
            <div className="breakdown-item unused-cf">
              <span className="breakdown-label">Unused Allowance:</span>
              <span className="breakdown-value">
                £
                {(remainingCarryForward || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          {excessAfterCarryForward > 0 && (
            <div className="breakdown-item excess">
              <span className="breakdown-label">
                ⚠️ Excess (tax charge applies):
              </span>
              <span className="breakdown-value excess-amount">
                £
                {excessAfterCarryForward.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Show carry forward sources if any were used */}
        {carryForwardSources.length > 0 && (
          <div className="carry-forward-sources">
            <h5 className="sources-title">Carry forward used from:</h5>
            <div className="sources-list">
              {carryForwardSources.map((source, idx) => {
                const sourceStartYear = parseInt(source.fromYear.slice(0, 4));
                const sourceDisplayYear = `${sourceStartYear}/${(
                  sourceStartYear + 1
                )
                  .toString()
                  .slice(-2)}`;
                return (
                  <div key={idx} className="source-item">
                    <span className="source-year">{sourceDisplayYear}:</span>
                    <span className="source-amount">
                      £
                      {source.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Show what this year's carry forward was used for */}
        {carryForwardConsumedBy.length > 0 && (
          <div className="carry-forward-consumed">
            <h5 className="consumed-title">Carry forward used by:</h5>
            <div className="consumed-list">
              {carryForwardConsumedBy.map((usage, idx) => {
                const usedByStartYear = parseInt(usage.usedByYear.slice(0, 4));
                const usedByDisplayYear = `${usedByStartYear}/${(
                  usedByStartYear + 1
                )
                  .toString()
                  .slice(-2)}`;
                return (
                  <div key={idx} className="consumed-item">
                    <span className="consumed-year">{usedByDisplayYear}:</span>
                    <span className="consumed-amount">
                      £
                      {usage.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PensionAllowanceChart({ yearlyTotals }) {
  const [expanded, setExpanded] = useState(false);

  // Calculate carry forward and excess allocations
  const processedYearData = useMemo(() => {
    const parseStartYear = (yearStr) => {
      const match = yearStr.match(/^(\d{4})/);
      return match ? parseInt(match[1], 10) : 0;
    };

    // Sort years chronologically (oldest first for carry forward calculation)
    const sortedYears = Object.keys(yearlyTotals).sort(
      (a, b) => parseStartYear(a) - parseStartYear(b)
    );

    const processedData = {};
    const carryForwardAvailable = {}; // Track unused allowances by year
    const carryForwardConsumedFromYear = {}; // Track which future years consumed this year's CF

    // Get the latest year to determine what's still within the 3-year window
    const latestYear = Math.max(...sortedYears.map(parseStartYear));

    // Process each year in chronological order
    sortedYears.forEach((yearKey) => {
      const startYear = parseStartYear(yearKey);
      const allowance = startYear >= 2023 ? 60000 : 40000;
      const directContribution = yearlyTotals[yearKey];

      // Calculate unused allowance for this year (available for future carry forward)
      const unusedAllowance = Math.max(0, allowance - directContribution);

      // Initialize this year's data
      let carryForwardUsed = 0;
      let excessAfterCarryForward = Math.max(0, directContribution - allowance);
      const carryForwardSources = []; // Track which years provided the carry forward

      // If there's an excess, try to use carry forward from previous 3 years
      if (excessAfterCarryForward > 0) {
        // Get available carry forward from previous 3 years (earliest first)
        const availableYears = sortedYears
          .filter((y) => {
            const yStartYear = parseStartYear(y);
            return (
              yStartYear >= startYear - 3 &&
              yStartYear < startYear &&
              carryForwardAvailable[y] > 0
            );
          })
          .sort((a, b) => parseStartYear(a) - parseStartYear(b)); // Earliest first

        let remainingExcess = excessAfterCarryForward;

        availableYears.forEach((cfYear) => {
          if (remainingExcess > 0 && carryForwardAvailable[cfYear] > 0) {
            const cfUsed = Math.min(
              remainingExcess,
              carryForwardAvailable[cfYear]
            );
            carryForwardUsed += cfUsed;
            carryForwardAvailable[cfYear] -= cfUsed;
            remainingExcess -= cfUsed;

            // Track which year this CF came from
            carryForwardSources.push({
              fromYear: cfYear,
              amount: cfUsed,
            });

            // Track that cfYear had some of its CF used BY this year
            if (!carryForwardConsumedFromYear[cfYear]) {
              carryForwardConsumedFromYear[cfYear] = [];
            }
            carryForwardConsumedFromYear[cfYear].push({
              usedByYear: yearKey,
              amount: cfUsed,
            });
          }
        });

        excessAfterCarryForward = remainingExcess;
      }

      // Store unused allowance for this year (available for future carry forward)
      carryForwardAvailable[yearKey] = unusedAllowance;

      // Determine if this year's unused CF is expired
      const isCarryForwardExpired = startYear < latestYear - 3;

      processedData[yearKey] = {
        directContribution,
        carryForwardUsed,
        carryForwardSources,
        allowance,
        unusedCarryForward: unusedAllowance,
        originalUnusedCarryForward: unusedAllowance,
        excessAfterCarryForward,
        totalWithCarryForward: directContribution,
        isExpired: isCarryForwardExpired,
      };
    });

    // Second pass: assign consumed carry forward info and calculate lost amounts
    sortedYears.forEach((yearKey) => {
      const yearData = processedData[yearKey];

      // Assign the carry forward consumed by future years
      yearData.carryForwardConsumedBy =
        carryForwardConsumedFromYear[yearKey] || [];

      if (yearData.isExpired) {
        // For expired years, calculate how much was used and how much was lost
        const totalConsumed = yearData.carryForwardConsumedBy.reduce(
          (sum, usage) => sum + usage.amount,
          0
        );
        yearData.carryForwardLost = Math.max(
          0,
          yearData.originalUnusedCarryForward - totalConsumed
        );
        yearData.remainingCarryForward = 0; // Expired years have no remaining CF
      } else {
        // For non-expired years, calculate remaining after consumption
        const totalConsumed = yearData.carryForwardConsumedBy.reduce(
          (sum, usage) => sum + usage.amount,
          0
        );
        yearData.remainingCarryForward = Math.max(
          0,
          yearData.originalUnusedCarryForward - totalConsumed
        );
        yearData.carryForwardLost = 0; // Non-expired years have no lost CF
      }
    });

    return processedData;
  }, [yearlyTotals]);

  // Determine current tax year for display sorting
  const today = new Date();
  const currentTaxYearStart =
    today.getMonth() < 3 || (today.getMonth() === 3 && today.getDate() < 6)
      ? today.getFullYear() - 1
      : today.getFullYear();

  const parseStartYear = (yearStr) => {
    const match = yearStr.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Sort years for display (newest first)
  const sortedYearsForDisplay = Object.keys(processedYearData).sort(
    (a, b) => parseStartYear(b) - parseStartYear(a)
  );

  const visibleYears = [];
  const hiddenYears = [];

  sortedYearsForDisplay.forEach((yearKey) => {
    const startYear = parseStartYear(yearKey);
    if (startYear >= currentTaxYearStart - 3) {
      visibleYears.push(yearKey);
    } else {
      hiddenYears.push(yearKey);
    }
  });

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    let totalExcess = 0;
    let totalCarryForwardUsed = 0;
    let totalUnusedCarryForward = 0; // Only count unallocated unused allowances
    let yearsWithExcess = 0;

    Object.values(processedYearData).forEach((yearData) => {
      totalExcess += yearData.excessAfterCarryForward;
      totalCarryForwardUsed += yearData.carryForwardUsed;

      // Only include remaining carry forward from non-expired years
      if (!yearData.isExpired && yearData.remainingCarryForward > 0) {
        totalUnusedCarryForward += yearData.remainingCarryForward;
      }

      if (yearData.excessAfterCarryForward > 0) yearsWithExcess++;
    });

    return {
      totalExcess,
      totalCarryForwardUsed,
      totalUnusedCarryForward,
      yearsWithExcess,
    };
  }, [processedYearData]);

  return (
    <div className="pension-chart-container">
      {processedYearData && (
        <>
          <div className="pension-chart-header">
            <h3 className="pension-chart-title">
              Annual Allowance Utilization
            </h3>

            {summaryStats.totalExcess > 0 && (
              <div className="excess-warning">
                ⚠️ Total excess contributions: £
                {summaryStats.totalExcess.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                across {summaryStats.yearsWithExcess} year
                {summaryStats.yearsWithExcess !== 1 ? "s" : ""}
              </div>
            )}

            {summaryStats.totalCarryForwardUsed > 0 && (
              <div className="carry-forward-summary">
                Carry Forward Used: £
                {summaryStats.totalCarryForwardUsed.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            )}

            {summaryStats.totalUnusedCarryForward > 0 && (
              <div className="unused-summary">
                Unused Allowances: £
                {summaryStats.totalUnusedCarryForward.toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </div>
            )}
          </div>

          {visibleYears.map((yearKey) => (
            <AnimatedBar
              key={yearKey}
              yearData={processedYearData[yearKey]}
              yearKey={yearKey}
              isExpanded={true}
            />
          ))}

          {hiddenYears.length > 0 && (
            <>
              {hiddenYears.map((yearKey) => (
                <AnimatedBar
                  key={yearKey}
                  yearData={processedYearData[yearKey]}
                  yearKey={yearKey}
                  isExpanded={expanded}
                />
              ))}

              <button
                className="expand-toggle-btn"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                aria-controls="hiddenYearsContainer"
              >
                {expanded
                  ? "Collapse previous years ▲"
                  : "Show previous years ▼"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
