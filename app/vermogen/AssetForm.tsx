"use client";

import { FormEvent, useState } from "react";

export default function AssetForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("BANK");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type,
          value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er ging iets mis.");
        return;
      }

      setName("");
      setType("BANK");
      setValue("");
      setOpen(false);

      window.location.reload();
    } catch {
      setError("Er kon geen verbinding met de server worden gemaakt.");
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
        + Bezitting toevoegen
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
        Bezitting toevoegen
      </h3>

      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 16 }}>
          Naam
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bijvoorbeeld: Betaalrekening"
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: "block", marginBottom: 16 }}>
          Type
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
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

        <label style={{ display: "block", marginBottom: 20 }}>
          Huidige waarde
          <input
            type="number"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="0,00"
            min="0"
            step="0.01"
            required
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

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "11px 18px",
              border: 0,
              borderRadius: 8,
              background: "#111827",
              color: "white",
              cursor: loading ? "default" : "pointer",
              fontWeight: 600,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Opslaan..." : "Opslaan"}
          </button>

          <button
            type="button"
            onClick={() => setOpen(false)}
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