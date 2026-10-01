import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import YearSelector from "./YearSelector";
import BudgetMonthCell from "./BudgetMonthCell";
import BudgetActualCell from "./BudgetActualCell";
import DeleteCategoryButton from "./DeleteCategoryButton";

type SearchParams = {
  year?: string;
};

const months = [
  "Jan",
  "Feb",
  "Mrt",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
];

async function createCategory(formData: FormData) {
  "use server";

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const year = Number(formData.get("year") ?? new Date().getFullYear());
  const standardAmountRaw = String(
    formData.get("standardAmount") ?? ""
  ).trim();
  const fixedCost = formData.get("fixedCost") === "on";

  const allowedTypes = [
    "INCOME",
    "EXPENSE",
    "SAVING",
    "INVESTMENT",
    "DEBT_PAYMENT",
  ];

  if (!name || !allowedTypes.includes(type) || !Number.isInteger(year)) {
    throw new Error("Ongeldige categoriegegevens.");
  }

  let standardAmount: number | null = null;

  if (standardAmountRaw !== "") {
    const normalized = standardAmountRaw.replace(",", ".");
    const parsed = Number(normalized);

    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("Vul een geldig standaardbedrag in.");
    }

    standardAmount = parsed;
  }

  const existing = await prisma.category.findFirst({
    where: {
      userId,
      name: { equals: name, mode: "insensitive" },
      type: type as any,
    },
  });

  if (existing) {
    throw new Error("Er bestaat al een categorie met deze naam en dit type.");
  }

  const category = await prisma.category.create({
    data: {
      userId,
      name,
      type: type as any,
      standardAmount: null,
      active: true,
      fixedCost,
    },
  });

  if (standardAmount !== null) {
    await prisma.budgetStandard.create({
      data: {
        categoryId: category.id,
        year,
        amount: standardAmount,
      },
    });
  }

  revalidatePath("/budget");
}

async function updateCategoryStandardAmount(formData: FormData) {
  "use server";

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const year = Number(formData.get("year") ?? new Date().getFullYear());
  const standardAmountRaw = String(
    formData.get("standardAmount") ?? ""
  ).trim();
  const fixedCost = formData.get("fixedCost") === "on";

  if (!categoryId || !Number.isInteger(year)) {
    throw new Error("Ongeldige categorie of jaar.");
  }

  let standardAmount: number | null = null;

  if (standardAmountRaw !== "") {
    const normalized = standardAmountRaw.replace(",", ".");
    const parsed = Number(normalized);

    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("Vul een geldig standaardbedrag in.");
    }

    standardAmount = parsed;
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
  });

  if (!category) {
    throw new Error("Categorie niet gevonden.");
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: { fixedCost },
  });

  if (standardAmount === null) {
    await prisma.budgetStandard.deleteMany({
      where: {
        categoryId,
        year,
      },
    });
  } else {
    await prisma.budgetStandard.upsert({
      where: {
        categoryId_year: {
          categoryId,
          year,
        },
      },
      update: {
        amount: standardAmount,
      },
      create: {
        categoryId,
        year,
        amount: standardAmount,
      },
    });
  }

  // Clear the old global value after the category has been migrated to the
  // year-specific standard.
  if (category.standardAmount !== null) {
    await prisma.category.update({
      where: { id: categoryId },
      data: { standardAmount: null },
    });
  }

  revalidatePath("/budget");
}

async function deleteCategory(formData: FormData) {
  "use server";

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const categoryId = String(formData.get("categoryId") ?? "").trim();

  if (!categoryId) {
    throw new Error("Ongeldige categorie.");
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
  });

  if (!category) {
    throw new Error("Categorie niet gevonden.");
  }

  await prisma.category.delete({
    where: { id: categoryId },
  });

  revalidatePath("/budget");
}

const groups = [
  {
    type: "INCOME",
    title: "Inkomsten",
  },
  {
    type: "EXPENSE",
    title: "Uitgaven",
  },
  {
    type: "SAVING",
    title: "Sparen",
  },
  {
    type: "INVESTMENT",
    title: "Beleggen",
  },
  {
    type: "DEBT_PAYMENT",
    title: "Schuldaflossing",
  },
] as const;

