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
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { parseNumber } from "./utils/parseNumber";
import "./SavingsPieStyles.css";

dayjs.extend(customParseFormat);

// Extended color palette matching PensionPotPie
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

// Fixed color mapping for account types to match SavingsAccountsTable badges
const ACCOUNT_TYPE_COLORS = {
  "Current Account": "#3b82f6", // Blue (COLOR_PALETTE[1])
  "Savings": "#10b981", // Emerald green (COLOR_PALETTE[0])
  "Savings Account": "#10b981", // Emerald green (COLOR_PALETTE[0])
  "ISA": "#8b5cf6", // Purple (COLOR_PALETTE[2])
  "LISA": "#ec4899", // Pink (COLOR_PALETTE[8])
  "Premium Bonds": "#f59e0b", // Amber (COLOR_PALETTE[3])
  "Investment Account": "#ef4444", // Red (COLOR_PALETTE[4])
  "Other": "#06b6d4", // Cyan (COLOR_PALETTE[5])
};

// Function to create consistent color mapping for types and accounts
const createColorMapping = (items) => {
  const mapping = {};

  items.forEach((item) => {
    // Use fixed color if defined, otherwise fall back to palette-based assignment
    if (ACCOUNT_TYPE_COLORS[item]) {
      mapping[item] = ACCOUNT_TYPE_COLORS[item];
    } else {
      // Fallback for any undefined types - use hash-based color from palette
      const sortedItems = [...items].sort();
      const index = sortedItems.indexOf(item);
      mapping[item] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    }
  });

  return mapping;
};

