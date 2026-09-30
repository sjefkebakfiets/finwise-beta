"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== passwordConfirmation) {
      setError("De wachtwoorden komen niet overeen.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Registreren is mislukt.");
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setError("Er kon geen verbinding met de server worden gemaakt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f5f7fa"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "white",
          padding: 32,
          borderRadius: 16,
          border: "1px solid #e3e7ed"
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              opacity: 0.55
            }}
          >
            Finwise
          </div>

          <h1 style={{ margin: "8px 0" }}>Account aanmaken</h1>

          <p style={{ opacity: 0.7, marginBottom: 0 }}>
            Maak je eerste Finwise-account aan.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Naam
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={inputStyle}
              autoComplete="name"
            />
          </label>

          <label>
            E-mailadres
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={inputStyle}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Wachtwoord
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={inputStyle}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label>
            Wachtwoord bevestigen
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(event) =>
                setPasswordConfirmation(event.target.value)
              }
              style={inputStyle}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 8,
                background: "#fee2e2",
                color: "#991b1b"
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={buttonStyle}
          >
            {loading ? "Account aanmaken..." : "Account aanmaken"}
          </button>
        </form>
      </div>
    </main>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  marginTop: 6,
  marginBottom: 18,
  padding: "12px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 16
};

const buttonStyle = {
  width: "100%",
  padding: "13px 16px",
  border: 0,
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer"
};