export default async function BudgetPage({
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

  const currentYear = new Date().getFullYear();

  const selectedYear =
    params.year && !Number.isNaN(Number(params.year))
      ? Number(params.year)
      : currentYear;

  const categories = await prisma.category.findMany({
    where: {
      userId,
      active: true,
    },
    orderBy: [
      {
        type: "asc",
      },
      {
        name: "asc",
      },
    ],
  });

  const budgetStandards = await prisma.budgetStandard.findMany({
    where: {
      year: selectedYear,
      category: {
        userId,
      },
    },
  });

  const standardMap = new Map<string, number>();

  for (const standard of budgetStandards) {
    standardMap.set(
      standard.categoryId,
      Number(standard.amount)
    );
  }

  function getStandardAmount(categoryId: string, legacyStandardAmount: any) {
    if (standardMap.has(categoryId)) {
      return standardMap.get(categoryId)!;
    }

    // Backwards compatibility for the old Category.standardAmount field:
    // it is treated as a legacy value for the current year only.
    if (selectedYear === currentYear && legacyStandardAmount !== null) {
      return Number(legacyStandardAmount);
    }

    return 0;
  }

  const overrides = await prisma.budgetOverride.findMany({
    where: {
      year: selectedYear,
      category: {
        userId,
      },
    },
  });

  const actuals = await prisma.budgetActual.findMany({
    where: {
      year: selectedYear,
      category: {
        userId,
      },
    },
  });

  const overrideMap = new Map<string, number>();

  for (const override of overrides) {
    overrideMap.set(
      `${override.categoryId}-${override.month}`,
      Number(override.amount)
    );
  }

  const actualMap = new Map<string, number>();

  for (const actual of actuals) {
    actualMap.set(
      `${actual.categoryId}-${actual.month}`,
      Number(actual.amount)
    );
  }

  function getPlannedAmount(
    categoryId: string,
    standardAmount: number,
    month: number
  ) {
    const key = `${categoryId}-${month}`;

    if (overrideMap.has(key)) {
      return overrideMap.get(key)!;
    }

    return standardAmount;
  }

  function getActualAmount(
    categoryId: string,
    month: number
  ) {
    const key = `${categoryId}-${month}`;

    if (!actualMap.has(key)) {
      return null;
    }

    return actualMap.get(key)!;
  }

  function formatEuro(value: number) {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatDifference(value: number | null) {
    if (value === null) {
      return "—";
    }

    if (value > 0) {
      return `+${formatEuro(value)}`;
    }

    return formatEuro(value);
  }

  function differenceColor(value: number | null) {
    if (value === null) {
      return "#9ca3af";
    }

    if (value > 0) {
      return "#15803d";
    }

    if (value < 0) {
      return "#b91c1c";
    }

    return "#6b7280";
  }

  function calculateCategoryTotals(
    categoryId: string,
    standardAmount: number
  ) {
    let planned = 0;
    let actual = 0;
    let hasActual = false;

    for (let month = 1; month <= 12; month++) {
      planned += getPlannedAmount(
        categoryId,
        standardAmount,
        month
      );

      const monthActual = getActualAmount(
        categoryId,
        month
      );

      if (monthActual !== null) {
        actual += monthActual;
        hasActual = true;
      }
    }

    return {
      planned,
      actual: hasActual ? actual : null,
      difference: hasActual
        ? planned - actual
        : null,
    };
  }

  function calculateGroupTotals(
    groupCategories: typeof categories
  ) {
    const plannedMonthly = Array(12).fill(0);
    const actualMonthly = Array(12).fill(0);
    const actualExistsMonthly = Array(12).fill(false);

    for (const category of groupCategories) {
      const standardAmount = getStandardAmount(
        category.id,
        category.standardAmount
      );

      for (let month = 1; month <= 12; month++) {
        plannedMonthly[month - 1] +=
          getPlannedAmount(
            category.id,
            standardAmount,
            month
          );

        const actual = getActualAmount(
          category.id,
          month
        );

        if (actual !== null) {
          actualMonthly[month - 1] += actual;
          actualExistsMonthly[month - 1] = true;
        }
      }
    }

    const plannedYear = plannedMonthly.reduce(
      (sum, value) => sum + value,
      0
    );

    const actualYear = actualMonthly.reduce(
      (sum, value) => sum + value,
      0
    );

    const hasActual = actualExistsMonthly.some(
      Boolean
    );

    return {
      plannedMonthly,
      actualMonthly,
      actualExistsMonthly,
      plannedYear,
      actualYear: hasActual ? actualYear : null,
    };
  }

  const groupTotals = groups.map((group) => {
    const groupCategories = categories.filter(
      (category) => category.type === group.type
    );

    return {
      ...group,
      categories: groupCategories,
      totals: calculateGroupTotals(
        groupCategories
      ),
    };
  });

  const totalPlannedYear =
    groupTotals.reduce(
      (sum, group) =>
        sum + group.totals.plannedYear,
      0
    );

  const totalActualYearValues =
    groupTotals
      .filter(
        (group) =>
          group.totals.actualYear !== null
      )
      .reduce(
        (sum, group) =>
          sum + (group.totals.actualYear ?? 0),
        0
      );

  const hasAnyActual = actuals.length > 0;

  const totalActualYear = hasAnyActual
    ? totalActualYearValues
    : null;

  const totalDifference =
    totalActualYear !== null
      ? totalPlannedYear - totalActualYear
      : null;

  const incomeGroup = groupTotals.find((group) => group.type === "INCOME");
  const expenseGroup = groupTotals.find((group) => group.type === "EXPENSE");
  const savingGroup = groupTotals.find((group) => group.type === "SAVING");
  const investmentGroup = groupTotals.find((group) => group.type === "INVESTMENT");
  const debtPaymentGroup = groupTotals.find((group) => group.type === "DEBT_PAYMENT");

  const plannedAvailableMonthly = months.map((_, index) =>
    (incomeGroup?.totals.plannedMonthly[index] ?? 0) -
    (expenseGroup?.totals.plannedMonthly[index] ?? 0) -
    (savingGroup?.totals.plannedMonthly[index] ?? 0) -
    (investmentGroup?.totals.plannedMonthly[index] ?? 0) -
    (debtPaymentGroup?.totals.plannedMonthly[index] ?? 0)
  );

  const actualAvailableMonthly = months.map((_, index) => {
    const hasAnyActual =
      incomeGroup?.totals.actualExistsMonthly[index] ||
      expenseGroup?.totals.actualExistsMonthly[index] ||
      savingGroup?.totals.actualExistsMonthly[index] ||
      investmentGroup?.totals.actualExistsMonthly[index] ||
      debtPaymentGroup?.totals.actualExistsMonthly[index];

    if (!hasAnyActual) return null;

    return (incomeGroup?.totals.actualMonthly[index] ?? 0) -
      (expenseGroup?.totals.actualMonthly[index] ?? 0) -
      (savingGroup?.totals.actualMonthly[index] ?? 0) -
      (investmentGroup?.totals.actualMonthly[index] ?? 0) -
      (debtPaymentGroup?.totals.actualMonthly[index] ?? 0);
  });

  const plannedAvailableYear = plannedAvailableMonthly.reduce((sum, value) => sum + value, 0);
  const actualAvailableYear = actualAvailableMonthly.reduce((sum, value) => sum + (value ?? 0), 0);
  const hasAvailableActual = actualAvailableMonthly.some((value) => value !== null);

  return (
    <div
      style={{
        padding: 32,
        maxWidth: 1900,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Budget
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#6b7280",
            }}
          >
            Gepland, werkelijk en verschil per maand.
          </p>
        </div>

        <YearSelector
          currentYear={currentYear}
          selectedYear={selectedYear}
        />
      </div>

      {/* Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <SummaryCard
          title="Jaar gepland"
          value={formatEuro(totalPlannedYear)}
        />

        <SummaryCard
          title="Jaar werkelijk"
          value={
            totalActualYear !== null
              ? formatEuro(totalActualYear)
              : "—"
          }
        />

        <SummaryCard
          title="Jaar verschil"
          value={formatDifference(
            totalDifference
          )}
          valueColor={differenceColor(
            totalDifference
          )}
        />
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 12,
          color: "#6b7280",
          fontSize: 13,
        }}
      >
        <div>
          <strong style={{ color: "#111827" }}>
            Gepland
          </strong>{" "}
          = je budget
        </div>

        <div>
          <strong style={{ color: "#111827" }}>
            Werkelijk
          </strong>{" "}
          = wat er echt is gebeurd
        </div>

        <div>
          <strong style={{ color: "#111827" }}>
            Verschil
          </strong>{" "}
          = gepland − werkelijk
        </div>
      </div>

      {/* Nieuwe categorie */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 12,
          }}
        >
          Nieuwe categorie
        </div>

        <form
          action={createCategory}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(180px, 1.5fr) minmax(170px, 1fr) minmax(150px, 1fr) auto auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <input type="hidden" name="year" value={selectedYear} />

          <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#6b7280" }}>
            Naam
            <input
              name="name"
              required
              placeholder="Bijv. Boodschappen"
              style={{
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#6b7280" }}>
            Type
            <select
              name="type"
              defaultValue="EXPENSE"
              style={{
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                background: "white",
                fontSize: 14,
              }}
            >
              <option value="INCOME">Inkomsten</option>
              <option value="EXPENSE">Uitgaven</option>
              <option value="SAVING">Sparen</option>
              <option value="INVESTMENT">Beleggen</option>
              <option value="DEBT_PAYMENT">Schuldaflossing</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#6b7280" }}>
            Standaard per maand
            <input
              name="standardAmount"
              type="text"
              inputMode="decimal"
              placeholder="Bijv. 500"
              style={{
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 0",
              fontSize: 13,
              color: "#374151",
              whiteSpace: "nowrap",
            }}
          >
            <input
              type="checkbox"
              name="fixedCost"
              style={{ width: 16, height: 16 }}
            />
            Vaste lasten
          </label>

          <button
            type="submit"
            style={{
              padding: "10px 16px",
              border: 0,
              borderRadius: 8,
              background: "#111827",
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Categorie toevoegen
          </button>
        </form>

        <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
          De nieuwe categorie wordt direct aan je budget toegevoegd. Per maand kun je daarna afwijkingen instellen.
        </div>
      </div>

      {/* Main table */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: 1850,
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f9fafb",
                  borderBottom:
                    "2px solid #e5e7eb",
                }}
              >
                <th
                  style={{
                    width: 240,
                    minWidth: 240,
                    padding: "14px 16px",
                    textAlign: "left",
                    position: "sticky",
                    left: 0,
                    zIndex: 4,
                    background: "#f9fafb",
                  }}
                >
                  Categorie
                </th>

                {months.map((month) => (
                  <th
                    key={month}
                    style={{
                      minWidth: 125,
                      padding: "14px 8px",
                      textAlign: "center",
                    }}
                  >
                    {month}
                  </th>
                ))}

                <th
                  style={{
                    minWidth: 145,
                    padding: "14px 12px",
                    textAlign: "right",
                    position: "sticky",
                    right: 0,
                    zIndex: 4,
                    background: "#f9fafb",
                  }}
                >
                  Jaar
                </th>
              </tr>
            </thead>

            <tbody>
              {groupTotals.map((group) => {
                if (group.categories.length === 0) {
                  return null;
                }

                return (
                  <GroupRows
                    key={group.type}
                    title={group.title}
                    categories={group.categories}
                    selectedYear={selectedYear}
                    getStandardAmount={getStandardAmount}
                    getPlannedAmount={
                      getPlannedAmount
                    }
                    getActualAmount={
                      getActualAmount
                    }
                    calculateCategoryTotals={
                      calculateCategoryTotals
                    }
                    formatEuro={formatEuro}
                    formatDifference={
                      formatDifference
                    }
                    differenceColor={
                      differenceColor
                    }
                    groupTotals={group.totals}
                  />
                );
              })}

              {/* Totaal */}
              <tr
                style={{
                  borderTop:
                    "2px solid #d1d5db",
                  background: "#f3f4f6",
                }}
              >
                <td
                  style={{
                    padding: "16px",
                    fontWeight: 700,
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                    background: "#f3f4f6",
                  }}
                >
                  Totaal
                </td>

                {months.map((_, index) => {
                  let planned = 0;
                  let actual = 0;
                  let hasActual = false;

                  for (const group of groupTotals) {
                    planned +=
                      group.totals.plannedMonthly[
                        index
                      ];

                    if (
                      group.totals
                        .actualExistsMonthly[
                        index
                      ]
                    ) {
                      actual +=
                        group.totals.actualMonthly[
                          index
                        ];

                      hasActual = true;
                    }
                  }

                  const difference =
                    hasActual
                      ? planned - actual
                      : null;

                  return (
                    <td
                      key={index}
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                        verticalAlign: "top",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                        }}
                      >
                        {formatEuro(planned)}
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 11,
                          color: "#6b7280",
                        }}
                      >
                        {hasActual
                          ? formatEuro(actual)
                          : "—"}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          color:
                            differenceColor(
                              difference
                            ),
                        }}
                      >
                        {formatDifference(
                          difference
                        )}
                      </div>
                    </td>
                  );
                })}

                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    position: "sticky",
                    right: 0,
                    zIndex: 2,
                    background: "#f3f4f6",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                    }}
                  >
                    {formatEuro(
                      totalPlannedYear
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 11,
                      color: "#6b7280",
                    }}
                  >
                    {totalActualYear !== null
                      ? formatEuro(
                          totalActualYear
                        )
                      : "—"}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      color:
                        differenceColor(
                          totalDifference
                        ),
                    }}
                  >
                    {formatDifference(
                      totalDifference
                    )}
                  </div>
                </td>
              </tr>

              {/* Vrij besteedbaar na alle geplande reserveringen */}
              <tr style={{ borderTop: "2px solid #111827", background: "#ecfdf5" }}>
                <td style={{ padding: "14px 16px", fontWeight: 700, position: "sticky", left: 0, zIndex: 2, background: "#ecfdf5", color: "#065f46" }}>
                  Vrij besteedbaar
                  <div style={{ fontSize: 10, fontWeight: 400, color: "#047857", marginTop: 3 }}>
                    Inkomsten − uitgaven − sparen − beleggen − aflossingen
                  </div>
                </td>
                {months.map((_, index) => {
                  const planned = plannedAvailableMonthly[index];
                  const actual = actualAvailableMonthly[index];
                  return (
                    <td key={index} style={{ padding: "12px 8px", textAlign: "right", verticalAlign: "top", fontWeight: 700, color: planned < 0 ? "#b91c1c" : "#065f46" }}>
                      <div>{formatEuro(planned)}</div>
                      <div style={{ marginTop: 5, fontSize: 11, fontWeight: 400, color: "#6b7280" }}>
                        Werkelijk: {actual === null ? "—" : formatEuro(actual)}
                      </div>
                    </td>
                  );
                })}
                <td style={{ padding: "12px", textAlign: "right", position: "sticky", right: 0, zIndex: 2, background: "#ecfdf5", borderLeft: "2px solid #d1fae5", color: plannedAvailableYear < 0 ? "#b91c1c" : "#065f46" }}>
                  <div style={{ fontWeight: 700 }}>{formatEuro(plannedAvailableYear)}</div>
                  <div style={{ marginTop: 5, fontSize: 11, fontWeight: 400, color: "#6b7280" }}>
                    Werkelijk: {hasAvailableActual ? formatEuro(actualAvailableYear) : "—"}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 10,
          background: "#f9fafb",
          color: "#6b7280",
          fontSize: 13,
        }}
      >
        <strong style={{ color: "#374151" }}>
          Tip:
        </strong>{" "}
        klik op een bedrag bij <strong>Werkelijk</strong>{" "}
        om het daadwerkelijke maandbedrag in te voeren.
      </div>
    </div>
  );
}

