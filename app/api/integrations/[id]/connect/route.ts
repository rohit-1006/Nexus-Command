import { NextResponse } from "next/server";
import { integrationRepository } from "@/lib/repositories";
import { eventBus } from "@/lib/events/bus";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { apiKey?: string; config?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.apiKey?.trim()) return NextResponse.json({ error: "apiKey is required" }, { status: 400 });

  const integration = await integrationRepository.findById(id);
  if (!integration) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

  const updated = await integrationRepository.connect(id, {
    apiKey: body.apiKey,
    config: body.config ?? {},
  });

  await eventBus.emit({
    type: "INTEGRATION_CONNECTED",
    aggregate: "integration",
    aggregateId: id,
    actor: "operator",
    summary: `${integration.service} connected — key masked, sync simulated`,
    payload: { service: integration.service },
    priority: "LOW",
  });

  return NextResponse.json({ ok: true, integration: updated });
}