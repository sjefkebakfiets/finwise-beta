import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet ingelogd." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const [mortgages, availableDebts] = await Promise.all([
      prisma.mortgage.findMany({
        where: { userId },
        include: {
          debt: true,
          loanParts: {
            orderBy: { createdAt: "asc" },
          },
          balanceHistory: {
            orderBy: { date: "desc" },
          },
          extraPayments: {
            orderBy: { startDate: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),

      prisma.debt.findMany({
        where: {
          userId,
          type: "MORTGAGE",
          mortgage: null,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      mortgage: mortgages[0] ?? null,
      mortgages,
      availableDebts,
    });
  } catch (error) {
    console.error("Mortgage fetch error:", error);

    return NextResponse.json(
      {
        error:
          "Er ging iets mis bij het ophalen van de hypotheek.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet ingelogd." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();

    // Nieuw hypotheekdeel toevoegen
    if (body.action === "createLoanPart") {
      const mortgage = await prisma.mortgage.findFirst({
        where: { userId },
      });

      if (!mortgage) {
        return NextResponse.json(
          { error: "Er is nog geen hypotheek gekoppeld." },
          { status: 404 }
        );
      }

      const name =
        typeof body.name === "string"
          ? body.name.trim()
          : "";

      const loanType = body.loanType;

      const originalPrincipal = Number(body.originalPrincipal);
      const currentBalance = Number(body.currentBalance);
      const interestRate = Number(body.interestRate);

      const monthlyPayment =
        body.monthlyPayment === "" ||
        body.monthlyPayment === null ||
        body.monthlyPayment === undefined
          ? null
          : Number(body.monthlyPayment);

      const startDate = new Date(body.startDate);

      const endDate = body.endDate
        ? new Date(body.endDate)
        : null;

      if (
        !name ||
        !["ANNUITY", "LINEAR", "INTEREST_ONLY"].includes(
          loanType
        ) ||
        !Number.isFinite(originalPrincipal) ||
        !Number.isFinite(currentBalance) ||
        !Number.isFinite(interestRate) ||
        originalPrincipal <= 0 ||
        currentBalance < 0 ||
        interestRate < 0 ||
        (monthlyPayment !== null &&
          (!Number.isFinite(monthlyPayment) ||
            monthlyPayment < 0)) ||
        Number.isNaN(startDate.getTime()) ||
        (endDate !== null &&
          Number.isNaN(endDate.getTime()))
      ) {
        return NextResponse.json(
          { error: "Controleer de ingevoerde gegevens." },
          { status: 400 }
        );
      }

      const loanPart = await prisma.mortgageLoanPart.create({
        data: {
          mortgageId: mortgage.id,
          name,
          loanType,
          originalPrincipal,
          currentBalance,
          interestRate,
          monthlyPayment,
          startDate,
          endDate,
        },
      });

      return NextResponse.json(
        { loanPart },
        { status: 201 }
      );
    }

    // Bestaande hypotheekschuld koppelen
    const debtId =
      typeof body.debtId === "string"
        ? body.debtId.trim()
        : "";

    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : "Mijn hypotheek";

    if (!debtId) {
      return NextResponse.json(
        {
          error:
            "Selecteer een bestaande hypotheekschuld.",
        },
        { status: 400 }
      );
    }

    const debt = await prisma.debt.findFirst({
      where: {
        id: debtId,
        userId,
        type: "MORTGAGE",
      },
      include: {
        mortgage: true,
      },
    });

    if (!debt) {
      return NextResponse.json(
        { error: "Hypotheekschuld niet gevonden." },
        { status: 404 }
      );
    }

    if (debt.mortgage) {
      return NextResponse.json(
        {
          error:
            "Deze schuld is al aan een hypotheek gekoppeld.",
        },
        { status: 409 }
      );
    }

    const mortgage = await prisma.mortgage.create({
      data: {
        userId,
        debtId,
        name,
      },
      include: {
        debt: true,
        loanParts: true,
        balanceHistory: true,
        extraPayments: true,
      },
    });

    return NextResponse.json(
      { mortgage },
      { status: 201 }
    );
  } catch (error) {
    console.error("Mortgage API error:", error);

    return NextResponse.json(
      {
        error:
          "Er ging iets mis bij het verwerken van de hypotheek.",
      },
      { status: 500 }
    );
  }
}