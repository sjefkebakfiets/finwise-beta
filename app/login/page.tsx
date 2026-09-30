"use client";

import { FormEvent, Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const registered = searchParams.get("registered") === "1";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        setError("E-mailadres of wachtwoord is onjuist.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Er ging iets mis bij het inloggen.");
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

          <h1 style={{ margin: "8px 0" }}>
            Inloggen
          </h1>

          {registered ? (
            <p style={{ color: "#166534" }}>
              Je account is aangemaakt. Je kunt nu inloggen.
            </p>
          ) : (
            <p style={{ opacity: 0.7 }}>
              Log in op je Finwise-account.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
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
              autoComplete="current-password"
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
            {loading ? "Inloggen..." : "Inloggen"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Inloggen laden...</div>}>
      <LoginForm />
    </Suspense>
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