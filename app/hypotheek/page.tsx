"use client";

import { useEffect, useState } from "react";

type Debt = {
  id: string;
  name: string;
  currentBalance: string | number;
  interestRate: string | number | null;
  monthlyPayment: string | number | null;
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
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
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
        throw new Error(
          data.error || "Hypotheekgegevens ophalen mislukt."
        );
      }

      const loadedMortgages: Mortgage[] =
        data.mortgages ??
        (data.mortgage ? [data.mortgage] : []);

      setMortgages(loadedMortgages);
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
        throw new Error(
          data.error || "Hypotheek koppelen mislukt."
        );
      }

      setSelectedDebtId("");
      setName("Mijn hypotheek");

      await loadMortgage();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Er ging iets mis."
      );
    } finally {
      setSaving(false);
    }
  }

  const formatCurrency = (value: string | number | null) => {
    const amount = Number(value ?? 0);

    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(Number.isFinite(amount) ? amount : 0);
  };

  const formatPercentage = (value: string | number | null) => {
    if (value === null || value === undefined || value === "") {
      return "Niet ingesteld";
    }

    return `${Number(value).toLocaleString("nl-NL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%`;
  };

  const totalBalance = mortgages.reduce(
    (total, mortgage) =>
      total + Number(mortgage.debt.currentBalance || 0),
    0
  );

  const knownMonthlyPayments = mortgages
    .filter((mortgage) => mortgage.debt.monthlyPayment !== null)
    .reduce(
      (total, mortgage) =>
        total + Number(mortgage.debt.monthlyPayment || 0),
      0
    );

  const hasUnknownMonthlyPayment = mortgages.some(
    (mortgage) => mortgage.debt.monthlyPayment === null
  );

  const selectedDebt = availableDebts.find(
    (debt) => debt.id === selectedDebtId
  );

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 24,
        color: "var(--foreground)",
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 8 }}>
          Hypotheek
        </h1>

        <p style={{ color: "var(--muted-foreground)" }}>
          Beheer je hypotheekdelen en bekijk je totale hypotheekschuld.
        </p>
      </div>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 14,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p>Hypotheekgegevens laden...</p>
      ) : (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div
                style={{
                  color: "var(--muted-foreground)",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                Totale hypotheekschuld
              </div>

              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {formatCurrency(totalBalance)}
              </div>
            </div>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div
                style={{
                  color: "var(--muted-foreground)",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                Aantal hypotheekdelen
              </div>

              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {mortgages.length}
              </div>
            </div>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div
                style={{
                  color: "var(--muted-foreground)",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                Bekende maandlasten
              </div>

              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {formatCurrency(knownMonthlyPayments)}
              </div>

              {hasUnknownMonthlyPayment && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                    marginTop: 6,
                  }}
                >
                  Niet alle maandlasten zijn ingevuld.
                </div>
              )}
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 21,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              Mijn hypotheekdelen
            </h2>

            {mortgages.length === 0 ? (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <p>
                  Er zijn nog geen hypotheekdelen gekoppeld.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {mortgages.map((mortgage) => (
                  <div
                    key={mortgage.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 12,
                        marginBottom: 18,
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            fontSize: 18,
                            fontWeight: 600,
                            marginBottom: 4,
                          }}
                        >
                          {mortgage.debt.name}
                        </h3>

                        <div
                          style={{
                            color: "var(--muted-foreground)",
                            fontSize: 13,
                          }}
                        >
                          {mortgage.name}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                        }}
                      >
                        {formatCurrency(mortgage.debt.currentBalance)}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: 16,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "var(--muted-foreground)",
                            fontSize: 13,
                            marginBottom: 5,
                          }}
                        >
                          Rente
                        </div>

                        <strong>
                          {formatPercentage(mortgage.debt.interestRate)}
                        </strong>
                      </div>

                      <div>
                        <div
                          style={{
                            color: "var(--muted-foreground)",
                            fontSize: 13,
                            marginBottom: 5,
                          }}
                        >
                          Maandlast
                        </div>

                        <strong>
                          {mortgage.debt.monthlyPayment === null
                            ? "Niet ingesteld"
                            : formatCurrency(
                                mortgage.debt.monthlyPayment
                              )}
                        </strong>
                      </div>

                      <div>
                        <div
                          style={{
                            color: "var(--muted-foreground)",
                            fontSize: 13,
                            marginBottom: 5,
                          }}
                        >
                          Extra aflossingen
                        </div>

                        <strong>
                          {mortgage.extraPayments?.length || 0}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {availableDebts.length > 0 && (
            <section
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 22,
              }}
            >
              <h2
                style={{
                  fontSize: 21,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Hypotheekdeel toevoegen
              </h2>

              <p
                style={{
                  color: "var(--muted-foreground)",
                  fontSize: 14,
                  marginBottom: 18,
                }}
              >
                Koppel een bestaande hypotheekschuld. De bestaande
                schuld blijft behouden en wordt niet dubbel geteld.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                  alignItems: "end",
                }}
              >
                <div>
                  <label
                    htmlFor="debt"
                    style={{
                      display: "block",
                      fontSize: 14,
                      marginBottom: 6,
                    }}
                  >
                    Bestaande hypotheekschuld
                  </label>

                  <select
                    id="debt"
                    value={selectedDebtId}
                    onChange={(event) => {
                      const debtId = event.target.value;
                      setSelectedDebtId(debtId);

                      const debt = availableDebts.find(
                        (item) => item.id === debtId
                      );

                      if (debt) {
                        setName(debt.name);
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: 11,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      color: "var(--foreground)",
                    }}
                  >
                    <option value="">Selecteer hypotheekdeel</option>

                    {availableDebts.map((debt) => (
                      <option key={debt.id} value={debt.id}>
                        {debt.name} — {formatCurrency(debt.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="mortgageName"
                    style={{
                      display: "block",
                      fontSize: 14,
                      marginBottom: 6,
                    }}
                  >
                    Weergavenaam
                  </label>

                  <input
                    id="mortgageName"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Bijvoorbeeld Hypotheek Deel 2"
                    style={{
                      width: "100%",
                      padding: 11,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>

                <button
                  onClick={createMortgage}
                  disabled={saving || !selectedDebtId}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 8,
                    border: "none",
                    background: "#2563eb",
                    color: "white",
                    fontWeight: 600,
                    cursor: saving ? "wait" : "pointer",
                    opacity: saving || !selectedDebtId ? 0.6 : 1,
                  }}
                >
                  {saving ? "Koppelen..." : "Hypotheekdeel koppelen"}
                </button>
              </div>

              {selectedDebt && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--muted-foreground)",
                    marginTop: 12,
                  }}
                >
                  Geselecteerd: {selectedDebt.name} —{" "}
                  {formatCurrency(selectedDebt.currentBalance)}
                </p>
              )}
            </section>
          )}

          {availableDebts.length === 0 && mortgages.length > 0 && (
            <p
              style={{
                color: "var(--muted-foreground)",
                fontSize: 14,
              }}
            >
              Alle bestaande hypotheekschulden zijn gekoppeld.
            </p>
          )}
        </>
      )}
    </main>
  );
}