import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { simulateGrowth } from "./utils";
import "./PensionReturnsChartStyles.css";

export default function PensionReturnsChart({
  currentPot,
  currentMonthly,
  futureMonthly,
  employerMonthly,
  returnRates,
  selectedReturnKey,
  setReturnRates,
  setSelectedReturnKey,
  yearsToSave,
  employerMatchEnabled,
}) {
  // Simulate growth for selected plan
  const chartData = simulateGrowth(
    currentPot,
    yearsToSave,
    currentMonthly + (employerMatchEnabled ? employerMonthly : 0),
    returnRates[selectedReturnKey]
  );
  const futureData = simulateGrowth(
    currentPot,
    yearsToSave,
    futureMonthly + (employerMatchEnabled ? employerMonthly : 0),
    returnRates[selectedReturnKey]
  );

  // High returns data for fixed Y-axis scaling
  const futureHighData = simulateGrowth(
    currentPot,
    yearsToSave,
    futureMonthly + (employerMatchEnabled ? employerMonthly : 0),
    returnRates.High
  );
  const maxYValue = Math.max(...futureHighData.map((d) => d.balance));

  // Round to nearest 10k and calculate 5 evenly spaced ticks
  const roundedMax = Math.ceil(maxYValue / 10000) * 10000;
  const yAxisTicks = Array.from({ length: 5 }, (_, i) =>
    Math.round((roundedMax * i) / 4)
  );

  // X-axis tick optimization
  const totalYears = chartData.length;
  const tickInterval = Math.ceil(totalYears / 10);
  const xAxisTicks = chartData
    .filter((_, i) => i % tickInterval === 0)
    .map((d) => d.year);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const current = payload.find((p) => p.name === "Current Plan");
    const future = payload.find((p) => p.name === "Future Plan");

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
        <div style={{ marginBottom: 6, color: "#ccc" }}>Year: {label}</div>
        {current && (
          <div style={{ color: "#6366f1", marginBottom: 4 }}>
            <strong>Current Plan:</strong> £{current.value.toLocaleString()}
          </div>
        )}
        {future && (
          <div style={{ color: "#10b981" }}>
            <strong>Future Plan:</strong> £{future.value.toLocaleString()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <h3 className="chart-heading">Estimated Returns</h3>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          margin={{ top: 10, right: 0, left: -15, bottom: 0 }}
          data={chartData}
        >
          <defs>
            <linearGradient id="gradCurrent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="gradFuture" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            ticks={xAxisTicks}
            tick={{ fill: "#d1d5db", fontSize: 12 }}
            axisLine={{ stroke: "#333" }}
            tickLine={false}
            minTickGap={10}
          />
          <YAxis
            domain={[0, roundedMax]}
            ticks={yAxisTicks}
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
          <Legend wrapperStyle={{ color: "#d1d5db", fontSize: "12px" }} />

          <Area
            type="monotone"
            dataKey="balance"
            stroke="#6366f1"
            fill="url(#gradCurrent)"
            fillOpacity={0.6}
            strokeWidth={2}
            name="Current Plan"
          />
          <Area
            type="monotone"
            dataKey="balance"
            data={futureData}
            stroke="#10b981"
            fill="url(#gradFuture)"
            fillOpacity={0.6}
            strokeWidth={2}
            name="Future Plan"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="return-tabs-container">
        {["Low", "Medium", "High"].map((key) => {
          const [tempValue, setTempValue] = React.useState(
            (returnRates[key] * 100).toFixed(2)
          );

          const handleCommit = () => {
            const value = parseFloat(tempValue) / 100;
            if (isNaN(value)) return;

            const updated = { ...returnRates, [key]: value };
            if (updated.Low < updated.Medium && updated.Medium < updated.High) {
              setReturnRates(updated);
            } else {
              alert("Ensure Low < Medium < High");
              setTempValue((returnRates[key] * 100).toFixed(2));
            }
          };

          return (
            <div
              key={key}
              className={`return-tab ${
                selectedReturnKey === key ? "active" : ""
              }`}
              onClick={() => setSelectedReturnKey(key)}
            >
              <div className="return-tab-content">
                <div className="return-tab-label">{key}</div>
                <div className="return-tab-input-row">
                  <input
                    type="number"
                    value={tempValue}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() => setSelectedReturnKey(key)}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={handleCommit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.target.blur();
                      }
                    }}
                    step="0.01"
                    min="0"
                  />
                  <span className="percent-label"></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
