import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { parseNumber } from "./utils/parseNumber";
import "./SavingsChart.css";
import TimeframeTabs from "./TimeframeTabs";

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

const TIMEFRAMES = [
  { label: "1M", days: 30 },
  { label: "6M", days: 182 },
  { label: "1Y", days: 365 },
  { label: "5Y", days: 1825 },
  { label: "All", days: Infinity },
];

export default function SavingsChart({ uploads, selectedAccounts = [] }) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("All");

  const activeAccounts =
    selectedAccounts.length > 0
      ? selectedAccounts
      : uploads.map((u) => u.accountName);

  const allDates = new Set();
  const accountDailyBalances = {};

  let minDate = null;
  let maxDate = null;

  uploads.forEach((upload) => {
    const { rawData, mapping, dateFormat, accountName } = upload;
    if (!activeAccounts.includes(accountName)) return;

    const dailyBalances = {};

    rawData.forEach((row) => {
      const rawDate = row[mapping.date];
      const parsed = dayjs(rawDate, dateFormat, true);
      if (!parsed.isValid()) return;

      const date = parsed.format("YYYY-MM-DD");

      // FIXED: Only read balance from ONE source to avoid double-counting
      // Priority: mapping.balance > Balance > balance
      let balanceValue = 0;
      if (mapping.balance && row[mapping.balance] !== undefined) {
        balanceValue = parseNumber(row[mapping.balance]);
      } else if (row.Balance !== undefined) {
        balanceValue = parseNumber(row.Balance);
      } else if (row.balance !== undefined) {
        balanceValue = parseNumber(row.balance);
      }

      dailyBalances[date] = balanceValue;
      allDates.add(date);

      if (!minDate || parsed.isBefore(minDate)) minDate = parsed;
      if (!maxDate || parsed.isAfter(maxDate)) maxDate = parsed;
    });

    accountDailyBalances[accountName] = dailyBalances;
  });

  if (!minDate || !maxDate) return null;

  const fullDateRange = [];
  let cursor = minDate.startOf("day");
  while (cursor.isSameOrBefore(maxDate)) {
    fullDateRange.push(cursor.format("YYYY-MM-DD"));
    cursor = cursor.add(1, "day");
  }

  const filledBalancesPerAccount = {};
  activeAccounts.forEach((account) => {
    const raw = accountDailyBalances[account] || {};
    const filled = {};
    let lastKnown = 0;
    fullDateRange.forEach((date) => {
      if (raw[date] !== undefined) {
        lastKnown = raw[date];
      }
      filled[date] = lastKnown;
    });
    filledBalancesPerAccount[account] = filled;
  });

  const fullChartData = fullDateRange.map((date) => {
    const total = activeAccounts.reduce((sum, account) => {
      return sum + (filledBalancesPerAccount[account][date] || 0);
    }, 0);
    return { date, balance: total };
  });

  const filteredChartData = useMemo(() => {
    if (selectedTimeframe === "All") return fullChartData;
    const days = TIMEFRAMES.find((t) => t.label === selectedTimeframe)?.days;
    const startDate = dayjs(maxDate).subtract(days, "day");
    return fullChartData.filter((d) => dayjs(d.date).isAfter(startDate));
  }, [fullChartData, selectedTimeframe]);

  const minVal = Math.min(...filteredChartData.map((d) => d.balance));
  const maxVal = Math.max(...filteredChartData.map((d) => d.balance));
  const range = maxVal - minVal;

  const approxTickCount = 5;
  let step = Math.pow(10, Math.floor(Math.log10(range / approxTickCount)));
  const steps = [1, 2, 5];
  for (let s of steps) {
    if (range / (step * s) <= approxTickCount) {
      step = step * s;
      break;
    }
  }
  const startTick = Math.floor(minVal / step) * step;
  const endTick = Math.ceil(maxVal / step) * step;

  const ticks = [];
  for (let val = startTick; val <= endTick; val += step) {
    ticks.push(val);
  }

  const firstDataPoint = filteredChartData[0];
  const lastDataPoint = filteredChartData[filteredChartData.length - 1];
  const finalBalance = lastDataPoint?.balance || 0;
  const lastDate = lastDataPoint?.date || "";
  const growthChange = firstDataPoint
    ? ((lastDataPoint.balance - firstDataPoint.balance) /
        firstDataPoint.balance) *
      100
    : 0;
  const isPositive = growthChange >= 0;

  const availableDays = dayjs(maxDate).diff(minDate, "day");
  const visibleTabs = TIMEFRAMES.filter(
    (t) => t.days <= availableDays || t.label === "All"
  );

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <h3 className="chart-heading">
          £
          {finalBalance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </h3>
        <div className="chart-meta">
          <p className="last-updated">
            Last Update: {dayjs(lastDate).format("DD/MM/YY")}
          </p>
          <div
            className={`change-indicator ${
              isPositive ? "positive" : "negative"
            }`}
          >
            {isPositive ? "▲" : "▼"} {Math.abs(growthChange).toFixed(2)}%
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={filteredChartData}
          margin={{ top: 10, right: 30, left: -30, bottom: 0 }}
        >
          <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#d1d5db", fontSize: 12 }}
            axisLine={{ stroke: "#333" }}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            tick={{ fill: "#d1d5db", fontSize: 12 }}
            axisLine={{ stroke: "#333" }}
            tickLine={false}
            width={80}
            domain={[startTick, endTick]}
            ticks={ticks}
            tickFormatter={(val) =>
              val >= 1000
                ? `£${(val / 1000).toFixed(0)}k`
                : `£${val.toLocaleString()}`
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e1e1e",
              border: "1px solid #333",
              borderRadius: 8,
              color: "#fff",
            }}
            labelStyle={{ color: "#ccc", fontSize: 12 }}
            itemStyle={{ color: "#0ff" }}
            formatter={(val) => `£${val.toLocaleString()}`}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="#00e5ff"
            strokeWidth={3}
            dot={false}
            activeDot={{
              r: 6,
              strokeWidth: 2,
              stroke: "#00e5ff",
              fill: "#003f4f",
            }}
            name="Total Balance"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="timeframe-tabs">
        {visibleTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setSelectedTimeframe(tab.label)}
            className={`timeframe-tab ${
              selectedTimeframe === tab.label ? "active" : ""
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
