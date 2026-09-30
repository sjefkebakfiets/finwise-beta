"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = {
  date: string;
  assets: number;
  debts: number;
  netWorth: number;
};

export default function NetWorthDashboardChart({
  data,
}: {
  data: ChartPoint[];
}) {
  if (data.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          border: "1px dashed #d1d5db",
          borderRadius: 10,
          color: "#6b7280",
          textAlign: "center",
        }}
      >
        Er zijn nog geen vermogenssnapshots beschikbaar
        voor de grafiek.
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: 360,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 20,
            left: 10,
            bottom: 10,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
          />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
          />

          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) =>
              formatCompactEuro(value)
            }
          />

          <Tooltip
            formatter={(value, name) => [
              formatEuro(Number(value)),
              getSeriesLabel(String(name)),
            ]}
          />

          <Legend
            formatter={(value) =>
              getSeriesLabel(String(value))
            }
          />

          {/* Extra dikke nullijn */}
          <ReferenceLine
            y={0}
            stroke="#4b5563"
            strokeWidth={3}
            ifOverflow="extendDomain"
          />

          {/* Bezittingen: blauw */}
          <Line
            type="monotone"
            dataKey="assets"
            name="assets"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />

          {/* Schulden: rood */}
          <Line
            type="monotone"
            dataKey="debts"
            name="debts"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />

          {/* Netto vermogen: groen */}
          <Line
            type="monotone"
            dataKey="netWorth"
            name="netWorth"
            stroke="#22c55e"
            strokeWidth={3}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function getSeriesLabel(value: string) {
  switch (value) {
    case "assets":
      return "Bezittingen";

    case "debts":
      return "Schulden";

    case "netWorth":
      return "Netto vermogen";

    default:
      return value;
  }
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactEuro(value: number) {
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(1)}M`;
  }

  if (absolute >= 1_000) {
    return `€${(value / 1_000).toFixed(0)}k`;
  }

  return `€${Math.round(value)}`;
}