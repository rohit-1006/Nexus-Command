import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  contactRepository,
  communicationRepository,
  dealRepository,
  financeRepository,
  socialRepository,
  knowledgeRepository,
  taskRepository,
  agentRepository,
  agentRunRepository,
} from "@/lib/repositories";

let contactId = "";
let dealId = "";
let taskId = "";
let messageId = "";
let nodeId = "";
let postId = "";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("contact + communication repositories", () => {
  it("creates a contact", async () => {
    const company = `Repo Co ${Date.now()}`;
    const c = await prisma.contact.create({
      data: {
        name: "Repo Test Client",
        company,
        email: `repo-${Date.now()}@test.dev`,
        role: "Founder",
        tags: '["enterprise"]',
        relationshipStage: "ACTIVE",
        lastTouchAt: new Date(),
      },
    });
    contactId = c.id;
    const found = await contactRepository.findById(contactId);
    expect(found?.name).toBe("Repo Test Client");
    const byCompany = await contactRepository.findByCompany(company);
    expect(byCompany).toHaveLength(1);
  });

  it("creates a validated communication and replies to it", async () => {
    const msg = await communicationRepository.create({
      contactId,
      channel: "EMAIL",
      direction: "INBOUND",
      senderName: "Repo Co",
      subject: "Pricing question",
      preview: "Can you share pricing?",
      body: "Hi, can you share your pricing for a small team?",
      priority: "HIGH",
      sentiment: "POSITIVE",
    });
    messageId = msg.id;
    expect(msg.threadKey).toBeNull();

    await communicationRepository.markRead(messageId);
    const reply = await communicationRepository.sendReply({
      messageId,
      content: "Happy to — here's the pricing page.",
      tone: "professional",
    });
    expect(reply.direction).toBe("OUTBOUND");
    expect(reply.contactId).toBe(contactId);
    expect(reply.threadKey).toBe(`thread-${contactId}-EMAIL`);

    const thread = await communicationRepository.findThread(reply.threadKey!);
    expect(thread).toHaveLength(2);
    const original = await communicationRepository.findById(messageId);
    expect(original?.read).toBe(true);
    expect(original?.threadKey).toBe(reply.threadKey);
  });

  it("rejects replies to unknown messages", async () => {
    await expect(
      communicationRepository.sendReply({ messageId: "nope", content: "hi", tone: "casual" }),
    ).rejects.toThrow("Original message not found");
  });
});

describe("deal repository", () => {
  it("creates a deal with history", async () => {
    const deal = await dealRepository.create({
      title: "Repo Co expansion",
      contactId,
      stage: "DISCOVERY",
      value: 18000,
      probability: 30,
      source: "referral",
    });
    dealId = deal.id;
    expect(deal.healthScore).toBe(60);
    const history = await dealRepository.stageHistory(dealId);
    expect(history).toHaveLength(1);
  });

  it("moves deals between stages and records history", async () => {
    const moved = await dealRepository.changeStage(dealId, { toStage: "PROPOSAL" });
    expect(moved.stage).toBe("PROPOSAL");
    expect(moved.daysInStage).toBe(0);
    const history = await dealRepository.stageHistory(dealId);
    expect(history).toHaveLength(2);
    expect(history[1].from).toBe("DISCOVERY");
    expect(history[1].to).toBe("PROPOSAL");
  });

  it("closing a deal won sets probability and closedAt", async () => {
    const won = await dealRepository.changeStage(dealId, { toStage: "CLOSED_WON" });
    expect(won.probability).toBe(100);
    expect(won.closedAt).not.toBeNull();
  });

  it("aggregates funnel + stage breakdown + velocity", async () => {
    const funnel = await dealRepository.funnel();
    expect(funnel.closed).toBeGreaterThanOrEqual(1);
    expect(funnel.wonValue).toBeGreaterThanOrEqual(18000);
    const stages = await dealRepository.stageBreakdown();
    const won = stages.find((s) => s.stage === "CLOSED_WON");
    expect(won?.value).toBeGreaterThanOrEqual(18000);
    const vel = await dealRepository.velocity();
    expect(vel.avgCycleDays).toBe(0);
    const rev = await dealRepository.revenueByDay(7);
    expect(rev).toHaveLength(7);
  });
});

describe("task repository", () => {
  it("creates tasks with defaults and validation", async () => {
    const task = await taskRepository.create({
      title: "Ship repo test task",
      priority: "P1",
      department: "OPERATIONS",
      dependencies: [],
    });
    taskId = task.id;
    expect(task.status).toBe("BACKLOG");
    expect(task.estimateHours).toBe(2);
    await expect(taskRepository.create({ title: "x" })).rejects.toThrow(/invalid/);
  });

  it("moves tasks and marks completion", async () => {
    const moved = await taskRepository.move(taskId, "IN_PROGRESS");
    expect(moved.status).toBe("IN_PROGRESS");
    const done = await taskRepository.move(taskId, "DONE");
    expect(done.completedAt).not.toBeNull();
    const counts = await taskRepository.countByStatus();
    expect(counts.DONE).toBeGreaterThanOrEqual(1);
    expect(counts.BACKLOG + counts.TODO + counts.IN_PROGRESS + counts.BLOCKED + counts.DONE).toBeGreaterThan(0);
  });
});

