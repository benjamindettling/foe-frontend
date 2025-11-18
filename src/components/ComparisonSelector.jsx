// src/components/ComparisonSelector.jsx
import React from "react";

const ComparisonSelector = ({ options, value, onChange }) => {
  return (
    <>
      <label htmlFor="comparison-select">Compare to:</label>
      <select
        id="comparison-select"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
      >
        <option value="">No comparison</option>
        {options.map((days) => (
          <option key={days} value={days}>
            {days} day{days === 1 ? "" : "s"} ago
          </option>
        ))}
      </select>
    </>
  );
};

export default ComparisonSelector;
