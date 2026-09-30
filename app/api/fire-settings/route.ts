
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet ingelogd" },
        { status: 401 }
      );
    }

    const settings = await prisma.fireSettings.upsert({
      where: {
        userId: session.user.id,
      },
      update: {},
      create: {
        userId: session.user.id,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("FIRE instellingen ophalen mislukt:", error);

    return NextResponse.json(
      { error: "Instellingen ophalen mislukt" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet ingelogd" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const fields = [
      "monthlyExpenses",
      "annualReturn",
      "inflation",
      "withdrawalRate",
      "monthlyContribution",
    ] as const;

    const values: Record<string, number> = {};

    for (const field of fields) {
      const value = Number(body[field]);

      if (!Number.isFinite(value)) {
        return NextResponse.json(
          { error: `Ongeldige waarde voor ${field}` },
          { status: 400 }
        );
      }

      values[field] = value;
    }

    if (
      values.monthlyExpenses < 0 ||
      values.monthlyContribution < 0 ||
      values.annualReturn < -100 ||
      values.inflation < -100 ||
      values.withdrawalRate <= 0 ||
      values.withdrawalRate > 100
    ) {
      return NextResponse.json(
        { error: "Een of meer waarden vallen buiten het toegestane bereik." },
        { status: 400 }
      );
    }

    const settings = await prisma.fireSettings.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        monthlyExpenses: values.monthlyExpenses,
        annualReturn: values.annualReturn,
        inflation: values.inflation,
        withdrawalRate: values.withdrawalRate,
        monthlyContribution: values.monthlyContribution,
      },
      create: {
        userId: session.user.id,
        monthlyExpenses: values.monthlyExpenses,
        annualReturn: values.annualReturn,
        inflation: values.inflation,
        withdrawalRate: values.withdrawalRate,
        monthlyContribution: values.monthlyContribution,
      },
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("FIRE instellingen opslaan mislukt:", error);

    return NextResponse.json(
      { error: "Instellingen opslaan mislukt" },
      { status: 500 }
    );
  }
}
