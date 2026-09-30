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

export default function CategoryForm() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("EXPENSE");
  const [standardAmount, setStandardAmount] =
    useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Vul een naam in.");
      return;
    }

    const amount =
      standardAmount.trim() === ""
        ? null
        : Number(
            standardAmount
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
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            type,
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

      setName("");
      setType("EXPENSE");
      setStandardAmount("");
      setOpen(false);

      router.refresh();
    } catch {
      setError(
        "Er kon geen verbinding met de server worden gemaakt."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError("");
        }}
        style={{
          padding: "12px 18px",
          border: 0,
          borderRadius: 8,
          background: "#111827",
          color: "white",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        + Categorie toevoegen
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: 16,
        border: "1px solid #d1d5db",
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
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            autoFocus
            placeholder="Bijvoorbeeld Boodschappen"
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
            value={type}
            onChange={(event) =>
              setType(event.target.value)
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
                  key={categoryType.value}
                  value={categoryType.value}
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
            value={standardAmount}
            onChange={(event) =>
              setStandardAmount(
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
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 14,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setOpen(false);
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
          type="submit"
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
    </form>
  );
}