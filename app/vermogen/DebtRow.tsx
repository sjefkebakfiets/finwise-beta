
"use client";

import { useState } from "react";

type DebtRowProps = {
  id: string;
  name: string;
  type: string;
  value: number;
  interestRate: number | null;
  monthlyPayment: number | null;
};

export default function DebtRow({
  id,
  name,
  type,
  value,
  interestRate,
  monthlyPayment,
}: DebtRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editType, setEditType] = useState(type);
  const [editValue, setEditValue] = useState(String(value));
  const [editInterestRate, setEditInterestRate] = useState(
    interestRate == null ? "" : String(interestRate)
  );
  const [editMonthlyPayment, setEditMonthlyPayment] = useState(
    monthlyPayment == null ? "" : String(monthlyPayment)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/debts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          name: editName,
          type: editType,
          currentBalance: editValue,
          interestRate: editInterestRate,
          monthlyPayment: editMonthlyPayment,
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

    if (!confirmed) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/debts", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
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
      <div style={cardStyle}>
        <div style={{ display: "grid", gap: 14 }}>
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
              <option value="MORTGAGE">Hypotheek</option>
              <option value="PERSONAL_LOAN">Persoonlijke lening</option>
              <option value="STUDENT_LOAN">Studieschuld</option>
              <option value="OTHER">Overig</option>
            </select>
          </label>

          <label>
            Openstaand bedrag
            <input
              type="number"
              min="0"
              step="0.01"
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              style={inputStyle}
            />
          </label>

          <label>
            Rente (%)
            <input
              type="number"
              min="0"
              step="0.01"
              value={editInterestRate}
              onChange={(event) =>
                setEditInterestRate(event.target.value)
              }
              style={inputStyle}
            />
          </label>

          <label>
            Maandelijkse betaling (€)
            <input
              type="number"
              min="0"
              step="0.01"
              value={editMonthlyPayment}
              onChange={(event) =>
                setEditMonthlyPayment(event.target.value)
              }
              style={inputStyle}
            />
          </label>

          {error && <div style={errorStyle}>{error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              style={primaryButtonStyle}
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
              style={secondaryButtonStyle}
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
        ...cardStyle,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontWeight: 600 }}>{name}</div>

        <div style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>
          {debtTypeLabel(type)}
          {interestRate != null && ` · ${interestRate}% rente`}
          {monthlyPayment != null &&
            ` · ${formatEuro(monthlyPayment)} p/m`}
        </div>

        {error && <div style={errorStyle}>{error}</div>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>
          {formatEuro(value)}
        </div>

        <button
          type="button"
          onClick={() => {
            setEditName(name);
            setEditType(type);
            setEditValue(String(value));
            setEditInterestRate(
              interestRate == null ? "" : String(interestRate)
            );
            setEditMonthlyPayment(
              monthlyPayment == null ? "" : String(monthlyPayment)
            );
            setEditing(true);
          }}
          disabled={loading}
          style={secondaryButtonStyle}
        >
          Bewerken
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          style={{
            ...secondaryButtonStyle,
            borderColor: "#fecaca",
            color: "#b91c1c",
          }}
        >
          {loading ? "..." : "Verwijderen"}
        </button>
      </div>
    </div>
  );
}

function debtTypeLabel(type: string) {
  const labels: Record<string, string> = {
    MORTGAGE: "Hypotheek",
    PERSONAL_LOAN: "Persoonlijke lening",
    STUDENT_LOAN: "Studieschuld",
    OTHER: "Overige schuld",
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

const cardStyle = {
  padding: 18,
  border: "1px solid #d1d5db",
  borderRadius: 10,
  background: "#ffffff",
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

const primaryButtonStyle = {
  padding: "10px 16px",
  border: 0,
  borderRadius: 8,
  background: "#111827",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};

const secondaryButtonStyle = {
  padding: "10px 16px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "white",
  cursor: "pointer",
};

const errorStyle = {
  padding: 10,
  borderRadius: 8,
  background: "#fee2e2",
  color: "#991b1b",
};
