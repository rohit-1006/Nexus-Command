import { NextResponse } from "next/server";
import { dealRepository } from "@/lib/repositories";
import { eventBus } from "@/lib/events/bus";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { toStage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.toStage) return NextResponse.json({ error: "toStage is required" }, { status: 400 });

  try {
    const deal = await dealRepository.changeStage(id, { toStage: body.toStage });
    await eventBus.emit({
      type: "DEAL_STAGE_CHANGED",
      aggregate: "deal",
      aggregateId: id,
      actor: "operator",
      summary: `Deal "${deal.title}" moved to ${body.toStage}`,
      payload: { toStage: body.toStage },
      priority: "LOW",
    });
    return NextResponse.json({ ok: true, deal });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Stage change failed" }, { status: 500 });
  }
}