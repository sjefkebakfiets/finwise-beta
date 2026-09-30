import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return session.user.id;
}

function parseAmount(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      return undefined;
    }

    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");

    if (!normalized) {
      return null;
    }

    const amount = Number(normalized);

    if (!Number.isFinite(amount) || amount < 0) {
      return undefined;
    }

    return amount;
  }

  return undefined;
}

function isValidMonth(month: number) {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

function isValidYear(year: number) {
  return Number.isInteger(year) && year >= 2000 && year <= 2100;
}

/*
 * GET
 *
 * Haalt alle overrides op voor een bepaald jaar.
 *
 * Bijvoorbeeld:
 * /api/budget-overrides?year=2026
 */
export async function GET(request: Request) {
  try {
    const userId = await getCurrentUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Niet ingelogd." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const yearValue = searchParams.get("year");

    const year = yearValue
      ? Number(yearValue)
      : new Date().getFullYear();

    if (!isValidYear(year)) {
      return NextResponse.json(
        { error: "Ongeldig jaar." },
        { status: 400 }
      );
    }

    const overrides = await prisma.budgetOverride.findMany({
      where: {
        year,
        category: {
          userId,
        },
      },
      orderBy: [
        {
          categoryId: "asc",
        },
        {
          month: "asc",
        },
      ],
    });

    return NextResponse.json({
      overrides,
    });
  } catch (error) {
    console.error(
      "Budget override retrieval error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Er ging iets mis bij het ophalen van de budgetafwijkingen.",
      },
      { status: 500 }
    );
  }
}

/*
 * POST
 *
 * Maakt een override aan of wijzigt een bestaande override.
 *
 * Body:
 * {
 *   categoryId: "...",
 *   year: 2026,
 *   month: 12,
 *   amount: 750
 * }
 */
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Niet ingelogd." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const categoryId =
      typeof body.categoryId === "string"
        ? body.categoryId
        : "";

    const year =
      typeof body.year === "number"
        ? body.year
        : Number(body.year);

    const month =
      typeof body.month === "number"
        ? body.month
        : Number(body.month);

    const amount = parseAmount(body.amount);

    if (!categoryId) {
      return NextResponse.json(
        { error: "Categorie-ID ontbreekt." },
        { status: 400 }
      );
    }

    if (!isValidYear(year)) {
      return NextResponse.json(
        { error: "Ongeldig jaar." },
        { status: 400 }
      );
    }

    if (!isValidMonth(month)) {
      return NextResponse.json(
        { error: "Ongeldige maand." },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: "Vul een geldig bedrag in." },
        { status: 400 }
      );
    }

    /*
     * Controleer dat de categorie van de ingelogde
     * gebruiker is.
     */
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categorie niet gevonden." },
        { status: 404 }
      );
    }

    /*
     * Upsert:
     * bestaat de override al → aanpassen
     * bestaat hij nog niet → aanmaken
     */
    const override =
      await prisma.budgetOverride.upsert({
        where: {
          categoryId_year_month: {
            categoryId,
            year,
            month,
          },
        },
        update: {
          amount,
        },
        create: {
          categoryId,
          year,
          month,
          amount,
        },
      });

    return NextResponse.json(
      {
        override,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Budget override creation/update error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Er ging iets mis bij het opslaan van de budgetafwijking.",
      },
      { status: 500 }
    );
  }
}

/*
 * DELETE
 *
 * Verwijdert een override.
 *
 * Daarna valt die maand automatisch terug
 * op het standaardbedrag van de categorie.
 *
 * Body:
 * {
 *   categoryId: "...",
 *   year: 2026,
 *   month: 12
 * }
 */
export async function DELETE(request: Request) {
  try {
    const userId = await getCurrentUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Niet ingelogd." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const categoryId =
      typeof body.categoryId === "string"
        ? body.categoryId
        : "";

    const year =
      typeof body.year === "number"
        ? body.year
        : Number(body.year);

    const month =
      typeof body.month === "number"
        ? body.month
        : Number(body.month);

    if (!categoryId) {
      return NextResponse.json(
        { error: "Categorie-ID ontbreekt." },
        { status: 400 }
      );
    }

    if (!isValidYear(year)) {
      return NextResponse.json(
        { error: "Ongeldig jaar." },
        { status: 400 }
      );
    }

    if (!isValidMonth(month)) {
      return NextResponse.json(
        { error: "Ongeldige maand." },
        { status: 400 }
      );
    }

    /*
     * Controleer via de categorie of deze override
     * daadwerkelijk bij de ingelogde gebruiker hoort.
     */
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categorie niet gevonden." },
        { status: 404 }
      );
    }

    await prisma.budgetOverride.deleteMany({
      where: {
        categoryId,
        year,
        month,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Budget override deletion error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Er ging iets mis bij het verwijderen van de budgetafwijking.",
      },
      { status: 500 }
    );
  }
}