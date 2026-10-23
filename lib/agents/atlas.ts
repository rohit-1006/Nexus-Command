import type { AgentDefinition } from "@/lib/agents/types";
import { communicationRepository, dealRepository } from "@/lib/repositories";
import { clamp, fmtMoney } from "@/lib/utils";

const PROBABILITY_BY_STAGE: Record<string, number> = {
  LEAD: 15,
  QUALIFIED: 30,
  DISCOVERY: 45,
  PROPOSAL: 62,
  NEGOTIATION: 80,
};

export const atlas: AgentDefinition = {
  slug: "atlas",
  name: "Atlas",
  department: "REVENUE",
  role: "Revenue Strategist — pipeline scoring, forecasting, churn radar",
  personality:
    "Numerical, unsentimental, and relentlessly forward-looking. Atlas treats every deal as a probability distribution and every dead week as a pipeline gap to fix.",
  capabilities: [
    "Deal health scoring (0-100)",
    "Close probability & next-move suggestions",
    "30/60/90 forecasting with confidence bands",
    "Lead source & acquisition analysis",
    "Churn early-warning signals",
  ],
  avatarColor: "#34d399",
  avatarIcon: "Chart",
  memoryContext:
    "Atlas owns the revenue nervous system. Historical close rate and stage dwell times inform every forecast. Health scores under 45 trigger operator alerts.",
  config: { model: "gpt-4o", temperature: 0.2, forecastHorizon: 90 },

  async run() {
    const log: string[] = [];
    const deals = await dealRepository.findAll();
    const open = deals.filter((d) => d.stage !== "CLOSED_WON" && d.stage !== "CLOSED_LOST");
    log.push(`[scan] ${open.length} open deals loaded`);

    const scores: Array<{ dealId: string; healthScore: number; suggestedMove: string; probability: number }> = [];
    const atRisk: typeof open = [];
    for (const deal of open) {
      const dwell = deal.daysInStage;
      const hasContact = await communicationRepository.findForContact(deal.contactId, 3);
      const recency = hasContact.length ? (Date.now() - (hasContact[0]?.createdAt.getTime() ?? Date.now())) / 86_400_000 : 99;
      let health = 55;
      health += Math.min(25, (deal.probability - 10) / 4);
      health += Math.max(-20, 20 - recency * 2);
      health -= Math.min(25, Math.max(0, dwell - 10) * 1.5);
      health = Math.round(clamp(health, 5, 98));
      if (health < 45) atRisk.push(deal);

      const suggested =
        health < 40
          ? "Immediate personal outreach — this deal is cooling."
          : recency > 7
            ? "Schedule a pulse check; last touch was a week ago."
            : dwell > 14
              ? "Nudge with a concrete deliverable to restart momentum."
              : "Maintain cadence — next touch in 3 days with new value.";

      scores.push({
        dealId: deal.id,
        healthScore: health,
        suggestedMove: suggested,
        probability: Math.round(clamp((PROBABILITY_BY_STAGE[deal.stage] ?? 20) + (health - 55) / 5, 5, 95)),
      });
    }
    await dealRepository.applyHealthScores(scores);
    log.push(`[scoring] health scores applied across ${scores.length} deals`);
    log.push(`[risk] ${atRisk.length} deals flagged at-risk (<45)`);

    const funnel = await dealRepository.funnel();
    const velocity = await dealRepository.velocity();
    const sources = await dealRepository.sourceBreakdown();

    const days = 90;
    const dailyRate = Math.max(0.15, velocity.openValue / Math.max(1, days));
    const forecast = Array.from({ length: days }, (_, i) => {
      const base = dailyRate * (i + 1) * (velocity.closeRate / 100);
      const band = 0.12 + (i / days) * 0.1;
      return {
        day: i + 1,
        expected: Math.round(base),
        low: Math.round(base * (1 - band)),
        high: Math.round(base * (1 + band)),
      };
    });

    const weakestSource = sources.sort((a, b) => a.count - b.count)[0];
    const output = {
      atRiskDeals: atRisk.map((d) => ({ title: d.title, value: d.value, health: d.healthScore })),
      forecast,
      funnel,
      velocity,
      sources,
      pipelineGap: weakestSource,
      generated: new Date().toISOString(),
    };

    const tasks = atRisk
      .slice(0, 3)
      .map((d) => ({
        title: `Stabilize "${d.title}"`,
        description: `Health score ${d.healthScore}/100, ${d.daysInStage}d in stage, last touch recency is the drag factor. Suggested move: ${d.suggestedMove}`,
        priority: "P1" as const,
        department: "REVENUE" as const,
        dueInDays: 2,
        delegationNote: `Atlas churn radar: deal value ${fmtMoney(d.value, { compact: true })} at risk of stalling.`,
      }));

    const notifications = atRisk.length
      ? [{
          title: `${atRisk.length} deal${atRisk.length > 1 ? "s" : ""} cooling — churn early warning`,
          body: atRisk
            .slice(0, 3)
            .map((d) => `${d.title} (${fmtMoney(d.value, { compact: true })}, health ${d.healthScore})`)
            .join(", "),
          priority: "HIGH" as const,
          category: "revenue",
          link: "/revenue",
        }]
      : [];

    return {
      summary: `Scored ${scores.length} deals, flagged ${atRisk.length} at-risk, generated ${days}-day forecast.`,
      log,
      output,
      tasks,
      notifications,
      recommendations: [
        atRisk.length
          ? `Re-engage the ${atRisk[0]?.title} deal today — highest value at risk (${fmtMoney(atRisk[0]?.value ?? 0, { compact: true })}).`
          : "Pipeline health is green across the board.",
        weakestSource
          ? `${weakestSource.source} is your thinnest lead source (${weakestSource.count} deals) — consider a campaign.`
          : "Lead sources are balanced.",
        `Forecast: ${fmtMoney(forecast[days - 1]?.expected ?? 0, { compact: true })} expected over 90 days at current velocity.`,
      ],
    };
  },

  async respond(message: string) {
    const lower = message.toLowerCase();
    if (lower.includes("forecast") || lower.includes("project")) {
      const funnel = await dealRepository.funnel();
      const velocity = await dealRepository.velocity();
      return `90-day view: open pipeline ${fmtMoney(funnel.openValue, { compact: true })}, weighted ${fmtMoney(funnel.weightedValue, { compact: true })}. Historic close rate ${velocity.closeRate}%. At velocity I expect ${fmtMoney(funnel.weightedValue * 1.15, { compact: true })} to land — call it ${fmtMoney(funnel.weightedValue * 0.9, { compact: true })} conservatively.`;
    }
    if (lower.includes("risk") || lower.includes("health") || lower.includes("churn")) {
      const deals = await dealRepository.findOpen();
      const bad = deals.filter((d) => d.healthScore < 45).sort((a, b) => b.value - a.value);
      if (!bad.length) return "No deals below my 45-point at-risk threshold. Pipeline health is nominal.";
      return `${bad.length} deal${bad.length > 1 ? "s" : ""} are at risk: ${bad.map((d) => `${d.title} (${d.healthScore}, ${fmtMoney(d.value, { compact: true })})`).join("; ")}. The pattern is almost always dwell time — each one needs a re-engagement touch this week.`;
    }
    if (lower.includes("next move") || lower.includes("next step") || lower.includes("action")) {
      const deals = await dealRepository.findOpen();
      const top = deals.sort((a, b) => b.value * b.probability - a.value * a.probability)[0];
      if (!top) return "No open deals to advise on.";
      return `Highest-leverage move right now: ${top.title} (${fmtMoney(top.value, { compact: true })} @ ${top.probability}%). Suggested next action: ${top.suggestedMove || "maintain cadence"}. Next action on file: "${top.nextAction}".`;
    }
    return `I run the numbers on every deal: health scores, close probability, dwell time, forecast bands, and lead-source gaps. Ask me about the forecast, at-risk deals, or the single highest-leverage next move.`;
  },
};