import { NextResponse } from "next/server";
import { seedAll } from "@/lib/seed";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const counts = await seedAll(prisma);
    return NextResponse.json({
      ok: true,
      summary: `contacts ${counts.contacts} · deals ${counts.deals} · comms ${counts.comms} · transactions ${counts.transactions} · events ${counts.events}`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Reseed failed" },
      { status: 500 },
    );
  }
}