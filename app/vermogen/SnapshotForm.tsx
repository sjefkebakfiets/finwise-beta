"use client";

import { FormEvent, useState } from "react";

export default function SnapshotForm() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/snapshots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er ging iets mis.");
        return;
      }

      setOpen(false);
      setNote("");

      window.location.reload();
    } catch {
      setError(
        "Er kon geen verbinding met de server worden gemaakt."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
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
        + Snapshot maken
      </button>
    );
  }

  return (
    <div
      style={{
        marginTop: 20,
        padding: 20,
        border: "1px solid #e3e7ed",
        borderRadius: 12,
        background: "#f9fafb",
      }}
    >
      <h3 style={{ marginTop: 0 }}>
        Vermogenssnapshot maken
      </h3>

      <p
        style={{
          color: "#6b7280",
          fontSize: 14,
          marginTop: 0,
        }}
      >
        Er wordt een momentopname gemaakt van al je huidige
        bezittingen en schulden.
      </p>

      <form onSubmit={handleSubmit}>
        <label
          style={{
            display: "block",
            marginBottom: 16,
          }}
        >
          Datum
          <input
            type="date"
            value={date}
            onChange={(event) =>
              setDate(event.target.value)
            }
            required
            style={inputStyle}
          />
        </label>

        <label
          style={{
            display: "block",
            marginBottom: 20,
          }}
        >
          Notitie
          <input
            type="text"
            value={note}
            onChange={(event) =>
              setNote(event.target.value)
            }
            placeholder="Bijvoorbeeld: Maandafsluiting september"
            style={inputStyle}
          />
        </label>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
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
            type="submit"
            disabled={loading}
            style={{
              padding: "11px 18px",
              border: 0,
              borderRadius: 8,
              background: "#111827",
              color: "white",
              cursor: loading
                ? "default"
                : "pointer",
              fontWeight: 600,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading
              ? "Opslaan..."
              : "Snapshot opslaan"}
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError("");
            }}
            disabled={loading}
            style={{
              padding: "11px 18px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              background: "white",
              cursor: "pointer",
            }}
          >
            Annuleren
          </button>
        </div>
      </form>
    </div>
  );
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