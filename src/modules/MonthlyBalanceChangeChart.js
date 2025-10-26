import React, { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { parseNumber } from "./utils/parseNumber";
import "./SavingsChart.css";

dayjs.extend(customParseFormat);

export default function MonthlyBalanceChangeChart({
  uploads,
  selectedAccounts,
}) {
  const [chartKey, setChartKey] = useState(0); // key to trigger animation

  const chartData = useMemo(() => {
    const yearlyTotals = {};

    uploads.forEach((upload) => {
      const { rawData, mapping, dateFormat, accountName } = upload;
      if (!selectedAccounts.includes(accountName)) return;

      // Sort transactions by date to ensure we get the last balance of each year
      const sorted = rawData
        .filter((row) => {
          const rawDate = row[mapping.date];
          const parsed = dayjs(rawDate, dateFormat, true);
          return parsed.isValid();
        })
        .sort((a, b) => {
          const dateA = dayjs(a[mapping.date], dateFormat, true);
          const dateB = dayjs(b[mapping.date], dateFormat, true);
          return dateA.diff(dateB);
        });

      // Calculate balance at end of each year
      let runningBalance = 0;
      sorted.forEach((row) => {
        const rawDate = row[mapping.date];
        const parsed = dayjs(rawDate, dateFormat, true);
        if (!parsed.isValid()) return;

        const year = parsed.format("YYYY");

        // Get balance for this transaction
        let balance = 0;
        if (mapping.balance && row[mapping.balance] !== undefined) {
          // Use balance column if available
          balance = parseNumber(row[mapping.balance]);
          runningBalance = balance; // Update running balance
        } else if (mapping.amount) {
          // Calculate running balance from amounts if no balance column
          const amount = parseNumber(row[mapping.amount]);
          runningBalance += amount;
          balance = runningBalance;
        }

        if (!yearlyTotals[year]) {
          yearlyTotals[year] = {};
        }

        // Store the latest balance for this year for this account
        yearlyTotals[year][accountName] = balance;
      });
    });

    const data = Object.entries(yearlyTotals)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([year, accountBalances], idx, arr) => {
        const currentTotal = Object.values(accountBalances).reduce(
          (sum, b) => sum + b,
          0
        );
        const previousTotal =
          idx > 0
            ? Object.values(arr[idx - 1][1]).reduce((sum, b) => sum + b, 0)
            : 0;
        return {
          year,
          change: currentTotal - previousTotal,
        };
      });

    return data;
  }, [uploads, selectedAccounts]);

  // Trigger animation by resetting the chart key when chartData changes
  useEffect(() => {
    setChartKey((prev) => prev + 1);
  }, [chartData]);

  return (
    <div className="chart-wrapper">
      <h3 className="chart-heading">Annual Balance Changes</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          key={chartKey}
          data={chartData}
          margin={{ top: 25, right: 30, left: -30, bottom: -10 }}
        >
          <CartesianGrid vertical={false} stroke="#1f2937" />
          <XAxis
            dataKey="year"
            tick={{ fill: "#d1d5db", fontSize: 13, fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: "#374151" }}
          />
          <YAxis
            tick={{ fill: "#d1d5db", fontSize: 13, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            width={80}
            tickFormatter={(val) => {
              const absVal = Math.abs(val);
              return absVal >= 1000
                ? `£${(val / 1000).toFixed(0)}k`
                : `£${val.toLocaleString()}`;
            }}
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
          <Bar
            dataKey="change"
            name="Change"
            radius={[6, 6, 0, 0]}
            isAnimationActive={true}
            animationDuration={500}
            barSize={36}
          >
            {chartData.map((entry, idx) => (
              <Cell
                key={`cell-${idx}`}
                fill={entry.change >= 0 ? "#10b981" : "#ef4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
