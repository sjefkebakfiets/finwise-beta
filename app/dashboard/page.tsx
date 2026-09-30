import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div
      style={{
        padding: 32,
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 36,
            margin: 0,
          }}
        >
          Dashboard
        </h1>

        <p
          style={{
            marginTop: 8,
            color: "#6b7280",
            fontSize: 16,
          }}
        >
          Welkom terug
          {session.user.name ? `, ${session.user.name}` : ""}.
          Hier krijg je straks een compleet overzicht van je financiële
          situatie.
        </p>
      </div>

      {/* Kerncijfers */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <DashboardCard
          title="Netto vermogen"
          value="€ 0"
          description="Huidige waarde"
        />

        <DashboardCard
          title="Deze maand"
          value="€ 0"
          description="Gepland resultaat"
        />

        <DashboardCard
          title="Beschikbaar"
          value="€ 0"
          description="Nog beschikbaar"
        />

        <DashboardCard
          title="Spaargeld & beleggingen"
          value="€ 0"
          description="Opgebouwd vermogen"
        />
      </section>

      {/* Vermogensgrafiek */}
      <section
        style={{
          background: "white",
          border: "1px solid #e3e7ed",
          borderRadius: 14,
          padding: 24,
          marginBottom: 24,
          minHeight: 300,
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          Vermogensontwikkeling
        </h2>

        <div
          style={{
            minHeight: 220,
            display: "grid",
            placeItems: "center",
            color: "#9ca3af",
            border: "1px dashed #d1d5db",
            borderRadius: 10,
          }}
        >
          Grafiek komt hier
        </div>
      </section>

      {/* Onderste widgets */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        <DashboardPanel
          title="Budget"
          description="Je budgetoverzicht komt hier."
        />

        <DashboardPanel
          title="Doelen"
          description="Je financiële doelen komen hier."
        />

        <DashboardPanel
          title="Planning"
          description="Je financiële planning en prognose komen hier."
        />

        <DashboardPanel
          title="Vermogen"
          description="Je bezittingen en schulden komen hier."
        />
      </section>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e3e7ed",
        borderRadius: 14,
        padding: 22,
      }}
    >
      <div
        style={{
          fontSize: 14,
          color: "#6b7280",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          marginTop: 8,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 13,
          color: "#9ca3af",
          marginTop: 6,
        }}
      >
        {description}
      </div>
    </div>
  );
}

function DashboardPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e3e7ed",
        borderRadius: 14,
        padding: 24,
        minHeight: 150,
      }}
    >
      <h2 style={{ marginTop: 0 }}>
        {title}
      </h2>

      <p
        style={{
          color: "#6b7280",
          marginBottom: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}