import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finwise",
  description: "Persoonlijke financiële planning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        style={{
          margin: 0,
          background: "#f5f7fa",
          color: "#111827",
        }}
      >
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
          }}
        >
          <Navigation />

          <main
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}