// Calculate current balance for an account (matching SavingsAccountsTable logic exactly)
const calculateCurrentBalance = (account) => {
  const { rawData, mapping, dateFormat } = account;

  if (!rawData || rawData.length === 0) return 0;

  // Filter and sort by date ascending (oldest first) - EXACTLY matching SavingsAccountsTable
  const sorted = rawData
    .filter((row) => {
      if (!row || !mapping || !mapping.date) return false;
      const dateValue = row[mapping.date];
      if (!dateValue) return false;
      const parsed = dayjs(dateValue, dateFormat, true);
      return parsed.isValid();
    })
    .sort((a, b) => {
      const dateA = dayjs(a[mapping.date], dateFormat, true);
      const dateB = dayjs(b[mapping.date], dateFormat, true);
      return dateA.diff(dateB); // Ascending order
    });

  if (sorted.length === 0) return 0;

  const endRow = sorted[sorted.length - 1]; // Most recent transaction
  let currentValue = 0;

  if (mapping.balance) {
    // Use balance column if available
    currentValue = parseNumber(endRow[mapping.balance]);
  } else if (mapping.amount) {
    // Calculate running balance from amounts if no balance column
    let runningBalance = 0;
    sorted.forEach((row) => {
      const amount = parseNumber(row[mapping.amount]);
      runningBalance += amount;
    });
    currentValue = runningBalance;
  }

  return currentValue;
};

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    return (
      <div className="savings-pie-tooltip no-animation">
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

export default function SavingsPie({ uploads, selectedAccounts }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Filter uploads to only selected accounts
  const filteredUploads = useMemo(() => {
    if (!uploads) {
      console.log('[SavingsPie] No uploads provided');
      return [];
    }

    console.log('[SavingsPie] Total uploads:', uploads.length);
    console.log('[SavingsPie] Selected accounts:', selectedAccounts);

    const filtered = uploads.filter((upload) => {
      const isSelected = selectedAccounts.includes(upload.accountName);
      console.log(`[SavingsPie] ${upload.accountName} - Selected: ${isSelected}`);
      return isSelected;
    });

    console.log('[SavingsPie] Filtered uploads count:', filtered.length);
    return filtered;
  }, [uploads, selectedAccounts]);

  // Group data by Type for initial view
  const typeData = useMemo(() => {
    if (!filteredUploads || filteredUploads.length === 0) return [];

    const typeMap = {};

    filteredUploads.forEach((upload) => {
      const type = upload.accountType || "Other";
      const balance = calculateCurrentBalance(upload);

      console.log(`[SavingsPie] Account: ${upload.accountName}, Type: ${type}, Balance: ${balance}`);

      if (balance > 0) {
        if (!typeMap[type]) {
          typeMap[type] = {
            name: type,
            value: 0,
            accounts: [],
          };
        }
        typeMap[type].value += balance;
        typeMap[type].accounts.push({
          name: `${upload.bank || "Unknown"} - ${upload.accountName}`,
          value: balance,
          bank: upload.bank,
          accountName: upload.accountName,
        });
      }
    });

    console.log('[SavingsPie] Type totals:', Object.entries(typeMap).map(([type, data]) => `${type}: £${data.value.toFixed(2)}`).join(', '));

    return Object.values(typeMap);
  }, [filteredUploads]);

  // Data to display (either types or accounts within selected type)
  const displayData = useMemo(() => {
    if (selectedType) {
      // Show accounts within selected type
      const typeEntry = typeData.find((t) => t.name === selectedType);
      return typeEntry ? typeEntry.accounts : [];
    }
    // Show types
    return typeData.map((t) => ({ name: t.name, value: t.value }));
  }, [selectedType, typeData]);

  // Create color mappings
  const typeColorMapping = useMemo(() => {
    const types = typeData.map((t) => t.name);
    return createColorMapping(types);
  }, [typeData]);

  const accountColorMapping = useMemo(() => {
    if (!selectedType) return {};

    const typeEntry = typeData.find((t) => t.name === selectedType);
    if (!typeEntry) return {};

    const accountNames = typeEntry.accounts.map((a) => a.name);
    return createColorMapping(accountNames);
  }, [selectedType, typeData]);

  // Current color mapping based on view
  const currentColorMapping = selectedType ? accountColorMapping : typeColorMapping;

  // Generate colors array
  const pieColors = useMemo(() => {
    return displayData.map((item) => {
      return currentColorMapping[item.name] || COLOR_PALETTE[0];
    });
  }, [displayData, currentColorMapping]);

  const total = displayData.reduce((sum, d) => sum + d.value, 0);

  // Handle pie click for drill-down
  const handlePieClick = (data, index) => {
    if (!selectedType && !isTransitioning) {
      // Clicking on a type - drill down to accounts
      setIsTransitioning(true);
      setActiveIndex(null);
      setSelectedType(data.name);

      // Re-enable hover after animation completes (800ms animation duration)
      setTimeout(() => {
        setIsTransitioning(false);
      }, 850);
    }
  };

  // Handle back to types view
  const handleBackToTypes = () => {
    setIsTransitioning(true);
    setActiveIndex(null);
    setSelectedType(null);

    // Re-enable hover after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, 850);
  };

  if (!displayData.length || total === 0) {
    return (
      <div className="savings-pie-wrapper">
        <div className="chart-header">
          <h3 className="chart-heading">Current Value</h3>
        </div>
        <p className="no-data">No savings data available</p>
      </div>
    );
  }

  return (
    <div className="savings-pie-wrapper">
      <div className="chart-header">
        <h3 className="chart-heading">
          {selectedType ? `${selectedType} Accounts` : "Current Value"}: £
          {total.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </h3>
        {selectedType && (
          <button className="back-to-types-btn" onClick={handleBackToTypes}>
            ← Back to Types
          </button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={displayData}
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
            onMouseEnter={(_, index) => !isTransitioning && setActiveIndex(index)}
            onMouseLeave={() => !isTransitioning && setActiveIndex(null)}
            onClick={handlePieClick}
            label={false}
            labelLine={false}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-in-out"
            style={{
              cursor: selectedType ? "default" : "pointer",
              pointerEvents: isTransitioning ? "none" : "auto"
            }}
          >
            {displayData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={pieColors[index]}
                style={{ cursor: selectedType ? "default" : "pointer" }}
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
      {!selectedType && (
        <div className="drill-down-hint">
          <p className="hint-text">💡 Click a segment to see accounts within that type</p>
        </div>
      )}
    </div>
  );
}
