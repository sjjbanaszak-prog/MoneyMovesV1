import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { parseNumber } from "./utils/parseNumber";
import "./NetWorthChartStyles.css";

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

const TIMEFRAMES = [
  { label: "1M", months: 1 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "5Y", months: 60 },
  { label: "All", months: Infinity },
];

export default function NetWorthChart({
  savingsUploads = [],
  pensionAccounts = [],
  selectedSavingsAccounts = [],
  selectedPensions = [],
  showMetricsAbove = false,
}) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("All");
  const [customRange, setCustomRange] = useState(null);

  // Process and combine all data
  const fullData = useMemo(() => {
    const activeSavingsAccounts =
      selectedSavingsAccounts.length > 0
        ? selectedSavingsAccounts
        : savingsUploads.map((u) => u.accountName);

    const activePensions =
      selectedPensions.length > 0
        ? selectedPensions
        : pensionAccounts.map((p) => p.provider);

    // Collect all dates
    const allDatesSet = new Set();
    let minDate = null;
    let maxDate = null;

    // Process savings data - collect all daily balances
    const savingsAccountBalances = {};
    savingsUploads.forEach((upload) => {
      const { rawData, mapping, dateFormat, accountName } = upload;
      if (!activeSavingsAccounts.includes(accountName)) return;

      const dailyBalances = {};
      rawData.forEach((row) => {
        const rawDate = row[mapping.date];
        const parsed = dayjs(rawDate, dateFormat, true);
        if (!parsed.isValid()) return;

        const date = parsed.format("YYYY-MM-DD");
        let balanceValue = 0;

        if (mapping.balance && row[mapping.balance] !== undefined) {
          balanceValue = parseNumber(row[mapping.balance]);
        }

        dailyBalances[date] = balanceValue;
        allDatesSet.add(date);

        if (!minDate || parsed.isBefore(minDate)) minDate = parsed;
        if (!maxDate || parsed.isAfter(maxDate)) maxDate = parsed;
      });

      savingsAccountBalances[accountName] = dailyBalances;
    });

    // Process pension data
    const pensionDailyBalances = {};
    pensionAccounts.forEach((account) => {
      if (!activePensions.includes(account.provider)) return;

      const dailyBalances = {};
      if (account.paymentHistory && account.paymentHistory.length > 0) {
        let runningTotal = 0;
        account.paymentHistory.forEach((payment) => {
          if (!payment.date) return;

          const parsed = dayjs(payment.date);
          if (!parsed.isValid()) return;

          const date = parsed.format("YYYY-MM-DD");
          runningTotal += payment.amount || 0;
          dailyBalances[date] = runningTotal;

          allDatesSet.add(date);
          if (!minDate || parsed.isBefore(minDate)) minDate = parsed;
          if (!maxDate || parsed.isAfter(maxDate)) maxDate = parsed;
        });

        // Add current value as today's balance
        const today = dayjs().format("YYYY-MM-DD");
        if (account.currentValue > 0) {
          dailyBalances[today] = account.currentValue;
          allDatesSet.add(today);
          const todayParsed = dayjs();
          if (!maxDate || todayParsed.isAfter(maxDate)) maxDate = todayParsed;
        }
      }

      pensionDailyBalances[account.provider] = dailyBalances;
    });

    if (!minDate || !maxDate) return [];

    // Create full date range
    const fullDateRange = [];
    let cursor = minDate.startOf("day");
    while (cursor.isSameOrBefore(maxDate)) {
      fullDateRange.push(cursor.format("YYYY-MM-DD"));
      cursor = cursor.add(1, "day");
    }

    // Fill in balances with forward filling
    const filledSavingsBalances = {};
    activeSavingsAccounts.forEach((account) => {
      const raw = savingsAccountBalances[account] || {};
      const filled = {};
      let lastKnown = 0;
      fullDateRange.forEach((date) => {
        if (raw[date] !== undefined) {
          lastKnown = raw[date];
        }
        filled[date] = lastKnown;
      });
      filledSavingsBalances[account] = filled;
    });

    const filledPensionBalances = {};
    activePensions.forEach((provider) => {
      const raw = pensionDailyBalances[provider] || {};
      const filled = {};
      let lastKnown = 0;
      fullDateRange.forEach((date) => {
        if (raw[date] !== undefined) {
          lastKnown = raw[date];
        }
        filled[date] = lastKnown;
      });
      filledPensionBalances[provider] = filled;
    });

    // Create data points (monthly sampling for cleaner display)
    const monthlyData = [];
    let lastMonth = null;

    fullDateRange.forEach((date) => {
      const currentMonth = dayjs(date).format("YYYY-MM");

      // Only add one data point per month (use the last day of each month with data)
      if (currentMonth !== lastMonth) {
        const savingsTotal = activeSavingsAccounts.reduce((sum, account) => {
          return sum + (filledSavingsBalances[account]?.[date] || 0);
        }, 0);

        const pensionTotal = activePensions.reduce((sum, provider) => {
          return sum + (filledPensionBalances[provider]?.[date] || 0);
        }, 0);

        monthlyData.push({
          date: dayjs(date).toDate(),
          savings: Math.round(savingsTotal),
          pensions: Math.round(pensionTotal),
          netWorth: Math.round(savingsTotal + pensionTotal),
          displayMonth: dayjs(date).format("MMM YY"),
        });

        lastMonth = currentMonth;
      }
    });

    return monthlyData;
  }, [
    savingsUploads,
    pensionAccounts,
    selectedSavingsAccounts,
    selectedPensions,
  ]);

  const filteredData = useMemo(() => {
    if (fullData.length === 0) return [];

    if (customRange) {
      const startIdx = Math.floor((customRange.start / 100) * fullData.length);
      const endIdx = Math.ceil((customRange.end / 100) * fullData.length);
      return fullData.slice(startIdx, endIdx);
    }

    if (selectedTimeframe === "All") return fullData;

    // Special handling for 1M - show previous month + current month
    if (selectedTimeframe === "1M") {
      const now = dayjs();
      const currentMonth = now.format("YYYY-MM");
      const previousMonth = now.subtract(1, "month").format("YYYY-MM");

      return fullData.filter((d) => {
        const dataMonth = dayjs(d.date).format("YYYY-MM");
        return dataMonth === currentMonth || dataMonth === previousMonth;
      });
    }

    const timeframe = TIMEFRAMES.find((t) => t.label === selectedTimeframe);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - timeframe.months);

    return fullData.filter((d) => d.date >= cutoffDate);
  }, [fullData, selectedTimeframe, customRange]);

  const availableTimeframes = useMemo(() => {
    const monthsAvailable = fullData.length;
    return TIMEFRAMES.filter(
      (t) => t.months <= monthsAvailable || t.label === "All"
    );
  }, [fullData]);

  const latestData = filteredData[filteredData.length - 1];
  const earliestData = filteredData[0];

  const oneYearAgo = useMemo(() => {
    const targetDate = new Date();
    targetDate.setFullYear(targetDate.getFullYear() - 1);
    return fullData.find((d) => d.date >= targetDate) || fullData[0];
  }, [fullData]);

  // Calculate growth between earliest and latest in filtered range
  const growthChange =
    latestData && earliestData
      ? latestData.netWorth - earliestData.netWorth
      : 0;

  const netWorthChange =
    latestData && earliestData
      ? ((latestData.netWorth - earliestData.netWorth) /
          Math.abs(earliestData.netWorth)) *
        100
      : 0;
  const isPositive = netWorthChange >= 0;

  const totalAssets = latestData ? latestData.savings + latestData.pensions : 0;
  const totalLiabilities = 0;
  const assetLiabilityRatio =
    totalLiabilities > 0 ? totalAssets / totalLiabilities : totalAssets;

  const handleRangeChange = (start, end) => {
    setCustomRange({ start, end });
    setSelectedTimeframe(null);
  };

  const resetToTimeframe = (timeframe) => {
    setSelectedTimeframe(timeframe);

    if (timeframe === "All") {
      setCustomRange(null);
    } else if (timeframe === "1M") {
      // For 1M, show previous month + current month
      const now = dayjs();
      const currentMonth = now.format("YYYY-MM");
      const previousMonth = now.subtract(1, "month").format("YYYY-MM");

      // Find indices for these two months
      const startIdx = fullData.findIndex(
        (d) => dayjs(d.date).format("YYYY-MM") === previousMonth
      );
      const endIdx = fullData.length - 1;

      if (startIdx >= 0) {
        const startPercent = (startIdx / fullData.length) * 100;
        const endPercent = 100;
        setCustomRange({ start: startPercent, end: endPercent });
      } else {
        setCustomRange(null);
      }
    } else {
      const tf = TIMEFRAMES.find((t) => t.label === timeframe);
      if (tf && tf.months !== Infinity) {
        const totalMonths = fullData.length;
        const endPercent = 100;
        const startPercent = Math.max(
          0,
          ((totalMonths - tf.months) / totalMonths) * 100
        );
        setCustomRange({ start: startPercent, end: endPercent });
      }
    }
  };

  const handleExport = () => {
    const csvContent = [
      ["Month", "Net Worth", "Savings", "Pensions"].join(","),
      ...filteredData.map((d) =>
        [d.displayMonth, d.netWorth, d.savings, d.pensions].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "net-worth-data.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatYAxis = (value) => {
    if (value >= 1000000) return "£" + (value / 1000000).toFixed(1) + "m";
    if (value <= -1000000)
      return "-£" + (Math.abs(value) / 1000000).toFixed(1) + "m";
    return "£" + (value / 1000).toFixed(0) + "k";
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const dataPoint = filteredData.find((d) => d.displayMonth === label);
    if (!dataPoint) return null;

    return (
      <div
        style={{
          backgroundColor: "#1e1e1e",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "12px",
          color: "#fff",
          fontSize: "12px",
          minWidth: "180px",
        }}
      >
        <div style={{ marginBottom: "8px", color: "#ccc", fontWeight: 600 }}>
          {label}
        </div>

        <div style={{ marginBottom: "6px", fontSize: "11px", color: "#888" }}>
          ASSETS
        </div>
        <div style={{ color: "#10b981", marginBottom: "4px" }}>
          Savings: £{dataPoint.savings.toLocaleString()}
        </div>
        <div style={{ color: "#3b82f6", marginBottom: "4px" }}>
          Pensions: £{dataPoint.pensions.toLocaleString()}
        </div>

        <div
          style={{
            marginTop: "10px",
            paddingTop: "8px",
            borderTop: "1px solid #374151",
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          Net Worth: £{dataPoint.netWorth.toLocaleString()}
        </div>
      </div>
    );
  };

  if (fullData.length === 0) {
    return (
      <div className="networth-chart-wrapper">
        <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
          Upload savings or pension data to see your net worth chart
        </div>
      </div>
    );
  }

  const metricsCards = (
    <div className="networth-metrics-grid">
      <div className="networth-metric-card">
        <div className="networth-metric-label">Current Net Worth</div>
        <div className="networth-metric-value">
          £{latestData?.netWorth.toLocaleString()}
        </div>
        <div
          className={`networth-metric-change ${
            isPositive ? "positive" : "negative"
          }`}
        >
          {isPositive ? "▲" : "▼"} {Math.abs(netWorthChange).toFixed(1)}% (
          {selectedTimeframe})
        </div>
      </div>

      <div className="networth-metric-card">
        <div className="networth-metric-label">Asset/Liability Ratio</div>
        <div className="networth-metric-value" style={{ color: "#06b6d4" }}>
          {assetLiabilityRatio.toFixed(2)}x
        </div>
        <div className="networth-metric-subtitle">
          Assets: £{(totalAssets / 1000).toFixed(0)}k | Liabilities: £
          {(totalLiabilities / 1000).toFixed(0)}k
        </div>
      </div>

      <div className="networth-metric-card">
        <div className="networth-metric-label">Growth</div>
        <div
          className="networth-metric-value"
          style={{ color: growthChange >= 0 ? "#10b981" : "#ef4444" }}
        >
          {growthChange >= 0 ? "+" : ""}£{growthChange.toLocaleString()}
        </div>
        <div className="networth-metric-subtitle">
          {earliestData?.displayMonth || "Start"} to{" "}
          {latestData?.displayMonth || "End"}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {showMetricsAbove && metricsCards}

      <div className="networth-chart-wrapper">
        <div className="networth-chart-header">
          <h3 className="networth-chart-title">Net Worth</h3>
          <div className="networth-header-actions">
            <button onClick={handleExport} className="networth-export-btn">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export</span>
            </button>
          </div>
        </div>

        {!showMetricsAbove && metricsCards}

        <div className="networth-chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={filteredData}
              margin={{ top: 10, right: 0, left: -15, bottom: 0 }}
            >
              <defs>
              <linearGradient id="gradSavings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="gradPensions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
            <XAxis
              dataKey="displayMonth"
              tick={{ fill: "#d1d5db", fontSize: 12 }}
              axisLine={{ stroke: "#333" }}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              tick={{ fill: "#d1d5db", fontSize: 12 }}
              axisLine={{ stroke: "#333" }}
              tickLine={false}
              tickFormatter={formatYAxis}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: "#d1d5db", fontSize: "12px" }} />
            <Area
              type="monotone"
              dataKey="savings"
              stackId="assets"
              stroke="#10b981"
              fill="url(#gradSavings)"
              fillOpacity={0.6}
              strokeWidth={2}
              name="Savings"
            />
            <Area
              type="monotone"
              dataKey="pensions"
              stackId="assets"
              stroke="#3b82f6"
              fill="url(#gradPensions)"
              fillOpacity={0.6}
              strokeWidth={2}
              name="Pensions"
            />
            <Line
              type="monotone"
              dataKey="netWorth"
              stroke="#ffffff"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Net Worth"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <div className="networth-mini-chart-container">
          <ResponsiveContainer width="100%" height={50}>
            <AreaChart
              data={fullData}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#fff" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#fff"
                strokeWidth={1.5}
                fill="url(#miniGrad)"
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>

          <div
            className="networth-overlay-mask networth-overlay-left"
            style={{ width: (customRange?.start || 0) + "%" }}
          />
          <div
            className="networth-overlay-mask networth-overlay-right"
            style={{ width: 100 - (customRange?.end || 100) + "%" }}
          />

          <div className="networth-range-track">
            <div
              className="networth-range-active"
              style={{
                left: (customRange?.start || 0) + "%",
                width:
                  (customRange?.end || 100) - (customRange?.start || 0) + "%",
              }}
            />
          </div>

          <div
            className="networth-range-handle"
            style={{ left: (customRange?.start || 0) + "%" }}
            onMouseDown={(e) => {
              e.preventDefault();
              const parentRect =
                e.currentTarget.parentElement.getBoundingClientRect();

              const handleMove = (moveEvent) => {
                const x = moveEvent.clientX - parentRect.left;
                const percent = Math.max(
                  0,
                  Math.min(100, (x / parentRect.width) * 100)
                );
                const end = customRange?.end || 100;
                if (percent < end - 2) {
                  handleRangeChange(percent, end);
                }
              };

              const handleUp = () => {
                document.removeEventListener("mousemove", handleMove);
                document.removeEventListener("mouseup", handleUp);
              };

              document.addEventListener("mousemove", handleMove);
              document.addEventListener("mouseup", handleUp);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              const parentRect =
                e.currentTarget.parentElement.getBoundingClientRect();

              const handleMove = (moveEvent) => {
                const touch = moveEvent.touches[0];
                const x = touch.clientX - parentRect.left;
                const percent = Math.max(
                  0,
                  Math.min(100, (x / parentRect.width) * 100)
                );
                const end = customRange?.end || 100;
                if (percent < end - 2) {
                  handleRangeChange(percent, end);
                }
              };

              const handleEnd = () => {
                document.removeEventListener("touchmove", handleMove);
                document.removeEventListener("touchend", handleEnd);
              };

              document.addEventListener("touchmove", handleMove);
              document.addEventListener("touchend", handleEnd);
            }}
          >
            {fullData[
              Math.floor(
                ((customRange?.start || 0) / 100) * (fullData.length - 1)
              )
            ]?.displayMonth || "Start"}
          </div>

          <div
            className="networth-range-handle"
            style={{ left: (customRange?.end || 100) + "%" }}
            onMouseDown={(e) => {
              e.preventDefault();
              const parentRect =
                e.currentTarget.parentElement.getBoundingClientRect();

              const handleMove = (moveEvent) => {
                const x = moveEvent.clientX - parentRect.left;
                const percent = Math.max(
                  0,
                  Math.min(100, (x / parentRect.width) * 100)
                );
                const start = customRange?.start || 0;
                if (percent > start + 2) {
                  handleRangeChange(start, percent);
                }
              };

              const handleUp = () => {
                document.removeEventListener("mousemove", handleMove);
                document.removeEventListener("mouseup", handleUp);
              };

              document.addEventListener("mousemove", handleMove);
              document.addEventListener("mouseup", handleUp);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              const parentRect =
                e.currentTarget.parentElement.getBoundingClientRect();

              const handleMove = (moveEvent) => {
                const touch = moveEvent.touches[0];
                const x = touch.clientX - parentRect.left;
                const percent = Math.max(
                  0,
                  Math.min(100, (x / parentRect.width) * 100)
                );
                const start = customRange?.start || 0;
                if (percent > start + 2) {
                  handleRangeChange(start, percent);
                }
              };

              const handleEnd = () => {
                document.removeEventListener("touchmove", handleMove);
                document.removeEventListener("touchend", handleEnd);
              };

              document.addEventListener("touchmove", handleMove);
              document.addEventListener("touchend", handleEnd);
            }}
          >
            {fullData[
              Math.floor(
                ((customRange?.end || 100) / 100) * (fullData.length - 1)
              )
            ]?.displayMonth || "End"}
          </div>
        </div>

        <div className="networth-timeframe-tabs">
          {availableTimeframes.map((tab) => (
            <button
              key={tab.label}
              onClick={() => resetToTimeframe(tab.label)}
              className={`networth-timeframe-tab ${
                selectedTimeframe === tab.label ? "active" : ""
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
