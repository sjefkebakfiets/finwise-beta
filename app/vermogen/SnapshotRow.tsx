
"use client";

import { useState } from "react";

type SnapshotRowProps = {
  id: string;
  date: Date | string;
  note: string | null;
  assets: number;
  debts: number;
  netWorth: number;
  change: number | null;
  changePercentage: number | null;
  isLatest: boolean;
};

export default function SnapshotRow({
  id,
  date,
  note,
  assets,
  debts,
  netWorth,
  change,
  changePercentage,
  isLatest,
}: SnapshotRowProps) {
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState(
    new Date(date).toISOString().split("T")[0]
  );
  const [editNote, setEditNote] = useState(note ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const changePositive = change !== null && change >= 0;

  function formatEuro(value: number) {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function formatDate(value: Date | string) {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  }

  function formatPercentage(value: number) {
    return (
      new Intl.NumberFormat("nl-NL", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value) + "%"
    );
  }

  async function handleSave() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/snapshots", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          date: editDate,
          note: editNote,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Bewerken mislukt.");
        return;
      }

      window.location.reload();
    } catch {
      setError("Er kon geen verbinding met de server worden gemaakt.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Weet je zeker dat je deze snapshot wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
    );

    if (!confirmed) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/snapshots", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Verwijderen mislukt.");
        return;
      }

      window.location.reload();
    } catch {
      setError("Er kon geen verbinding met de server worden gemaakt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: 18,
        border: "1px solid #e5e7eb",
        borderRadius: 10,
      }}
    >
      {editing ? (
        <div>
          <h3 style={{ marginTop: 0 }}>
            Snapshot bewerken
          </h3>

          <label style={labelStyle}>
            Datum
            <input
              type="date"
              value={editDate}
              onChange={(event) => setEditDate(event.target.value)}
              required
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Notitie
            <input
              type="text"
              value={editNote}
              onChange={(event) => setEditNote(event.target.value)}
              placeholder="Notitie"
              style={inputStyle}
            />
          </label>

          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              style={primaryButton}
            >
              {loading ? "Opslaan..." : "Opslaan"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
              disabled={loading}
              style={secondaryButton}
            >
              Annuleren
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 20,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontWeight: 600,
                  fontSize: 16,
                }}
              >
                {formatDate(date)}

                {isLatest && (
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: "#e5e7eb",
                      color: "#374151",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    Laatste
                  </span>
                )}
              </div>

              {note && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  {note}
                </div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 20 }}>
                {formatEuro(netWorth)}
              </div>

              {change !== null && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    fontWeight: 600,
                    color: changePositive ? "#166534" : "#b91c1c",
                  }}
                >
                  {changePositive ? "+" : ""}
                  {formatEuro(change)}
                  {changePercentage !== null &&
                    ` (${changePositive ? "+" : ""}${formatPercentage(
                      changePercentage
                    )})`}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <SnapshotValue label="Bezittingen" value={assets} />
            <SnapshotValue label="Schulden" value={debts} />
            <SnapshotValue
              label="Netto vermogen"
              value={netWorth}
              highlight
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 16,
              paddingTop: 14,
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setEditDate(new Date(date).toISOString().split("T")[0]);
                setEditNote(note ?? "");
                setError("");
                setEditing(true);
              }}
              style={secondaryButton}
            >
              Bewerken
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              style={deleteButton}
            >
              Verwijderen
            </button>
          </div>

          {error && (
            <div style={{ ...errorStyle, marginTop: 12 }}>
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SnapshotValue({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 16,
          fontWeight: highlight ? 700 : 600,
        }}
      >
        {new Intl.NumberFormat("nl-NL", {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)}
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 16,
  fontWeight: 500,
};

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  marginTop: 6,
  padding: "11px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "white",
  fontSize: 15,
};

const primaryButton = {
  padding: "10px 16px",
  border: 0,
  borderRadius: 8,
  background: "#111827",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};

const secondaryButton = {
  padding: "10px 16px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "white",
  cursor: "pointer",
};

const deleteButton = {
  padding: "10px 16px",
  border: "1px solid #fecaca",
  borderRadius: 8,
  background: "#fef2f2",
  color: "#b91c1c",
  cursor: "pointer",
  fontWeight: 600,
};

const errorStyle = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 8,
  background: "#fee2e2",
  color: "#991b1b",
};
