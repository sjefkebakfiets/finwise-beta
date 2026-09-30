
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type Snapshot = {
  date: string;
  assets: number;
  debts: number;
  netWorth: number;
};

export default function NetWorthChart({
  snapshots,
}: {
  snapshots: Snapshot[];
}) {
  if (snapshots.length < 2) {
    return (
      <div
        style={{
          minHeight: 280,
          display: "grid",
          placeItems: "center",
          border: "1px dashed #d1d5db",
          borderRadius: 10,
          color: "#9ca3af",
          textAlign: "center",
          padding: 20,
        }}
      >
        Maak minimaal twee snapshots om je
        vermogensontwikkeling te kunnen zien.
      </div>
    );
  }

  const formatEuro = (value: number) =>
    new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);

  const data = [...snapshots]
    .sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    )
    .map((snapshot) => ({
      date: new Intl.DateTimeFormat("nl-NL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(snapshot.date)),

      assets: snapshot.assets,

      // Schulden worden in de grafiek negatief weergegeven.
      debts: -snapshot.debts,

      netWorth: snapshot.netWorth,
    }));

  const labelMap: Record<string, string> = {
    assets: "Bezittingen",
    debts: "Schulden",
    netWorth: "Netto vermogen",
  };

  return (
    <div
      style={{
        width: "100%",
        height: 380,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 25,
            left: 15,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <ReferenceLine
            y={0}
            stroke="#6b7280"
            strokeWidth={1.5}
          />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            minTickGap={20}
          />

          <YAxis
            tickFormatter={(value) =>
              new Intl.NumberFormat("nl-NL", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(value)
            }
            width={65}
          />

          <Tooltip
            labelStyle={{
              fontWeight: 600,
              marginBottom: 8,
            }}
            formatter={(value, name) => [
              formatEuro(Number(value)),
              labelMap[String(name)] ?? String(name),
            ]}
          />

          <Legend
            formatter={(value) =>
              labelMap[String(value)] ?? String(value)
            }
          />

          {/* Bezittingen: blauw */}
          <Line
            type="monotone"
            dataKey="assets"
            name="assets"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />

          {/* Schulden: rood en negatief */}
          <Line
            type="monotone"
            dataKey="debts"
            name="debts"
            stroke="#dc2626"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />

          {/* Netto vermogen: groen */}
          <Line
            type="monotone"
            dataKey="netWorth"
            name="netWorth"
            stroke="#16a34a"
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
