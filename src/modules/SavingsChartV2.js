import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { parseNumber } from "./utils/parseNumber";
import "./PensionGrowthChartStyles.css";

dayjs.extend(customParseFormat);

console.log("SavingsChartV2 component loaded");

// Extended color palette for multiple savings accounts
const COLOR_PALETTE = [
  "#10b981", // Emerald green
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f97316", // Orange
  "#ec4899", // Pink
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#a855f7", // Violet
  "#eab308", // Yellow
  "#f43f5e", // Rose
  "#0ea5e9", // Sky blue
  "#22c55e", // Green
  "#d946ef", // Fuchsia
  "#fb7c5b", // Coral
  "#8e44ad", // Dark purple
  "#2ecc71", // Sea green
];

// Fixed color mapping for account types to match SavingsAccountsTable badges
const ACCOUNT_TYPE_COLORS = {
  "Current Account": "#3b82f6", // Blue (COLOR_PALETTE[1])
  "Savings": "#10b981", // Emerald green (COLOR_PALETTE[0])
  "Savings Account": "#10b981", // Emerald green (COLOR_PALETTE[0])
  "ISA": "#8b5cf6", // Purple (COLOR_PALETTE[2])
  "LISA": "#ec4899", // Pink (COLOR_PALETTE[8])
  "Premium Bonds": "#f59e0b", // Amber (COLOR_PALETTE[3])
  "Investment Account": "#ef4444", // Red (COLOR_PALETTE[4])
  "Other": "#06b6d4", // Cyan (COLOR_PALETTE[5])
};

// Function to create a consistent color mapping for savings accounts
const createAccountColorMapping = (accounts) => {
  const mapping = {};

  accounts.forEach((account) => {
    // Use fixed color if defined, otherwise fall back to palette-based assignment
    if (ACCOUNT_TYPE_COLORS[account]) {
      mapping[account] = ACCOUNT_TYPE_COLORS[account];
    } else {
      // Fallback for any undefined types - use hash-based color from palette
      const sortedAccounts = [...accounts].sort();
      const index = sortedAccounts.indexOf(account);
      mapping[account] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    }
  });

  return mapping;
};

// Generate chart data from savings account transaction history
// Groups by account TYPE (ISA, LISA, Current Account, etc.) instead of individual accounts
const generateChartDataFromTransactions = (uploads, selectedAccounts) => {
  console.log("=== USING REAL SAVINGS DATA (GROUPED BY TYPE) ===");
  console.log("uploads received:", uploads?.length || 0);
  console.log("selectedAccounts:", selectedAccounts);

  if (!uploads || uploads.length === 0) {
    console.log("No uploads, returning empty array");
    return [];
  }

  // Filter to only selected accounts
  const activeUploads = uploads.filter((upload) =>
    selectedAccounts.includes(upload.accountName)
  );

  if (activeUploads.length === 0) {
    return [];
  }

  // Get all unique account types across all uploads
  const allAccountTypes = new Set();
  activeUploads.forEach((upload) => {
    const normalizedType = upload.accountType || "Savings";
    allAccountTypes.add(normalizedType);
  });
  console.log("All account types:", Array.from(allAccountTypes));

  // Get all years we need to show
  const allYears = new Set();
  activeUploads.forEach((upload) => {
    const { rawData, mapping, dateFormat, accountName, accountType } = upload;

    console.log(
      `Processing ${accountName} (Type: ${accountType}): transactions=${rawData?.length || 0}`
    );

    if (rawData && rawData.length > 0) {
      rawData.forEach((row) => {
        const dateValue = row[mapping.date];
        if (dateValue) {
          const parsed = dayjs(dateValue, dateFormat, true);
          if (parsed.isValid()) {
            allYears.add(parsed.year());
          }
        }
      });
    }
  });

  if (allYears.size === 0) {
    return [];
  }

  const sortedYears = Array.from(allYears).sort();
  console.log("Years to process:", sortedYears);

  const result = sortedYears.map((year) => {
    const yearData = { year };
    const typeBalances = {}; // Track balances by account type

    // Initialize all account types to 0 for this year
    // This ensures proper stacking in the chart
    allAccountTypes.forEach((type) => {
      typeBalances[type] = 0;
    });

    // Process each account and aggregate by type
    activeUploads.forEach((upload) => {
      const { rawData, mapping, dateFormat, accountName, accountType } = upload;

      // Normalize account type for grouping
      const normalizedType = accountType || "Savings";

      // Filter transactions up to this year
      const transactionsUpToYear = rawData.filter((row) => {
        const dateValue = row[mapping.date];
        if (!dateValue) return false;
        const parsed = dayjs(dateValue, dateFormat, true);
        return parsed.isValid() && parsed.year() <= year;
      });

      if (transactionsUpToYear.length === 0) {
        return;
      }

      // Sort by date to get the last balance for this year
      const sorted = transactionsUpToYear.sort((a, b) => {
        const dateA = dayjs(a[mapping.date], dateFormat, true);
        const dateB = dayjs(b[mapping.date], dateFormat, true);
        return dateA.diff(dateB);
      });

      // Get the balance at year end
      const lastTransaction = sorted[sorted.length - 1];
      let balance = 0;

      if (mapping.balance && lastTransaction[mapping.balance] !== undefined) {
        balance = parseNumber(lastTransaction[mapping.balance]);
      } else if (mapping.amount) {
        // Calculate running balance from amounts if no balance column
        let runningBalance = 0;
        sorted.forEach((row) => {
          const amount = parseNumber(row[mapping.amount]);
          runningBalance += amount;
        });
        balance = runningBalance;
      } else if (lastTransaction.Balance !== undefined) {
        balance = parseNumber(lastTransaction.Balance);
      } else if (lastTransaction.balance !== undefined) {
        balance = parseNumber(lastTransaction.balance);
      }

      console.log(
        `${accountName} (${normalizedType}) ${year}: balance = £${balance} (${sorted.length} transactions)`
      );

      // Add to type total
      typeBalances[normalizedType] += Math.round(balance);
    });

    // Add type totals to year data (all types will be present, some with 0)
    Object.entries(typeBalances).forEach(([type, balance]) => {
      yearData[`${type}_balance`] = balance;
      console.log(`${year} - ${type}: £${balance.toLocaleString()}`);
    });

    return yearData;
  });

  console.log("Final savings chart data (grouped by type):", result);
  return result;
};

