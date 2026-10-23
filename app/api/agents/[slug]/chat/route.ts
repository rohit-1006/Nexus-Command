import { NextResponse } from "next/server";
import { getAgentDefinition } from "@/lib/agents/registry";
import { chatWithAgent } from "@/lib/agents/runtime";
import { agentRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const definition = getAgentDefinition(slug);
  if (!definition) return NextResponse.json({ error: `Unknown agent: ${slug}` }, { status: 404 });

  const agent = await agentRepository.findBySlug(slug);
  if (!agent) return NextResponse.json({ error: "Agent not registered in DB" }, { status: 404 });

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const { reply, log } = await chatWithAgent(agent, definition, message);
  return NextResponse.json({ reply, log });
}