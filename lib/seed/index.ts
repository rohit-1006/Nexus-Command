import type { PrismaClient } from "@prisma/client";
import type { Communication, Contact, Deal } from "@prisma/client";
import { ensureAgents } from "@/lib/agents/registry";
import { mulberry32, pick } from "@/lib/utils";
import {
  BODY_FRAGMENTS,
  CHANNELS,
  CONTACT_SEED,
  DEAL_TITLES,
  PRIORITIES,
  SENTIMENTS,
  SOURCES,
  SUBJECTS,
} from "@/lib/seed/constants1";
import { POST_TEXTS, SOCIAL_PLATFORMS } from "@/lib/seed/constants2";
import { seedTransactionsAndInvoices } from "@/lib/seed/finance";
import { seedMisc } from "@/lib/seed/misc";

export interface SeedPlan {
  contacts: Contact[];
  deals: Deal[];
  comms: Communication[];
  events: number;
  transactions: number;
}

const rng = mulberry32(1337);

export async function seedAll(prisma: PrismaClient): Promise<SeedPlan> {
  await wipe(prisma);

  const operator = await prisma.user.create({
    data: {
      name: process.env.OPERATOR_NAME || "Jordan Reyes",
      email: "jordan@northstarsystems.io",
      company: process.env.COMPANY_NAME || "Northstar Systems",
      role: "Founder & CEO",
      timezone: process.env.COMPANY_TIMEZONE || "America/New_York",
      onboarded: true,
    },
  });
  void operator;

  await ensureAgents();

  const contacts: Contact[] = [];
  for (const c of CONTACT_SEED) {
    const created = await prisma.contact.create({
      data: {
        name: c.name,
        email: `${c.name.toLowerCase().replace(/[^a-z]+/g, ".")}@${c.company.toLowerCase().replace(/[^a-z]+/g, "")}.io`,
        phone: `+1${String(200 + Math.floor(rng() * 700)).padStart(3, "0")}${String(1000000 + Math.floor(rng() * 8999999))}`,
        company: c.company,
        role: c.role,
        avatarColor: ["#34d399", "#22d3ee", "#818cf8", "#f472b6", "#fbbf24", "#f87171"][Math.floor(rng() * 6)],
        tags: JSON.stringify(c.tags),
        relationshipStage: c.stage,
        sentiment: c.nps != null && c.nps >= 7 ? "POSITIVE" : c.nps != null && c.nps <= 4 ? "NEGATIVE" : "NEUTRAL",
        ltv: c.ltv,
        nps: c.nps,
        engagementScore: Math.floor(40 + rng() * 60),
        source: pick(rng, SOURCES),
        lastTouchAt: new Date(Date.now() - Math.floor(rng() * 20) * 86_400_000),
        createdAt: new Date(Date.now() - Math.floor(rng() * 400) * 86_400_000),
      },
    });
    contacts.push(created);
  }

  const deals: Deal[] = [];
  const stageOrder = ["LEAD", "QUALIFIED", "DISCOVERY", "PROPOSAL", "NEGOTIATION", "CLOSED_WON"] as const;
  const probByStage: Record<string, number> = {
    LEAD: 15, QUALIFIED: 30, DISCOVERY: 45, PROPOSAL: 62, NEGOTIATION: 80, CLOSED_WON: 100,
  };
  for (let i = 0; i < DEAL_TITLES.length; i++) {
    const contact = contacts[Math.floor(rng() * contacts.length)];
    let stage = stageOrder[Math.floor(rng() * 5)];
    if (i === 4) stage = "CLOSED_WON";
    if (i === 9) stage = "NEGOTIATION";
    if (i === 13) stage = "PROPOSAL";
    const value = Math.round((12000 + rng() * 90000) / 500) * 500;
    const created = await prisma.deal.create({
      data: {
        title: DEAL_TITLES[i],
        contactId: contact.id,
        stage,
        value,
        probability: probByStage[stage],
        healthScore: Math.floor(40 + rng() * 55),
        nextAction: pick(rng, ["Send proposal v2", "Book discovery call", "Follow up on pricing", "Intro call with CFO", "Send security questionnaire", "Schedule renewal review"]),
        suggestedMove: "",
        source: pick(rng, SOURCES),
        daysInStage: Math.floor(rng() * 22),
        lastTouchAt: new Date(Date.now() - Math.floor(rng() * 8) * 86_400_000),
        createdAt: new Date(Date.now() - Math.floor(rng() * 120) * 86_400_000),
        closedAt: stage === "CLOSED_WON" ? new Date(Date.now() - Math.floor(rng() * 40) * 86_400_000) : null,
      },
    });
    await prisma.dealStageHistory.create({
      data: {
        dealId: created.id,
        toStage: created.stage,
        at: new Date(Date.now() - Math.floor(rng() * 25) * 86_400_000),
      },
    });
    deals.push(created);
  }

  const comms: Communication[] = [];
  const now = Date.now();
  for (let i = 0; i < 64; i++) {
    const contact = contacts[Math.floor(rng() * contacts.length)];
    const channel = pick(rng, CHANNELS);
    const direction = rng() > 0.45 ? "INBOUND" : "OUTBOUND";
    const body = pick(rng, BODY_FRAGMENTS);
    const created = await prisma.communication.create({
      data: {
        contactId: contact.id,
        channel,
        direction,
        senderName: direction === "INBOUND" ? contact.name.split(" ")[0] ?? contact.name : "Jordan Reyes",
        senderColor: direction === "INBOUND" ? contact.avatarColor : "#34d399",
        subject: channel === "EMAIL" ? pick(rng, SUBJECTS) : null,
        preview: body.slice(0, 120),
        body,
        priority: pick(rng, PRIORITIES),
        sentiment: pick(rng, SENTIMENTS),
        aiSummary: "AI summary: prospect engaging, mid-funnel, positive signal.",
        threadKey: `thread-${contact.id}-${channel}-${Math.floor(i / 2)}`,
        read: rng() > 0.6,
        createdAt: new Date(now - Math.floor(rng() * 45) * 86_400_000 - Math.floor(rng() * 24) * 3_600_000),
      },
    });
    comms.push(created);
  }

  await seedSocial(prisma, now);
  const finance = await seedTransactionsAndInvoices(prisma, now, contacts);
  const misc = await seedMisc(prisma, now, contacts, deals);

  return {
    contacts,
    deals,
    comms,
    events: misc.events,
    transactions: finance.transactions,
  };
}

