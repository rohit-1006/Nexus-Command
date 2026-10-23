import { NextResponse } from "next/server";
import { conductor } from "@/lib/agents/registry";
import { agentRepository } from "@/lib/repositories";
import { runAgent } from "@/lib/agents/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const agent = await agentRepository.findBySlug("conductor");
  if (!agent) return NextResponse.json({ error: "Conductor not registered" }, { status: 404 });

  const result = await runAgent(agent, conductor, "Scheduled daily briefing");
  return NextResponse.json({
    briefing: result.summary,
    recommendations: result.recommendations,
    output: result.output,
    log: result.log,
  });
}