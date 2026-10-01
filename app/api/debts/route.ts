
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const allowedTypes = [
  "MORTGAGE",
  "PERSONAL_LOAN",
  "STUDENT_LOAN",
  "OTHER",
] as const;

type DebtType = (typeof allowedTypes)[number];

async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return session.user.id;
}

function isValidDebtType(type: string): type is DebtType {
  return allowedTypes.includes(type as DebtType);
}

function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

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

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const type =
      typeof body.type === "string" ? body.type : "";

    const currentBalance = Number(
      body.currentBalance ?? body.value
    );

    const interestRate = parseOptionalNumber(body.interestRate);
    const monthlyPayment = parseOptionalNumber(body.monthlyPayment);

    if (!name) {
      return NextResponse.json(
        { error: "Naam is verplicht." },
        { status: 400 }
      );
    }

    if (!isValidDebtType(type)) {
      return NextResponse.json(
        { error: "Ongeldig type schuld." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(currentBalance) || currentBalance < 0) {
      return NextResponse.json(
        { error: "Ongeldig openstaand bedrag." },
        { status: 400 }
      );
    }

    if (
      interestRate === undefined ||
      (interestRate !== null && interestRate < 0)
    ) {
      return NextResponse.json(
        { error: "Ongeldig rentepercentage." },
        { status: 400 }
      );
    }

    if (
      monthlyPayment === undefined ||
      (monthlyPayment !== null && monthlyPayment < 0)
    ) {
      return NextResponse.json(
        { error: "Ongeldige maandelijkse aflossing." },
        { status: 400 }
      );
    }

    const debt = await prisma.debt.create({
      data: {
        userId,
        name,
        type,
        currentBalance,
        interestRate,
        monthlyPayment,
      },
    });

    return NextResponse.json({ debt }, { status: 201 });
  } catch (error) {
    console.error("Debt creation error:", error);

    return NextResponse.json(
      {
        error: "Er ging iets mis bij het opslaan van de schuld.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
      typeof body.id === "string" ? body.id : "";

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const type =
      typeof body.type === "string" ? body.type : "";

    const currentBalance = Number(
      body.currentBalance ?? body.value
    );

    const interestRate = parseOptionalNumber(body.interestRate);
    const monthlyPayment = parseOptionalNumber(body.monthlyPayment);

    if (!id) {
      return NextResponse.json(
        { error: "Schuld-ID ontbreekt." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Naam is verplicht." },
        { status: 400 }
      );
    }

    if (!isValidDebtType(type)) {
      return NextResponse.json(
        { error: "Ongeldig type schuld." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(currentBalance) || currentBalance < 0) {
      return NextResponse.json(
        { error: "Ongeldig openstaand bedrag." },
        { status: 400 }
      );
    }

    if (
      interestRate === undefined ||
      (interestRate !== null && interestRate < 0)
    ) {
      return NextResponse.json(
        { error: "Ongeldig rentepercentage." },
        { status: 400 }
      );
    }

    if (
      monthlyPayment === undefined ||
      (monthlyPayment !== null && monthlyPayment < 0)
    ) {
      return NextResponse.json(
        { error: "Ongeldige maandelijkse aflossing." },
        { status: 400 }
      );
    }

    const existingDebt = await prisma.debt.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingDebt) {
      return NextResponse.json(
        { error: "Schuld niet gevonden." },
        { status: 404 }
      );
    }

    const linkedMortgage = await prisma.mortgage.findFirst({
      where: {
        debtId: id,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (linkedMortgage) {
      return NextResponse.json(
        {
          error:
            "Deze schuld is gekoppeld aan de hypotheekmodule. Pas de hypotheek aan via de hypotheekmodule.",
        },
        { status: 409 }
      );
    }

    const debt = await prisma.debt.update({
      where: {
        id,
      },
      data: {
        name,
        type,
        currentBalance,
        interestRate,
        monthlyPayment,
      },
    });

    return NextResponse.json({ debt });
  } catch (error) {
    console.error("Debt update error:", error);

    return NextResponse.json(
      {
        error: "Er ging iets mis bij het aanpassen van de schuld.",
      },
      { status: 500 }
    );
  }
}

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

    const id =
      typeof body.id === "string" ? body.id : "";

    if (!id) {
      return NextResponse.json(
        { error: "Schuld-ID ontbreekt." },
        { status: 400 }
      );
    }

    const existingDebt = await prisma.debt.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingDebt) {
      return NextResponse.json(
        { error: "Schuld niet gevonden." },
        { status: 404 }
      );
    }

    const linkedMortgage = await prisma.mortgage.findFirst({
      where: {
        debtId: id,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (linkedMortgage) {
      return NextResponse.json(
        {
          error:
            "Deze schuld is gekoppeld aan de hypotheekmodule. Verwijder de hypotheek eerst via de hypotheekmodule.",
        },
        { status: 409 }
      );
    }

    await prisma.debt.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Debt deletion error:", error);

    return NextResponse.json(
      {
        error: "Er ging iets mis bij het verwijderen van de schuld.",
      },
      { status: 500 }
    );
  }
}
