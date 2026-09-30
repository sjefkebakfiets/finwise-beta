import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const allowedTypes = [
  "INCOME",
  "EXPENSE",
  "SAVING",
  "INVESTMENT",
  "DEBT_PAYMENT",
] as const;

type CategoryType = (typeof allowedTypes)[number];

async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return session.user.id;
}

function isValidCategoryType(
  type: string
): type is CategoryType {
  return allowedTypes.includes(
    type as CategoryType
  );
}

function parseAmount(
  value: unknown
): number | null | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "number") {
    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      return undefined;
    }

    return value;
  }

  if (typeof value === "string") {
    const normalized = value
      .trim()
      .replace(",", ".");

    if (!normalized) {
      return null;
    }

    const amount = Number(normalized);

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      return undefined;
    }

    return amount;
  }

  return undefined;
}

export async function GET() {
  try {
    const userId = await getCurrentUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Niet ingelogd." },
        { status: 401 }
      );
    }

    const categories =
      await prisma.category.findMany({
        where: {
          userId,
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

    return NextResponse.json({
      categories,
    });
  } catch (error) {
    console.error(
      "Category retrieval error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Er ging iets mis bij het ophalen van de categorieën.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const userId = await getCurrentUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Niet ingelogd." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const type =
      typeof body.type === "string"
        ? body.type
        : "";

    const standardAmount =
      parseAmount(body.standardAmount);

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Naam van de categorie is verplicht.",
        },
        { status: 400 }
      );
    }

    if (!isValidCategoryType(type)) {
      return NextResponse.json(
        {
          error:
            "Ongeldig type categorie.",
        },
        { status: 400 }
      );
    }

    if (standardAmount === undefined) {
      return NextResponse.json(
        {
          error:
            "Vul een geldig bedrag in.",
        },
        { status: 400 }
      );
    }

    const existingCategory =
      await prisma.category.findFirst({
        where: {
          userId,
          name,
        },
      });

    if (existingCategory) {
      return NextResponse.json(
        {
          error:
            "Er bestaat al een categorie met deze naam.",
        },
        { status: 409 }
      );
    }

    const category =
      await prisma.category.create({
        data: {
          userId,
          name,
          type,
          standardAmount,
        },
      });

    return NextResponse.json(
      { category },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Category creation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Er ging iets mis bij het opslaan van de categorie.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request
) {
  try {
    const userId = await getCurrentUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Niet ingelogd." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const type =
      typeof body.type === "string"
        ? body.type
        : "";

    const standardAmount =
      parseAmount(body.standardAmount);

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Categorie-ID ontbreekt.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Naam van de categorie is verplicht.",
        },
        { status: 400 }
      );
    }

    if (!isValidCategoryType(type)) {
      return NextResponse.json(
        {
          error:
            "Ongeldig type categorie.",
        },
        { status: 400 }
      );
    }

    if (standardAmount === undefined) {
      return NextResponse.json(
        {
          error:
            "Vul een geldig bedrag in.",
        },
        { status: 400 }
      );
    }

    const existingCategory =
      await prisma.category.findFirst({
        where: {
          id,
          userId,
        },
      });

    if (!existingCategory) {
      return NextResponse.json(
        {
          error:
            "Categorie niet gevonden.",
        },
        { status: 404 }
      );
    }

    const duplicateCategory =
      await prisma.category.findFirst({
        where: {
          userId,
          name,
          NOT: {
            id,
          },
        },
      });

    if (duplicateCategory) {
      return NextResponse.json(
        {
          error:
            "Er bestaat al een categorie met deze naam.",
        },
        { status: 409 }
      );
    }

    const category =
      await prisma.category.update({
        where: {
          id,
        },
        data: {
          name,
          type,
          standardAmount,
        },
      });

    return NextResponse.json({
      category,
    });
  } catch (error) {
    console.error(
      "Category update error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Er ging iets mis bij het aanpassen van de categorie.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request
) {
  try {
    const userId = await getCurrentUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Niet ingelogd." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id
        : "";

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Categorie-ID ontbreekt.",
        },
        { status: 400 }
      );
    }

    const existingCategory =
      await prisma.category.findFirst({
        where: {
          id,
          userId,
        },
      });

    if (!existingCategory) {
      return NextResponse.json(
        {
          error:
            "Categorie niet gevonden.",
        },
        { status: 404 }
      );
    }

    await prisma.category.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Category deletion error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Er ging iets mis bij het verwijderen van de categorie.",
      },
      { status: 500 }
    );
  }
}