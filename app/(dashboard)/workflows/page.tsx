import { Workflow, Zap, PlayCircle, History } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat";
import { WorkflowRunButton } from "@/components/workflows/run-button";
import { workflowRepository, parseDefinition } from "@/lib/repositories";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const [workflows, runs] = await Promise.all([
    workflowRepository.findAll(),
    workflowRepository.runs(undefined, 12),
  ]);

  const totalRuns = workflows.reduce((a, w) => a + w.runsCount, 0);
  const successRate = workflows.length
    ? Math.round(workflows.reduce((a, w) => a + w.successRate, 0) / workflows.length)
    : 0;
  const active = workflows.filter((w) => w.status === "ACTIVE").length;

  return (
    <div>
      <PageHeader
        title="Workflows"
        desc="Automation with a paper trail. Every run is traced, every failure is honest, every node is inspectable."
        badge={<span className="font-mono text-[10px] text-mut2">{active} active · {totalRuns} runs</span>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Workflows" value={String(workflows.length)} delta={`${active} active`} deltaTone={active ? "ok" : "warn"} icon={<Workflow className="h-4 w-4" />} />
        <StatCard label="Total runs" value={String(totalRuns)} delta="all-time" deltaTone="neutral" icon={<PlayCircle className="h-4 w-4" />} />
        <StatCard label="Avg success" value={`${successRate}%`} delta={successRate >= 80 ? "healthy" : "watch"} deltaTone={successRate >= 80 ? "ok" : "warn"} icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Failed (recent)" value={String(runs.filter((r) => r.status === "FAILED").length)} delta="last 12 runs" deltaTone="neutral" icon={<History className="h-4 w-4" />} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {workflows.map((wf) => {
          const def = parseDefinition(wf);
          return (
            <Card key={wf.id}>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {wf.name}
                    <Badge tone={wf.status === "ACTIVE" ? "ok" : wf.status === "PAUSED" ? "warn" : "muted"}>{wf.status}</Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">{wf.description}</CardDescription>
                </div>
                <WorkflowRunButton workflowId={wf.id} />
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex items-center gap-2 text-[10px] text-mut2">
                  <span className="font-semibold uppercase tracking-wider text-mut">Trigger:</span>
                  <span className="font-mono">{def.trigger.label}</span>
                </div>
                <div className="space-y-1">
                  {def.nodes.map((node, i) => (
                    <div key={node.id} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-panel2 font-mono text-[9px] text-mut">
                        {i + 1}
                      </span>
                      <span className="font-mono text-[10px] text-ink/85">{node.type}</span>
                      <span className="text-[10px] text-mut">·</span>
                      <span className="truncate text-[10px] text-mut">{node.label}</span>
                      {i < def.nodes.length - 1 && <span className="ml-auto h-px flex-1 bg-line" />}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-line pt-2.5 text-[10px] text-mut2">
                  <span><span className="font-data font-bold text-ink">{wf.runsCount}</span> runs</span>
                  <span><span className={wf.successRate >= 80 ? "font-data font-bold text-ok" : "font-data font-bold text-warn"}>{wf.successRate}%</span> success</span>
                  <span className="ml-auto">created {timeAgo(wf.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run history</CardTitle>
          <CardDescription>Traceable executions — tap a run to see its steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {runs.map((run) => (
              <div key={run.id} className="flex items-center gap-3 rounded-lg border border-line bg-panel2 px-3 py-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: run.status === "COMPLETED" ? "var(--ok)" : "var(--crit)", boxShadow: `0 0 6px ${run.status === "COMPLETED" ? "var(--ok)" : "var(--crit)"}` }}
                />
                <span className="w-40 truncate text-xs font-semibold">{run.workflow.name}</span>
                <span className="hidden font-mono text-[10px] text-mut sm:block">trigger: {run.trigger}</span>
                <span className="ml-auto font-data text-[10px] text-mut2">{new Date(run.startedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}