describe("finance repository", () => {
  it("records transactions and summarizes", async () => {
    await financeRepository.create({
      date: new Date().toISOString(),
      description: "Test payout",
      amount: 4200,
      type: "INCOME",
      category: "INCOME_PRODUCT",
    });
    const all = await financeRepository.findTransactions({ type: "INCOME" });
    const income = all.reduce((a, t) => a + t.amount, 0);
    expect(income).toBeGreaterThanOrEqual(4200);
    expect(await financeRepository.currentCash()).toBeGreaterThanOrEqual(4200);
  });

  it("produces a pnl statement", async () => {
    const st = await financeRepository.statements({ kind: "pnl", months: 3 });
    if (st.kind !== "pnl") throw new Error("expected pnl");
    expect(st.kind).toBe("pnl");
    expect(st.months.length).toBeGreaterThan(0);
    const current = st.months[st.months.length - 1];
    expect(current.income).toBeGreaterThanOrEqual(4200);
  });

  it("computes runway and cashflow", async () => {
    const runway = await financeRepository.runway();
    expect(runway.cash).toBeGreaterThanOrEqual(0);
    const cf = await financeRepository.cashFlow(3);
    expect(cf.months).toHaveLength(3);
    expect(cf.months[0].cumulative).toBeDefined();
  });
});

describe("social repository", () => {
  it("creates posts and aggregates metrics", async () => {
    const post = await socialRepository.createPost({
      platform: "LINKEDIN",
      content: "Testing the social engine",
      status: "DRAFT",
    });
    postId = post.id;
    expect(post.status).toBe("DRAFT");
    const published = await socialRepository.publishPost(postId);
    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedAt).not.toBeNull();
    await expect(socialRepository.aggregateMetrics()).resolves.toMatchObject({ impressions: 0, engagements: 0 });
    await expect(
      socialRepository.createPost({ platform: "FACEBOOK", content: "x" }),
    ).rejects.toThrow(/invalid/);
  });
});

describe("knowledge repository", () => {
  it("creates nodes with links and queries them", async () => {
    const node = await knowledgeRepository.create({
      title: "Pricing philosophy",
      summary: "How we think about pricing",
      content: "We price on outcomes for small teams.",
      category: "DECISION",
      importance: 90,
      tags: ["pricing", "strategy"],
    });
    nodeId = node.id;
    const second = await knowledgeRepository.create({
      title: "Pricing tiers",
      summary: "Current tiers",
      content: "Starter, Growth, Scale tiers.",
      category: "PRODUCT",
      links: [nodeId],
    });
    const edge = await prisma.knowledgeEdge.findFirst({ where: { fromId: second.id, toId: nodeId } });
    expect(edge?.relationType).toBe("RELATED");
    const results = await knowledgeRepository.queryInterface({ question: "pricing tiers" });
    if (!Array.isArray(results)) throw new Error(String(results.error));
    expect(results.length).toBeGreaterThan(0);
    const found = results.find((r) => r.nodeId === second.id);
    expect(found).toBeDefined();
  });

  it("brain dumps round-trip", async () => {
    const dump = await knowledgeRepository.createBrainDump({ content: "Remember to review pricing tiers quarterly." });
    expect(dump.processed).toBe(false);
    const pending = await knowledgeRepository.pendingDumps();
    expect(pending.some((d) => d.id === dump.id)).toBe(true);
    await knowledgeRepository.markDumpProcessed(dump.id, nodeId);
    const updated = await knowledgeRepository.brainDumps();
    expect(updated.find((d) => d.id === dump.id)?.processed).toBe(true);
  });
});

describe("agent repository", () => {
  it("creates agents and records runs", async () => {
    await prisma.agent.deleteMany({ where: { slug: "test-agent" } });
    const agent = await agentRepository.create({
      slug: "test-agent",
      name: "Test Agent",
      department: "OPERATIONS",
      role: "Test runner",
      personality: "Deterministic and friendly.",
      capabilities: ["test"],
      memoryContext: "",
      config: {},
      avatarColor: "#34d399",
      avatarIcon: "Bot",
    });
    const run = await agentRunRepository.create({
      agentId: agent.id,
      status: "SUCCESS",
      summary: "Ran a test",
      log: ["step 1", "step 2"],
      input: "run test",
      output: { ok: true },
      durationMs: 12,
    });
    expect(run.status).toBe("SUCCESS");
    const recent = await agentRunRepository.findRecent();
    expect(recent.some((r) => r.id === run.id)).toBe(true);
    const bySlug = await agentRepository.findBySlug("test-agent");
    expect(bySlug?.name).toBe("Test Agent");
    const agentRuns = await agentRunRepository.findForAgent(agent.id);
    expect(agentRuns).toHaveLength(1);
  });
});