import { Brain, Layers, FileText, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat";
import { KnowledgeGraph, type GraphEdge, type GraphNode } from "@/components/graphs/knowledge-graph";
import { knowledgeRepository } from "@/lib/repositories";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CATEGORY_COLOR: Record<string, string> = {
  concept: "var(--chart2)",
  fact: "var(--chart3)",
  lesson: "var(--chart4)",
  playbook: "var(--chart5)",
  person: "var(--chart6)",
};

export default async function KnowledgePage() {
  const [graph, nodes, dumps, categories] = await Promise.all([
    knowledgeRepository.graph(),
    knowledgeRepository.findAll(),
    knowledgeRepository.brainDumps(),
    knowledgeRepository.byCategory(),
  ]);

  const graphNodes: GraphNode[] = graph.nodes.map((n) => ({
    id: n.id,
    label: n.title,
    kind: n.category,
    importance: n.importance,
  }));
  const graphEdges: GraphEdge[] = graph.edges.map((e) => ({
    source: e.fromId,
    target: e.toId,
    weight: e.strength,
  }));

  const totalImportance = nodes.reduce((a, n) => a + n.importance, 0);
  const pending = dumps.filter((d) => !d.processed).length;

  return (
    <div>
      <PageHeader
        title="Knowledge"
        desc="A living second brain: nodes, edges, and raw brain dumps. Cortex structures the noise into a navigable graph."
        badge={<span className="font-mono text-[10px] text-mut2">{nodes.length} nodes · {graph.edges.length} edges</span>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Knowledge nodes" value={String(nodes.length)} delta={`${graph.edges.length} connections`} icon={<Brain className="h-4 w-4" />} />
        <StatCard label="Categories" value={String(categories.length)} delta="taxonomy live" deltaTone="neutral" icon={<Layers className="h-4 w-4" />} />
        <StatCard label="Pending dumps" value={String(pending)} delta={pending ? "awaiting Cortex" : "all processed"} deltaTone={pending ? "warn" : "ok"} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Total weight" value={String(Math.round(totalImportance))} delta="importance sum" deltaTone="neutral" icon={<Loader2 className="h-4 w-4" />} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Knowledge graph</CardTitle>
            <CardDescription>Force-directed simulation — drag nodes to explore</CardDescription>
          </CardHeader>
          <CardContent>
            <KnowledgeGraph nodes={graphNodes} edges={graphEdges} height={460} />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-4 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Node distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {categories.map((cat) => (
                <div key={cat.category} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLOR[cat.category] ?? "var(--acc)" }} />
                  <span className="flex-1 text-xs capitalize text-ink/90">{cat.category}</span>
                  <span className="font-data text-[10px] text-mut">{cat.count}</span>
                  <span className="font-data text-[9px] text-mut2">{cat.recent} recent</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Brain dumps</CardTitle>
              <CardDescription>Raw thought stream — {pending} waiting for Cortex</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {dumps.slice(0, 6).map((d) => (
                <div key={d.id} className="rounded-lg border border-line bg-panel2 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-data text-[9px] text-mut2">{timeAgo(d.createdAt)}</span>
                    <Badge tone={d.processed ? "ok" : "warn"}>{d.processed ? "processed" : "pending"}</Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-ink/85">{d.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Node index</CardTitle>
          <CardDescription>All {nodes.length} nodes, newest first</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {nodes.slice(0, 18).map((n) => (
              <div key={n.id} className="rounded-lg border border-line bg-panel2 p-3 transition-colors hover:border-line-strong">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: CATEGORY_COLOR[n.category] ?? "var(--acc)" }} />
                  <span className="truncate text-xs font-semibold">{n.title}</span>
                  <Badge tone="muted" className="ml-auto">{n.category}</Badge>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-mut">{n.summary}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-panel3">
                    <div className="h-full rounded-full bg-acc" style={{ width: `${n.importance * 100}%` }} />
                  </div>
                  <span className="font-data text-[9px] text-mut2">imp {n.importance.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}