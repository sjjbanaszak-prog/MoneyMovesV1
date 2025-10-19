import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * Process pension upload data from IntelligentFileUploader
 * and convert it to the format expected by PensionPots.js
 *
 * @param {Object} uploadResult - Result from IntelligentFileUploader
 * @returns {Object} { yearlyTotals, providerData }
 */
export function processPensionUpload(uploadResult) {
  const { rawData, mapping, dateFormat, provider } = uploadResult;

  const yearlyTotals = {};
  const providerGroups = {};

  // Parse each row
  rawData.forEach((row) => {
    // Extract date
    const dateValue = row[mapping.date];
    if (!dateValue) return;

    const date = dayjs(dateValue, dateFormat, true);
    if (!date.isValid()) return;

    // Extract provider name
    const providerName = row[mapping.provider] || provider || "Unknown Provider";

    // Extract amount
    let amount = 0;

    // Check if we have specific employee/employer contributions
    if (mapping.employeeContribution && mapping.employerContribution) {
      const empAmount = parseAmount(row[mapping.employeeContribution]);
      const erAmount = parseAmount(row[mapping.employerContribution]);
      amount = empAmount + erAmount;
    } else {
      // Use total amount field
      amount = parseAmount(row[mapping.amount]);
    }

    if (isNaN(amount) || amount <= 0) return;

    // Calculate pension year (April 6 cutoff)
    const pensionYear =
      date.month() > 3 || (date.month() === 3 && date.date() >= 6)
        ? date.year()
        : date.year() - 1;

    // Add to yearly totals
    yearlyTotals[pensionYear] = (yearlyTotals[pensionYear] || 0) + amount;

    // Extract description (optional)
    const description = mapping.description ? row[mapping.description] : null;

    // Group by provider
    if (!providerGroups[providerName]) {
      providerGroups[providerName] = {
        provider: providerName,
        paymentHistory: [],
        firstPayment: null,
        lastPayment: null,
        deposits: 0,
      };
    }

    const providerGroup = providerGroups[providerName];

    // Add payment with description
    providerGroup.paymentHistory.push({
      date: date.format("YYYY-MM-DD"),
      amount,
      description: description || "Pension contribution",
    });

    // Update date range
    const dateStr = date.format("YYYY-MM-DD");
    if (
      !providerGroup.firstPayment ||
      dateStr < providerGroup.firstPayment
    ) {
      providerGroup.firstPayment = dateStr;
    }
    if (!providerGroup.lastPayment || dateStr > providerGroup.lastPayment) {
      providerGroup.lastPayment = dateStr;
    }

    // Update total deposits
    providerGroup.deposits += amount;
  });

  // Convert provider groups to array and add metadata
  const providerData = Object.values(providerGroups).map((provider) => ({
    ...provider,
    latestUpdate: new Date().toISOString(),
    // Sort payment history by date
    paymentHistory: provider.paymentHistory.sort((a, b) => a.date.localeCompare(b.date)),
  }));

  return {
    yearlyTotals,
    providerData,
  };
}

/**
 * Parse amount string to number
 *
 * @param {*} value - Amount value
 * @returns {number}
 */
function parseAmount(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;

  // Remove currency symbols, commas, and whitespace
  const cleaned = String(value).replace(/[£$€,\s]/g, "");
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
}
