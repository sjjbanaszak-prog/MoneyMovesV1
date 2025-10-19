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
    const monthlyTotals = {};

    uploads.forEach((upload) => {
      const { rawData, mapping, dateFormat, accountName } = upload;
      if (!selectedAccounts.includes(accountName)) return;

      rawData.forEach((row) => {
        const rawDate = row[mapping.date];
        const parsed = dayjs(rawDate, dateFormat, true);
        if (!parsed.isValid()) return;

        const month = parsed.format("YYYY-MM");
        const balance = parseNumber(row[mapping.balance]);

        if (!monthlyTotals[month]) {
          monthlyTotals[month] = {};
        }

        monthlyTotals[month][accountName] = balance;
      });
    });

    const data = Object.entries(monthlyTotals)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([month, accountBalances], idx, arr) => {
        const currentTotal = Object.values(accountBalances).reduce(
          (sum, b) => sum + b,
          0
        );
        const previousTotal =
          idx > 0
            ? Object.values(arr[idx - 1][1]).reduce((sum, b) => sum + b, 0)
            : 0;
        return {
          month,
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
      <h3 className="chart-heading">Balance Changes</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          key={chartKey}
          data={chartData}
          margin={{ top: 25, right: 30, left: -30, bottom: -10 }}
        >
          <CartesianGrid vertical={false} stroke="#1f2937" />
          <XAxis
            dataKey="month"
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
