"use client";

import React from "react";

type Props = {
  currentYear: number;
  selectedYear: number;
};

export default function YearSelector({
  currentYear,
  selectedYear,
}: Props) {
  function handleChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const year = event.target.value;

    window.location.href = `/budget?year=${year}`;
  }

  return (
    <select
      name="year"
      value={selectedYear}
      onChange={handleChange}
      style={{
        padding: "10px 14px",
        border: "1px solid #d1d5db",
        borderRadius: 8,
        background: "white",
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      <option value={currentYear}>
        {currentYear}
      </option>

      <option value={currentYear + 1}>
        {currentYear + 1}
      </option>

      <option value={currentYear + 2}>
        {currentYear + 2}
      </option>
    </select>
  );
}