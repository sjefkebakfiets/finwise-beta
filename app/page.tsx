import Link from "next/link";

import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

import NetWorthDashboardChart from "./components/NetWorthDashboardChart";



type SearchParams = {

  year?: string;

};



export default async function DashboardPage({

  searchParams,

}: {

  searchParams: Promise<SearchParams>;

}) {

  const session = await auth();



  if (!session?.user?.id) {

    redirect("/login");

  }



  const userId = session.user.id;

  const params = await searchParams;



  const currentDate = new Date();

  const currentYear = currentDate.getFullYear();

  const currentMonth = currentDate.getMonth() + 1;



  const selectedYear = params.year

    ? Number(params.year)

    : currentYear;



  const [assets, debts, categories, overrides, snapshots, mortgages] =
    await Promise.all([

      prisma.asset.findMany({

        where: { userId },

        orderBy: { name: "asc" },

      }),



      prisma.debt.findMany({

        where: { userId },

        orderBy: { name: "asc" },

      }),



      prisma.category.findMany({

        where: { userId },

        orderBy: [{ type: "asc" }, { name: "asc" }],

      }),



      prisma.budgetOverride.findMany({

        where: {

          year: selectedYear,

          category: {

            userId,

          },

        },

        orderBy: [{ categoryId: "asc" }, { month: "asc" }],

      }),



      prisma.netWorthSnapshot.findMany({

        where: { userId },

        include: {

          assetValues: true,

          debtValues: true,

        },

        orderBy: {

          date: "asc",

        },

      }),



      prisma.mortgage.findMany({
        where: { userId },
        include: {
          debt: true,
          payments: { orderBy: { date: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);



  /* ---------------------------------------------------------------------- */

  /* Vermogen                                                               */

  /* ---------------------------------------------------------------------- */



  const totalAssets = assets.reduce(

    (total, asset) =>

      total + Number(asset.currentValue ?? 0),

    0

  );



  const totalDebts = debts.reduce(

    (total, debt) =>

      total + Number(debt.currentBalance ?? 0),

    0

  );



  const netWorth = totalAssets - totalDebts;

  const mortgageBalance = mortgages.reduce(
    (total, mortgage) => total + Number(mortgage.debt.currentBalance ?? 0), 0
  );
  const mortgageGrossMonthly = mortgages.reduce(
    (total, mortgage) => total + Number(mortgage.debt.monthlyPayment ?? 0), 0
  );
  const mortgageAnnualEwfTax = mortgages.reduce((total, mortgage) => {
    const woz = Number(mortgage.wozValue ?? 0);
    const ewfRate = Number(mortgage.eigenwoningforfaitRate ?? 0) / 100;
    const taxRate = Number(mortgage.taxRate ?? 0) / 100;
    return total + woz * ewfRate * taxRate;
  }, 0);
  const mortgageAnnualTaxRelief = mortgages.reduce((total, mortgage) => {
    const balance = Number(mortgage.debt.currentBalance ?? 0);
    const rate = Number(mortgage.debt.interestRate ?? 0) / 100;
    const taxRate = Number(mortgage.taxRate ?? 0) / 100;
    return total + balance * rate * taxRate;
  }, 0);
  const mortgageNetMonthly = Math.max(0, mortgageGrossMonthly - Math.max(0, mortgageAnnualTaxRelief - mortgageAnnualEwfTax) / 12);
  const repaidThisYear = mortgages.reduce((total, mortgage) => total + mortgage.payments
    .filter((payment) => new Date(payment.date).getFullYear() === currentYear)
    .reduce((sum, payment) => sum + Number(payment.principalAmount ?? 0) + Number(payment.extraPrincipal ?? 0), 0), 0);
  const mortgageEndDates = mortgages.map((mortgage) => mortgage.endDate).filter((date): date is Date => Boolean(date));
  const mortgageFreeYear = mortgageBalance <= 0 ? currentYear : mortgageEndDates.length > 0
    ? Math.max(...mortgageEndDates.map((date) => new Date(date).getFullYear())) : null;



  /* ---------------------------------------------------------------------- */

  /* Maandoverzicht                                                         */

  /* ---------------------------------------------------------------------- */



  const monthlyBudget = calculateMonthlyBudget(

    categories,

    overrides,

    currentMonth

  );



  const available = calculateAvailable(monthlyBudget);



  /* ---------------------------------------------------------------------- */

  /* Snapshots                                                              */

  /* ---------------------------------------------------------------------- */



  const latestSnapshot =

    snapshots.length > 0

      ? snapshots[snapshots.length - 1]

      : null;



  const previousSnapshot =

    snapshots.length > 1

      ? snapshots[snapshots.length - 2]

      : null;



  const latestSnapshotTotals = latestSnapshot

    ? calculateSnapshotTotals(latestSnapshot)

    : null;



  const previousSnapshotTotals = previousSnapshot

    ? calculateSnapshotTotals(previousSnapshot)

    : null;



  const snapshotChange =

    latestSnapshotTotals && previousSnapshotTotals

      ? latestSnapshotTotals.netWorth -

        previousSnapshotTotals.netWorth

      : null;



  /* ---------------------------------------------------------------------- */

  /* Grafiekdata                                                            */

  /* ---------------------------------------------------------------------- */



  const chartData = snapshots.map((snapshot) => {

    const totals = calculateSnapshotTotals(snapshot);



    return {

      date: formatDate(snapshot.date),

      assets: totals.assets,

      debts: -totals.debts,

      netWorth: totals.netWorth,

    };

  });



  return (

    <main

      style={{

        maxWidth: 1320,

        margin: "0 auto",

        padding: "32px 32px 56px",

        color: "#172033",

      }}

    >

      {/* HEADER */}



      <header

        style={{

          display: "flex",

          justifyContent: "space-between",

          alignItems: "flex-end",

          flexWrap: "wrap",

          gap: 16,

          marginBottom: 30,

        }}

      >

        <div>

          <div

            style={{

              display: "inline-flex",

              alignItems: "center",

              gap: 8,

              padding: "6px 11px",

              borderRadius: 999,

              background: "#eff6ff",

              color: "#2563eb",

              fontSize: 12,

              fontWeight: 700,

              marginBottom: 12,

            }}

          >

            <span

              style={{

                width: 7,

                height: 7,

                borderRadius: "50%",

                background: "#3b82f6",

              }}

            />

            FINWISE OVERZICHT

          </div>



          <h1

            style={{

              margin: 0,

              fontSize: 34,

              fontWeight: 750,

              letterSpacing: "-1.2px",

              color: "#172033",

            }}

          >

            Dashboard

          </h1>



          <p

            style={{

              margin: "8px 0 0",

              color: "#64748b",

              fontSize: 15,

              lineHeight: 1.6,

            }}

          >

            Welkom terug, {session.user.name || session.user.email}.

            <br />

            Hier zie je waar je financieel staat.

          </p>

        </div>



        <div

          style={{

            padding: "10px 15px",

            background: "#ffffff",

            border: "1px solid #e8edf4",

            borderRadius: 12,

            color: "#64748b",

            fontSize: 13,

            fontWeight: 600,

          }}

        >

          {getMonthName(currentMonth)} {currentYear}

        </div>

      </header>



      {/* HOOFDKAART NETTO VERMOGEN */}



      <section

        style={{

          position: "relative",

          overflow: "hidden",

          background:

            "linear-gradient(115deg, #eff6ff 0%, #f5f8ff 55%, #f0fdfa 100%)",

          border: "1px solid #dce9fb",

          borderRadius: 22,

          padding: "30px 32px",

          marginBottom: 18,

        }}

      >

        <div

          style={{

            position: "absolute",

            width: 260,

            height: 260,

            borderRadius: "50%",

            background: "rgba(59,130,246,0.06)",

            right: -75,

            top: -130,

            pointerEvents: "none",

          }}

        />



        <div

          style={{

            position: "relative",

            display: "flex",

            justifyContent: "space-between",

            alignItems: "flex-end",

            flexWrap: "wrap",

            gap: 24,

          }}

        >

          <div>

            <div

              style={{

                display: "flex",

                alignItems: "center",

                gap: 9,

                color: "#526783",

                fontSize: 14,

                fontWeight: 600,

                marginBottom: 12,

              }}

            >

              <span

                style={{

                  display: "inline-flex",

                  alignItems: "center",

                  justifyContent: "center",

                  width: 30,

                  height: 30,

                  borderRadius: 9,

                  background: "#dbeafe",

                  color: "#2563eb",

                  fontSize: 17,

                }}

              >

                ↗

              </span>

              Netto vermogen

            </div>



            <div

              style={{

                fontSize: "clamp(36px, 5vw, 52px)",

                fontWeight: 800,

                letterSpacing: "-2px",

                lineHeight: 1.15,

                color: "#172f57",

                fontVariantNumeric: "tabular-nums",

              }}

            >

              {formatEuro(netWorth)}

            </div>



            <p

              style={{

                margin: "12px 0 0",

                color: "#64748b",

                fontSize: 14,

              }}

            >

              Je bezittingen minus je openstaande schulden

            </p>

          </div>



          <Link

            href="/vermogen"

            style={{

              display: "inline-flex",

              alignItems: "center",

              gap: 10,

              padding: "12px 17px",

              borderRadius: 11,

              background: "#ffffff",

              border: "1px solid #d9e5f5",

              color: "#28558f",

              textDecoration: "none",

              fontSize: 13,

              fontWeight: 700,

              whiteSpace: "nowrap",

            }}

          >

            Bekijk vermogen

            <span style={{ fontSize: 17 }}>→</span>

          </Link>

        </div>

      </section>



      {/* OVERIGE VERMOGENSKAARTEN */}



      <section

        style={{

          display: "grid",

          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",

          gap: 15,

          marginBottom: 30,

        }}

      >

        <DashboardCard

          title="Bezittingen"

          value={formatEuro(totalAssets)}

          subtitle="Totale huidige waarde"

          icon="◈"

          accent="#2563eb"

          background="#eff6ff"

        />



        <DashboardCard

          title="Schulden"

          value={formatEuro(totalDebts)}

          subtitle="Openstaande schulden"

          icon="↓"

          accent="#d97706"

          background="#fff7ed"

        />



        <DashboardCard

          title="Laatste snapshot"

          value={

            latestSnapshot

              ? formatDate(latestSnapshot.date)

              : "Geen"

          }

          subtitle="Laatste vermogensmeting"

          icon="◷"

          accent="#0f766e"

          background="#f0fdfa"

        />

      </section>



      {/* HYPOTHEEKOVERZICHT */}
      <section style={{ background: "#ffffff", border: "1px solid #e8edf4", borderRadius: 18, padding: 25, marginBottom: 22, boxShadow: "0 3px 14px rgba(15,23,42,0.025)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div><SectionHeading>Hypotheek</SectionHeading><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>Actuele hypotheekpositie en indicatieve netto maandlast.</p></div>
          <Link href="/hypotheek" style={{ color: "#2563eb", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>Open hypotheekplanner →</Link>
        </div>
        {mortgages.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <InfoCard label="Hypotheekschuld" value={formatEuro(mortgageBalance)} />
            <InfoCard label="Netto maandlast" value={formatEuro(mortgageNetMonthly)} valueColor="#1d4ed8" />
            <InfoCard label={`Afgelost in ${currentYear}`} value={formatEuro(repaidThisYear)} valueColor="#15803d" />
            <InfoCard label="Hypotheekvrij" value={mortgageFreeYear ? String(mortgageFreeYear) : "Nog onbekend"} />
          </div>
        ) : <div style={{ padding: 18, background: "#f8fafc", border: "1px dashed #d5deea", borderRadius: 12, color: "#64748b", fontSize: 14 }}>Nog geen hypotheek gekoppeld.</div>}
      </section>

      {/* MAANDOVERZICHT */}



      <section

        style={{

          background: "#ffffff",

          border: "1px solid #e8edf4",

          borderRadius: 18,

          padding: 25,

          marginBottom: 22,

          boxShadow: "0 3px 14px rgba(15,23,42,0.025)",

        }}

      >

        <div

          style={{

            display: "flex",

            justifyContent: "space-between",

            alignItems: "flex-start",

            flexWrap: "wrap",

            gap: 12,

            marginBottom: 22,

          }}

        >

          <div>

            <SectionHeading>Deze maand</SectionHeading>

            <p

              style={{

                margin: "6px 0 0",

                color: "#64748b",

                fontSize: 14,

              }}

            >

              Gepland financieel overzicht voor{" "}

              {getMonthName(currentMonth)} {currentYear}.

            </p>

          </div>



          <Link

            href="/budget"

            style={{

              color: "#2563eb",

              textDecoration: "none",

              fontSize: 13,

              fontWeight: 700,

            }}

          >

            Bekijk budget →

          </Link>

        </div>



        <div

          style={{

            display: "grid",

            gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",

            gap: 12,

          }}

        >

          <MonthlyCard

            title="Inkomsten"

            value={monthlyBudget.income}

            subtitle="Gepland"

            accent="#15803d"

          />



          <MonthlyCard

            title="Uitgaven"

            value={monthlyBudget.expenses}

            subtitle="Gepland"

            accent="#dc2626"

          />



          <MonthlyCard

            title="Sparen"

            value={monthlyBudget.saving}

            subtitle="Gepland"

            accent="#0f766e"

          />



          <MonthlyCard

            title="Beleggen"

            value={monthlyBudget.investment}

            subtitle="Gepland"

            accent="#2563eb"

          />



          <MonthlyCard

            title="Schuldaflossing"

            value={monthlyBudget.debtPayment}

            subtitle="Gepland"

            accent="#d97706"

          />



          <MonthlyCard

            title="Beschikbaar"

            value={available}

            subtitle="Na geplande reserveringen"

            highlight

            accent="#172f57"

          />

        </div>

      </section>



      {/* VERMOGENSGRAFIEK */}



      <section

        style={{

          background: "#ffffff",

          border: "1px solid #e8edf4",

          borderRadius: 18,

          padding: 25,

          marginBottom: 22,

          boxShadow: "0 3px 14px rgba(15,23,42,0.025)",

        }}

      >

        <div style={{ marginBottom: 20 }}>

          <SectionHeading>Vermogensontwikkeling</SectionHeading>

          <p

            style={{

              margin: "6px 0 0",

              color: "#64748b",

              fontSize: 14,

              lineHeight: 1.6,

            }}

          >

            Ontwikkeling van bezittingen, schulden en netto

            vermogen op basis van je snapshots.

          </p>

        </div>



        <NetWorthDashboardChart data={chartData} />

      </section>



      {/* LAATSTE SNAPSHOT */}



      <section

        style={{

          background: "#ffffff",

          border: "1px solid #e8edf4",

          borderRadius: 18,

          padding: 25,

          marginBottom: 22,

          boxShadow: "0 3px 14px rgba(15,23,42,0.025)",

        }}

      >

        <div

          style={{

            display: "flex",

            justifyContent: "space-between",

            alignItems: "center",

            flexWrap: "wrap",

            gap: 12,

            marginBottom: 20,

          }}

        >

          <SectionHeading>

            Laatste vermogenssnapshot

          </SectionHeading>



          <Link

            href="/vermogen"

            style={{

              color: "#2563eb",

              textDecoration: "none",

              fontSize: 13,

              fontWeight: 700,

            }}

          >

            Alle snapshots →

          </Link>

        </div>



        {latestSnapshot && latestSnapshotTotals ? (

          <div

            style={{

              display: "grid",

              gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",

              gap: 12,

            }}

          >

            <InfoCard

              label="Datum"

              value={formatDate(latestSnapshot.date)}

            />



            <InfoCard

              label="Bezittingen"

              value={formatEuro(latestSnapshotTotals.assets)}

            />



            <InfoCard

              label="Schulden"

              value={formatEuro(latestSnapshotTotals.debts)}

            />



            <InfoCard

              label="Netto vermogen"

              value={formatEuro(latestSnapshotTotals.netWorth)}

              valueColor="#1d4ed8"

            />



            {snapshotChange !== null && (

              <InfoCard

                label="Verschil vorige snapshot"

                value={formatEuroWithSign(snapshotChange)}

                valueColor={

                  snapshotChange >= 0

                    ? "#15803d"

                    : "#b91c1c"

                }

              />

            )}

          </div>

        ) : (

          <div

            style={{

              padding: 22,

              background: "#f8fafc",

              border: "1px dashed #d5deea",

              borderRadius: 12,

              color: "#64748b",

              fontSize: 14,

              lineHeight: 1.6,

            }}

          >

            Er zijn nog geen vermogenssnapshots.

            Maak een snapshot aan via Vermogen om je

            vermogensontwikkeling te kunnen volgen.

          </div>

        )}

      </section>



      {/* SNELLE LINKS */}



      <section>

        <div style={{ marginBottom: 16 }}>

          <SectionHeading>Snel naar</SectionHeading>

          <p

            style={{

              margin: "6px 0 0",

              color: "#64748b",

              fontSize: 14,

            }}

          >

            Ga direct naar een onderdeel van Finwise.

          </p>

        </div>



        <div

          style={{

            display: "grid",

            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",

            gap: 14,

          }}

        >

          <QuickLink

            href="/budget"

            title="Budget"

            description="Bekijk en beheer je inkomsten, uitgaven, sparen en beleggen."

            icon="▤"

          />



          <QuickLink

            href="/doelen"

            title="Doelen"

            description="Bekijk je financiële doelen en voortgang."

            icon="◎"

          />



          <QuickLink

            href="/planning"

            title="Planning"

            description="Bekijk je financiële planning en prognoses."

            icon="⌁"

          />



          <QuickLink
            href="/hypotheek"
            title="Hypotheek"
            description="Bekijk je hypotheek, aflossingsscenario’s en prognose."
            icon="⌂"
          />

          <QuickLink

            href="/vermogen"

            title="Vermogen"

            description="Beheer je bezittingen, schulden en snapshots."

            icon="◈"

          />

        </div>

      </section>

    </main>

  );

}



/* -------------------------------------------------------------------------- */

/* Budgetberekening                                                           */

/* -------------------------------------------------------------------------- */



function calculateMonthlyBudget(

  categories: Array<{

    id: string;

    type: string;

    standardAmount: unknown;

  }>,

  overrides: Array<{

    categoryId: string;

    month: number;

    amount: unknown;

  }>,

  month: number

) {

  let income = 0;

  let expenses = 0;

  let saving = 0;

  let investment = 0;

  let debtPayment = 0;



  for (const category of categories) {

    const override = overrides.find(

      (item) =>

        item.categoryId === category.id &&

        item.month === month

    );



    const amount =

      override !== undefined

        ? Number(override.amount ?? 0)

        : Number(category.standardAmount ?? 0);



    switch (category.type) {

      case "INCOME":

        income += amount;

        break;



      case "EXPENSE":

        expenses += amount;

        break;



      case "SAVING":

        saving += amount;

        break;



      case "INVESTMENT":

        investment += amount;

        break;



      case "DEBT_PAYMENT":

        debtPayment += amount;

        break;

    }

  }



  return {

    income,

    expenses,

    saving,

    investment,

    debtPayment,

  };

}



function calculateAvailable(monthlyBudget: {

  income: number;

  expenses: number;

  saving: number;

  investment: number;

  debtPayment: number;

}) {

  return (

    monthlyBudget.income -

    monthlyBudget.expenses -

    monthlyBudget.saving -

    monthlyBudget.investment -

    monthlyBudget.debtPayment

  );

}



/* -------------------------------------------------------------------------- */

/* Snapshotberekening                                                         */

/* -------------------------------------------------------------------------- */



function calculateSnapshotTotals(snapshot: {

  assetValues: Array<{

    value: unknown;

  }>;

  debtValues: Array<{

    value: unknown;

  }>;

}) {

  const assets = snapshot.assetValues.reduce(

    (total, value) =>

      total + Number(value.value ?? 0),

    0

  );



  const debts = snapshot.debtValues.reduce(

    (total, value) =>

      total + Number(value.value ?? 0),

    0

  );



  return {

    assets,

    debts,

    netWorth: assets - debts,

  };

}



/* -------------------------------------------------------------------------- */

/* Helpers                                                                    */

/* -------------------------------------------------------------------------- */



function getMonthName(month: number) {

  return new Intl.DateTimeFormat("nl-NL", {

    month: "long",

  }).format(new Date(2026, month - 1, 1));

}



function formatEuro(value: number) {

  return new Intl.NumberFormat("nl-NL", {

    style: "currency",

    currency: "EUR",

    minimumFractionDigits: 0,

    maximumFractionDigits: 0,

  }).format(value);

}



function formatEuroWithSign(value: number) {

  if (value > 0) {

    return `+${formatEuro(value)}`;

  }



  return formatEuro(value);

}



function formatDate(date: Date) {

  return new Intl.DateTimeFormat("nl-NL", {

    day: "2-digit",

    month: "2-digit",

    year: "numeric",

  }).format(new Date(date));

}



/* -------------------------------------------------------------------------- */

/* Dashboard componenten                                                      */

/* -------------------------------------------------------------------------- */



function SectionHeading({

  children,

}: {

  children: React.ReactNode;

}) {

  return (

    <h2

      style={{

        margin: 0,

        fontSize: 20,

        fontWeight: 750,

        letterSpacing: "-0.4px",

        color: "#172033",

      }}

    >

      {children}

    </h2>

  );

}



function DashboardCard({

  title,

  value,

  subtitle,

  icon,

  accent,

  background,

}: {

  title: string;

  value: string;

  subtitle: string;

  icon: string;

  accent: string;

  background: string;

}) {

  return (

    <div

      style={{

        background: "#ffffff",

        border: "1px solid #e8edf4",

        borderRadius: 16,

        padding: 19,

        boxShadow: "0 3px 14px rgba(15,23,42,0.025)",

      }}

    >

      <div

        style={{

          display: "flex",

          alignItems: "center",

          gap: 10,

          marginBottom: 16,

        }}

      >

        <span

          style={{

            display: "inline-flex",

            alignItems: "center",

            justifyContent: "center",

            width: 34,

            height: 34,

            borderRadius: 10,

            background,

            color: accent,

            fontSize: 19,

            fontWeight: 700,

          }}

        >

          {icon}

        </span>



        <span

          style={{

            color: "#64748b",

            fontSize: 13,

            fontWeight: 600,

          }}

        >

          {title}

        </span>

      </div>



      <div

        style={{

          color: "#172033",

          fontSize: 25,

          fontWeight: 750,

          letterSpacing: "-0.7px",

          marginBottom: 7,

          fontVariantNumeric: "tabular-nums",

          overflowWrap: "anywhere",

        }}

      >

        {value}

      </div>



      <div

        style={{

          color: "#94a3b8",

          fontSize: 12,

        }}

      >

        {subtitle}

      </div>

    </div>

  );

}



function MonthlyCard({

  title,

  value,

  subtitle,

  highlight = false,

  accent,

}: {

  title: string;

  value: number;

  subtitle: string;

  highlight?: boolean;

  accent: string;

}) {

  return (

    <div

      style={{

        background: highlight ? "#eff6ff" : "#f8fafc",

        border: highlight

          ? "1px solid #cfe0fb"

          : "1px solid #edf1f6",

        borderRadius: 12,

        padding: 16,

      }}

    >

      <div

        style={{

          color: "#64748b",

          fontSize: 12,

          fontWeight: 600,

          marginBottom: 10,

        }}

      >

        {title}

      </div>



      <div

        style={{

          color: accent,

          fontSize: 21,

          fontWeight: 750,

          letterSpacing: "-0.5px",

          marginBottom: 6,

          fontVariantNumeric: "tabular-nums",

          overflowWrap: "anywhere",

        }}

      >

        {formatEuro(value)}

      </div>



      <div

        style={{

          color: "#94a3b8",

          fontSize: 11,

        }}

      >

        {subtitle}

      </div>

    </div>

  );

}



function InfoCard({

  label,

  value,

  valueColor,

}: {

  label: string;

  value: string;

  valueColor?: string;

}) {

  return (

    <div

      style={{

        padding: 17,

        background: "#f8fafc",

        border: "1px solid #edf1f6",

        borderRadius: 12,

      }}

    >

      <div

        style={{

          fontSize: 12,

          color: "#64748b",

          fontWeight: 600,

          marginBottom: 9,

        }}

      >

        {label}

      </div>



      <div

        style={{

          fontSize: 18,

          fontWeight: 750,

          color: valueColor || "#172033",

          overflowWrap: "anywhere",

        }}

      >

        {value}

      </div>

    </div>

  );

}



function QuickLink({

  href,

  title,

  description,

  icon,

}: {

  href: string;

  title: string;

  description: string;

  icon: string;

}) {

  return (

    <Link

      href={href}

      style={{

        display: "flex",

        alignItems: "flex-start",

        gap: 15,

        textDecoration: "none",

        color: "inherit",

        background: "#ffffff",

        border: "1px solid #e8edf4",

        borderRadius: 15,

        padding: 19,

        boxShadow: "0 3px 14px rgba(15,23,42,0.025)",

      }}

    >

      <span

        style={{

          display: "inline-flex",

          alignItems: "center",

          justifyContent: "center",

          flexShrink: 0,

          width: 40,

          height: 40,

          borderRadius: 12,

          background: "#eff6ff",

          color: "#2563eb",

          fontSize: 21,

          fontWeight: 700,

        }}

      >

        {icon}

      </span>



      <span style={{ display: "block" }}>

        <span

          style={{

            display: "block",

            marginBottom: 6,

            fontSize: 16,

            fontWeight: 700,

            color: "#172033",

          }}

        >

          {title}

        </span>



        <span

          style={{

            display: "block",

            color: "#64748b",

            fontSize: 13,

            lineHeight: 1.55,

          }}

        >

          {description}

        </span>

      </span>



      <span

        style={{

          marginLeft: "auto",

          color: "#94a3b8",

          fontSize: 18,

          flexShrink: 0,

        }}

      >

        →

      </span>

    </Link>

  );

}
