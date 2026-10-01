
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

    const mortgage = await prisma.mortgage.findFirst({
      where: {
        userId,
      },
      include: {
        debt: true,
        loanParts: {
          orderBy: {
            createdAt: "asc",
          },
        },
        balanceHistory: {
          orderBy: {
            date: "desc",
          },
        },
        extraPayments: {
          orderBy: {
            startDate: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      mortgage,
    });
  } catch (error) {
    console.error("Mortgage fetch error:", error);

    return NextResponse.json(
      {
        error: "Er ging iets mis bij het ophalen van de hypotheek.",
      },
      { status: 500 }
    );
  }
}
