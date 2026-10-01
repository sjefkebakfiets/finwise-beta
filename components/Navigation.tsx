"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

function FinwiseLogo() {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Finwise logo"
      role="img"
    >
      <path
        d="M8 43C8 22 23 10 53 5C50 26 39 39 19 44L8 43Z"
        fill="#22B573"
      />
      <path
        d="M8 48L27 37V58H8V48Z"
        fill="#123C70"
      />
      <path
        d="M31 35L45 27V58H31V35Z"
        fill="#087F9C"
      />
      <path
        d="M49 24L58 19V58H49V24Z"
        fill="#123C70"
      />
      <path
        d="M8 48L53 5"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Navigation() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 240,
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#12345b",
        padding: "28px 14px 20px",
        boxSizing: "border-box",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #e2eaf2",
      }}
    >
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "0 8px",
          marginBottom: 48,
          textDecoration: "none",
          color: "#12345b",
        }}
      >
        <FinwiseLogo />
        <span
          style={{
            fontSize: 27,
            fontWeight: 750,
            letterSpacing: "-1px",
          }}
        >
          Finwise
        </span>
      </Link>

      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {navigation.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "block",
                padding: "13px 14px",
                borderRadius: 9,
                color: active ? "#087f61" : "#234467",
                background: active ? "#e1f4ef" : "transparent",
                textDecoration: "none",
                fontSize: 15,
                fontWeight: active ? 650 : 500,
                transition: "background 0.15s ease",
              }}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <div
        style={{
          padding: "20px 10px 12px",
          borderTop: "1px solid #e2eaf2",
        }}
      >
        <Link
          href="/register"
          style={{
            display: "block",
            padding: "12px 14px",
            marginBottom: 10,
            borderRadius: 9,
            background: "#087f61",
            color: "#ffffff",
            textDecoration: "none",
            textAlign: "center",
            fontSize: 14,
            fontWeight: 650,
            transition: "background 0.15s ease",
          }}
        >
          Registreer
        </Link>

        <Link
          href="/instellingen"
          style={{
            display: "block",
            padding: "12px 14px",
            borderRadius: 9,
            color:
              pathname === "/instellingen"
                ? "#087f61"
                : "#234467",
            background:
              pathname === "/instellingen"
                ? "#e1f4ef"
                : "transparent",
            textDecoration: "none",
            fontSize: 14,
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
            border: "1px solid #e2eaf2",
            borderRadius: 9,
            background: "#ffffff",
            color: "#234467",
            textAlign: "left",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Uitloggen
        </button>
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "28px 8px 8px",
          color: "#58728c",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <FinwiseLogo />
        </div>
        <div style={{ marginTop: 12, fontWeight: 600 }}>
          Betere keuzes
          <br />
          voor een mooie toekomst
        </div>
      </div>
    </aside>
  );
}