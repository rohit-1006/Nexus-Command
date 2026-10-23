import { NextResponse } from "next/server";
import { getAgentDefinition } from "@/lib/agents/registry";
import { runAgent } from "@/lib/agents/runtime";
import { agentRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const definition = getAgentDefinition(slug);
  if (!definition) return NextResponse.json({ error: `Unknown agent: ${slug}` }, { status: 404 });

  const agent = await agentRepository.findBySlug(slug);
  if (!agent) return NextResponse.json({ error: "Agent not registered in DB" }, { status: 404 });

  let body: { reason?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* reason optional */
  }

  const result = await runAgent(agent, definition, body.reason ?? "Manual trigger");
  return NextResponse.json({
    slug,
    summary: result.summary,
    log: result.log,
    recommendations: result.recommendations,
    output: result.output,
  });
}