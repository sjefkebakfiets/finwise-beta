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

const START_AGE = 36;

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
      ? (settings.monthlyExpenses * 12) /
        (settings.withdrawalRate / 100)
      : 0;

  const progress =
    fireTarget > 0
      ? Math.min((currentInvestments / fireTarget) * 100, 100)
      : 0;

  const remaining = Math.max(fireTarget - currentInvestments, 0);

  // Bereken het verwachte aantal maanden tot FIRE.
  // Het FIRE-doel groeit mee met de inflatie.
  function calculateMonthsToFire(): number | null {
    if (
      settings.monthlyExpenses <= 0 ||
      settings.withdrawalRate <= 0 ||
      settings.monthlyContribution < 0 ||
      settings.annualReturn <= -100 ||
      settings.inflation <= -100
    ) {
      return null;
    }

    let portfolio = currentInvestments;
    let months = 0;

    const monthlyReturn =
      Math.pow(1 + settings.annualReturn / 100, 1 / 12) - 1;

    const monthlyInflation =
      Math.pow(1 + settings.inflation / 100, 1 / 12) - 1;

    while (months <= 1200) {
      const years = months / 12;

      const futureAnnualExpenses =
        settings.monthlyExpenses *
        12 *
        Math.pow(1 + monthlyInflation, months);

      const futureFireTarget =
        futureAnnualExpenses / (settings.withdrawalRate / 100);

      if (portfolio >= futureFireTarget) {
        return months;
      }

      portfolio =
        portfolio * (1 + monthlyReturn) +
        settings.monthlyContribution;

      months++;
    }

    return null;
  }

  const monthsToFire = calculateMonthsToFire();

  const yearsToFire =
    monthsToFire !== null ? Math.ceil(monthsToFire / 12) : null;

  const fireAge =
    yearsToFire !== null ? START_AGE + yearsToFire : null;

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
                gridTemplateColumns: