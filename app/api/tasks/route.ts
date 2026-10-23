import { NextResponse } from "next/server";
import { taskRepository } from "@/lib/repositories";
import { eventBus } from "@/lib/events/bus";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const task = await taskRepository.create(body);
    await eventBus.emit({
      type: "TASK_CREATED",
      aggregate: "task",
      aggregateId: task.id,
      actor: "operator",
      summary: `Task created: "${task.title}"`,
      payload: { priority: task.priority },
      priority: "MEDIUM",
    });
    return NextResponse.json({ ok: true, task });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Task creation failed" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.id || !body.status) return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  try {
    const task = await taskRepository.move(body.id, body.status);
    await eventBus.emit({
      type: "TASK_STATUS_CHANGED",
      aggregate: "task",
      aggregateId: body.id,
      actor: "operator",
      summary: `"${task.title}" → ${body.status}`,
      payload: { status: body.status },
      priority: "LOW",
    });
    return NextResponse.json({ ok: true, task });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Move failed" }, { status: 500 });
  }
}