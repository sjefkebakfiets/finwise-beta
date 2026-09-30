import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const allowedTypes = [
  "BANK",
  "SAVINGS",
  "INVESTMENT",
  "CRYPTO",
  "PROPERTY",
  "VEHICLE",
  "OTHER",
] as const;

type AssetType = (typeof allowedTypes)[number];

async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return session.user.id;
}

function isValidAssetType(type: string): type is AssetType {
  return allowedTypes.includes(type as AssetType);
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

    const value = Number(body.value);

    if (!name) {
      return NextResponse.json(
        { error: "Naam is verplicht." },
        { status: 400 }
      );
    }

    if (!isValidAssetType(type)) {
      return NextResponse.json(
        { error: "Ongeldig type bezitting." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(value) || value < 0) {
      return NextResponse.json(
        { error: "Ongeldige waarde." },
        { status: 400 }
      );
    }

    const asset = await prisma.asset.create({
      data: {
        userId,
        name,
        type,
        currentValue: value,
      },
    });

    return NextResponse.json(
      { asset },
      { status: 201 }
    );
  } catch (error) {
    console.error("Asset creation error:", error);

    return NextResponse.json(
      {
        error: "Er ging iets mis bij het opslaan van de bezitting.",
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

    const value = Number(body.value);

    if (!id) {
      return NextResponse.json(
        { error: "Bezitting-ID ontbreekt." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Naam is verplicht." },
        { status: 400 }
      );
    }

    if (!isValidAssetType(type)) {
      return NextResponse.json(
        { error: "Ongeldig type bezitting." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(value) || value < 0) {
      return NextResponse.json(
        { error: "Ongeldige waarde." },
        { status: 400 }
      );
    }

    const existingAsset = await prisma.asset.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingAsset) {
      return NextResponse.json(
        { error: "Bezitting niet gevonden." },
        { status: 404 }
      );
    }

    const asset = await prisma.asset.update({
      where: {
        id,
      },
      data: {
        name,
        type,
        currentValue: value,
      },
    });

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Asset update error:", error);

    return NextResponse.json(
      {
        error: "Er ging iets mis bij het aanpassen van de bezitting.",
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
        { error: "Bezitting-ID ontbreekt." },
        { status: 400 }
      );
    }

    const existingAsset = await prisma.asset.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingAsset) {
      return NextResponse.json(
        { error: "Bezitting niet gevonden." },
        { status: 404 }
      );
    }

    await prisma.asset.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Asset deletion error:", error);

    return NextResponse.json(
      {
        error: "Er ging iets mis bij het verwijderen van de bezitting.",
      },
      { status: 500 }
    );
  }
}