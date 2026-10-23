import type { BrainDump, KnowledgeEdge, KnowledgeNode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/repositories/base";
import { brainDumpSchema, idSchema, knowledgeNodeCreateSchema, knowledgeQuerySchema } from "@/lib/schemas";

export const knowledgeRepository = {
  async findAll(): Promise<Array<KnowledgeNode & { _count: { edgesFrom: number; edgesTo: number } }>> {
    return prisma.knowledgeNode.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { edgesFrom: true, edgesTo: true } } },
    });
  },

  async findById(id: string): Promise<KnowledgeNode | null> {
    return prisma.knowledgeNode.findUnique({
      where: { id },
      include: {
        edgesFrom: { include: { to: true } },
        edgesTo: { include: { from: true } },
      },
    });
  },

  async graph() {
    const [nodes, edges] = await Promise.all([
      prisma.knowledgeNode.findMany({ select: { id: true, title: true, category: true, importance: true, summary: true } }),
      prisma.knowledgeEdge.findMany({ select: { id: true, fromId: true, toId: true, strength: true, relationType: true } }),
    ]);
    return { nodes, edges };
  },

  async create(input: unknown): Promise<KnowledgeNode> {
    const data = safe(knowledgeNodeCreateSchema, input);
    if (!data.ok) throw new Error(`knowledge.create invalid: ${data.error}`);
    const node = await prisma.knowledgeNode.create({
      data: {
        title: data.data.title,
        summary: data.data.summary,
        content: data.data.content,
        category: data.data.category,
        source: data.data.source,
        importance: data.data.importance,
        tags: JSON.stringify(data.data.tags),
      },
    });
    for (const link of data.data.links) {
      await prisma.knowledgeEdge.create({
        data: { fromId: node.id, toId: link, relationType: "RELATED", strength: 50 },
      });
    }
    return node;
  },

  async update(id: string, patch: Partial<Pick<KnowledgeNode, "title" | "summary" | "content" | "importance" | "tags">>): Promise<KnowledgeNode> {
    return prisma.knowledgeNode.update({
      where: { id },
      data: { ...patch, updatedAt: new Date(), ...(patch.tags ? { tags: JSON.stringify(patch.tags) } : {}) },
    });
  },

  async addEdge(input: { fromId: string; toId: string; relationType: string; strength: number; description?: string }): Promise<KnowledgeEdge> {
    const existing = await prisma.knowledgeEdge.findFirst({
      where: { fromId: input.fromId, toId: input.toId },
    });
    if (existing) return existing;
    return prisma.knowledgeEdge.create({ data: input });
  },

  async byCategory() {
    const nodes = await prisma.knowledgeNode.findMany({ select: { category: true, createdAt: true } });
    const groups = new Map<string, { count: number; recent: number }>();
    for (const n of nodes) {
      const g = groups.get(n.category) ?? { count: 0, recent: 0 };
      g.count += 1;
      if (Date.now() - n.createdAt.getTime() < 14 * 86_400_000) g.recent += 1;
      groups.set(n.category, g);
    }
    return Array.from(groups.entries()).map(([category, g]) => ({ category, ...g }));
  },

  async brainDumps(): Promise<BrainDump[]> {
    return prisma.brainDump.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  },

  async createBrainDump(input: unknown): Promise<BrainDump> {
    const data = safe(brainDumpSchema, input);
    if (!data.ok) throw new Error(`brainDump invalid: ${data.error}`);
    return prisma.brainDump.create({ data: { content: data.data.content } });
  },

  async markDumpProcessed(id: string, nodeId: string): Promise<BrainDump> {
    return prisma.brainDump.update({ where: { id }, data: { processed: true, nodeId } });
  },

  async pendingDumps(): Promise<BrainDump[]> {
    return prisma.brainDump.findMany({ where: { processed: false }, orderBy: { createdAt: "asc" }, take: 20 });
  },

  async search(term: string, limit = 8): Promise<KnowledgeNode[]> {
    return prisma.knowledgeNode.findMany({
      where: {
        OR: [{ title: { contains: term } }, { summary: { contains: term } }, { content: { contains: term } }],
      },
      orderBy: { importance: "desc" },
      take: limit,
    });
  },

  async queryInterface(input: unknown) {
    const data = safe(knowledgeQuerySchema, input);
    if (!data.ok) return { error: data.error };
    const question = data.data.question;
    const terms = question.toLowerCase().split(/\s+/).filter((t) => t.length > 3).slice(0, 6);
    const nodes = await prisma.knowledgeNode.findMany({ take: 60 });
    const scored = nodes
      .map((node) => {
        const haystack = `${node.title} ${node.summary} ${node.content} ${node.tags}`.toLowerCase();
        let score = 0;
        for (const t of terms) if (haystack.includes(t)) score += 1;
        if (haystack.includes(question.toLowerCase())) score += 5;
        return { node, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return scored.map((s) => ({
      nodeId: s.node.id,
      title: s.node.title,
      category: s.node.category,
      summary: s.node.summary,
      snippet: s.node.content.slice(0, 300),
      relevance: s.score,
    }));
  },
};

export function parseKnowledgeId(input: unknown): { id: string } | { error: string } {
  const parsed = safe(idSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return { id: parsed.data };
}