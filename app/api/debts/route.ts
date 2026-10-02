
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
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const type =
      typeof body.type === "string"
        ? body.type
        : "";

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

    return NextResponse.json(
      { debt },
      { status: 201 }
    );
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
      include: {
        mortgage: true,
      },
    });

    if (!existingDebt) {
      return NextResponse.json(
        { error: "Schuld niet gevonden." },
        { status: 404 }
      );
    }

    const parseMortgageDate = (value: unknown): Date | null | undefined => {
      if (value === undefined) return undefined;
      if (value === null || value === "") return null;
      if (typeof value !== "string") return new Date("invalid");
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return Number.isNaN(parsed.getTime()) ? new Date("invalid") : parsed;
    };
    const mortgageEndDate = parseMortgageDate(body.mortgageEndDate);
    const fixedRateEndDate = parseMortgageDate(body.fixedRateEndDate);
    if ((mortgageEndDate && Number.isNaN(mortgageEndDate.getTime())) ||
        (fixedRateEndDate && Number.isNaN(fixedRateEndDate.getTime()))) {
      return NextResponse.json({ error: "Vul geldige hypotheekdatums in." }, { status: 400 });
    }
    // Valideer de combinatie van nieuwe en reeds opgeslagen datums.
    const effectiveEndDate = mortgageEndDate !== undefined
      ? mortgageEndDate
      : existingDebt.mortgage?.endDate ?? null;
    const effectiveFixedRateEndDate = fixedRateEndDate !== undefined
      ? fixedRateEndDate
      : existingDebt.mortgage?.fixedRateEndDate ?? null;

    if (
      effectiveEndDate &&
      effectiveFixedRateEndDate &&
      effectiveFixedRateEndDate > effectiveEndDate
    ) {
      return NextResponse.json(
        { error: "De rentevaste einddatum kan niet na de hypotheek-einddatum liggen." },
        { status: 400 }
      );
    }

    const dateData: { endDate?: Date | null; fixedRateEndDate?: Date | null } = {};
    if (mortgageEndDate !== undefined) dateData.endDate = mortgageEndDate;
    if (fixedRateEndDate !== undefined) dateData.fixedRateEndDate = fixedRateEndDate;

    // Schuld en hypotheekdatums worden samen opgeslagen. Ontbreekt het
    // Mortgage-record, dan maakt upsert het aan en koppelt het aan deze Debt.
    const debt = await prisma.$transaction(async (tx) => {
      const updatedDebt = await tx.debt.update({
        where: { id },
        data: {
          name,
          type,
          currentBalance,
          interestRate,
          monthlyPayment,
        },
      });

      if (type === "MORTGAGE" && Object.keys(dateData).length > 0) {
        await tx.mortgage.upsert({
          where: { debtId: existingDebt.id },
          update: dateData,
          create: {
            userId,
            debtId: existingDebt.id,
            name: name || "Mijn hypotheek",
            endDate: effectiveEndDate,
            fixedRateEndDate: effectiveFixedRateEndDate,
          },
        });
      }

      return updatedDebt;
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
      typeof body.id === "string"
        ? body.id
        : "";

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
