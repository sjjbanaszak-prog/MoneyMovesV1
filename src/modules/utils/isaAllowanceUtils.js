import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { parseNumber } from "./parseNumber";

dayjs.extend(customParseFormat);

// ISA allowances by tax year (April 6 - April 5)
const ISA_ALLOWANCES = {
  "2020/21": 20000,
  "2021/22": 20000,
  "2022/23": 20000,
  "2023/24": 20000,
  "2024/25": 20000,
  "2025/26": 20000,
};

/**
 * Calculate ISA allowance utilization data from uploads
 * Much simpler than pension - no carry forward, unused is just lost
 */
export function calculateISAAllowanceData(uploads) {
  console.log("Calculating ISA allowance data from uploads:", uploads.length);

  // Filter to only ISA and LISA accounts
  const isaAccounts = uploads.filter(
    (upload) => upload.accountType === "ISA" || upload.accountType === "LISA"
  );

  if (isaAccounts.length === 0) {
    return { years: [] };
  }

  // Calculate deposits by tax year
  const yearlyDeposits = {};

  isaAccounts.forEach((account) => {
    const { rawData, mapping, dateFormat, accountName } = account;

    rawData.forEach((row) => {
      const dateValue = row[mapping.date];
      if (!dateValue) return;

      const transactionDate = dayjs(dateValue, dateFormat, true);
      if (!transactionDate.isValid()) return;

      // Determine tax year (April 6 - April 5)
      const year = transactionDate.year();
      const month = transactionDate.month(); // 0-indexed
      const day = transactionDate.date();

      let taxYearStart;
      if (month < 3 || (month === 3 && day < 6)) {
        // Before April 6 - previous tax year
        taxYearStart = year - 1;
      } else {
        // April 6 or later - current tax year
        taxYearStart = year;
      }

      const taxYearLabel = `${taxYearStart}/${String(taxYearStart + 1).slice(2)}`;

      // Get description to check transaction type
      const description = mapping.description
        ? String(row[mapping.description] || row.Description || "").toLowerCase()
        : "";

      // Exclude interest, dividends, and transfers
      const isInterest =
        description.includes("interest") ||
        description.includes("int paid") ||
        description.includes("int credit") ||
        description.includes("credit interest") ||
        description.includes("gross interest") ||
        description.includes("int pmt") ||
        description.match(/\bint\b/);

      const isDividend =
        description.includes("dividend") ||
        description.includes("div paid") ||
        description.includes("div credit");

      const isTransfer = description.includes("transfer");

      // Only count deposits (positive amounts), excluding interest, dividends, and transfers
      let depositAmount = 0;
      if (mapping.credit) {
        const creditAmount = parseNumber(row[mapping.credit]);
        if (creditAmount > 0 && !isInterest && !isDividend && !isTransfer) {
          depositAmount = creditAmount;
        }
      } else if (mapping.amount) {
        const amount = parseNumber(row[mapping.amount]);
        if (amount > 0 && !isInterest && !isDividend && !isTransfer) {
          depositAmount = amount;
        }
      }

      if (depositAmount > 0) {
        if (!yearlyDeposits[taxYearLabel]) {
          yearlyDeposits[taxYearLabel] = 0;
        }
        yearlyDeposits[taxYearLabel] += depositAmount;
      }
    });
  });

  // Convert to array format
  const years = Object.entries(yearlyDeposits)
    .map(([taxYear, used]) => {
      const allowance = ISA_ALLOWANCES[taxYear] || 20000;
      const unused = Math.max(0, allowance - used);

      return {
        year: taxYear,
        allowance,
        used: Math.round(used),
        unused: Math.round(unused),
      };
    })
    .sort((a, b) => {
      // Sort by start year
      const yearA = parseInt(a.year.split("/")[0]);
      const yearB = parseInt(b.year.split("/")[0]);
      return yearA - yearB;
    });

  console.log("ISA allowance years calculated:", years);

  return { years };
}
