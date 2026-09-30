
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import FireSettingsForm from "@/components/FireSettingsForm";

export default async function FirePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const investments = await prisma.asset.findMany({
    where: {
      userId: session.user.id,
      type: "INVESTMENT",
    },
    orderBy: {
      name: "asc",
    },
  });

  const totalInvestments = investments.reduce(
    (total, asset) => total + Number(asset.currentValue),
    0
  );

  const formatEuro = (value: number) =>
    new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "24px",
  };

  const mutedText = {
    color: "#6b7280",
    fontSize: "14px",
  };

  return (
    <div
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "32px",
        color: "#111827",
      }}
    >
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "30px", fontWeight: 700, margin: 0 }}>
          FIRE
        </h1>

        <p style={{ color: "#6b7280", marginTop: "8px" }}>
          Financiële onafhankelijkheid en eerder stoppen met werken.
        </p>
      </div>

      <div
        style={{
          ...cardStyle,
          marginBottom: "24px",
        }}
      >
        <p style={mutedText}>Huidig FIRE-beleggingsvermogen</p>

        <div
          style={{
            fontSize: "30px",
            fontWeight: 700,
            color: "#2563eb",
            marginTop: "12px",
          }}
        >
          {formatEuro(totalInvestments)}
        </div>

        <p style={mutedText}>
          Alleen actuele bezittingen van het type Beleggingen.
        </p>
      </div>

      <FireSettingsForm currentInvestments={totalInvestments} />

      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 600, marginTop: 0 }}>
          Jouw FIRE-vermogen
        </h2>

        <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
          Alleen bezittingen van het type Beleggingen tellen mee.
          Spaargeld, banktegoeden, crypto, woningwaarde en overige
          bezittingen worden buiten beschouwing gelaten.
        </p>

        {investments.length === 0 ? (
          <div
            style={{
              background: "#f9fafb",
              padding: "20px",
              borderRadius: "8px",
              color: "#6b7280",
            }}
          >
            Je hebt nog geen bezittingen van het type Beleggingen
            geregistreerd. Voeg deze eerst toe via Vermogen.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "12px 8px" }}>Belegging</th>
                  <th style={{ padding: "12px 8px", textAlign: "right" }}>
                    Actuele waarde
                  </th>
                </tr>
              </thead>

              <tbody>
                {investments.map((investment) => (
                  <tr
                    key={investment.id}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                  >
                    <td style={{ padding: "14px 8px" }}>
                      {investment.name}
                    </td>

                    <td
                      style={{
                        padding: "14px 8px",
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {formatEuro(Number(investment.currentValue))}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <td style={{ padding: "16px 8px", fontWeight: 700 }}>
                    Totaal
                  </td>

                  <td
                    style={{
                      padding: "16px 8px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#2563eb",
                    }}
                  >
                    {formatEuro(totalInvestments)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