async function seedSocial(prisma: PrismaClient, now: number): Promise<void> {
  const seriesRows = [];
  const seriesDefs = [
    { name: "Founder Diaries", description: "Weekly build-in-public journal", color: "#22d3ee", score: 87 },
    { name: "SaaS Metrics Deep-Dive", description: "One metric, one breakdown", color: "#34d399", score: 74 },
    { name: "AI Ops Lab", description: "Practical AI workflows for operators", color: "#a78bfa", score: 68 },
  ];
  for (const s of seriesDefs) {
    seriesRows.push(
      await prisma.contentSeries.create({
        data: { name: s.name, description: s.description, color: s.color, performanceScore: s.score },
      }),
    );
  }

  const accounts = [];
  for (const p of SOCIAL_PLATFORMS) {
    const followersHistory: Array<{ date: string; followers: number }> = [];
    let f = Math.floor(p.base * 0.62);
    for (let d = 180; d >= 0; d -= 3) {
      f = Math.floor(f * (1 + (0.004 + rng() * 0.012)));
      followersHistory.push({
        date: new Date(now - d * 86_400_000).toISOString().slice(0, 10),
        followers: f,
      });
    }
    const account = await prisma.socialAccount.create({
      data: {
        platform: p.platform as never,
        handle: p.handle,
        displayName: p.display,
        followerCount: f,
        growthRate: Math.round((2 + rng() * 9) * 10) / 10,
        engagementRate: p.er,
        bestPostingTime: p.time,
        healthScore: Math.floor(65 + rng() * 35),
        followersHistory: JSON.stringify(followersHistory),
        status: ["CONNECTED", "CONNECTED", "CONNECTED", "DEGRADED", "NOT_CONFIGURED"][Math.floor(rng() * 5)] as never,
        connectedAt: new Date(now - 190 * 86_400_000),
      },
    });
    accounts.push(account);
    for (let d = 180; d >= 0; d--) {
      const impressions = Math.floor(300 + rng() * 4200);
      await prisma.socialMetric.create({
        data: {
          accountId: account.id,
          date: new Date(now - d * 86_400_000),
          followers: Math.floor(p.base * (0.6 + ((180 - d) / 180) * 0.55)),
          impressions,
          engagements: Math.floor(impressions * (p.er / 100) * (0.6 + rng())),
        },
      });
    }
  }

  for (let i = 0; i < 46; i++) {
    const account = accounts[Math.floor(rng() * accounts.length)];
    const published = rng() > 0.4;
    await prisma.socialPost.create({
      data: {
        accountId: account.id,
        platform: account.platform,
        content: pick(rng, POST_TEXTS),
        status: published ? "PUBLISHED" : rng() > 0.5 ? "SCHEDULED" : "DRAFT",
        scheduledAt: published ? null : new Date(now + Math.floor(rng() * 14) * 86_400_000),
        publishedAt: published ? new Date(now - Math.floor(rng() * 60) * 86_400_000) : null,
        reach: published ? Math.floor(800 + rng() * 42000) : null,
        likes: published ? Math.floor(20 + rng() * 900) : null,
        comments: published ? Math.floor(rng() * 60) : null,
        shares: published ? Math.floor(rng() * 30) : null,
        seriesId: rng() > 0.5 ? seriesRows[Math.floor(rng() * seriesRows.length)].id : null,
        createdAt: new Date(now - Math.floor(rng() * 60) * 86_400_000),
      },
    });
  }
}

async function wipe(prisma: PrismaClient): Promise<void> {
  await prisma.event.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.workflowRun.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.dealStageHistory.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.socialMetric.deleteMany();
  await prisma.socialPost.deleteMany();
  await prisma.contentSeries.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.knowledgeEdge.deleteMany();
  await prisma.knowledgeNode.deleteMany();
  await prisma.brainDump.deleteMany();
  await prisma.task.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.okr.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.agentMessage.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.user.deleteMany();
}