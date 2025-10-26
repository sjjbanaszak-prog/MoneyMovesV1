import React, { useState, useMemo } from "react";
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
import "./PensionGrowthChartStyles.css";

console.log("PensionGrowthChart component loaded - ALL FIXES APPLIED");

// Extended color palette for multiple pension providers
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

// Function to create a consistent color mapping for pension providers
const createProviderColorMapping = (providers) => {
  const mapping = {};
  const sortedProviders = [...providers].sort(); // Sort for consistency

  sortedProviders.forEach((provider, index) => {
    mapping[provider] = COLOR_PALETTE[index % COLOR_PALETTE.length];
  });

  return mapping;
};

// Guaranteed dummy data that will always display
const DUMMY_DATA = [
  {
    year: 2019,
    Aviva_contributions: 2400,
    Aviva_total: 2400,
    Vanguard_contributions: 3600,
    Vanguard_total: 3600,
    Nest_contributions: 1800,
    Nest_total: 1800,
  },
  {
    year: 2020,
    Aviva_contributions: 4800,
    Aviva_total: 4600,
    Vanguard_contributions: 7200,
    Vanguard_total: 6900,
    Nest_contributions: 3600,
    Nest_total: 3450,
  },
  {
    year: 2021,
    Aviva_contributions: 7200,
    Aviva_total: 8100,
    Vanguard_contributions: 10800,
    Vanguard_total: 12150,
    Nest_contributions: 5400,
    Nest_total: 6075,
  },
  {
    year: 2022,
    Aviva_contributions: 9600,
    Aviva_total: 9800,
    Vanguard_contributions: 14400,
    Vanguard_total: 14700,
    Nest_contributions: 7200,
    Nest_total: 7350,
  },
  {
    year: 2023,
    Aviva_contributions: 12000,
    Aviva_total: 14400,
    Vanguard_contributions: 18000,
    Vanguard_total: 21600,
    Nest_contributions: 9000,
    Nest_total: 10800,
  },
  {
    year: 2024,
    Aviva_contributions: 14400,
    Aviva_total: 16200,
    Vanguard_contributions: 21600,
    Vanguard_total: 24300,
    Nest_contributions: 10800,
    Nest_total: 12150,
  },
];

// FIXED: Generate chart data from actual payment history
const generateChartDataFromPayments = (pensionAccounts) => {
  console.log("=== USING REAL PAYMENT DATA ===");
  console.log("pensionAccounts received:", pensionAccounts?.length || 0);

  if (!pensionAccounts || pensionAccounts.length === 0) {
    console.log("No accounts, returning dummy data");
    return DUMMY_DATA;
  }

  // Get all unique providers across all accounts
  const allProviders = new Set();
  pensionAccounts.forEach((account) => {
    if (account.provider) {
      allProviders.add(account.provider);
    }
  });
  console.log("All providers:", Array.from(allProviders));

  // Get all years we need to show
  const allYears = new Set();
  pensionAccounts.forEach((account) => {
    console.log(
      `Processing ${account.provider}: payments=${
        account.paymentHistory?.length || 0
      }, deposits=${account.deposits}`
    );

    if (account.firstPayment)
      allYears.add(new Date(account.firstPayment).getFullYear());
    if (account.lastPayment)
      allYears.add(new Date(account.lastPayment).getFullYear());
    if (account.paymentHistory) {
      account.paymentHistory.forEach((payment) => {
        if (payment.date) allYears.add(new Date(payment.date).getFullYear());
      });
    }
  });
  allYears.add(new Date().getFullYear());

  const sortedYears = Array.from(allYears).sort();
  console.log("Years to process:", sortedYears);

  const result = sortedYears.map((year) => {
    const yearData = { year };

    // Initialize all providers to 0 for this year
    // This ensures proper stacking in the chart
    allProviders.forEach((provider) => {
      yearData[`${provider}_contributions`] = 0;
      yearData[`${provider}_total`] = 0;
    });

    // Process each account independently
    pensionAccounts.forEach((account) => {
      const providerName = account.provider;
      let contributions = 0;

      // Determine the first year this provider started contributing
      let providerStartYear = null;
      if (account.paymentHistory && account.paymentHistory.length > 0) {
        providerStartYear = Math.min(
          ...account.paymentHistory.map((p) => new Date(p.date).getFullYear())
        );
      } else if (account.firstPayment) {
        providerStartYear = new Date(account.firstPayment).getFullYear();
      }

      // Only calculate actual data for this provider if we're at or after their start year
      if (providerStartYear && year >= providerStartYear) {
        // Sum up all payments for THIS account up to this year
        if (account.paymentHistory && account.paymentHistory.length > 0) {
          const relevantPayments = account.paymentHistory.filter(
            (payment) =>
              payment.date && new Date(payment.date).getFullYear() <= year
          );
          contributions = relevantPayments.reduce(
            (sum, payment) => sum + (payment.amount || 0),
            0
          );
          console.log(
            `${providerName} ${year}: ${relevantPayments.length} payments = £${contributions}`
          );
        } else if (account.deposits > 0) {
          // If no payment history, estimate based on date range
          const start = new Date(account.firstPayment).getFullYear();
          const end = new Date(account.lastPayment).getFullYear();
          if (year >= start && year <= end) {
            const progress = (year - start + 1) / (end - start + 1);
            contributions = account.deposits * progress;
          } else if (year > end) {
            contributions = account.deposits;
          }
          console.log(
            `${providerName} ${year}: estimated £${contributions} (no payment history)`
          );
        }

        let totalValue = contributions;
        if (year === new Date().getFullYear() && account.currentValue > 0) {
          totalValue = account.currentValue;
        }

        // Update the initialized values with actual data
        yearData[`${providerName}_contributions`] = Math.round(contributions);
        yearData[`${providerName}_total`] = Math.round(totalValue);
      }
      // For years before provider starts, values remain at 0 (already initialized)
    });

    return yearData;
  });

  console.log("Final result:", result);
  return result;
};

