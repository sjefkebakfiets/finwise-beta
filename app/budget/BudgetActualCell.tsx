"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  categoryId: string;
  year: number;
  month: number;
  amount: number | null;
  standardAmount: number;
};

export default function BudgetActualCell({
  categoryId,
  year,
  month,
  amount,
  standardAmount,
}: Props) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    amount !== null ? String(amount) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEditing() {
    setValue(amount !== null ? String(amount) : "");
    setError("");
    setEditing(true);
  }

  function cancelEditing() {
    setValue(amount !== null ? String(amount) : "");
    setError("");
    setEditing(false);
  }

  async function save() {
    setError("");

    const normalized = value.trim().replace(",", ".");
    const parsed = Number(normalized);

    if (
      normalized === "" ||
      !Number.isFinite(parsed) ||
      parsed < 0
    ) {
      setError("Vul een geldig bedrag in.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/budget-actuals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          year,
          month,
          amount: parsed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Er ging iets mis bij het opslaan."
        );
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      setError(
        "Er kon geen verbinding met de server worden gemaakt."
      );
    } finally {
      setSaving(false);
    }
  }

  async function adoptStandard() {
    if (!Number.isFinite(standardAmount) || standardAmount < 0) {
      setError("Er is geen geldig standaardbedrag ingesteld.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/budget-actuals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          year,
          month,
          amount: standardAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Er ging iets mis bij het overnemen van het standaardbedrag."
        );
        return;
      }

      setValue(String(standardAmount));
      router.refresh();
    } catch {
      setError(
        "Er kon geen verbinding met de server worden gemaakt."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeActual() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        "/api/budget-actuals",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            categoryId,
            year,
            month,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Er ging iets mis bij het verwijderen."
        );
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      setError(
        "Er kon geen verbinding met de server worden gemaakt."
      );
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div
        style={{
          position: "relative",
          minWidth: 90,
        }}
      >
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) =>
            setValue(event.target.value)
          }
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              save();
            }

            if (event.key === "Escape") {
              cancelEditing();
            }
          }}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "7px 6px",
            border: "1px solid #111827",
            borderRadius: 6,
            fontSize: 13,
            textAlign: "right",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 4,
            justifyContent: "flex-end",
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              padding: "3px 6px",
              border: 0,
              borderRadius: 5,
              background: "#111827",
              color: "white",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            {saving ? "..." : "Opslaan"}
          </button>

          <button
            type="button"
            onClick={cancelEditing}
            disabled={saving}
            style={{
              padding: "3px 6px",
              border: "1px solid #d1d5db",
              borderRadius: 5,
              background: "white",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            Ann.
          </button>
        </div>

        {standardAmount >= 0 && (
          <button
            type="button"
            onClick={adoptStandard}
            disabled={saving}
            style={{
              marginTop: 4,
              border: 0,
              background: "transparent",
              color: "#374151",
              cursor: "pointer",
              fontSize: 10,
            }}
          >
            Standaard overnemen ({formatEuro(standardAmount)})
          </button>
        )}

        {amount !== null && (
          <button
            type="button"
            onClick={removeActual}
            disabled={saving}
            style={{
              marginTop: 2,
              border: 0,
              background: "transparent",
              color: "#b91c1c",
              cursor: "pointer",
              fontSize: 10,
            }}
          >
            Werkelijk verwijderen
          </button>
        )}

        {error && (
          <div
            style={{
              position: "absolute",
              zIndex: 20,
              top: "100%",
              right: 0,
              marginTop: 4,
              padding: 6,
              background: "#fef2f2",
              color: "#b91c1c",
              borderRadius: 5,
              fontSize: 10,
              whiteSpace: "nowrap",
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ textAlign: "right" }}>
      <button
        type="button"
        onClick={startEditing}
        title="Klik om het werkelijke maandbedrag in te voeren"
        style={{
          width: "100%",
          border: 0,
          background: "transparent",
          padding: 0,
          cursor: "pointer",
          textAlign: "right",
          fontSize: 13,
          fontWeight: amount !== null ? 600 : 400,
          color:
            amount !== null
              ? "#111827"
              : "#9ca3af",
        }}
      >
        {amount !== null
          ? formatEuro(amount)
          : "—"}
      </button>

      {amount === null && standardAmount > 0 && (
        <button
          type="button"
          onClick={adoptStandard}
          disabled={saving}
          title="Neem het standaardbedrag over als werkelijk bedrag"
          style={{
            marginTop: 4,
            padding: 0,
            border: 0,
            background: "transparent",
            color: "#6b7280",
            cursor: "pointer",
            fontSize: 10,
            textDecoration: "underline",
          }}
        >
          Standaard overnemen
        </button>
      )}

      {error && (
        <div
          style={{
            marginTop: 4,
            color: "#b91c1c",
            fontSize: 10,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
