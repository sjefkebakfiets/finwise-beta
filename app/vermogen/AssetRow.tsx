"use client";

import { useState } from "react";

type AssetRowProps = {
  id: string;
  name: string;
  type: string;
  value: number;
};

export default function AssetRow({
  id,
  name,
  type,
  value,
}: AssetRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editType, setEditType] = useState(type);
  const [editValue, setEditValue] = useState(String(value));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/assets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          name: editName,
          type: editType,
          value: editValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er ging iets mis.");
        return;
      }

      setEditing(false);
      window.location.reload();
    } catch {
      setError("Er kon geen verbinding met de server worden gemaakt.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Weet je zeker dat je "${name}" wilt verwijderen?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/assets", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er ging iets mis.");
        return;
      }

      window.location.reload();
    } catch {
      setError("Er kon geen verbinding met de server worden gemaakt.");
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <div
        style={{
          padding: 18,
          border: "1px solid #d1d5db",
          borderRadius: 10,
          background: "#f9fafb",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          <label>
            Naam
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              style={inputStyle}
            />
          </label>

          <label>
            Type
            <select
              value={editType}
              onChange={(event) => setEditType(event.target.value)}
              style={inputStyle}
            >
              <option value="BANK">Bankrekening</option>
              <option value="SAVINGS">Spaarrekening</option>
              <option value="INVESTMENT">Beleggingen</option>
              <option value="CRYPTO">Crypto</option>
              <option value="PROPERTY">Woning</option>
              <option value="VEHICLE">Auto / voertuig</option>
              <option value="OTHER">Overig</option>
            </select>
          </label>

          <label>
            Waarde
            <input
              type="number"
              min="0"
              step="0.01"
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              style={inputStyle}
            />
          </label>

          {error && (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                background: "#fee2e2",
                color: "#991b1b",
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              style={{
                padding: "10px 16px",
                border: 0,
                borderRadius: 8,
                background: "#111827",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
              }}
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
              style={{
                padding: "10px 16px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                background: "white",
                cursor: "pointer",
              }}
            >
              Annuleren
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: "16px 18px",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
      }}
    >
      <div>
        <div
          style={{
            fontWeight: 600,
          }}
        >
          {name}
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          {assetTypeLabel(type)}
        </div>

        {error && (
          <div
            style={{
              marginTop: 8,
              color: "#991b1b",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 17,
          }}
        >
          {formatEuro(value)}
        </div>

        <button
          type="button"
          onClick={() => {
            setEditName(name);
            setEditType(type);
            setEditValue(String(value));
            setEditing(true);
          }}
          disabled={loading}
          style={{
            padding: "10px 16px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            background: "white",
            cursor: "pointer",
          }}
        >
          Bewerken
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          style={{
            padding: "10px 16px",
            border: "1px solid #fecaca",
            borderRadius: 8,
            background: "white",
            color: "#b91c1c",
            cursor: "pointer",
          }}
        >
          {loading ? "..." : "Verwijderen"}
        </button>
      </div>
    </div>
  );
}

function assetTypeLabel(type: string) {
  const labels: Record<string, string> = {
    BANK: "Bankrekening",
    SAVINGS: "Spaarrekening",
    INVESTMENT: "Beleggingen",
    CRYPTO: "Crypto",
    PROPERTY: "Woning",
    VEHICLE: "Auto / voertuig",
    OTHER: "Overig",
  };

  return labels[type] ?? type;
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

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