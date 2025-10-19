import React from "react";
import "./TimeframeTabs.css";

const options = [
  { label: "All", value: "all" },
  { label: "5Y", value: "5y" },
  { label: "1Y", value: "1y" },
  { label: "6M", value: "6m" },
  { label: "1M", value: "1m" },
];

export default function TimeframeTabs({ value, onChange }) {
  return (
    <div className="timeframe-tabs-container">
      {options.map((option) => (
        <button
          key={option.value}
          className={`timeframe-tab ${value === option.value ? "active" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
