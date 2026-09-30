export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      status: "ok",
      database: "connected",
      version: "0.2.0"
    });
  } catch (error) {
    console.error("Finwise health check failed:", error);

    return Response.json(
      {
        status: "error",
        database: "unavailable",
        version: "0.2.0"
      },
      { status: 503 }
    );
  }
}
