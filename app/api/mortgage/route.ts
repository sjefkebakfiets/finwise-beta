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

    const [mortgages, availableDebts, investmentAssets] = await Promise.all([
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
          payments: { orderBy: { date: "desc" } },
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

      prisma.asset.findMany({
        where: {
          userId,
          type: "INVESTMENT",
        },
        select: {
          id: true,
          name: true,
          currentValue: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      mortgage: mortgages[0] ?? null,
      mortgages,
      availableDebts,
      investmentAssets,
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

    // Werkelijke betaling registreren. Alleen principal + extra verlaagt de schuld.
    if (body.action === "createPayment") {
      const mortgageId = String(body.mortgageId || "");
      const mortgage = await prisma.mortgage.findFirst({ where: { id: mortgageId, userId }, include: { debt: true } });
      if (!mortgage) return NextResponse.json({ error: "Hypotheek niet gevonden." }, { status: 404 });
      const interestAmount = Number(body.interestAmount);
      const principalAmount = Number(body.principalAmount);
      const extraPrincipal = Number(body.extraPrincipal ?? 0);
      const taxReliefEstimate = Number(body.taxReliefEstimate ?? 0);
      const date = new Date(body.date);
      if ([interestAmount, principalAmount, extraPrincipal, taxReliefEstimate].some(v => !Number.isFinite(v) || v < 0) || Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: "Vul een geldige datum en niet-negatieve bedragen in." }, { status: 400 });
      }
      const reduction = principalAmount + extraPrincipal;
      if (reduction > Number(mortgage.debt.currentBalance)) return NextResponse.json({ error: "Aflossing is hoger dan de openstaande schuld." }, { status: 400 });
      const result = await prisma.$transaction(async tx => {
        const payment = await tx.mortgagePayment.create({ data: { mortgageId, date, interestAmount, principalAmount, extraPrincipal, taxReliefEstimate, note: typeof body.note === "string" ? body.note.trim() || null : null } });
        const newBalance = Number(mortgage.debt.currentBalance) - reduction;
        await tx.debt.update({ where: { id: mortgage.debtId }, data: { currentBalance: newBalance } });
        await tx.mortgageBalanceHistory.upsert({ where: { mortgageId_date: { mortgageId, date } }, create: { mortgageId, date, totalBalance: newBalance, note: "Automatisch bijgewerkt via betalingsregistratie" }, update: { totalBalance: newBalance, note: "Automatisch bijgewerkt via betalingsregistratie" } });
        return { payment, newBalance };
      });
      return NextResponse.json(result, { status: 201 });
    }

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
// Wijzig een bestaande betalingsregistratie en corrigeer alleen het verschil
// in aflossing op het actuele saldo. Rente wijzigt de schuld niet.
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
    }

    const body = await request.json();
    if (body.action === "updateTaxSettings") {
      const mortgageId = typeof body.mortgageId === "string" ? body.mortgageId : "";
      if (!mortgageId) return NextResponse.json({ error: "Hypotheek-ID ontbreekt." }, { status: 400 });

      const mortgage = await prisma.mortgage.findFirst({
        where: { id: mortgageId, userId: session.user.id },
      });
      if (!mortgage) return NextResponse.json({ error: "Hypotheek niet gevonden." }, { status: 404 });

      const wozValue = Number(body.wozValue);
      const taxRate = Number(body.taxRate);
      const eigenwoningforfaitRate = Number(body.eigenwoningforfaitRate);
      const taxYear = Number(body.taxYear);

      if (
        !Number.isFinite(wozValue) || wozValue < 0 ||
        !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100 ||
        !Number.isFinite(eigenwoningforfaitRate) || eigenwoningforfaitRate < 0 || eigenwoningforfaitRate > 100 ||
        !Number.isInteger(taxYear) || taxYear < 2000 || taxYear > 2100
      ) {
        return NextResponse.json(
          { error: "Controleer de WOZ-waarde, het belastingpercentage, het eigenwoningforfaitpercentage en het belastingjaar." },
          { status: 400 }
        );
      }

      const updated = await prisma.mortgage.update({
        where: { id: mortgageId },
        data: { wozValue, taxRate, eigenwoningforfaitRate, taxYear },
      });

      return NextResponse.json({ mortgage: updated });
    }

    if (body.action === "updateMortgageDates") {
      const mortgageId = typeof body.mortgageId === "string" ? body.mortgageId : "";
      const mortgage = await prisma.mortgage.findFirst({ where: { id: mortgageId, userId: session.user.id } });
      if (!mortgage) return NextResponse.json({ error: "Hypotheek niet gevonden." }, { status: 404 });
      const parseDate = (value: unknown) => {
        if (value === null || value === "" || value === undefined) return null;
        if (typeof value !== "string") return new Date("invalid");
        const date = new Date(`${value}T00:00:00.000Z`);
        return Number.isNaN(date.getTime()) ? new Date("invalid") : date;
      };
      const endDate = parseDate(body.endDate);
      const fixedRateEndDate = parseDate(body.fixedRateEndDate);
      if ((endDate && Number.isNaN(endDate.getTime())) || (fixedRateEndDate && Number.isNaN(fixedRateEndDate.getTime()))) {
        return NextResponse.json({ error: "Vul geldige datums in." }, { status: 400 });
      }
      if (endDate && fixedRateEndDate && fixedRateEndDate > endDate) {
        return NextResponse.json({ error: "De rentevaste einddatum kan niet na de hypotheek-einddatum liggen." }, { status: 400 });
      }
      const updated = await prisma.mortgage.update({ where: { id: mortgageId }, data: { endDate, fixedRateEndDate } });
      return NextResponse.json({ mortgage: updated });
    }
    const paymentId = typeof body.paymentId === "string" ? body.paymentId : "";
    if (!paymentId) {
      return NextResponse.json({ error: "Betalings-ID ontbreekt." }, { status: 400 });
    }

    const existing = await prisma.mortgagePayment.findFirst({
      where: { id: paymentId, mortgage: { userId: session.user.id } },
      include: { mortgage: { include: { debt: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Betaling niet gevonden." }, { status: 404 });
    }

    const interestAmount = Number(body.interestAmount);
    const principalAmount = Number(body.principalAmount);
    const extraPrincipal = Number(body.extraPrincipal ?? 0);
    const taxReliefEstimate = Number(body.taxReliefEstimate ?? 0);
    const date = new Date(`${String(body.date || "").slice(0, 10)}T00:00:00.000Z`);
    if ([interestAmount, principalAmount, extraPrincipal, taxReliefEstimate].some(v => !Number.isFinite(v) || v < 0) || Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Vul een geldige datum en niet-negatieve bedragen in." }, { status: 400 });
    }

    const oldReduction = Number(existing.principalAmount) + Number(existing.extraPrincipal);
    const newReduction = principalAmount + extraPrincipal;
    const correctedBalance = Math.round((Number(existing.mortgage.debt.currentBalance) + oldReduction - newReduction) * 100) / 100;
    if (correctedBalance < 0) {
      return NextResponse.json({ error: "De aangepaste aflossing is hoger dan de beschikbare schuld." }, { status: 400 });
    }

    const result = await prisma.$transaction(async tx => {
      const payment = await tx.mortgagePayment.update({
        where: { id: paymentId },
        data: {
          date,
          interestAmount,
          principalAmount,
          extraPrincipal,
          taxReliefEstimate,
          note: typeof body.note === "string" ? body.note.trim() || null : null,
        },
      });
      await tx.debt.update({ where: { id: existing.mortgage.debtId }, data: { currentBalance: correctedBalance } });

      // Herbereken uitsluitend automatisch aangemaakte saldohistoriepunten.
      const payments = await tx.mortgagePayment.findMany({ where: { mortgageId: existing.mortgageId }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] });
      const reductionTotal = payments.reduce((sum, p) => sum + Number(p.principalAmount) + Number(p.extraPrincipal), 0);
      const baseline = Math.round((correctedBalance + reductionTotal) * 100) / 100;
      const activeDates = new Set<string>();
      for (const p of payments) {
        const day = new Date(p.date);
        day.setUTCHours(0, 0, 0, 0);
        const key = day.toISOString();
        if (activeDates.has(key)) continue;
        activeDates.add(key);
        const dayReduction = payments.filter(x => new Date(x.date).toISOString().slice(0, 10) === key.slice(0, 10)).reduce((sum, x) => sum + Number(x.principalAmount) + Number(x.extraPrincipal), 0);
        const beforeDay = payments.filter(x => new Date(x.date).toISOString().slice(0, 10) < key.slice(0, 10)).reduce((sum, x) => sum + Number(x.principalAmount) + Number(x.extraPrincipal), 0);
        const balanceAtDay = Math.max(0, Math.round((baseline - beforeDay - dayReduction) * 100) / 100);
        const prior = await tx.mortgageBalanceHistory.findUnique({ where: { mortgageId_date: { mortgageId: existing.mortgageId, date: day } } });
        if (!prior) {
          await tx.mortgageBalanceHistory.create({ data: { mortgageId: existing.mortgageId, date: day, totalBalance: balanceAtDay, note: "Automatisch bijgewerkt via betalingsregistratie" } });
        } else if (prior.note === "Automatisch bijgewerkt via betalingsregistratie") {
          await tx.mortgageBalanceHistory.update({ where: { id: prior.id }, data: { totalBalance: balanceAtDay } });
        }
      }
      const automaticRows = await tx.mortgageBalanceHistory.findMany({ where: { mortgageId: existing.mortgageId, note: "Automatisch bijgewerkt via betalingsregistratie" } });
      for (const row of automaticRows) {
        if (!activeDates.has(new Date(row.date).toISOString())) {
          await tx.mortgageBalanceHistory.delete({ where: { id: row.id } });
        }
      }
      return { payment, newBalance: correctedBalance };
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Mortgage payment update error:", error);
    return NextResponse.json({ error: "Betaling wijzigen is mislukt." }, { status: 500 });
  }
}

// Verwijder een betalingsregistratie en draai uitsluitend de aflossing terug.
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
    }
    const body = await request.json();

    // Verwijder de hypotheekregistratie, maar behoud de onderliggende schuld in Vermogen.
    if (body.action === "deleteMortgage") {
      const mortgageId = typeof body.mortgageId === "string" ? body.mortgageId : "";
      if (!mortgageId) return NextResponse.json({ error: "Hypotheek-ID ontbreekt." }, { status: 400 });

      const mortgage = await prisma.mortgage.findFirst({
        where: { id: mortgageId, userId: session.user.id },
        select: { id: true, debtId: true },
      });
      if (!mortgage) return NextResponse.json({ error: "Hypotheekdeel niet gevonden." }, { status: 404 });

      await prisma.$transaction(async tx => {
        await tx.mortgagePayment.deleteMany({ where: { mortgageId } });
        await tx.mortgageBalanceHistory.deleteMany({ where: { mortgageId } });
        await tx.mortgageExtraPayment.deleteMany({ where: { mortgageId } });
        await tx.mortgageLoanPart.deleteMany({ where: { mortgageId } });
        await tx.mortgage.delete({ where: { id: mortgageId } });
      });
      return NextResponse.json({ ok: true, debtId: mortgage.debtId });
    }

    const paymentId = typeof body.paymentId === "string" ? body.paymentId : "";
    if (!paymentId) {
      return NextResponse.json({ error: "Betalings-ID ontbreekt." }, { status: 400 });
    }
    const existing = await prisma.mortgagePayment.findFirst({
      where: { id: paymentId, mortgage: { userId: session.user.id } },
      include: { mortgage: { include: { debt: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Betaling niet gevonden." }, { status: 404 });
    }
    const restore = Number(existing.principalAmount) + Number(existing.extraPrincipal);
    const newBalance = Math.round((Number(existing.mortgage.debt.currentBalance) + restore) * 100) / 100;
    const result = await prisma.$transaction(async tx => {
      await tx.mortgagePayment.delete({ where: { id: paymentId } });
      await tx.debt.update({ where: { id: existing.mortgage.debtId }, data: { currentBalance: newBalance } });
      const payments = await tx.mortgagePayment.findMany({ where: { mortgageId: existing.mortgageId }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] });
      const reductionTotal = payments.reduce((sum, p) => sum + Number(p.principalAmount) + Number(p.extraPrincipal), 0);
      const baseline = Math.round((newBalance + reductionTotal) * 100) / 100;
      const dates = [...new Set(payments.map(p => new Date(p.date).toISOString().slice(0, 10)))].sort();
      for (const dateText of dates) {
        const date = new Date(`${dateText}T00:00:00.000Z`);
        const cumulative = payments.filter(p => new Date(p.date).toISOString().slice(0, 10) <= dateText).reduce((sum, p) => sum + Number(p.principalAmount) + Number(p.extraPrincipal), 0);
        const balanceAtDate = Math.max(0, Math.round((baseline - cumulative) * 100) / 100);
        const prior = await tx.mortgageBalanceHistory.findUnique({ where: { mortgageId_date: { mortgageId: existing.mortgageId, date } } });
        if (!prior) await tx.mortgageBalanceHistory.create({ data: { mortgageId: existing.mortgageId, date, totalBalance: balanceAtDate, note: "Automatisch bijgewerkt via betalingsregistratie" } });
        else if (prior.note === "Automatisch bijgewerkt via betalingsregistratie") await tx.mortgageBalanceHistory.update({ where: { id: prior.id }, data: { totalBalance: balanceAtDate } });
      }
      const active = new Set(dates.map(d => `${d}T00:00:00.000Z`));
      const automaticRows = await tx.mortgageBalanceHistory.findMany({ where: { mortgageId: existing.mortgageId, note: "Automatisch bijgewerkt via betalingsregistratie" } });
      for (const row of automaticRows) if (!active.has(new Date(row.date).toISOString())) await tx.mortgageBalanceHistory.delete({ where: { id: row.id } });
      return { newBalance };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Mortgage payment delete error:", error);
    return NextResponse.json({ error: "Betaling verwijderen is mislukt." }, { status: 500 });
  }
}
