"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const categoryTypes = [
  { value: "INCOME", label: "Inkomsten" },
  { value: "EXPENSE", label: "Uitgaven" },
  { value: "SAVING", label: "Sparen" },
  { value: "INVESTMENT", label: "Investeringen" },
  { value: "DEBT_PAYMENT", label: "Aflossingen" },
];

const typeLabels: Record<string, string> = {
  INCOME: "Inkomsten",
  EXPENSE: "Uitgaven",
  SAVING: "Sparen",
  INVESTMENT: "Investeringen",
  DEBT_PAYMENT: "Aflossingen",
};

export default function CategoryRow({
  id,
  name,
  type,
  active,
  standardAmount,
}: {
  id: string;
  name: string;
  type: string;
  active: boolean;
  standardAmount: number | null;
}) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editType, setEditType] = useState(type);
  const [editAmount, setEditAmount] = useState(
    standardAmount !== null
      ? String(standardAmount)
      : ""
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");

    if (!editName.trim()) {
      setError("Vul een naam in.");
      return;
    }

    const amount =
      editAmount.trim() === ""
        ? null
        : Number(
            editAmount
              .trim()
              .replace(",", ".")
          );

    if (
      amount !== null &&
      (!Number.isFinite(amount) || amount < 0)
    ) {
      setError("Vul een geldig bedrag in.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/categories",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id,
            name: editName.trim(),
            type: editType,
            standardAmount: amount,
          }),
        }
      );

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

  async function handleDelete() {
    const confirmed = window.confirm(
      `Weet je zeker dat je de categorie "${name}" wilt verwijderen?`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(
        "/api/categories",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id,
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

      router.refresh();
    } catch {
      setError(
        "Er kon geen verbinding met de server worden gemaakt."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <div
        style={{
          padding: 16,
          border:
            "1px solid #d1d5db",
          borderRadius: 10,
          background: "#f9fafb",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(180px, 1fr) minmax(150px, 200px) minmax(130px, 160px)",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Naam
            </label>

            <input
              type="text"
              value={editName}
              onChange={(event) =>
                setEditName(
                  event.target.value
                )
              }
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                border:
                  "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Type
            </label>

            <select
              value={editType}
              onChange={(event) =>
                setEditType(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                border:
                  "1px solid #d1d5db",
                borderRadius: 8,
                background: "white",
                fontSize: 14,
              }}
            >
              {categoryTypes.map(
                (categoryType) => (
                  <option
                    key={
                      categoryType.value
                    }
                    value={
                      categoryType.value
                    }
                  >
                    {categoryType.label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Standaard per maand
            </label>

            <input
              type="text"
              inputMode="decimal"
              value={editAmount}
              onChange={(event) =>
                setEditAmount(
                  event.target.value
                )
              }
              placeholder="500"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                border:
                  "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 8,
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent:
              "flex-end",
            gap: 8,
            marginTop: 14,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError("");
            }}
            disabled={saving}
            style={{
              padding: "10px 14px",
              border:
                "1px solid #d1d5db",
              borderRadius: 8,
              background: "white",
              cursor: saving
                ? "default"
                : "pointer",
              fontSize: 13,
            }}
          >
            Annuleren
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 14px",
              border: 0,
              borderRadius: 8,
              background: "#111827",
              color: "white",
              cursor: saving
                ? "default"
                : "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {saving
              ? "Opslaan..."
              : "Opslaan"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "16px 18px",
        border:
          "1px solid #e5e7eb",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                fontWeight: 600,
              }}
            >
              {name}
            </div>

            {!active && (
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "#f3f4f6",
                  color: "#6b7280",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Inactief
              </span>
            )}
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            {typeLabels[type] ??
              type}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {standardAmount !== null
              ? `${formatEuro(
                  standardAmount
                )} per maand`
              : "Geen standaardbedrag ingesteld"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setEditName(name);
              setEditType(type);
              setEditAmount(
                standardAmount !== null
                  ? String(
                      standardAmount
                    )
                  : ""
              );
              setError("");
              setEditing(true);
            }}
            style={{
              padding:
                "8px 12px",
              border:
                "1px solid #d1d5db",
              borderRadius: 8,
              background: "white",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Bewerken
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding:
                "8px 12px",
              border:
                "1px solid #fecaca",
              borderRadius: 8,
              background: "#fffafa",
              color: "#b91c1c",
              cursor: deleting
                ? "default"
                : "pointer",
              fontSize: 13,
            }}
          >
            {deleting
              ? "Verwijderen..."
              : "Verwijderen"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 8,
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 13,
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