import type { Deal, DealStage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/repositories/base";
import { dealCreateSchema, dealStageChangeSchema, dealUpdateSchema, idSchema } from "@/lib/schemas";

const STAGE_ORDER: DealStage[] = ["LEAD", "QUALIFIED", "DISCOVERY", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"];

export function stageIndex(stage: DealStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export const dealRepository = {
  async findAll(): Promise<Array<Deal & { contact: { name: string; company: string; email: string } }>> {
    return prisma.deal.findMany({
      orderBy: [{ stage: "asc" }, { value: "desc" }],
      include: {
        contact: { select: { name: true, company: true, email: true, avatarColor: true } },
      },
    });
  },

  async findById(id: string): Promise<Deal | null> {
    return prisma.deal.findUnique({ where: { id }, include: { contact: true } });
  },

  async findOpen(): Promise<Deal[]> {
    return prisma.deal.findMany({
      where: { stage: { in: ["LEAD", "QUALIFIED", "DISCOVERY", "PROPOSAL", "NEGOTIATION"] } },
      orderBy: { value: "desc" },
      include: { contact: true },
    });
  },

  async create(input: unknown): Promise<Deal> {
    const data = safe(dealCreateSchema, input);
    if (!data.ok) throw new Error(`deal.create invalid: ${data.error}`);
    const deal = await prisma.deal.create({
      data: {
        title: data.data.title,
        contactId: data.data.contactId,
        stage: data.data.stage,
        value: data.data.value,
        probability: data.data.probability,
        healthScore: 60,
        nextAction: data.data.nextAction,
        suggestedMove: "",
        source: data.data.source,
        daysInStage: 0,
        lastTouchAt: new Date(),
      },
    });
    await prisma.dealStageHistory.create({
      data: { dealId: deal.id, toStage: data.data.stage, at: new Date() },
    });
    return deal;
  },

  async update(id: string, input: unknown): Promise<Deal> {
    const data = safe(dealUpdateSchema, input);
    if (!data.ok) throw new Error(`deal.update invalid: ${data.error}`);
    const { title, value, probability, nextAction, source, stage } = data.data;
    return prisma.deal.update({
      where: { id },
      data: {
        title,
        value,
        probability,
        nextAction,
        source,
        stage,
      },
    });
  },

  async changeStage(id: string, input: unknown): Promise<Deal> {
    const data = safe(dealStageChangeSchema, input);
    if (!data.ok) throw new Error(`deal.stage invalid: ${data.error}`);
    const current = await prisma.deal.findUnique({ where: { id } });
    if (!current) throw new Error("Deal not found");
    if (current.stage === data.data.toStage) return current;
    const updated = await prisma.deal.update({
      where: { id },
      data: {
        stage: data.data.toStage,
        daysInStage: 0,
        lastTouchAt: new Date(),
        ...(data.data.toStage === "CLOSED_WON" || data.data.toStage === "CLOSED_LOST"
          ? { closedAt: new Date(), probability: data.data.toStage === "CLOSED_WON" ? 100 : 0 }
          : {}),
      },
    });
    await prisma.dealStageHistory.create({
      data: { dealId: id, fromStage: current.stage, toStage: data.data.toStage, at: new Date() },
    });
    return updated;
  },

  async applyHealthScores(scores: Array<{ dealId: string; healthScore: number; suggestedMove: string; probability: number }>): Promise<void> {
    for (const s of scores) {
      await prisma.deal.update({
        where: { id: s.dealId },
        data: { healthScore: s.healthScore, suggestedMove: s.suggestedMove, probability: s.probability },
      });
    }
  },

  async stageBreakdown() {
    const deals = await prisma.deal.findMany();
    const stages = STAGE_ORDER.map((stage) => {
      const inStage = deals.filter((d) => d.stage === stage);
      return {
        stage,
        count: inStage.length,
        value: inStage.reduce((a, d) => a + d.value, 0),
      };
    });
    return stages;
  },

  async funnel() {
    const deals = await prisma.deal.findMany();
    const count = (s: DealStage) => deals.filter((d) => d.stage === s).length;
    const won = deals.filter((d) => d.stage === "CLOSED_WON");
    const open = deals.filter((d) => d.stage !== "CLOSED_WON" && d.stage !== "CLOSED_LOST");
    const qualified = deals.filter((d) => stageIndex(d.stage) >= stageIndex("QUALIFIED"));
    return {
      leads: count("LEAD"),
      qualified: count("QUALIFIED"),
      proposals: count("PROPOSAL") + count("NEGOTIATION"),
      closed: won.length,
      openValue: open.reduce((a, d) => a + d.value, 0),
      wonValue: won.reduce((a, d) => a + d.value, 0),
      qualifiedValue: qualified.reduce((a, d) => a + d.value, 0),
      weightedValue: open.reduce((a, d) => a + (d.value * d.probability) / 100, 0),
    };
  },

  async sourceBreakdown() {
    const deals = await prisma.deal.findMany();
    const groups = new Map<string, { count: number; value: number; won: number }>();
    for (const d of deals) {
      const g = groups.get(d.source) ?? { count: 0, value: 0, won: 0 };
      g.count += 1;
      g.value += d.value;
      if (d.stage === "CLOSED_WON") g.won += 1;
      groups.set(d.source, g);
    }
    return Array.from(groups.entries()).map(([source, g]) => ({ source, ...g }));
  },

  async revenueByDay(days: number) {
    const won = await prisma.deal.findMany({
      where: { stage: "CLOSED_WON", closedAt: { not: null } },
      select: { value: true, closedAt: true },
    });
    const byDay = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const deal of won) {
      if (!deal.closedAt) continue;
      const key = deal.closedAt.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + deal.value);
    }
    return Array.from(byDay.entries()).map(([date, value]) => ({ date, value }));
  },

  async velocity() {
    const open = await prisma.deal.findMany({
      where: { stage: { in: ["LEAD", "QUALIFIED", "DISCOVERY", "PROPOSAL", "NEGOTIATION"] } },
    });
    const closed = await prisma.deal.findMany({ where: { stage: { in: ["CLOSED_WON", "CLOSED_LOST"] } } });
    const won = closed.filter((d) => d.stage === "CLOSED_WON");
    return {
      openCount: open.length,
      openValue: open.reduce((a, d) => a + d.value, 0),
      weightedValue: open.reduce((a, d) => a + (d.value * d.probability) / 100, 0),
      closeRate: closed.length ? Math.round((won.length / closed.length) * 100) : 0,
      avgCycleDays: 0, // computed by Atlas agent from stage history where available
    };
  },

  async stageHistory(dealId: string) {
    const history = await prisma.dealStageHistory.findMany({
      where: { dealId },
      orderBy: { at: "asc" },
    });
    return history.map((h) => ({
      from: h.fromStage,
      to: h.toStage,
      at: h.at,
    }));
  },
};

export function parseDealId(input: unknown): { id: string } | { error: string } {
  const parsed = safe(idSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return { id: parsed.data };
}