import { parseNumber } from "./parseNumber";

export function parsePremiumBondsData(data, mapping) {
  console.log("=== PARSING PREMIUM BONDS DATA ===");
  console.log("Raw data length:", data.length);
  console.log("Mapping:", mapping);

  const parsed = data.map((row, index) => {
    // Start with all original CSV columns
    const parsedRow = { ...row };

    // Add parsed numeric values
    parsedRow.deposit = parseNumber(row["Deposit"]);
    parsedRow.wins = parseNumber(row["Wins"]);
    parsedRow.withdrawals = parseNumber(row["Withdrawls"]);
    parsedRow.balance = parseNumber(row[mapping.balance]);

    // Only add mapped fields that exist (not undefined)
    if (mapping.date) {
      parsedRow[mapping.date] = row[mapping.date];
    }
    if (mapping.description) {
      parsedRow[mapping.description] =
        row[mapping.description] ||
        row["Description"] ||
        "Premium Bond Transaction";
    }
    if (mapping.balance) {
      parsedRow[mapping.balance] = row[mapping.balance];
    }
    // Only add amount if it's mapped
    if (mapping.amount && row[mapping.amount] !== undefined) {
      parsedRow[mapping.amount] = row[mapping.amount];
    }

    // Add transaction type based on the transaction
    if (parsedRow.wins > 0) {
      parsedRow.transactionType = "Prize Win";
      parsedRow.credit = parsedRow.wins;
    } else if (parsedRow.deposit > 0) {
      parsedRow.transactionType = "Purchase";
      parsedRow.credit = parsedRow.deposit;
    } else if (parsedRow.withdrawals > 0) {
      parsedRow.transactionType = "Withdrawal";
      parsedRow.debit = parsedRow.withdrawals;
    }

    if (index === 0) {
      console.log("First parsed row:", parsedRow);
    }

    return parsedRow;
  });

  console.log("Total parsed rows:", parsed.length);
  console.log("=== END PARSING ===");

  return parsed;
}

export const accountTypeTransformers = {
  "Premium Bonds": (data, mapping) => {
    console.log("Premium Bonds transformer called");
    return parsePremiumBondsData(data, mapping);
  },

  ISA: (data, mapping) => {
    return data.map((row) => ({
      ...row,
      taxYear: getTaxYear(row[mapping.date]),
      isISAContribution: detectISAContribution(row[mapping.description] || ""),
    }));
  },

  LISA: (data, mapping) => {
    return data.map((row) => ({
      ...row,
      taxYear: getTaxYear(row[mapping.date]),
      isLISAContribution: detectLISAContribution(
        row[mapping.description] || ""
      ),
      governmentBonus: detectGovernmentBonus(row[mapping.description] || ""),
    }));
  },

  "Current Account": (data, mapping) => {
    return data.map((row) => ({
      ...row,
      paymentMethod: detectPaymentMethod(row[mapping.description] || ""),
      isDirectDebit: /direct debit/i.test(row[mapping.description] || ""),
      isStandingOrder: /standing order/i.test(row[mapping.description] || ""),
    }));
  },
};

function getTaxYear(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 3 ? year : year - 1;
}

function detectISAContribution(description) {
  return /contribution|deposit|transfer in/i.test(description);
}

function detectLISAContribution(description) {
  return /lisa contribution|lifetime isa/i.test(description);
}

function detectGovernmentBonus(description) {
  return /government bonus|25% bonus|lisa bonus/i.test(description);
}

function detectPaymentMethod(description) {
  const desc = description.toLowerCase();
  if (desc.includes("card")) return "Card Payment";
  if (desc.includes("contactless")) return "Contactless";
  if (desc.includes("atm")) return "ATM";
  if (desc.includes("online")) return "Online Transfer";
  if (desc.includes("direct debit")) return "Direct Debit";
  if (desc.includes("standing order")) return "Standing Order";
  if (desc.includes("cheque")) return "Cheque";
  return "Other";
}
