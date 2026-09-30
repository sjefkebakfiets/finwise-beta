
"use client";

import { useEffect, useState } from "react";

type FireSettings = {
  monthlyExpenses: number;
  annualReturn: number;
  inflation: number;
  withdrawalRate: number;
  monthlyContribution: number;
};

type Props = {
  currentInvestments: number;
};

const defaults: FireSettings = {
  monthlyExpenses: 2500,
  annualReturn: 7,
  inflation: 2,
  withdrawalRate: 4,
  monthlyContribution: 800,
};

export default function FireSettingsForm({
  currentInvestments,
}: Props) {
  const [settings, setSettings] = useState<FireSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/fire-settings");

        if (!response.ok) {
          throw new Error("Instellingen konden niet worden geladen.");
        }

        const data = await response.json();

        setSettings({
          monthlyExpenses: Number(data.monthlyExpenses),
          annualReturn: Number(data.annualReturn),
          inflation: Number(data.inflation),
          withdrawalRate: Number(data.withdrawalRate),
          monthlyContribution: Number(data.monthlyContribution),
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Er is iets misgegaan."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  function updateField(field: keyof FireSettings, value: string) {
    setSettings((previous) => ({
      ...previous,
      [field]: value === "" ? 0 : Number(value),
    }));

    setMessage("");
    setError("");
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/fire-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Instellingen opslaan mislukt.");
      }

      setMessage("Instellingen succesvol opgeslagen.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Er is iets misgegaan."
      );
    } finally {
      setSaving(false);
    }
  }

  const formatEuro = (value: number) =>
    new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);

  const fireTarget =
    settings.withdrawalRate > 0
      ? (settings.monthlyExpenses * 12) / (settings.withdrawalRate / 100)
      : 0;

  const progress =
    fireTarget > 0
      ? Math.min((currentInvestments / fireTarget) * 100, 100)
      : 0;

  const remaining = Math.max(fireTarget - currentInvestments, 0);

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "24px",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "15px",
    boxSizing: "border-box" as const,
    background: "#ffffff",
    color: "#111827",
  };

  const labelStyle = {
    display: "block",
    fontWeight: 600,
    marginBottom: "8px",
    fontSize: "14px",
  };

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div style={cardStyle}>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            FIRE-doelbedrag
          </p>
          <div style={{ fontSize: "30px", fontWeight: 700, marginTop: "12px" }}>
            {loading ? "Laden..." : formatEuro(fireTarget)}
          </div>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Op basis van je uitgaven en opnamepercentage.
          </p>
        </div>

        <div style={cardStyle}>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            FIRE-voortgang
          </p>
          <div
            style={{
              fontSize: "30px",
              fontWeight: 700,
              color: "#16a34a",
              marginTop: "12px",
            }}
          >
            {loading ? "Laden..." : `${progress.toFixed(1)}%`}
          </div>
          <div
            style={{
              height: "10px",
              background: "#e5e7eb",
              borderRadius: "10px",
              overflow: "hidden",
              marginTop: "14px",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "#16a34a",
                borderRadius: "10px",
              }}
            />
          </div>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            {loading ? " " : `${formatEuro(remaining)} resterend`}
          </p>
        </div>

        <div style={cardStyle}>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Jaarlijkse uitgaven
          </p>
          <div style={{ fontSize: "30px", fontWeight: 700, marginTop: "12px" }}>
            {loading ? "Laden..." : formatEuro(settings.monthlyExpenses * 12)}
          </div>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Gewenste uitgaven na FIRE.
          </p>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 600, marginTop: 0 }}>
          FIRE-instellingen
        </h2>
        <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
          Pas hieronder je financiële aannames aan. Je instellingen worden
          per gebruiker opgeslagen.
        </p>

        {loading ? (
          <p>Instellingen laden...</p>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                gap: "20px",
                marginTop: "24px",
              }}
            >
              <div>
                <label style={labelStyle}>
                  Gewenste maandelijkse uitgaven (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={settings.monthlyExpenses}
                  onChange={(e) => updateField("monthlyExpenses", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Verwacht rendement per jaar (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.annualReturn}
                  onChange={(e) => updateField("annualReturn", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Inflatie per jaar (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={settings.inflation}
                  onChange={(e) => updateField("inflation", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Opnamepercentage (%)</label>
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={settings.withdrawalRate}
                  onChange={(e) => updateField("withdrawalRate", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Maandelijkse inleg (€)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={settings.monthlyContribution}
                  onChange={(e) =>
                    updateField("monthlyContribution", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "8px",
                padding: "16px",
                marginTop: "24px",
                lineHeight: 1.7,
              }}
            >
              <strong>Berekening FIRE-doel</strong>
              <p style={{ margin: "8px 0 0" }}>
                Jaarlijkse uitgaven ÷ opnamepercentage
              </p>
              <strong style={{ color: "#2563eb", fontSize: "20px" }}>
                {formatEuro(fireTarget)}
              </strong>
            </div>

            {message && (
              <p style={{ color: "#16a34a", marginTop: "16px" }}>
                {message}
              </p>
            )}

            {error && (
              <p style={{ color: "#dc2626", marginTop: "16px" }}>
                {error}
              </p>
            )}

            <button
              onClick={saveSettings}
              disabled={saving}
              style={{
                marginTop: "24px",
                padding: "12px 22px",
                background: saving ? "#9ca3af" : "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Opslaan..." : "Instellingen opslaan"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