function GroupRows({
  title,
  categories,
  selectedYear,
  getStandardAmount,
  getPlannedAmount,
  getActualAmount,
  calculateCategoryTotals,
  formatEuro,
  formatDifference,
  differenceColor,
  groupTotals,
}: {
  title: string;
  categories: any[];
  selectedYear: number;
  getStandardAmount: (
    categoryId: string,
    legacyStandardAmount: any
  ) => number;
  getPlannedAmount: (
    categoryId: string,
    standardAmount: number,
    month: number
  ) => number;
  getActualAmount: (
    categoryId: string,
    month: number
  ) => number | null;
  calculateCategoryTotals: (
    categoryId: string,
    standardAmount: number
  ) => {
    planned: number;
    actual: number | null;
    difference: number | null;
  };
  formatEuro: (value: number) => string;
  formatDifference: (
    value: number | null
  ) => string;
  differenceColor: (
    value: number | null
  ) => string;
  groupTotals: {
    plannedMonthly: number[];
    actualMonthly: number[];
    actualExistsMonthly: boolean[];
    plannedYear: number;
    actualYear: number | null;
  };
}) {
  return (
    <>
      <tr>
        <td
          colSpan={14}
          style={{
            padding: "12px 16px",
            background: "#eef2ff",
            borderTop:
              "1px solid #e5e7eb",
            borderBottom:
              "1px solid #e5e7eb",
            fontWeight: 700,
            color: "#374151",
            position: "sticky",
            left: 0,
          }}
        >
          {title}
        </td>
      </tr>

      {categories.map((category) => {
        const standardAmount = getStandardAmount(
          category.id,
          category.standardAmount
        );

        const totals =
          calculateCategoryTotals(
            category.id,
            standardAmount
          );

        return (
          <tr
            key={category.id}
            style={{
              borderBottom:
                "1px solid #f0f0f0",
            }}
          >
            <td
              style={{
                padding: "12px 16px",
                fontWeight: 500,
                position: "sticky",
                left: 0,
                zIndex: 2,
                background: "white",
              }}
            >
              <div>{category.name}</div>

              <form
                action={updateCategoryStandardAmount}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 7,
                }}
              >
                <input
                  type="hidden"
                  name="year"
                  value={selectedYear}
                />

                <input
                  type="hidden"
                  name="categoryId"
                  value={category.id}
                />

                <span
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    whiteSpace: "nowrap",
                  }}
                >
                  Standaard
                </span>

                <input
                  name="standardAmount"
                  type="text"
                  inputMode="decimal"
                  defaultValue={
                    standardAmount !== 0
                      ? String(standardAmount)
                      : ""
                  }
                  placeholder="0"
                  aria-label={`Standaardbedrag ${category.name}`}
                  style={{
                    width: 82,
                    padding: "4px 6px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 11,
                    textAlign: "right",
                  }}
                />

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 10,
                    color: "#6b7280",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    type="checkbox"
                    name="fixedCost"
                    defaultChecked={category.fixedCost}
                    style={{ width: 14, height: 14 }}
                  />
                  Vaste lasten
                </label>

                <button
                  type="submit"
                  style={{
                    padding: "4px 7px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    background: "white",
                    color: "#374151",
                    fontSize: 10,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Opslaan
                </button>
              </form>

              <DeleteCategoryButton
                categoryId={category.id}
                categoryName={category.name}
                action={deleteCategory}
              />
            </td>

            {months.map((_, index) => {
              const month = index + 1;

              const planned =
                getPlannedAmount(
                  category.id,
                  standardAmount,
                  month
                );

              const actual =
                getActualAmount(
                  category.id,
                  month
                );

              const difference =
                actual !== null
                  ? planned - actual
                  : null;

              return (
                <td
                  key={month}
                  style={{
                    padding: "8px",
                    verticalAlign: "top",
                    borderLeft:
                      "1px solid #f3f4f6",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      marginBottom: 3,
                    }}
                  >
                    Gepland
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                    }}
                  >
                    <BudgetMonthCell
                      categoryId={
                        category.id
                      }
                      year={selectedYear}
                      month={month}
                      amount={planned}
                      isOverride={false}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      marginTop: 7,
                      marginBottom: 3,
                    }}
                  >
                    Werkelijk
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                    }}
                  >
                    <BudgetActualCell
                      categoryId={
                        category.id
                      }
                      year={selectedYear}
                      month={month}
                      amount={actual}
                      standardAmount={standardAmount}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      paddingTop: 5,
                      borderTop:
                        "1px solid #f3f4f6",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                        marginBottom: 2,
                      }}
                    >
                      Verschil
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                        fontSize: 11,
                        fontWeight: 700,
                        color:
                          differenceColor(
                            difference
                          ),
                      }}
                    >
                      {formatDifference(
                        difference
                      )}
                    </div>
                  </div>
                </td>
              );
            })}

            <td
              style={{
                padding: "8px 12px",
                verticalAlign: "top",
                position: "sticky",
                right: 0,
                zIndex: 2,
                background: "white",
                borderLeft:
                  "2px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  marginBottom: 3,
                }}
              >
                Gepland
              </div>

              <div
                style={{
                  textAlign: "right",
                  fontWeight: 600,
                }}
              >
                {formatEuro(
                  totals.planned
                )}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  marginTop: 7,
                  marginBottom: 3,
                }}
              >
                Werkelijk
              </div>

              <div
                style={{
                  textAlign: "right",
                  fontWeight: 600,
                }}
              >
                {totals.actual !== null
                  ? formatEuro(
                      totals.actual
                    )
                  : "—"}
              </div>

              <div
                style={{
                  marginTop: 6,
                  paddingTop: 5,
                  borderTop:
                    "1px solid #f3f4f6",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    marginBottom: 2,
                  }}
                >
                  Verschil
                </div>

                <div
                  style={{
                    textAlign: "right",
                    fontSize: 11,
                    fontWeight: 700,
                    color:
                      differenceColor(
                        totals.difference
                      ),
                  }}
                >
                  {formatDifference(
                    totals.difference
                  )}
                </div>
              </div>
            </td>
          </tr>
        );
      })}

      {/* Groepstotaal */}
      <tr
        style={{
          background: "#fafafa",
          borderBottom:
            "1px solid #d1d5db",
        }}
      >
        <td
          style={{
            padding: "12px 16px",
            fontWeight: 700,
            position: "sticky",
            left: 0,
            zIndex: 2,
            background: "#fafafa",
          }}
        >
          Totaal {title.toLowerCase()}
        </td>

        {months.map((_, index) => {
          const planned =
            groupTotals.plannedMonthly[
              index
            ];

          const actualExists =
            groupTotals
              .actualExistsMonthly[index];

          const actual =
            groupTotals.actualMonthly[
              index
            ];

          const difference = actualExists
            ? planned - actual
            : null;

          return (
            <td
              key={index}
              style={{
                padding: "8px",
                textAlign: "right",
                verticalAlign: "top",
                borderLeft:
                  "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {formatEuro(planned)}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: "#6b7280",
                }}
              >
                {actualExists
                  ? formatEuro(actual)
                  : "—"}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  color:
                    differenceColor(
                      difference
                    ),
                }}
              >
                {formatDifference(
                  difference
                )}
              </div>
            </td>
          );
        })}

        <td
          style={{
            padding: "8px 12px",
            textAlign: "right",
            verticalAlign: "top",
            position: "sticky",
            right: 0,
            zIndex: 2,
            background: "#fafafa",
            borderLeft:
              "2px solid #e5e7eb",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {formatEuro(
              groupTotals.plannedYear
            )}
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            {groupTotals.actualYear !== null
              ? formatEuro(
                  groupTotals.actualYear
                )
              : "—"}
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              fontWeight: 700,
              color:
                differenceColor(
                  groupTotals.actualYear !==
                    null
                    ? groupTotals.plannedYear -
                        groupTotals.actualYear
                    : null
                ),
            }}
          >
            {formatDifference(
              groupTotals.actualYear !==
                null
                ? groupTotals.plannedYear -
                    groupTotals.actualYear
                : null
            )}
          </div>
        </td>
      </tr>
    </>
  );
}

function SummaryCard({
  title,
  value,
  valueColor,
}: {
  title: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#6b7280",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color:
            valueColor || "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}