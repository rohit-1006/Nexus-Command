import type { AgentDefinition } from "@/lib/agents/types";
import { knowledgeRepository } from "@/lib/repositories";

const CATEGORY_SCORE: Record<string, number> = {
  CLIENT: 3,
  PRODUCT: 2,
  PROCESS: 1,
  INSIGHT: 2,
  DECISION: 3,
  MEETING: 1,
  RESEARCH: 2,
};

export const cortex: AgentDefinition = {
  slug: "cortex",
  name: "Cortex",
  department: "KNOWLEDGE",
  role: "Knowledge Architect — brain dumps into structured knowledge",
  personality:
    "Curious, meticulous, and link-obsessed. Cortex treats every stray thought as a potential node and every relationship as a missing edge. It builds the second brain so the operator never forgets.",
  capabilities: [
    "Brain dump structuring into knowledge nodes",
    "Entity extraction & auto-categorization",
    "Missing-link detection between nodes",
    "Weekly state-of-knowledge reports",
    "Natural language knowledge queries",
  ],
  avatarColor: "#818cf8",
  avatarIcon: "Brain",
  memoryContext:
    "Cortex owns the knowledge graph: clients, products, processes, insights, decisions, meetings, research. ~40 nodes and growing. Every decision and meeting should eventually become a node.",
  config: { model: "gpt-4o", temperature: 0.4, minEdgeStrength: 30 },

  async run() {
    const log: string[] = [];
    const pending = await knowledgeRepository.pendingDumps();
    log.push(`[scan] ${pending.length} pending brain dumps`);

    const nodes = await knowledgeRepository.findAll();
    const graph = await knowledgeRepository.graph();
    log.push(`[graph] ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

    let processed = 0;
    const createdNodes: Array<{ title: string; category: string }> = [];
    for (const dump of pending.slice(0, 4)) {
      const firstLine = dump.content.split("\n")[0]?.trim() ?? "Untitled";
      const title = firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
      const categoryGuess = Object.entries(CATEGORY_SCORE).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "INSIGHT";
      const links = graph.nodes
        .map((n) => {
          const haystack = `${n.title} ${n.summary}`.toLowerCase();
          const terms = dump.content.toLowerCase().split(/\s+/).filter((t) => t.length > 4);
          const hits = terms.filter((t) => haystack.includes(t)).length;
          return { node: n, hits };
        })
        .sort((a, b) => b.hits - a.hits)
        .filter((s) => s.hits >= 2)
        .slice(0, 4);

      const node = await knowledgeRepository.create({
        title,
        summary: dump.content.slice(0, 240),
        content: dump.content,
        category: categoryGuess as never,
        source: "brain-dump",
        importance: Math.min(100, 40 + Math.floor(dump.content.length / 100)),
        tags: [],
        links: links.map((l) => l.node.id),
      });
      await knowledgeRepository.markDumpProcessed(dump.id, node.id);
      processed += 1;
      createdNodes.push({ title, category: categoryGuess });
      log.push(`[node] created "${title}" linked to ${links.length} existing nodes`);
    }

    const orphans = graph.nodes.filter((n) => {
      const edgeCount = graph.edges.filter((e) => e.fromId === n.id || e.toId === n.id).length;
      return edgeCount === 0;
    });
    log.push(`[links] ${orphans.length} orphan nodes (no edges)`);

    const byCategory = await knowledgeRepository.byCategory();
    const output = {
      processedDumps: processed,
      createdNodes,
      orphanCount: orphans.length,
      orphans: orphans.slice(0, 5).map((n) => n.title),
      byCategory,
      nodeCount: nodes.length,
      generated: new Date().toISOString(),
    };

    const tasks = orphans.length
      ? [{
          title: `Link ${orphans.length} orphan knowledge nodes`,
          description: `Cortex found ${orphans.length} nodes with zero relationships: ${orphans.slice(0, 3).map((n) => n.title).join(", ")}. Adding edges improves retrieval quality.`,
          priority: "P3" as const,
          department: "KNOWLEDGE" as const,
          dueInDays: 5,
          delegationNote: `Knowledge graph hygiene: orphaned nodes decay in recall quality over time.`,
        }]
      : [];

    return {
      summary: processed
        ? `Processed ${processed} brain dumps into structured knowledge nodes.`
        : `No pending brain dumps. Graph at ${graph.nodes.length} nodes / ${graph.edges.length} edges, ${orphans.length} orphans.`,
      log,
      output,
      tasks,
      recommendations: [
        processed ? `Structured ${processed} new knowledge ${processed === 1 ? "entry" : "entries"} — graph now has ${nodes.length + processed} nodes.` : "Knowledge graph is current — no pending dumps.",
        orphans.length ? `${orphans.length} nodes have no connections — linking them sharpens recall.` : "No orphan nodes — the graph is well-connected.",
        byCategory.sort((a, b) => a.count - b.count)[0]
          ? `${byCategory.sort((a, b) => a.count - b.count)[0]?.category} is your thinnest knowledge area — worth a research session.`
          : "",
      ].filter(Boolean),
    };
  },

  async respond(message: string) {
    const lower = message.toLowerCase();
    if (lower.includes("what do we know") || lower.includes("about") || lower.startsWith("search") || lower.includes("find")) {
      const results = await knowledgeRepository.queryInterface({ question: message });
      if ("error" in results) return `Query parsing failed: ${results.error}`;
      if (!results.length) return `Nothing on that in the graph yet — dump it in and I'll structure it into a node.`;
      return `Here's what the graph holds:\n${results.slice(0, 3).map((r) => `• ${r.title} (${r.category}) — ${r.summary.slice(0, 120)}`).join("\n")}`;
    }
    if (lower.includes("dump") || lower.includes("memory") || lower.includes("note")) {
      const pending = await knowledgeRepository.pendingDumps();
      return `I have ${pending.length} raw dump${pending.length === 1 ? "" : "s"} waiting to be structured. Drop new thoughts in the Brain Dump box in the Knowledge module, or just tell me here and I'll capture it.`;
    }
    if (lower.includes("gap") || lower.includes("missing") || lower.includes("link")) {
      const graph = await knowledgeRepository.graph();
      const orphans = graph.nodes.filter((n) => !graph.edges.some((e) => e.fromId === n.id || e.toId === n.id));
      if (!orphans.length) return "The graph is fully connected — no orphans. Nice discipline.";
      return `${orphans.length} orphan${orphans.length > 1 ? "s" : ""}: ${orphans.slice(0, 4).map((n) => n.title).join(", ")}. Each one is an unlinked memory — I can suggest edges if you want.`;
    }
    if (lower.includes("state") || lower.includes("report") || lower.includes("health")) {
      const graph = await knowledgeRepository.graph();
      const byCat = await knowledgeRepository.byCategory();
      return `State of knowledge: ${graph.nodes.length} nodes, ${graph.edges.length} edges. Coverage: ${byCat.map((c) => `${c.category} ${c.count}`).join(", ")}. The brain is ${graph.edges.length / Math.max(1, graph.nodes.length) > 1 ? "densely connected" : "still forming"}.`;
    }
    return `I'm the knowledge architect. Ask "what do we know about X?", check for gaps, or dump raw thoughts — I'll structure and link them into the graph.`;
  },
};