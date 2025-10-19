// Enhanced column detection with better pattern matching and scoring
export function autoDetectColumns(data) {
  const headers = Object.keys(data[0]);
  const sampleRows = data.slice(0, Math.min(10, data.length));

  const mapping = {
    date: null,
    debit: null,
    credit: null,
    balance: null,
    description: null,
    reference: null,
    amount: null,
  };

  // Enhanced pattern matching with scoring
  const patterns = {
    date: {
      keywords: [
        "date",
        "transaction date",
        "posting date",
        "value date",
        "processed date",
      ],
      patterns: [/date/i, /time/i, /when/i],
      validators: [
        (header, rows) => {
          const dateValues = rows.map((row) => row[header]).filter(Boolean);
          return dateValues.some(
            (val) =>
              /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(val) ||
              /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(val) ||
              /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(
                val
              )
          );
        },
      ],
    },
    debit: {
      keywords: [
        "debit",
        "withdrawal",
        "money out",
        "out",
        "withdrawals",
        "paid out",
        "debits",
      ],
      patterns: [/debit/i, /withdrawal/i, /out/i, /paid/i],
      validators: [
        (header, rows) => {
          const values = rows
            .map((row) => row[header])
            .filter((val) => val !== "" && val != null);
          return (
            values.length > 0 &&
            values.some(
              (val) => !isNaN(parseFloat(String(val).replace(/[£$,]/g, "")))
            )
          );
        },
      ],
    },
    credit: {
      keywords: [
        "credit",
        "deposit",
        "money in",
        "in",
        "deposits",
        "paid in",
        "credits",
      ],
      patterns: [/credit/i, /deposit/i, /in/i, /received/i],
      validators: [
        (header, rows) => {
          const values = rows
            .map((row) => row[header])
            .filter((val) => val !== "" && val != null);
          return (
            values.length > 0 &&
            values.some(
              (val) => !isNaN(parseFloat(String(val).replace(/[£$,]/g, "")))
            )
          );
        },
      ],
    },
    balance: {
      keywords: [
        "balance",
        "running balance",
        "account balance",
        "current balance",
        "closing balance",
      ],
      patterns: [/balance/i, /total/i, /amount/i],
      validators: [
        (header, rows) => {
          const values = rows
            .map((row) => row[header])
            .filter((val) => val !== "" && val != null);
          return (
            values.length > 0 &&
            values.every(
              (val) => !isNaN(parseFloat(String(val).replace(/[£$,]/g, "")))
            )
          );
        },
      ],
    },
    description: {
      keywords: [
        "description",
        "narrative",
        "details",
        "memo",
        "reference",
        "transaction type",
        "payee",
      ],
      patterns: [
        /desc/i,
        /narrative/i,
        /details/i,
        /memo/i,
        /payee/i,
        /merchant/i,
      ],
      validators: [
        (header, rows) => {
          const values = rows.map((row) => row[header]).filter(Boolean);
          const uniqueValues = new Set(values);
          return uniqueValues.size > values.length * 0.3;
        },
      ],
    },
    reference: {
      keywords: ["reference", "ref", "transaction id", "id", "cheque number"],
      patterns: [/ref/i, /id/i, /number/i, /cheque/i],
      validators: [(header, rows) => true],
    },
    amount: {
      keywords: ["amount", "value", "sum", "total", "wins"],
      patterns: [/amount/i, /value/i, /sum/i, /wins/i],
      validators: [
        (header, rows) => {
          const values = rows
            .map((row) => row[header])
            .filter((val) => val !== "" && val != null);
          return (
            values.length > 0 &&
            values.some(
              (val) => !isNaN(parseFloat(String(val).replace(/[£$,]/g, "")))
            )
          );
        },
      ],
    },
  };

  // Score each header for each field type
  headers.forEach((header) => {
    const headerLower = header.toLowerCase().trim();

    Object.entries(patterns).forEach(([fieldType, config]) => {
      if (mapping[fieldType]) return;

      let score = 0;

      if (config.keywords.includes(headerLower)) {
        score += 100;
      }

      config.keywords.forEach((keyword) => {
        if (headerLower.includes(keyword)) {
          score += 50;
        }
      });

      config.patterns.forEach((pattern) => {
        if (pattern.test(headerLower)) {
          score += 30;
        }
      });

      if (
        config.validators.some((validator) => validator(header, sampleRows))
      ) {
        score += 20;
      }

      if (
        score > 0 &&
        (!mapping[fieldType] || score > (mapping[fieldType]?.score || 0))
      ) {
        mapping[fieldType] = { header, score };
      }
    });
  });

  // Extract just the header names
  const finalMapping = {};
  Object.entries(mapping).forEach(([field, value]) => {
    finalMapping[field] = value?.header || null;
  });

  return finalMapping;
}

// Enhanced account type detection
export function detectAccountType(data, mapping) {
  const sampleDescriptions = data
    .slice(0, 20)
    .map((row) => row[mapping.description] || "")
    .join(" ")
    .toLowerCase();

  const typeIndicators = {
    "Premium Bonds": ["wins", "prize", "premium bond", "ernie", "ns&i"],
    ISA: [
      "isa",
      "individual savings account",
      "stocks and shares isa",
      "cash isa",
    ],
    LISA: ["lisa", "lifetime isa", "lifetime individual savings account"],
    "Current Account": [
      "current account",
      "debit card",
      "direct debit",
      "standing order",
      "atm",
      "contactless",
      "faster payment",
      "bacs",
    ],
    Savings: [
      "savings account",
      "instant access",
      "notice account",
      "fixed term",
    ],
  };

  for (const [accountType, keywords] of Object.entries(typeIndicators)) {
    if (keywords.some((keyword) => sampleDescriptions.includes(keyword))) {
      return accountType;
    }
  }

  const hasRegularPayments =
    sampleDescriptions.includes("direct debit") ||
    sampleDescriptions.includes("standing order");
  const hasCardPayments =
    sampleDescriptions.includes("card") ||
    sampleDescriptions.includes("contactless");

  if (hasRegularPayments || hasCardPayments) {
    return "Current Account";
  }

  return "Savings";
}

// Enhanced bank detection
export function detectBank(data, mapping, fileName = "") {
  const fileNameLower = fileName.toLowerCase();
  const sampleText = data
    .slice(0, 10)
    .map((row) => Object.values(row).join(" "))
    .join(" ")
    .toLowerCase();

  const bankIndicators = {
    Barclays: ["barclays", "barclay"],
    Halifax: ["halifax", "hfx"],
    HSBC: ["hsbc", "hongkong shanghai"],
    Lloyds: ["lloyds", "lloyds bank"],
    Monzo: ["monzo"],
    NatWest: ["natwest", "national westminster"],
    Santander: ["santander"],
    Starling: ["starling"],
    "First Direct": ["first direct"],
    Nationwide: ["nationwide"],
    "NS&I": ["ns&i", "national savings", "premium bond", "ernie"],
    Trading212: ["trading212", "trading 212"],
  };

  for (const [bank, indicators] of Object.entries(bankIndicators)) {
    if (indicators.some((indicator) => fileNameLower.includes(indicator))) {
      return bank;
    }
  }

  for (const [bank, indicators] of Object.entries(bankIndicators)) {
    if (indicators.some((indicator) => sampleText.includes(indicator))) {
      return bank;
    }
  }

  return null;
}
