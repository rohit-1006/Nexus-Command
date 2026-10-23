import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Brain,
  Mail,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";
import { StatCard } from "@/components/stat";
import { TrendArea } from "@/components/charts/area";
import { LiveFeed } from "@/components/nerve/live-feed";
import { AgentStrip } from "@/components/nerve/agent-strip";
import {
  agentRepository,
  communicationRepository,
  dealRepository,
  eventRepository,
  financeRepository,
  integrationRepository,
  knowledgeRepository,
  notificationRepository,
  okrRepository,
  socialRepository,
  taskRepository,
  userRepository,
  decisionRepository,
  workflowRepository,
} from "@/lib/repositories";
import { fmtMoney, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const QUADRANTS = [
  {
    title: "Operations",
    href: "/comms",
    icon: Mail,
    tone: "#22d3ee",
    blurb: "Message traffic, deal movement, content cadence.",
    get: async () => {
      const [comms, deals, posts] = await Promise.all([
        communicationRepository.findAll({ limit: 200 }),
        dealRepository.funnel(),
        socialRepository.allPosts(),
      ]);
      return [
        { label: "Unread", value: String(comms.filter((c) => !c.read).length) },
        { label: "Open pipeline", value: fmtMoney(deals.openValue, { compact: true }) },
        { label: "Posts this cycle", value: String(posts.filter((p) => p.status === "PUBLISHED").length) },
      ];
    },
  },
  {
    title: "Intelligence",
    href: "/knowledge",
    icon: Brain,
    tone: "#a78bfa",
    blurb: "Second brain, crew status, strategic memory.",
    get: async () => {
      const [agents, nodes, dumps] = await Promise.all([
        agentRepository.findAll(),
        knowledgeRepository.findAll(),
        knowledgeRepository.pendingDumps(),
      ]);
      return [
        { label: "Agents online", value: `${agents.filter((a) => a.status === "RUNNING" || a.status === "IDLE").length}/${agents.length}` },
        { label: "Knowledge nodes", value: String(nodes.length) },
        { label: "Pending dumps", value: String(dumps.length) },
      ];
    },
  },
  {
    title: "Systems",
    href: "/finances",
    icon: Wallet,
    tone: "#34d399",
    blurb: "Cash, runway, automations and connectors.",
    get: async () => {
      const [runway, integrations, workflows] = await Promise.all([
        financeRepository.runway(),
        integrationRepository.findAll(),
        workflowRepository.findAll(),
      ]);
      return [
        { label: "Cash on hand", value: fmtMoney(runway.cash, { compact: true }) },
        { label: "Runway (neutral)", value: runway.neutralMonths === Infinity ? "∞" : `${runway.neutralMonths}mo` },
        { label: "Connectors live", value: `${integrations.filter((i) => i.status === "CONNECTED").length}/${integrations.length}` },
        { label: "Workflows", value: String(workflows.length) },
      ];
    },
  },
  {
    title: "Strategy",
    href: "/strategy",
    icon: Target,
    tone: "#fbbf24",
    blurb: "OKR momentum, decisions logged, north star.",
    get: async () => {
      const [okrs, decisions, tasks] = await Promise.all([
        okrRepository.findAll(),
        decisionRepository.findAll(),
        taskRepository.countByStatus(),
      ]);
      const open = okrs.filter((o) => o.kind === "OKR");
      const avg = open.length ? Math.round(open.reduce((a, o) => a + o.progress, 0) / open.length) : 0;
      return [
        { label: "Avg OKR progress", value: `${avg}%` },
        { label: "Decisions logged", value: String(decisions.length) },
        { label: "Open tasks", value: String(taskRepositoryOpen(tasks)) },
      ];
    },
  },
];

function taskRepositoryOpen(t: Record<string, number>): number {
  return t.BACKLOG + t.TODO + t.IN_PROGRESS + t.BLOCKED;
}

export default async function NerveCenterPage() {
  const [operator, events, unreadCount, funnel, runway, monthly, okrs, notifications, tasks, agents, commsRecent] =
    await Promise.all([
      userRepository.getOperator(),
      eventRepository.findAll({ limit: 24 }),
      notificationRepository.unreadCount(),
      dealRepository.funnel(),
      financeRepository.runway(),
      financeRepository.monthlySeries(9),
      okrRepository.findAll(),
      notificationRepository.findAll({ limit: 6 }),
      taskRepository.countByStatus(),
      agentRepository.findAll(),
      communicationRepository.findAll({ limit: 8 }),
    ]);

  const openTasks = taskRepositoryOpen(tasks);
  const avgOkr = okrs.filter((o) => o.kind === "OKR");
  const avgOkrPct = avgOkr.length ? Math.round(avgOkr.reduce((a, o) => a + o.progress, 0) / avgOkr.length) : 0;
  const topNotification = notifications[0];
  const agentMap = new Map(agents.map((a) => [a.slug, a]));

  const feed = events.map((e) => ({
    id: e.id,
    type: e.type,
    actor: e.actor,
    summary: e.summary,
    createdAt: e.createdAt.toISOString(),
    priority: e.priority,
  }));

  return (
    <div>
      <div className="grid-backdrop pointer-events-none fixed inset-0 -z-10" />

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="animate-fade-up">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-mut">
            <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulse-dot" />
            Command Post · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Commander on deck, <span className="text-acc">{operator?.name.split(" ")[0] ?? "Operator"}</span>.
          </h1>
          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-mut">
            {topNotification
              ? `Priority signal: “${topNotification.title}” — ${topNotification.body}`
              : "All departments nominal. Revenue is the highest-leverage surface today."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="ok" className="px-2.5 py-1">
            <Sparkles className="h-3 w-3" /> 6 agents running
          </Badge>
          <Badge tone="info" className="px-2.5 py-1">
            <Shield className="h-3 w-3" /> 319 events tracked
          </Badge>
        </div>
      </div>

      <AgentStrip agents={agents} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cash on hand"
          value={fmtMoney(runway.cash, { compact: true })}
          delta={runway.netBurn > 0 ? `+${fmtMoney(runway.netBurn, { compact: true })}/mo` : `${fmtMoney(runway.netBurn, { compact: true })}/mo`}
          deltaTone={runway.netBurn > 0 ? "ok" : "crit"}
          icon={<Wallet className="h-4 w-4" />}
          spark={monthly.map((m) => m.net)}
        />
        <StatCard
          label="Open pipeline"
          value={fmtMoney(funnel.openValue, { compact: true })}
          delta={`weighted ${fmtMoney(funnel.weightedValue, { compact: true })}`}
          deltaTone="neutral"
          icon={<TrendingUp className="h-4 w-4" />}
          sub={`${funnel.leads} leads · ${funnel.proposals} proposals · ${funnel.closed} closed`}
        />
        <StatCard
          label="Runway"
          value={runway.neutralMonths === Infinity ? "∞" : `${runway.neutralMonths} mo`}
          delta={`pessimistic ${runway.pessimisticMonths === Infinity ? "∞" : `${runway.pessimisticMonths} mo`}`}
          deltaTone="neutral"
          icon={<Wallet className="h-4 w-4" />}
          sub={`burn ${fmtMoney(runway.monthlyBurn, { compact: true })}/mo`}
        />
        <StatCard
          label="OKR progress"
          value={`${avgOkrPct}%`}
          delta={`${openTasks} open tasks`}
          deltaTone="neutral"
          icon={<Target className="h-4 w-4" />}
          spark={okrs.map((o) => o.progress)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Cash flow — 9 months</CardTitle>
              <CardDescription>Income vs expense, net highlighted by the ledger</CardDescription>
            </div>
            <Link href="/finances" className="flex items-center gap-1 text-[11px] text-acc hover:underline">
              full ledger <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <TrendArea
              data={monthly}
              series={[
                { key: "income", name: "Income", color: "var(--chart2)" },
                { key: "expense", name: "Expense", color: "var(--chart4)" },
              ]}
              money
              height={240}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Live telemetry</CardTitle>
              <CardDescription>Streaming from the event bus</CardDescription>
            </div>
            <Badge tone="ok">LIVE</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <LiveFeed initial={feed} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent comms</CardTitle>
            <CardDescription>Inbound signals awaiting your attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {commsRecent.map((c) => {
              const contact = (c as { contact?: { name: string } | null }).contact;
              return (
                <Link
                  key={c.id}
                  href="/comms"
                  className="block rounded-lg border border-line bg-panel2 px-3 py-2 transition-colors hover:border-line-strong"
                >
                  <div className="flex items-center gap-2">
                    <StatusDot color={c.read ? "var(--line-strong)" : "var(--acc)"} pulse={!c.read} />
                    <span className="truncate text-xs font-medium">{c.subject ?? "(no subject)"}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-mut2">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-mut">
                    {contact?.name ?? "Unknown"} · {c.preview}
                  </p>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Crew status</CardTitle>
            <CardDescription>Six agents, six departments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {agents.map((a) => (
              <Link key={a.id} href={`/agents?agent=${a.slug}`} className="flex items-center gap-3 rounded-lg border border-line bg-panel2 px-3 py-2 transition-colors hover:border-line-strong">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: `${agentMap.get(a.slug)?.avatarColor ?? "#8b93ff"}22`, border: `1px solid ${agentMap.get(a.slug)?.avatarColor ?? "#8b93ff"}44` }}
                >
                  <Bot className="h-4 w-4" style={{ color: agentMap.get(a.slug)?.avatarColor ?? "#8b93ff" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{a.name}</div>
                  <div className="truncate text-[10px] text-mut">{a.role}</div>
                </div>
                <span className="font-data text-[10px] text-mut2">{a.runsCount} runs</span>
                <StatusDot
                  color={a.status === "RUNNING" ? "var(--ok)" : a.status === "ERROR" ? "var(--crit)" : "var(--mut2)"}
                  pulse={a.status === "RUNNING"}
                />
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Nerve quadrants</CardTitle>
              <CardDescription>Four surfaces, one pulse</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 pt-0">
              {QUADRANTS.map((q) => (
                <Link key={q.title} href={q.href} className="group rounded-lg border border-line bg-panel2 p-3 transition-colors hover:border-line-strong">
                  <div className="flex items-center gap-2">
                    <q.icon className="h-3.5 w-3.5" style={{ color: q.tone }} />
                    <span className="text-xs font-semibold">{q.title}</span>
                    <ArrowRight className="ml-auto h-3 w-3 text-mut2 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-mut">{q.blurb}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Signal inbox</CardTitle>
              <CardDescription>Unread notifications: {unreadCount}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-0">
              {notifications.slice(0, 3).map((n) => (
                <div key={n.id} className="flex items-start gap-2 rounded-lg border border-line bg-panel2 px-3 py-2">
                  <StatusDot color={n.priority === "HIGH" || n.priority === "CRITICAL" ? "var(--crit)" : "var(--warn)"} pulse={!n.read} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold">{n.title}</div>
                    <div className="line-clamp-2 text-[10px] text-mut">{n.body}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}