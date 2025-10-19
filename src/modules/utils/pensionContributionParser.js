import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

function parsePensionContributions({ rawData, mapping, dateFormat }) {
  console.log("Parser called with:", {
    rawData: rawData?.length,
    mapping,
    dateFormat,
  });

  if (!Array.isArray(rawData)) {
    console.warn("Invalid rawData passed to parser:", rawData);
    return { yearlyTotals: {}, providerData: [] };
  }

  const dateKey = mapping.date;
  const amountKey = mapping.amount;
  const providerKey = mapping.provider;

  console.log("Column keys:", { dateKey, amountKey, providerKey });

  // Check if required mappings exist
  if (!dateKey || !amountKey || !providerKey) {
    console.error("Missing column mappings:", {
      date: dateKey,
      provider: providerKey,
      amount: amountKey,
    });
    return { yearlyTotals: {}, providerData: [] };
  }

  const yearlyTotals = {};
  const providerGroups = {};

  if (
    !dateFormat ||
    typeof dateFormat !== "string" ||
    dateFormat.trim() === ""
  ) {
    console.warn("Invalid or missing dateFormat:", dateFormat);
    return { yearlyTotals, providerData: [] };
  }

  console.log("Starting to process", rawData.length, "rows");
  console.log("Sample row structure:", rawData[0]);

  rawData.forEach((row, idx) => {
    const rawDate = row?.[dateKey];
    const rawAmount = row?.[amountKey];
    const rawProvider = row?.[providerKey];

    if (rawDate == null || rawAmount == null || rawProvider == null) {
      console.warn(
        `Row ${idx} skipped due to missing date, amount, or provider:`,
        row
      );
      return;
    }

    let rawDateStr;
    if (typeof rawDate === "string") {
      rawDateStr = rawDate.trim();
    } else if (rawDate instanceof Date) {
      rawDateStr = dayjs(rawDate).format("DD-MM-YYYY");
    } else {
      rawDateStr = String(rawDate).trim();
    }

    const date = dayjs(rawDateStr, dateFormat, true);
    if (!date.isValid()) {
      console.warn(
        `Invalid date parsed at row ${idx}: rawDate='${rawDate}', rawDateStr='${rawDateStr}', expected format='${dateFormat}'`
      );
      return;
    }

    const amount = parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, ""));
    if (isNaN(amount) || amount <= 0) {
      console.warn(`Invalid amount at row ${idx}:`, rawAmount);
      return;
    }

    const provider = String(rawProvider).trim();

    // Initialize provider group if not exists
    if (!providerGroups[provider]) {
      providerGroups[provider] = {
        provider,
        payments: [],
        totalDeposits: 0,
        firstPayment: null,
        lastPayment: null,
        currentValue: 0, // Will be manually set by user
      };
      console.log(`Initialized provider group for: ${provider}`);
    }

    // Add payment to provider group
    const paymentRecord = {
      date: date.format("YYYY-MM-DD"),
      amount,
    };

    providerGroups[provider].payments.push(paymentRecord);
    providerGroups[provider].totalDeposits += amount;

    // Update first and last payment dates
    const paymentDate = date.format("YYYY-MM-DD");
    if (
      !providerGroups[provider].firstPayment ||
      paymentDate < providerGroups[provider].firstPayment
    ) {
      providerGroups[provider].firstPayment = paymentDate;
    }
    if (
      !providerGroups[provider].lastPayment ||
      paymentDate > providerGroups[provider].lastPayment
    ) {
      providerGroups[provider].lastPayment = paymentDate;
    }

    // Pension year: April 6 cutoff
    const year =
      date.month() > 3 || (date.month() === 3 && date.date() >= 6)
        ? date.year()
        : date.year() - 1;

    yearlyTotals[year] = (yearlyTotals[year] || 0) + amount;
  });

  console.log("Parser - Provider groups created:", Object.keys(providerGroups));
  Object.values(providerGroups).forEach((group) => {
    console.log(
      `Provider ${group.provider} has ${group.payments.length} payments`
    );
  });

  // Convert provider groups to array format with explicit logging
  const providerData = Object.values(providerGroups).map((provider) => {
    const result = {
      provider: provider.provider,
      firstPayment: provider.firstPayment,
      lastPayment: provider.lastPayment,
      deposits: provider.totalDeposits,
      currentValue: provider.currentValue,
      latestUpdate: provider.lastPayment,
      paymentHistory: provider.payments, // This should contain the payment array
    };

    console.log(`FINAL DATA for ${provider.provider}:`, {
      paymentsCount: provider.payments.length,
      hasPaymentHistory: !!result.paymentHistory,
      paymentHistoryLength: result.paymentHistory?.length,
      firstFewPayments: result.paymentHistory?.slice(0, 3),
    });

    return result;
  });

  console.log(
    "Parser - Final providerData structure:",
    providerData.map((p) => ({
      provider: p.provider,
      hasPaymentHistory: !!p.paymentHistory,
      paymentCount: p.paymentHistory?.length || 0,
    }))
  );

  return { yearlyTotals, providerData };
}

export { parsePensionContributions };
