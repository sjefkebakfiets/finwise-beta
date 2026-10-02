
"use client";

import { useEffect, useState } from "react";

type Debt = {
  id: string;
  name: string;
  currentBalance: string;
  interestRate: string;
  monthlyPayment: string | null;
};

type Mortgage = {
  id: string;
  name: string;
  debt: Debt;
  loanParts: unknown[];
  balanceHistory: unknown[];
  extraPayments: unknown[];
};

export default function HypotheekPage() {
  const [mortgage, setMortgage] = useState<Mortgage | null>(null);
  const [availableDebts, setAvailableDebts] = useState<Debt[]>([]);
  const [selectedDebtId, setSelectedDebtId] = useState("");
  const [name, setName] = useState("Mijn hypotheek");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadMortgage() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/mortgage");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Hypotheekgegevens ophalen mislukt.");
      }

      setMortgage(data.mortgage);
      setAvailableDebts(data.availableDebts || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Er ging iets mis."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMortgage();
  }, []);

  async function createMortgage() {
    if (!selectedDebtId) {
      setError("Selecteer eerst een hypotheekschuld.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/mortgage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          debtId: selectedDebtId,
          name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Hypotheek koppelen mislukt.");
      }

      await loadMortgage();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Er ging iets mis."
      );
    } finally {
      setSaving(false);
    }
  }

  const formatCurrency = (value: string | number) =>
    new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(Number(value));

  return (
    <main style={{ padding: 32, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ fontSize: 36, margin: 0, color: "#12345b" }}>
        Hypotheek
      </h1>

      <p style={{ marginTop: 8, color: "#6b7280", fontSize: 16 }}>
        Beheer je hypotheek, leningdelen, aflossingen en toekomstige
        hypotheekontwikkeling.
      </p>

      {error && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            borderRadius: 10,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ marginTop: 32 }}>Hypotheekgegevens laden...</p>
      ) : mortgage ? (
        <section
          style={{
            marginTop: 32,
            padding: 24,
            background: "#ffffff",
            border: "1px solid #e3e7ed",
            borderRadius: 14,
          }}
        >
          <h2 style={{ marginTop: 0 }}>{mortgage.name}</h2>

          <p style={{ color: "#6b7280" }}>
            Gekoppelde hypotheekschuld
          </p>

          <h3 style={{ fontSize: 32, margin: "8px 0" }}>
            {formatCurrency(mortgage.debt.currentBalance)}
          </h3>

          <p>
            {mortgage.debt.name} · Rente{" "}
            {Number(mortgage.debt.interestRate).toLocaleString("nl-NL", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            %
          </p>

          <p style={{ color: "#6b7280" }}>
            Deze hypotheek is gekoppeld aan je bestaande schuld in Vermogen.
            De schuld wordt niet dubbel meegeteld.
          </p>

          <hr style={{ border: 0, borderTop: "1px solid #e3e7ed" }} />

          <h3>Volgende uitbreiding</h3>
          <p style={{ color: "#6b7280", marginBottom: 0 }}>
            Hier voegen we straks de afzonderlijke leningdelen,
            aflossingen, rente en hypotheekprognose aan toe.
          </p>
        </section>
      ) : (
        <section
          style={{
            marginTop: 32,
            padding: 24,
            background: "#ffffff",
            border: "1px solid #e3e7ed",
            borderRadius: 14,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Hypotheek koppelen</h2>

          <p style={{ color: "#6b7280" }}>
            Selecteer een bestaande hypotheekschuld uit Vermogen.
            Er wordt geen tweede schuld aangemaakt.
          </p>

          {availableDebts.length === 0 ? (
            <p>Geen beschikbare hypotheekschulden gevonden.</p>
          ) : (
            <>
              <label
                htmlFor="mortgageName"
                style={{ display: "block", marginTop: 20, fontWeight: 600 }}
              >
                Naam hypotheek
              </label>

              <input
                id="mortgageName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  maxWidth: 500,
                  padding: 12,
                  marginTop: 8,
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: 16,
                }}
              />

              <label
                htmlFor="mortgageDebt"
                style={{ display: "block", marginTop: 20, fontWeight: 600 }}
              >
                Bestaande hypotheekschuld
              </label>

              <select
                id="mortgageDebt"
                value={selectedDebtId}
                onChange={(event) => setSelectedDebtId(event.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  maxWidth: 600,
                  padding: 12,
                  marginTop: 8,
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: 16,
                  background: "#ffffff",
                }}
              >
                <option value="">Selecteer een hypotheekschuld</option>

                {availableDebts.map((debt) => (
                  <option key={debt.id} value={debt.id}>
                    {debt.name} — {formatCurrency(debt.currentBalance)} —{" "}
                    {Number(debt.interestRate).toLocaleString("nl-NL")}%
                  </option>
                ))}
              </select>

              <button
                onClick={createMortgage}
                disabled={saving || !selectedDebtId}
                style={{
                  marginTop: 24,
                  padding: "12px 20px",
                  background:
                    saving || !selectedDebtId ? "#9ca3af" : "#12345b",
                  color: "#ffffff",
                  border: 0,
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor:
                    saving || !selectedDebtId ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Bezig met koppelen..." : "Hypotheek koppelen"}
              </button>
            </>
          )}
        </section>
      )}
    </main>
  );
}
