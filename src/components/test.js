import React, { useState } from "react";
import Select, { components } from "react-select";
import industriesGrouped from "./industriesGrouped.json";

export default function IndustryDropdown({ value, onChange }) {
  const [customIndustry, setCustomIndustry] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Convert grouped JSON → react-select format
  const groupedOptions = industriesGrouped.map((group) => ({
    label: group.label,
    options: group.options.map((opt) => ({ label: opt, value: opt })),
  }));

  // Custom Option Renderer — if “Other” is selected, show inline input
  const CustomOption = (props) => {
    const { data, innerProps } = props;
    if (data.value === "Other / Not Listed" && isCustomMode) {
      return (
        <div
          style={{
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "#f9f9f9",
          }}
        >
          <input
            autoFocus
            type="text"
            placeholder="Enter your industry..."
            value={customIndustry}
            onChange={(e) => setCustomIndustry(e.target.value)}
            onBlur={() => {
              if (customIndustry.trim()) {
                onChange(customIndustry.trim());
                setIsCustomMode(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (customIndustry.trim()) {
                  onChange(customIndustry.trim());
                  setIsCustomMode(false);
                }
              }
            }}
            style={{
              width: "100%",
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "6px 8px",
              fontSize: "14px",
            }}
          />
        </div>
      );
    }
    return <components.Option {...props} />;
  };

  const handleSelectChange = (selectedOption) => {
    if (selectedOption.value === "Other / Not Listed") {
      setIsCustomMode(true);
      setCustomIndustry("");
      onChange(""); // clear temporary value
    } else {
      setIsCustomMode(false);
      onChange(selectedOption.value);
    }
  };

  return (
    <Select
      options={groupedOptions}
      value={value ? { label: value, value } : null}
      onChange={handleSelectChange}
      placeholder="Select your industry..."
      isSearchable
      components={{ Option: CustomOption }}
      menuPlacement="auto"
    />
  );
}
