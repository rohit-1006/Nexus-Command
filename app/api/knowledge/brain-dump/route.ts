import { NextResponse } from "next/server";
import { knowledgeRepository } from "@/lib/repositories";
import { eventBus } from "@/lib/events/bus";
import { safe } from "@/lib/repositories/base";
import { brainDumpSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = safe(brainDumpSchema, body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const dump = await knowledgeRepository.createBrainDump({ content: parsed.data.content });
  await eventBus.emit({
    type: "BRAIN_DUMP_CREATED",
    aggregate: "knowledge",
    aggregateId: dump.id,
    actor: "operator",
    summary: "Brain dump captured — Cortex will structure it",
    payload: { dumpId: dump.id },
    priority: "LOW",
  });
  return NextResponse.json({ ok: true, dump });
}