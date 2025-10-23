// Pension Allowance Carry Forward Calculations
// UK-specific: Annual allowance is £40k (2019-2023) and £60k (2023+)
// Unused allowance can be carried forward for 3 years

/**
 * Calculate carry forward data from yearly pension contributions
 * @param {Object} yearlyTotals - Object with tax years as keys (e.g., "2019", "2020") and contribution amounts as values
 * @returns {Object} Formatted carry forward data for visualization
 */
export function calculateCarryForwardData(yearlyTotals) {
  console.log("calculateCarryForwardData called with:", yearlyTotals);

  if (!yearlyTotals || Object.keys(yearlyTotals).length === 0) {
    console.log("No yearlyTotals data");
    return { years: [] };
  }

  // Parse year from various formats (could be "2019", "2019/20", or integer)
  const parseYear = (yearStr) => {
    const str = String(yearStr);
    const match = str.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : parseInt(str);
  };

  // Convert yearlyTotals object to sorted array of years
  const sortedYears = Object.keys(yearlyTotals)
    .map((year) => parseYear(year))
    .filter((year) => !isNaN(year))
    .sort((a, b) => a - b);

  console.log("Sorted years:", sortedYears);

  // Helper function to get allowance for a given tax year
  const getAllowance = (year) => {
    // £60k allowance from 2023/24 onwards, £40k before
    return year >= 2023 ? 60000 : 40000;
  };

  // Helper function to format tax year display (e.g., 2019 -> "2019/20")
  const formatTaxYear = (year) => {
    const nextYear = (year + 1).toString().slice(-2);
    return `${year}/${nextYear}`;
  };

  // Build data structure with carry forward calculations
  const yearsData = sortedYears.map((year, index) => {
    const used = yearlyTotals[year] || 0;
    const allowance = getAllowance(year);
    const unusedThisYear = Math.max(0, allowance - used);

    // Calculate carry forward breakdown
    const breakdown = {
      currentYear: Math.min(used, allowance),
      carryForward: [],
    };

    // If contributions exceed current year allowance, calculate carry forward usage
    if (used > allowance) {
      const excessContribution = used - allowance;
      let remainingExcess = excessContribution;

      // Look back up to 3 years for unused allowance
      for (let i = 1; i <= 3 && i <= index && remainingExcess > 0; i++) {
        const pastYearIndex = index - i;
        const pastYear = sortedYears[pastYearIndex];
        const pastYearUsed = yearlyTotals[pastYear] || 0;
        const pastYearAllowance = getAllowance(pastYear);
        const pastYearUnused = Math.max(0, pastYearAllowance - pastYearUsed);

        // Check if this past year's unused allowance was already used by years in between
        let alreadyUsedFromPastYear = 0;
        for (let j = pastYearIndex + 1; j < index; j++) {
          const intermediateYear = sortedYears[j];
          const intermediateUsed = yearlyTotals[intermediateYear] || 0;
          const intermediateAllowance = getAllowance(intermediateYear);

          if (intermediateUsed > intermediateAllowance) {
            // This year used carry forward - calculate how much from our past year
            const intermediateExcess = intermediateUsed - intermediateAllowance;
            let intermediateRemaining = intermediateExcess;

            // Calculate what was used from our specific past year
            for (let k = 1; k <= (j - pastYearIndex) && k <= 3; k++) {
              const checkYearIndex = j - k;
              if (checkYearIndex === pastYearIndex) {
                const availableFromPastYear = pastYearUnused - alreadyUsedFromPastYear;
                const usedFromPastYear = Math.min(intermediateRemaining, availableFromPastYear);
                alreadyUsedFromPastYear += usedFromPastYear;
                break;
              }
            }
          }
        }

        const availableFromPastYear = Math.max(0, pastYearUnused - alreadyUsedFromPastYear);
        const amountFromThisYear = Math.min(remainingExcess, availableFromPastYear);

        if (amountFromThisYear > 0) {
          breakdown.carryForward.push({
            fromYear: formatTaxYear(pastYear),
            amount: amountFromThisYear,
          });
          remainingExcess -= amountFromThisYear;
        }
      }
    }

    return {
      year: formatTaxYear(year),
      allowance,
      used,
      breakdown,
    };
  });

  return { years: yearsData };
}