const PensionGrowthChart = ({
  pensionAccounts = [],
  yearlyTotals = {},
  onProviderColorMapping,
}) => {
  const [viewMode, setViewMode] = useState("contributions");

  // FIXED: Use the payment history function instead of mock data
  const chartData = useMemo(() => {
    console.log("=== CHART DATA GENERATION ===");
    const data = generateChartDataFromPayments(pensionAccounts);
    console.log("Generated chart data:", data);
    return data;
  }, [pensionAccounts]);

  // Check if we have real payment data or should show dummy data
  const hasRealPaymentData = pensionAccounts.some(
    (account) =>
      (account.paymentHistory && account.paymentHistory.length > 0) ||
      account.deposits > 0
  );

  const isDummyData = !hasRealPaymentData;

  // Get pension accounts for the chart - sorted by start date for proper stacking
  const chartAccounts = useMemo(() => {
    if (isDummyData) {
      return [
        { provider: "Aviva" },
        { provider: "Vanguard" },
        { provider: "Nest" },
      ];
    }

    // Sort accounts by their start date (oldest first) for proper stacking order
    const accountsWithStartYear = pensionAccounts.map((account) => {
      let startYear = 9999; // Default to far future if no data
      if (account.paymentHistory && account.paymentHistory.length > 0) {
        startYear = Math.min(
          ...account.paymentHistory.map((p) => new Date(p.date).getFullYear())
        );
      } else if (account.firstPayment) {
        startYear = new Date(account.firstPayment).getFullYear();
      }
      return { ...account, startYear };
    });

    // Sort by start year (NEWEST first) so they stack properly with newest on top
    return accountsWithStartYear.sort((a, b) => b.startYear - a.startYear);
  }, [isDummyData, pensionAccounts]);

  // Create color mapping for all providers
  const providerColorMapping = useMemo(() => {
    const allProviders = chartAccounts.map((account) => account.provider);
    const mapping = createProviderColorMapping(allProviders);

    // Pass the mapping to parent component if callback provided
    if (
      onProviderColorMapping &&
      typeof onProviderColorMapping === "function"
    ) {
      onProviderColorMapping(mapping);
    }

    return mapping;
  }, [chartAccounts, onProviderColorMapping]);

  // Generate dynamic gradients based on provider colors
  const dynamicGradients = useMemo(() => {
    return Object.entries(providerColorMapping).map(([provider, color]) => {
      const gradientId = `grad${provider.replace(/\s+/g, "")}`;
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
  }, [providerColorMapping]);

  console.log("Chart render state:", {
    isDummyData,
    chartData: chartData.length,
    chartAccounts: chartAccounts.length,
    providerColorMapping,
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const isContributionsMode = viewMode === "contributions";
    const filteredPayload = payload.filter((entry) =>
      entry.dataKey.includes(isContributionsMode ? "_contributions" : "_total")
    );

    return (
      <div className="chart-tooltip">
        <div className="tooltip-label">Year: {label}</div>
        {filteredPayload.map((entry, index) => {
          const providerName = entry.dataKey.replace(
            isContributionsMode ? "_contributions" : "_total",
            ""
          );
          return (
            <div key={index} style={{ color: entry.color, marginBottom: 4 }}>
              <strong>{providerName}:</strong> £{entry.value.toLocaleString()}
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

  const isContributionsMode = viewMode === "contributions";
  const suffix = isContributionsMode ? "_contributions" : "_total";

  return (
    <div className="growth-chart-wrapper">
      <div className="chart-header">
        <h3 className="chart-heading">Deposit History</h3>
        {isDummyData && (
          <div className="demo-badge">
            <span className="demo-text">Demo Data</span>
          </div>
        )}
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
                  : `£${(tick / 1_000).toFixed(0)}k`
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ color: "#d1d5db", fontSize: "12px" }}
              formatter={(value) => value.replace(suffix, "")}
            />

            {chartAccounts.map((account) => {
              const color = providerColorMapping[account.provider];
              const gradientId = `grad${account.provider.replace(/\s+/g, "")}`;

              return (
                <Area
                  key={account.provider}
                  type="monotone"
                  dataKey={`${account.provider}${suffix}`}
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

export default PensionGrowthChart;
