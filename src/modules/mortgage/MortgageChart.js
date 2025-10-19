import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { formatCurrency, formatTick } from "../utils/mortgageUtils";
import "./MortgageChartStyles.css";

const MortgageChart = ({
  amortizationNoOverpay,
  amortizationWithOverpay,
  oneOffOverpayment,
  oneOffOverpaymentType,
  oneOffOverpaymentAmount,
  oneOffMonthIndex,
}) => {
  if (!amortizationNoOverpay?.length || !amortizationWithOverpay?.length) {
    return null;
  }

  const maxMonths = Math.max(
    amortizationNoOverpay.length,
    amortizationWithOverpay.length
  );

  const mergedChartData = Array.from({ length: maxMonths }, (_, i) => ({
    month: i + 1,
    balanceNoOverpay: amortizationNoOverpay[i]?.balance ?? null,
    balanceWithOverpay: amortizationWithOverpay[i]?.balance ?? null,
  }));

  return (
    <div className="mortgage-chart-wrapper">
      <div className="mortgage-chart-header">
        <h3 className="mortgage-chart-title">Balance</h3>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          margin={{ top: 10, right: 0, left: -15, bottom: 0 }}
          data={mergedChartData}
        >
          <defs>
            <linearGradient id="noOverpay" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="withOverpay" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            ticks={Array.from(
              { length: Math.ceil(maxMonths / 12) },
              (_, i) => (i + 1) * 12
            )}
            tickFormatter={(month) => `${month / 12}`}
            tick={{ fill: "#d1d5db", fontSize: 12 }}
            axisLine={{ stroke: "#333" }}
            tickLine={false}
          />

          <YAxis
            tickFormatter={formatTick}
            tick={{ fill: "#d1d5db", fontSize: 12 }}
            axisLine={{ stroke: "#333" }}
            tickLine={false}
            stroke="#9ca3af"
          />

          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;

              const isOverpaymentMonth =
                oneOffOverpayment && label === oneOffMonthIndex;

              let overpaymentValue = 0;
              if (isOverpaymentMonth) {
                const balanceAtThatMonth =
                  amortizationWithOverpay?.[oneOffMonthIndex - 1]?.balance || 0;

                overpaymentValue =
                  oneOffOverpaymentType === "%"
                    ? (oneOffOverpaymentAmount / 100) * balanceAtThatMonth
                    : oneOffOverpaymentAmount;
              }

              return (
                <div
                  style={{
                    backgroundColor: "#1e1e1e",
                    border: "1px solid #333",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#fff",
                    fontSize: 12,
                    minWidth: 150,
                  }}
                >
                  <p style={{ marginBottom: 6, color: "#ccc" }}>
                    Month: {label}
                  </p>
                  {payload.map((entry, i) => (
                    <p key={i} style={{ color: entry.color, margin: "4px 0" }}>
                      <strong>{entry.name}:</strong>{" "}
                      {formatCurrency(entry.value)}
                    </p>
                  ))}
                  {isOverpaymentMonth && (
                    <p style={{ color: "#f87171", marginTop: 6 }}>
                      <strong>One-off Overpayment</strong>:{" "}
                      {formatCurrency(overpaymentValue)}
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ color: "#d1d5db", fontSize: "12px" }} />

          {oneOffOverpayment && (
            <ReferenceLine
              x={oneOffMonthIndex}
              stroke="#f87171"
              strokeDasharray="3 3"
            />
          )}

          <Area
            type="monotone"
            dataKey="balanceWithOverpay"
            stroke="#10b981"
            fillOpacity={0.6}
            strokeWidth={2}
            fill="url(#withOverpay)"
            name="With Overpayments"
          />
          <Area
            type="monotone"
            dataKey="balanceNoOverpay"
            stroke="#6366f1"
            fillOpacity={0.6}
            strokeWidth={2}
            fill="url(#noOverpay)"
            name="No Overpayments"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MortgageChart;
