import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const PortfolioValueChart = ({ data = [] }) => {
  console.log("PortfolioValueChart data:", data);

  if (!Array.isArray(data)) return <p>Data prop is not an array</p>;
  if (data.length === 0) return <p>Data array is empty</p>;

  // Check if objects have correct keys and types
  const invalidItem = data.find(
    (item) =>
      !item.date ||
      typeof item.date !== "string" ||
      item.totalValue === undefined ||
      typeof item.totalValue !== "number"
  );

  if (invalidItem)
    return (
      <p>
        Invalid data item detected. Each item must have a string "date" and
        numeric "totalValue".
      </p>
    );

  return (
    <div className="bg-white p-4 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">Portfolio Value Over Time</h2>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `£${v}`} />
          <Tooltip formatter={(v) => `£${v.toFixed(2)}`} />
          <Area
            type="monotone"
            dataKey="totalValue"
            stroke="#4f46e5"
            fillOpacity={1}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PortfolioValueChart;
