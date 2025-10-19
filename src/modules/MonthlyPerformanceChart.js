import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const MonthlyPerformanceChart = ({ transactions }) => {
  const data = useMemo(() => {
    // Placeholder until time series is added to buildPortfolio
    const dailyValues = [];

    if (!Array.isArray(dailyValues)) return [];

    const monthlyMap = {};

    for (const { date, totalValue } of dailyValues) {
      const monthKey = date.slice(0, 7); // YYYY-MM
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = [];
      }
      monthlyMap[monthKey].push(totalValue);
    }

    return Object.entries(monthlyMap).map(([month, values]) => {
      const start = values[0];
      const end = values[values.length - 1];
      const change = end - start;
      return {
        month,
        change: Number(change.toFixed(2)),
      };
    });
  }, [transactions]);

  if (data.length === 0) return <p>No monthly performance data available.</p>;

  return (
    <div className="bg-white p-4 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">Monthly Performance</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(v) => `£${v}`} />
          <Tooltip formatter={(v) => `£${v.toFixed(2)}`} />
          <Bar dataKey="change" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyPerformanceChart;
