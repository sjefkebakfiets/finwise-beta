
"use client";

import { FormEvent, useState } from "react";

export default function DebtForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("MORTGAGE");
  const [currentBalance, setCurrentBalance] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type,
          currentBalance,
          interestRate: interestRate || null,
          monthlyPayment: monthlyPayment || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er ging iets mis.");
        return;
      }

      setName("");
      setType("MORTGAGE");
      setCurrentBalance("");
      setInterestRate("");
      setMonthlyPayment("");
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
        + Schuld toevoegen
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
        Schuld toevoegen
      </h3>

      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 16 }}>
          Naam
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bijvoorbeeld: Hypotheek"
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
            <option value="MORTGAGE">Hypotheek</option>
            <option value="PERSONAL_LOAN">Persoonlijke lening</option>
            <option value="STUDENT_LOAN">Studieschuld</option>
            <option value="OTHER">Overige schuld</option>
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 16 }}>
          Openstaand bedrag
          <input
            type="number"
            value={currentBalance}
            onChange={(event) => setCurrentBalance(event.target.value)}
            placeholder="0,00"
            min="0"
            step="0.01"
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: "block", marginBottom: 16 }}>
          Rentepercentage (%)
          <input
            type="number"
            value={interestRate}
            onChange={(event) => setInterestRate(event.target.value)}
            placeholder="Bijvoorbeeld: 4,31"
            min="0"
            step="0.01"
            style={inputStyle}
          />
        </label>

        <label style={{ display: "block", marginBottom: 20 }}>
          Maandelijkse betaling
          <input
            type="number"
            value={monthlyPayment}
            onChange={(event) => setMonthlyPayment(event.target.value)}
            placeholder="0,00"
            min="0"
            step="0.01"
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
