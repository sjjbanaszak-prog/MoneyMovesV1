import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function TakeHomeComparisonChart({
  viewBy,
  currentNetPay,
  futureNetPay,
  currentPension,
  futurePension,
  currentNI,
  futureNI,
  currentIncomeTax,
  futureIncomeTax,
}) {
  const data = [
    {
      name: "Current",
      "Net Pay": currentNetPay,
      Pension: currentPension,
      NI: currentNI,
      "Income Tax": currentIncomeTax,
      total:
        currentNetPay + currentPension + currentNI + currentIncomeTax,
    },
    {
      name: "Future",
      "Net Pay": futureNetPay,
      Pension: futurePension,
      NI: futureNI,
      "Income Tax": futureIncomeTax,
      total:
        futureNetPay + futurePension + futureNI + futureIncomeTax,
    },
  ];

  return (
    <>
      <h3
        style={{
          color: "#f9fafb",
          marginTop: "2rem",
          marginBottom: "0.75rem",
          fontSize: "1.125rem",
        }}
      >
        Income Tax Breakdown Comparison ({viewBy})
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 10, right: 30, left: 5, bottom: 10 }}
        >
          <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
          <XAxis
            type="number"
            stroke="#9ca3af"
            tickFormatter={(v) => `£${v.toFixed(0)}`}
            tick={{ fill: "#f3f4f6", fontSize: 14 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#9ca3af"
            tick={{ fill: "#f3f4f6", fontSize: 14, fontWeight: 600 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e1e1e",
              border: "1px solid #333",
              borderRadius: 8,
              color: "#fff",
              fontSize: 14,
            }}
            formatter={(value, name, props) => {
              const total = props.payload.total || 1;
              const percent = ((value / total) * 100).toFixed(1);
              return [`£${value.toFixed(2)} (${percent}%)`, name];
            }}
          />
          {/* Stack A: Net Pay + Pension */}
          <Bar
            dataKey="Net Pay"
            stackId="a"
            fill="#10b981"
            fillOpacity={0.5}
          />
          <Bar
            dataKey="Pension"
            stackId="a"
            fill="#3b82f6"
            fillOpacity={0.5}
          />
          {/* Stack B: NI + Income Tax */}
          <Bar
            dataKey="NI"
            stackId="b"
            fill="#f97316"
            fillOpacity={0.5}
          />
          <Bar
            dataKey="Income Tax"
            stackId="b"
            fill="#ef4444"
            fillOpacity={0.5}
          />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
