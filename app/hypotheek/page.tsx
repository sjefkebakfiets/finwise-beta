export default function HypotheekPage() {
  return (
    <main
      style={{
        padding: 32,
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontSize: 36,
          margin: 0,
          color: "#12345b",
        }}
      >
        Hypotheek
      </h1>

      <p
        style={{
          marginTop: 8,
          color: "#6b7280",
          fontSize: 16,
        }}
      >
        Beheer je hypotheek, leningdelen, aflossingen en toekomstige
        hypotheekontwikkeling.
      </p>

      <section
        style={{
          marginTop: 32,
          padding: 24,
          background: "#ffffff",
          border: "1px solid #e3e7ed",
          borderRadius: 14,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Hypotheekoverzicht</h2>

        <p style={{ color: "#6b7280", marginBottom: 0 }}>
          De hypotheekmodule wordt hier opgebouwd.
        </p>
      </section>
    </main>
  );
}