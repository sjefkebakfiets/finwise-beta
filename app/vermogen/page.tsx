import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AssetForm from "./AssetForm";
import AssetRow from "./AssetRow";
import DebtForm from "./DebtForm";
import DebtRow from "./DebtRow";
import SnapshotForm from "./SnapshotForm";
import NetWorthChart from "./NetWorthChart";
export const dynamic = "force-dynamic";
export default async function VermogenPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const assets = await prisma.asset.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  const debts = await prisma.debt.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      mortgage: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  const snapshots = await prisma.netWorthSnapshot.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      assetValues: true,
      debtValues: true,
    },
    orderBy: {
      date: "desc",
    },
  });
  const totalAssets = assets.reduce(
    (total, asset) => total + Number(asset.currentValue),
    0
  );
  const totalDebts = debts.reduce(
    (total, debt) => total + Number(debt.currentBalance),
    0
  );
  const netWorth = totalAssets - totalDebts;
  const chartSnapshots = snapshots.map((snapshot) => {
    const snapshotAssets = snapshot.assetValues.reduce(
      (total, asset) => total + Number(asset.value),
      0
    );
    const snapshotDebts = snapshot.debtValues.reduce(
      (total, debt) => total + Number(debt.value),
      0
    );
    return {
      date: snapshot.date.toISOString(),
      assets: snapshotAssets,
      debts: snapshotDebts,
      netWorth: snapshotAssets - snapshotDebts,
    };
  });
  return (
    <main
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
          Vermogen
        </h1>
        <p
          style={{
            marginTop: 8,
            color: "#6b7280",
            fontSize: 16,
          }}
        >
          Overzicht van je bezittingen, schulden en netto vermogen.
        </p>
      </div>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <SummaryCard
          title="Totale bezittingen"
          value={formatEuro(totalAssets)}
        />
        <SummaryCard
          title="Totale schulden"
          value={formatEuro(totalDebts)}
        />
        <SummaryCard
          title="Netto vermogen"
          value={formatEuro(netWorth)}
        />
      </section>
      <section
        style={{
          background: "white",
          border: "1px solid #e3e7ed",
          borderRadius: 14,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>
            Vermogensontwikkeling
          </h2>
          <p
            style={{
              marginTop: 6,
              marginBottom: 0,
              color: "#6b7280",
            }}
          >
            Ontwikkeling van je bezittingen, schulden en netto
            vermogen op basis van je historische snapshots.
          </p>
        </div>
        <NetWorthChart snapshots={chartSnapshots} />
      </section>
      <section
        style={{
          background: "white",
          border: "1px solid #e3e7ed",
          borderRadius: 14,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>
              Bezittingen
            </h2>
            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                color: "#6b7280",
              }}
            >
              Je huidige bezittingen en hun waarde.
            </p>
          </div>
          <AssetForm />
        </div>
        {assets.length === 0 ? (
          <div
            style={{
              padding: 24,
              border: "1px dashed #d1d5db",
              borderRadius: 10,
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            Je hebt nog geen bezittingen toegevoegd.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {assets.map((asset) => (
              <AssetRow
                key={asset.id}
                id={asset.id}
                name={asset.name}
                type={asset.type}
                value={Number(asset.currentValue)}
              />
            ))}
          </div>
        )}
      </section>
      <section
        style={{
          background: "white",
          border: "1px solid #e3e7ed",
          borderRadius: 14,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>
              Schulden
            </h2>
            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                color: "#6b7280",
              }}
            >
              Je huidige schulden en openstaande bedragen.
            </p>
          </div>
          <DebtForm />
        </div>
        {debts.length === 0 ? (
          <div
            style={{
              padding: 24,
              border: "1px dashed #d1d5db",
              borderRadius: 10,
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            Je hebt nog geen schulden toegevoegd.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {debts.map((debt) => (
              <DebtRow
                key={debt.id}
                id={debt.id}
                name={debt.name}
                type={debt.type}
                value={Number(debt.currentBalance)}
                interestRate={debt.interestRate == null ? null : Number(debt.interestRate)}
                monthlyPayment={debt.monthlyPayment == null ? null : Number(debt.monthlyPayment)}
                mortgageEndDate={debt.mortgage?.endDate?.toISOString().slice(0, 10) ?? ""}
                fixedRateEndDate={debt.mortgage?.fixedRateEndDate?.toISOString().slice(0, 10) ?? ""}
              />
            ))}
          </div>
        )}
      </section>
      <section
        style={{
          background: "white",
          border: "1px solid #e3e7ed",
          borderRadius: 14,
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>
              Vermogenssnapshots
            </h2>
            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                color: "#6b7280",
              }}
            >
              Historische momentopnames van je vermogen.
            </p>
          </div>
          <SnapshotForm />
        </div>
        {snapshots.length === 0 ? (
          <div
            style={{
              padding: 24,
              border: "1px dashed #d1d5db",
              borderRadius: 10,
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            Je hebt nog geen vermogenssnapshot gemaakt.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {snapshots.map((snapshot, index) => {
              const snapshotAssets =
                snapshot.assetValues.reduce(
                  (total, asset) => total + Number(asset.value),
                  0
                );
              const snapshotDebts =
                snapshot.debtValues.reduce(
                  (total, debt) => total + Number(debt.value),
                  0
                );
              const snapshotNetWorth =
                snapshotAssets - snapshotDebts;
              const previousSnapshot = snapshots[index + 1];
              let change: number | null = null;
              let changePercentage: number | null = null;
              if (previousSnapshot) {
                const previousAssets =
                  previousSnapshot.assetValues.reduce(
                    (total, asset) => total + Number(asset.value),
                    0
                  );
                const previousDebts =
                  previousSnapshot.debtValues.reduce(
                    (total, debt) => total + Number(debt.value),
                    0
                  );
                const previousNetWorth =
                  previousAssets - previousDebts;
                change =
                  snapshotNetWorth - previousNetWorth;
                if (previousNetWorth !== 0) {
                  changePercentage =
                    (change / Math.abs(previousNetWorth)) * 100;
                }
              }
              return (
                <SnapshotRow
                  key={snapshot.id}
                  date={snapshot.date}
                  note={snapshot.note}
                  assets={snapshotAssets}
                  debts={snapshotDebts}
                  netWorth={snapshotNetWorth}
                  change={change}
                  changePercentage={changePercentage}
                  isLatest={index === 0}
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
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
    </div>
  );
}
function SnapshotRow({
  date,
  note,
  assets,
  debts,
  netWorth,
  change,
  changePercentage,
  isLatest,
}: {
  date: Date;
  note: string | null;
  assets: number;
  debts: number;
  netWorth: number;
  change: number | null;
  changePercentage: number | null;
  isLatest: boolean;
}) {
  const changePositive = change !== null && change >= 0;
  return (
    <div
      style={{
        padding: 18,
        border: "1px solid #e5e7eb",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              {formatDate(date)}
            </div>
            {isLatest && (
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "#e5e7eb",
                  color: "#374151",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Laatste
              </span>
            )}
          </div>
          {note && (
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              {note}
            </div>
          )}
        </div>
        <div
          style={{
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            {formatEuro(netWorth)}
          </div>
          {change !== null && (
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                fontWeight: 600,
                color: changePositive ? "#166534" : "#b91c1c",
              }}
            >
              {changePositive ? "+" : ""}
              {formatEuro(change)}
              {changePercentage !== null &&
                ` (${changePositive ? "+" : ""}${formatPercentage(
                  changePercentage
                )})`}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid #f0f0f0",
        }}
      >
        <SnapshotValue
          label="Bezittingen"
          value={assets}
        />
        <SnapshotValue
          label="Schulden"
          value={debts}
        />
        <SnapshotValue
          label="Netto vermogen"
          value={netWorth}
          highlight
        />
      </div>
    </div>
  );
}
function SnapshotValue({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: highlight ? 700 : 600,
        }}
      >
        {formatEuro(value)}
      </div>
    </div>
  );
}
function debtTypeLabel(type: string) {
  const labels: Record<string, string> = {
    MORTGAGE: "Hypotheek",
    PERSONAL_LOAN: "Persoonlijke lening",
    STUDENT_LOAN: "Studieschuld",
    OTHER: "Overig",
  };
  return labels[type] ?? type;
}
function formatEuro(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
function formatPercentage(value: number) {
  return (
    new Intl.NumberFormat("nl-NL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value) + "%"
  );
}
function formatDate(date: Date) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
