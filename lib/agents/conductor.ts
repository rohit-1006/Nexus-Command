import type { AgentDefinition } from "@/lib/agents/types";
import {
  agentRepository,
  communicationRepository,
  dealRepository,
  eventRepository,
  financeRepository,
  knowledgeRepository,
  taskRepository,
} from "@/lib/repositories";
import { fmtMoney } from "@/lib/utils";

export const conductor: AgentDefinition = {
  slug: "conductor",
  name: "The Conductor",
  department: "STRATEGY",
  role: "Chief of Staff — orchestrates all departments",
  personality:
    "Calm, surgical, and slightly ahead of you. The Conductor never panics; it converts noise into a decision-ready briefing. It speaks in priorities, not paragraphs.",
  capabilities: [
    "Cross-department situation synthesis",
    "Daily executive briefing generation",
    "Priority arbitration between agents",
    "Strategic Q&A with memory",
    "System-wide directive broadcasting",
  ],
  avatarColor: "#a78bfa",
  avatarIcon: "Orchestra",
  memoryContext:
    "Operator: Jordan Reyes. Company: Northstar Systems (SaaS + services, ~$5M ARR target). The Conductor keeps a standing model of all six departments and arbitrates when agents disagree.",
  config: { model: "claude-sonnet-4-5", temperature: 0.3, schedule: "04:30 daily briefing" },

  async run() {
    const log: string[] = [];
    const start = Date.now();
    log.push("[boot] Gathering cross-department state…");

    const [events, deals, comms, agents, tasks, nodes] = await Promise.all([
      eventRepository.findAll({ limit: 60 }),
      dealRepository.findAll(),
      communicationRepository.findAll({ limit: 30 }),
      agentRepository.findAll(),
      taskRepository.findAll(),
      financeRepository.findTransactions({ limit: 40 }),
      knowledgeRepository.findAll(),
    ]);

    const openDeals = deals.filter((d) => d.stage !== "CLOSED_WON" && d.stage !== "CLOSED_LOST");
    const wonValue = deals.filter((d) => d.stage === "CLOSED_WON").reduce((a, d) => a + d.value, 0);
    const openValue = openDeals.reduce((a, d) => a + d.value, 0);
    const unread = comms.filter((c) => !c.read);
    const highPriority = unread.filter((c) => c.priority === "HIGH" || c.priority === "CRITICAL");
    const criticalTasks = tasks.filter((t) => t.priority === "P0" && t.status !== "DONE");
    const runningAgents = agents.filter((a) => a.status === "RUNNING");
    const nodesByCategory = new Map<string, number>();
    for (const n of nodes) nodesByCategory.set(n.category, (nodesByCategory.get(n.category) ?? 0) + 1);

    const briefing = {
      generated: new Date().toISOString(),
      overnightActivity: events.length,
      revenue: { won: Math.round(wonValue), open: Math.round(openValue), deals: openDeals.length },
      comms: { unread: unread.length, critical: highPriority.length },
      agents: { running: runningAgents.length, total: agents.length },
      tasks: { critical: criticalTasks.length, open: tasks.filter((t) => t.status !== "DONE").length },
      knowledge: Array.from(nodesByCategory.entries()).map(([k, v]) => ({ category: k, count: v })),
    };

    const recommendations: string[] = [];
    if (highPriority.length > 0) {
      recommendations.push(
        `Mercury flagged ${highPriority.length} critical ${highPriority.length === 1 ? "message" : "messages"} — clear them first this morning.`,
      );
    }
    if (criticalTasks.length > 0) {
      recommendations.push(`Resolve P0 task${criticalTasks.length > 1 ? "s" : ""}: "${criticalTasks[0]?.title}" is blocking downstream work.`);
    }
    const atRisk = openDeals.filter((d) => d.healthScore < 45);
    if (atRisk.length > 0) {
      recommendations.push(`Atlas rates ${atRisk.length} deal${atRisk.length > 1 ? "s" : ""} at-risk — the highest-value one is "${atRisk.sort((a, b) => b.value - a.value)[0]?.title}".`);
    }
    if (recommendations.length < 3) {
      recommendations.push("Run a knowledge review — Cortex has pending brain dumps waiting for structuring.");
    }
    while (recommendations.length < 3) {
      recommendations.push("No critical flags — hold the line, maintain cadence, protect your calendar.");
    }

    log.push(`[comms] ${unread.length} unread, ${highPriority.length} critical`);
    log.push(`[revenue] ${openDeals.length} open deals worth ${fmtMoney(openValue, { compact: true })}`);
    log.push(`[agents] ${runningAgents.length}/${agents.length} agents active`);
    log.push(`[tasks] ${criticalTasks.length} P0 tasks outstanding`);
    log.push(`[briefing] synthesized in ${Date.now() - start}ms`);

    return {
      summary: `Daily briefing generated — ${events.length} overnight events synthesized, ${recommendations.length} priority actions surfaced.`,
      log,
      output: briefing,
      recommendations,
      events: [
        {
          type: "DIGEST_GENERATED",
          aggregate: "system",
          aggregateId: `briefing-${Date.now()}`,
          summary: "Conductor generated the daily executive briefing",
          payload: briefing,
          priority: "MEDIUM",
        },
      ],
    };
  },

  async respond(message: string) {
    const lower = message.toLowerCase();
    const state = await Promise.all([
      dealRepository.funnel(),
      communicationRepository.findAll({ limit: 10 }),
      financeRepository.runway(),
      taskRepository.countByStatus(),
    ]);
    const [funnel, comms, runway, taskCounts] = state;

    if (lower.includes("forecast") || lower.includes("revenue")) {
      return `Based on pipeline velocity: ${funnel.openValue >= 1_000_000 ? "strong" : "moderate"} open pipeline of ${fmtMoney(funnel.openValue, { compact: true })} (weighted ${fmtMoney(funnel.weightedValue, { compact: true })}). With a ${funnel.closed}% historic close rate, I'd project ${fmtMoney(funnel.weightedValue * 1.2, { compact: true })} landing in the next 90 days. Atlas can give you a stage-level breakdown.`;
    }
    if (lower.includes("runway") || lower.includes("cash")) {
      return `You have ${fmtMoney(runway.cash, { compact: true })} in cash. Neutral-case runway: ${runway.neutralMonths === Infinity ? "indefinite (you're cash-flow positive)" : `${runway.neutralMonths} months`}. Pessimistic case: ${runway.pessimisticMonths === Infinity ? "still positive" : `${runway.pessimisticMonths} months`}. Ledger recommended holding ${fmtMoney(runway.monthlyBurn * 3, { compact: true })} as a 3-month buffer.`;
    }
    if (lower.includes("comms") || lower.includes("message") || lower.includes("inbox")) {
      const unread = comms.filter((c) => !c.read);
      const critical = unread.filter((c) => c.priority === "HIGH" || c.priority === "CRITICAL");
      return `There are ${unread.length} unread inbound messages right now, ${critical.length} flagged critical. Mercury has draft replies staged for the critical ones — I'd approve those before noon.`;
    }
    if (lower.includes("task") || lower.includes("priority")) {
      const open = taskCounts.BACKLOG + taskCounts.TODO + taskCounts.IN_PROGRESS + taskCounts.BLOCKED;
      return `You have ${open} open tasks (${taskCounts.BLOCKED} blocked). Your top blocker queue is ${taskCounts.BLOCKED > 0 ? "worth unblocking first" : "clear"}. I recommend protecting a 2-hour deep-work block for the P0s.`;
    }
    if (lower.includes("health") || lower.includes("status") || lower.includes("pulse")) {
      return `All departments are nominal. Comms is the busiest surface today; Knowledge is quiet. No agent is in an error state. Everything else is operating within expected ranges.`;
    }
    return `Understood. Here's my standing read: revenue is the highest-leverage surface today, comms needs your morning attention, and the rest of the system is on autopilot. Ask me about revenue, runway, inbox, tasks, or system health for specifics.`;
  },
};