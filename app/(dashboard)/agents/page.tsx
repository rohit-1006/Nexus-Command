import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentCrewGrid } from "@/components/agents/crew-grid";
import { agentRepository, agentRunRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const [agents, recentRuns] = await Promise.all([
    agentRepository.findAll(),
    agentRunRepository.findRecent(10),
  ]);

  return (
    <div>
      <PageHeader
        title="Agents"
        desc="The crew: six specialists with distinct departments, memories, and cadences. Trigger runs, read their logs, talk to them."
        badge={<span className="font-mono text-[10px] text-mut2">{agents.length} crew members</span>}
      />

      <AgentCrewGrid agents={agents} />

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
          <CardDescription>Latest executions across the crew</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {recentRuns.map((run) => (
            <div key={run.id} className="flex items-center gap-3 rounded-lg border border-line bg-panel2 px-3 py-2.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: run.status === "COMPLETED" ? "var(--ok)" : "var(--crit)",
                  boxShadow: `0 0 6px ${run.status === "COMPLETED" ? "var(--ok)" : "var(--crit)"}`,
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold">{run.agent.name}</div>
                <p className="truncate text-[10px] text-mut">{run.summary}</p>
              </div>
              <span className="hidden font-data text-[10px] text-mut2 sm:block">{run.durationMs}ms</span>
              <span className="font-data text-[10px] text-mut2">{new Date(run.startedAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}