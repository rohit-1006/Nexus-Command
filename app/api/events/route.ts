import { NextResponse } from "next/server";
import { eventRepository } from "@/lib/repositories";

export async function GET() {
  const events = await eventRepository.findAll({ limit: 30 });
  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      actor: e.actor,
      summary: e.summary,
      priority: e.priority,
      createdAt: e.createdAt,
    })),
  });
}