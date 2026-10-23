import { prisma } from "@/lib/db";

export interface SearchResult {
  id: string;
  label: string;
  subtitle: string;
  category: "Contact" | "Agent" | "Knowledge" | "Task" | "Route" | "Deal" | "Invoice" | "Series";
  href: string;
  meta?: string;
}

const ROUTES: Array<{ label: string; href: string; keywords: string }> = [
  { label: "Nerve Center", href: "/", keywords: "home overview dashboard nerve center mission briefing" },
  { label: "Communications", href: "/comms", keywords: "comms email slack whatsapp sms messages inbox" },
  { label: "Revenue", href: "/revenue", keywords: "revenue crm deals pipeline sales forecast funnel" },
  { label: "Social", href: "/social", keywords: "social twitter linkedin instagram youtube tiktok content" },
  { label: "Finances", href: "/finances", keywords: "finance money expenses invoices cashflow runway tax" },
  { label: "Agents", href: "/agents", keywords: "agents ai automation conductor mercury atlas ledger muse cortex" },
  { label: "Knowledge", href: "/knowledge", keywords: "knowledge graph brain second brain notes memory" },
  { label: "Tasks", href: "/tasks", keywords: "tasks kanban todo backlog priorities" },
  { label: "Workflows", href: "/workflows", keywords: "workflows automation triggers actions canvas" },
  { label: "Integrations", href: "/integrations", keywords: "integrations api connectors webhooks stripe gmail" },
  { label: "Analytics", href: "/analytics", keywords: "analytics kpi reports metrics charts" },
  { label: "Strategy", href: "/strategy", keywords: "strategy okr roadmap decisions venture" },
  { label: "Clients", href: "/clients", keywords: "clients customers relationships segments" },
  { label: "Settings", href: "/settings", keywords: "settings preferences profile theme" },
];

export async function searchIndex(): Promise<SearchResult[]> {
  const [contacts, agents, nodes, tasks, deals, invoices, series] = await Promise.all([
    prisma.contact.findMany({ take: 60, select: { id: true, name: true, company: true, role: true } }),
    prisma.agent.findMany({ take: 20, select: { slug: true, name: true, role: true, department: true } }),
    prisma.knowledgeNode.findMany({ take: 80, select: { id: true, title: true, category: true } }),
    prisma.task.findMany({ take: 40, select: { id: true, title: true, status: true, priority: true } }),
    prisma.deal.findMany({ take: 40, select: { id: true, title: true, value: true, stage: true } }),
    prisma.invoice.findMany({ take: 40, select: { id: true, number: true, status: true, amount: true } }),
    prisma.contentSeries.findMany({ take: 20, select: { id: true, name: true, description: true } }),
  ]);

  const results: SearchResult[] = [];

  for (const c of contacts) {
    results.push({
      id: c.id,
      label: c.name,
      subtitle: `${c.role} · ${c.company}`,
      category: "Contact",
      href: `/clients?contact=${c.id}`,
    });
  }
  for (const a of agents) {
    results.push({
      id: a.slug,
      label: `${a.name}`,
      subtitle: a.role,
      category: "Agent",
      href: `/agents?agent=${a.slug}`,
      meta: a.department,
    });
  }
  for (const n of nodes) {
    results.push({
      id: n.id,
      label: n.title,
      subtitle: "Knowledge node",
      category: "Knowledge",
      href: `/knowledge?node=${n.id}`,
      meta: n.category,
    });
  }
  for (const t of tasks) {
    results.push({
      id: t.id,
      label: t.title,
      subtitle: "Task",
      category: "Task",
      href: `/tasks?task=${t.id}`,
      meta: `${t.priority} · ${t.status}`,
    });
  }
  for (const d of deals) {
    results.push({
      id: d.id,
      label: d.title,
      subtitle: "Deal",
      category: "Deal",
      href: `/revenue?deal=${d.id}`,
      meta: `${d.stage} · $${Math.round(d.value).toLocaleString()}`,
    });
  }
  for (const i of invoices) {
    results.push({
      id: i.id,
      label: i.number,
      subtitle: "Invoice",
      category: "Invoice",
      href: `/finances?invoice=${i.id}`,
      meta: `${i.status} · $${Math.round(i.amount).toLocaleString()}`,
    });
  }
  for (const s of series) {
    results.push({
      id: s.id,
      label: s.name,
      subtitle: "Content series",
      category: "Series",
      href: `/social?series=${s.id}`,
    });
  }
  for (const r of ROUTES) {
    results.push({
      id: r.href,
      label: r.label,
      subtitle: "Route",
      category: "Route",
      href: r.href,
      meta: r.keywords,
    });
  }

  return results;
}

export function scoreSearch(results: SearchResult[], q: string): SearchResult[] {
  const query = q.trim().toLowerCase();
  if (!query) return results.slice(0, 24);
  const scored = results
    .map((r) => {
      const haystack = `${r.label} ${r.subtitle} ${r.category} ${r.meta ?? ""}`.toLowerCase();
      let score = 0;
      for (const token of query.split(/\s+/)) {
        if (haystack.includes(token)) score += 2;
        if (r.label.toLowerCase().startsWith(token)) score += 3;
        if (r.label.toLowerCase().includes(token)) score += 1;
      }
      if (haystack.includes(query)) score += 4;
      return { r, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 24).map((s) => s.r);
}