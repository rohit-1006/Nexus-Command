import { NextResponse } from "next/server";
import { conductor } from "@/lib/agents/registry";
import { agentRepository } from "@/lib/repositories";
import { chatWithAgent } from "@/lib/agents/runtime";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const agent = await agentRepository.findBySlug("conductor");
  if (!agent) return NextResponse.json({ error: "Conductor not registered" }, { status: 404 });

  const { reply } = await chatWithAgent(agent, conductor, message);
  return NextResponse.json({ reply });
}