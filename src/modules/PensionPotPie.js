import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Sector,
} from "recharts";
import "./PensionPotPieStyles.css";

// Extended color palette that matches PensionGrowthChart
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

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    return (
      <div className="pie-tooltip no-animation">
        <strong>{name}</strong>: £
        {value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    );
  }
  return null;
}

function renderActiveShape(props) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#1f2937"
        strokeWidth={2}
      />
    </g>
  );
}

export default function PensionPotPie({
  pensionAccounts,
  providerColorMapping,
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  const data = useMemo(() => {
    if (!pensionAccounts) return [];

    return pensionAccounts
      .filter((pot) => pot.currentValue > 0)
      .map((pot, i) => ({
        name: pot.provider || `Provider ${i + 1}`,
        value: pot.currentValue,
        provider: pot.provider,
      }));
  }, [pensionAccounts]);

  // Create color mapping if not provided by parent
  const colorMapping = useMemo(() => {
    if (providerColorMapping) {
      return providerColorMapping;
    }

    // Fallback: create our own mapping if parent doesn't provide one
    const providers = data.map((item) => item.provider).filter(Boolean);
    return createProviderColorMapping(providers);
  }, [providerColorMapping, data]);

  // Generate colors array based on the data and color mapping
  const pieColors = useMemo(() => {
    return data.map((item, index) => {
      if (item.provider && colorMapping[item.provider]) {
        return colorMapping[item.provider];
      }
      // Fallback to original color palette if no mapping found
      return COLOR_PALETTE[index % COLOR_PALETTE.length];
    });
  }, [data, colorMapping]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (!data.length || total === 0) {
    return (
      <div className="pie-wrapper">
        <div className="chart-header">
          <h3 className="chart-heading">Pension Allocation</h3>
        </div>
        <p className="no-data">No pension pots data available</p>
      </div>
    );
  }

  return (
    <div className="pie-wrapper">
      <div className="chart-header">
        <h3 className="chart-heading">
          Current Value: £
          {total.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={90}
            paddingAngle={4}
            stroke="#1f2937"
            strokeWidth={2}
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            label={false}
            labelLine={false}
            isAnimationActive={true}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={pieColors[index]}
              />
            ))}
          </Pie>
          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{ transition: "none" }}
          />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{
              color: "#d1d5db",
              fontSize: "12px",
              paddingTop: "10px",
            }}
            iconType="line"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
