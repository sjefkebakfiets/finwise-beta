import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const jsonError = (error: string, status = 400) => NextResponse.json({ error }, { status });
const numberField = (value: unknown) => value === "" || value === null || value === undefined ? null : Number(value);
const validDate = (value: unknown) => {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

async function ownedMortgage(userId: string, mortgageId: unknown) {
  if (typeof mortgageId !== "string" || !mortgageId) return null;
  return prisma.mortgage.findFirst({ where: { id: mortgageId, userId }, include: { debt: true } });
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Niet ingelogd.", 401);
    const userId = session.user.id;
    const [mortgages, availableDebts] = await Promise.all([
      prisma.mortgage.findMany({
        where: { userId }, include: {
          debt: true,
          loanParts: { orderBy: { createdAt: "asc" } },
          balanceHistory: { orderBy: { date: "desc" } },
          extraPayments: { orderBy: { startDate: "asc" } },
        }, orderBy: { createdAt: "asc" },
      }),
      prisma.debt.findMany({ where: { userId, type: "MORTGAGE", mortgage: null }, orderBy: { name: "asc" } }),
    ]);
    return NextResponse.json({ mortgage: mortgages[0] ?? null, mortgages, availableDebts });
  } catch (error) {
    console.error("Mortgage fetch error:", error);
    return jsonError("Er ging iets mis bij het ophalen van de hypotheek.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Niet ingelogd.", 401);
    const userId = session.user.id;
    const body = await request.json();

    if (body.action === "createLoanPart") {
      const mortgage = await ownedMortgage(userId, body.mortgageId) ?? await prisma.mortgage.findFirst({ where: { userId } });
      if (!mortgage) return jsonError("Koppel eerst een hypotheekschuld.", 404);
      const originalPrincipal = Number(body.originalPrincipal);
      const currentBalance = Number(body.currentBalance);
      const interestRate = Number(body.interestRate);
      const monthlyPayment = numberField(body.monthlyPayment);
      const startDate = validDate(body.startDate);
      const endDate = body.endDate ? validDate(body.endDate) : null;
      if (!String(body.name ?? "").trim() || !["ANNUITY", "LINEAR", "INTEREST_ONLY"].includes(body.loanType) || !Number.isFinite(originalPrincipal) || originalPrincipal <= 0 || !Number.isFinite(currentBalance) || currentBalance < 0 || !Number.isFinite(interestRate) || interestRate < 0 || (monthlyPayment !== null && (!Number.isFinite(monthlyPayment) || monthlyPayment < 0)) || !startDate || (body.endDate && !endDate)) return jsonError("Controleer de gegevens van het hypotheekdeel.");
      const loanPart = await prisma.mortgageLoanPart.create({ data: { mortgageId: mortgage.id, name: String(body.name).trim(), loanType: body.loanType, originalPrincipal, currentBalance, interestRate, monthlyPayment, startDate, endDate } });
      return NextResponse.json({ loanPart }, { status: 201 });
    }

    if (body.action === "updateMortgage") {
      const mortgage = await ownedMortgage(userId, body.mortgageId);
      if (!mortgage) return jsonError("Hypotheek niet gevonden.", 404);
      const currentBalance = Number(body.currentBalance);
      const interestRate = numberField(body.interestRate);
      const monthlyPayment = numberField(body.monthlyPayment);
      if (!Number.isFinite(currentBalance) || currentBalance < 0 || (interestRate !== null && (!Number.isFinite(interestRate) || interestRate < 0)) || (monthlyPayment !== null && (!Number.isFinite(monthlyPayment) || monthlyPayment < 0))) return jsonError("Vul geldige bedragen en rente in.");
      const [, updatedMortgage] = await prisma.$transaction([
        prisma.debt.update({ where: { id: mortgage.debtId }, data: { currentBalance, interestRate, monthlyPayment } }),
        prisma.mortgage.update({ where: { id: mortgage.id }, data: { name: String(body.name || mortgage.name).trim() || mortgage.name } }),
      ]);
      return NextResponse.json({ mortgage: updatedMortgage });
    }

    if (body.action === "createExtraPayment") {
      const mortgage = await ownedMortgage(userId, body.mortgageId);
      if (!mortgage) return jsonError("Hypotheek niet gevonden.", 404);
      const amount = Number(body.amount);
      const startDate = validDate(body.startDate);
      const endDate = body.endDate ? validDate(body.endDate) : null;
      if (!Number.isFinite(amount) || amount <= 0 || !["ONE_TIME", "MONTHLY"].includes(body.frequency) || !startDate || (body.endDate && !endDate) || (endDate && endDate < startDate)) return jsonError("Controleer bedrag, frequentie en datums.");
      const extraPayment = await prisma.mortgageExtraPayment.create({ data: { mortgageId: mortgage.id, name: String(body.name || "").trim() || null, frequency: body.frequency, amount, startDate, endDate, note: String(body.note || "").trim() || null } });
      return NextResponse.json({ extraPayment }, { status: 201 });
    }

    if (body.action === "deleteExtraPayment") {
      const mortgage = await ownedMortgage(userId, body.mortgageId);
      if (!mortgage) return jsonError("Hypotheek niet gevonden.", 404);
      const result = await prisma.mortgageExtraPayment.deleteMany({ where: { id: body.id, mortgageId: mortgage.id } });
      if (!result.count) return jsonError("Extra aflossing niet gevonden.", 404);
      return NextResponse.json({ success: true });
    }

    if (body.action === "createHistory") {
      const mortgage = await ownedMortgage(userId, body.mortgageId);
      if (!mortgage) return jsonError("Hypotheek niet gevonden.", 404);
      const totalBalance = Number(body.totalBalance);
      const date = validDate(body.date);
      if (!Number.isFinite(totalBalance) || totalBalance < 0 || !date) return jsonError("Vul een geldig saldo en een datum in.");
      const result = await prisma.$transaction(async (tx) => {
        const history = await tx.mortgageBalanceHistory.create({ data: { mortgageId: mortgage.id, date, totalBalance, note: String(body.note || "").trim() || null } });
        await tx.debt.update({ where: { id: mortgage.debtId }, data: { currentBalance: totalBalance } });
        return history;
      });
      return NextResponse.json({ history: result }, { status: 201 });
    }

    if (body.action === "deleteHistory") {
      const mortgage = await ownedMortgage(userId, body.mortgageId);
      if (!mortgage) return jsonError("Hypotheek niet gevonden.", 404);
      const result = await prisma.mortgageBalanceHistory.deleteMany({ where: { id: body.id, mortgageId: mortgage.id } });
      if (!result.count) return jsonError("Saldomoment niet gevonden.", 404);
      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteLoanPart") {
      const mortgage = await ownedMortgage(userId, body.mortgageId);
      if (!mortgage) return jsonError("Hypotheek niet gevonden.", 404);
      const result = await prisma.mortgageLoanPart.deleteMany({ where: { id: body.id, mortgageId: mortgage.id } });
      if (!result.count) return jsonError("Hypotheekdeel niet gevonden.", 404);
      return NextResponse.json({ success: true });
    }

    // Bestaande hypotheekschuld koppelen; bestaande schuld blijft de bron voor het actuele saldo.
    const debtId = typeof body.debtId === "string" ? body.debtId.trim() : "";
    if (!debtId) return jsonError("Selecteer een bestaande hypotheekschuld.");
    const debt = await prisma.debt.findFirst({ where: { id: debtId, userId, type: "MORTGAGE" }, include: { mortgage: true } });
    if (!debt) return jsonError("Hypotheekschuld niet gevonden.", 404);
    if (debt.mortgage) return jsonError("Deze schuld is al aan een hypotheek gekoppeld.", 409);
    const mortgage = await prisma.mortgage.create({ data: { userId, debtId, name: String(body.name || debt.name).trim() || "Mijn hypotheek" }, include: { debt: true, loanParts: true, balanceHistory: true, extraPayments: true } });
    return NextResponse.json({ mortgage }, { status: 201 });
  } catch (error) {
    console.error("Mortgage API error:", error);
    const message = error instanceof Error && error.message.includes("Unique constraint") ? "Er bestaat al een saldomoment op deze datum." : "Er ging iets mis bij het verwerken van de hypotheek.";
    return jsonError(message, 500);
  }
}