const SavingsChartV2 = ({ uploads = [], selectedAccounts = [] }) => {
  // Generate chart data from transaction history
  const chartData = useMemo(() => {
    console.log("=== SAVINGS CHART DATA GENERATION ===");
    const data = generateChartDataFromTransactions(uploads, selectedAccounts);
    console.log("Generated savings chart data:", data);
    return data;
  }, [uploads, selectedAccounts]);

  // Get active account types for the chart
  const chartAccountTypes = useMemo(() => {
    const activeUploads = uploads.filter((upload) =>
      selectedAccounts.includes(upload.accountName)
    );

    // Get unique account types with their earliest start year
    const typeMap = new Map();

    activeUploads.forEach((upload) => {
      const { rawData, mapping, dateFormat, accountType } = upload;
      const normalizedType = accountType || "Savings";

      let startYear = 9999;
      if (rawData && rawData.length > 0) {
        const validDates = rawData
          .map((row) => {
            const dateValue = row[mapping.date];
            if (!dateValue) return null;
            const parsed = dayjs(dateValue, dateFormat, true);
            return parsed.isValid() ? parsed.year() : null;
          })
          .filter((year) => year !== null);

        if (validDates.length > 0) {
          startYear = Math.min(...validDates);
        }
      }

      // Keep earliest start year for each type
      if (!typeMap.has(normalizedType) || typeMap.get(normalizedType).startYear > startYear) {
        typeMap.set(normalizedType, { accountType: normalizedType, startYear });
      }
    });

    // Sort by start year (NEWEST first) so they stack properly with newest on top
    return Array.from(typeMap.values()).sort((a, b) => b.startYear - a.startYear);
  }, [uploads, selectedAccounts]);

  // Create color mapping for all account types
  const accountColorMapping = useMemo(() => {
    const allTypes = chartAccountTypes.map((type) => type.accountType);
    return createAccountColorMapping(allTypes);
  }, [chartAccountTypes]);

  // Generate dynamic gradients based on account colors
  const dynamicGradients = useMemo(() => {
    return Object.entries(accountColorMapping).map(([account, color]) => {
      const gradientId = `gradSavings${account.replace(/\s+/g, "")}`;
      return (
        <linearGradient
          key={gradientId}
          id={gradientId}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="5%" stopColor={color} stopOpacity={0.8} />
          <stop offset="95%" stopColor={color} stopOpacity={0.1} />
        </linearGradient>
      );
    });
  }, [accountColorMapping]);

  console.log("Savings chart render state:", {
    chartData: chartData.length,
    chartAccountTypes: chartAccountTypes.length,
    accountColorMapping,
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const filteredPayload = payload.filter((entry) =>
      entry.dataKey.includes("_balance")
    );

    return (
      <div className="chart-tooltip">
        <div className="tooltip-label">Year: {label}</div>
        {filteredPayload.map((entry, index) => {
          const accountType = entry.dataKey.replace("_balance", "");
          return (
            <div key={index} style={{ color: entry.color, marginBottom: 4 }}>
              <strong>{accountType}:</strong> £{entry.value.toLocaleString()}
            </div>
          );
        })}
        {filteredPayload.length > 0 && (
          <div className="tooltip-total">
            <strong>Total:</strong> £
            {filteredPayload
              .reduce((sum, entry) => sum + entry.value, 0)
              .toLocaleString()}
          </div>
        )}
      </div>
    );
  };

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="growth-chart-wrapper">
      <div className="chart-header">
        <h3 className="chart-heading">Balance History</h3>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 0, left: -15, bottom: 0 }}
          >
            <defs>{dynamicGradients}</defs>

            <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              tick={{ fill: "#d1d5db", fontSize: 12 }}
              axisLine={{ stroke: "#333" }}
              tickLine={false}
              minTickGap={10}
            />
            <YAxis
              tick={{ fill: "#d1d5db", fontSize: 12 }}
              axisLine={{ stroke: "#333" }}
              tickLine={false}
              tickFormatter={(tick) =>
                tick >= 1_000_000
                  ? `£${(tick / 1_000_000).toFixed(1)}m`
                  : tick >= 1_000
                  ? `£${(tick / 1_000).toFixed(0)}k`
                  : `£${tick}`
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ color: "#d1d5db", fontSize: "12px" }}
              formatter={(value) => value.replace("_balance", "")}
            />

            {chartAccountTypes.map((typeObj) => {
              const accountType = typeObj.accountType;
              const color = accountColorMapping[accountType];
              const gradientId = `gradSavings${accountType.replace(/\s+/g, "")}`;

              return (
                <Area
                  key={accountType}
                  type="monotone"
                  dataKey={`${accountType}_balance`}
                  stackId="1"
                  stroke={color}
                  fill={`url(#${gradientId})`}
                  fillOpacity={0.6}
                  strokeWidth={2}
                  connectNulls={false}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SavingsChartV2;
