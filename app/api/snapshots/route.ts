
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

export async function GET() {
  try {
    const userId = await getCurrentUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Niet ingelogd." },
        { status: 401 }
      );
    }

    const snapshots = await prisma.netWorthSnapshot.findMany({
      where: { userId },
      include: {
        assetValues: true,
        debtValues: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error("Snapshot retrieval error:", error);

    return NextResponse.json(
      {
        error: "Er ging iets mis bij het ophalen van de snapshots.",
      },
      { status: 500 }
    );
  }
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

    const date =
      typeof body.date === "string"
        ? new Date(body.date)
        : new Date();

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Ongeldige datum." },
        { status: 400 }
      );
    }

    const note =
      typeof body.note === "string"
        ? body.note.trim()
        : null;

    const assets = await prisma.asset.findMany({
      where: { userId },
    });

    const debts = await prisma.debt.findMany({
      where: { userId },
    });

    const existingSnapshot =
      await prisma.netWorthSnapshot.findUnique({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
      });

    if (existingSnapshot) {
      return NextResponse.json(
        {
          error: "Er bestaat al een snapshot voor deze datum.",
        },
        { status: 409 }
      );
    }

    const snapshot = await prisma.netWorthSnapshot.create({
      data: {
        userId,
        date,
        note,
        assetValues: {
          create: assets.map((asset) => ({
            assetId: asset.id,
            value: asset.currentValue,
          })),
        },
        debtValues: {
          create: debts.map((debt) => ({
            debtId: debt.id,
            value: debt.currentBalance,
          })),
        },
      },
      include: {
        assetValues: true,
        debtValues: true,
      },
    });

    return NextResponse.json(
      { snapshot },
      { status: 201 }
    );
  } catch (error) {
    console.error("Snapshot creation error:", error);

    return NextResponse.json(
      {
        error: "Er ging iets mis bij het opslaan van de snapshot.",
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

    if (!id) {
      return NextResponse.json(
        { error: "Snapshot-ID ontbreekt." },
        { status: 400 }
      );
    }

    const existingSnapshot =
      await prisma.netWorthSnapshot.findFirst({
        where: {
          id,
          userId,
        },
      });

    if (!existingSnapshot) {
      return NextResponse.json(
        { error: "Snapshot niet gevonden." },
        { status: 404 }
      );
    }

    const updateData: {
      date?: Date;
      note?: string | null;
    } = {};

    if (typeof body.date === "string") {
      const date = new Date(body.date);

      if (Number.isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Ongeldige datum." },
          { status: 400 }
        );
      }

      const duplicate =
        await prisma.netWorthSnapshot.findFirst({
          where: {
            userId,
            date,
            id: { not: id },
          },
        });

      if (duplicate) {
        return NextResponse.json(
          {
            error:
              "Er bestaat al een snapshot voor deze datum.",
          },
          { status: 409 }
        );
      }

      updateData.date = date;
    }

    if (typeof body.note === "string" || body.note === null) {
      updateData.note =
        typeof body.note === "string"
          ? body.note.trim()
          : null;
    }

    const snapshot = await prisma.netWorthSnapshot.update({
      where: { id },
      data: updateData,
      include: {
        assetValues: true,
        debtValues: true,
      },
    });

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Snapshot update error:", error);

    return NextResponse.json(
      {
        error: "Er ging iets mis bij het bewerken van de snapshot.",
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
        { error: "Snapshot-ID ontbreekt." },
        { status: 400 }
      );
    }

    const snapshot =
      await prisma.netWorthSnapshot.findFirst({
        where: {
          id,
          userId,
        },
      });

    if (!snapshot) {
      return NextResponse.json(
        { error: "Snapshot niet gevonden." },
        { status: 404 }
      );
    }

    await prisma.netWorthSnapshot.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Snapshot deletion error:", error);

    return NextResponse.json(
      {
        error: "Er ging iets mis bij het verwijderen van de snapshot.",
      },
      { status: 500 }
    );
  }
}
