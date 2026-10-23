import { NextResponse } from "next/server";
import { workflowRepository } from "@/lib/repositories";
import { eventBus } from "@/lib/events/bus";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { trigger?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const workflow = await workflowRepository.findById(id);
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const started = Date.now();
  const ok = Math.random() > 0.1;
  const trace = [
    { step: "trigger", status: "ok", detail: body.trigger ?? "manual" },
    { step: "execute", status: ok ? "ok" : "error", detail: ok ? "steps completed" : "timeout on third-party call" },
  ];

  await workflowRepository.recordRun(id, ok ? "COMPLETED" : "FAILED", body.trigger ?? "manual", trace);
  await eventBus.emit({
    type: ok ? "WORKFLOW_RUN_COMPLETED" : "WORKFLOW_RUN_FAILED",
    aggregate: "workflow",
    aggregateId: id,
    actor: "operator",
    summary: `Workflow "${workflow.name}" ${ok ? "completed" : "failed"}`,
    payload: { trace },
    priority: ok ? "LOW" : "HIGH",
  });

  return NextResponse.json({ ok, workflow: workflow.name, durationMs: Date.now() - started, trace });
}