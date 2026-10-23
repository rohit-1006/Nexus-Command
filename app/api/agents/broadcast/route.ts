import { NextResponse } from "next/server";
import { AGENT_DEFINITIONS } from "@/lib/agents/registry";
import { runAgent } from "@/lib/agents/runtime";
import { agentMessageRepository, agentRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { directive?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const directive = body.directive?.trim() ?? "Standing directive from the operator";

  const agents = await agentRepository.findAll();
  const results: Array<{ slug: string; status: string; summary: string }> = [];

  for (const agent of agents) {
    const definition = AGENT_DEFINITIONS.find((d) => d.slug === agent.slug);
    if (!definition) continue;
    try {
      const result = await runAgent(agent, definition, directive);
      results.push({ slug: agent.slug, status: "COMPLETED", summary: result.summary });
    } catch {
      results.push({ slug: agent.slug, status: "FAILED", summary: "Run failed" });
    }
  }

  await agentMessageRepository.send({
    agentId: agents.find((a) => a.slug === "conductor")?.id ?? "",
    senderName: "Operator",
    kind: "BROADCAST",
    content: directive,
    targetId: "all-agents",
  });

  return NextResponse.json({ directive, results });
}