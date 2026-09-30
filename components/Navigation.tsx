"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "Budget", href: "/budget" },
  { name: "Vermogen", href: "/vermogen" },
  { name: "FIRE", href: "/fire" },
  { name: "Planning", href: "/planning" },
  { name: "Doelen", href: "/doelen" },
  { name: "Rapportages", href: "/rapportages" },
];

export default function Navigation() {
  return (
    <aside
      style={{
        width: 240,
        minHeight: "100vh",
        background: "#111827",
        color: "white",
        padding: 24,
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 40,
        }}
      >
        Finwise
      </div>

      <nav>
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "block",
              padding: "12px 14px",
              marginBottom: 6,
              borderRadius: 8,
              color: "white",
              textDecoration: "none",
              opacity: 0.9,
            }}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      <div
        style={{
          marginTop: 40,
          paddingTop: 20,
          borderTop: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <Link
          href="/instellingen"
          style={{
            display: "block",
            padding: "12px 14px",
            color: "white",
            textDecoration: "none",
          }}
        >
          Instellingen
        </Link>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%",
            marginTop: 8,
            padding: "12px 14px",
            border: 0,
            borderRadius: 8,
            background: "rgba(255,255,255,0.1)",
            color: "white",
            textAlign: "left",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Uitloggen
        </button>
      </div>
    </aside>
  );
}