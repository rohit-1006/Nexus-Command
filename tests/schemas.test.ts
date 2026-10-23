import { describe, it, expect } from "vitest";
import {
  idSchema,
  agentCreateSchema,
  agentChatSchema,
  replySendSchema,
  dealCreateSchema,
  dealStageChangeSchema,
  socialPostCreateSchema,
  transactionCreateSchema,
  invoiceCreateSchema,
  statementRequestSchema,
  brainDumpSchema,
  knowledgeNodeCreateSchema,
  taskCreateSchema,
  workflowRunSchema,
  integrationConnectSchema,
  searchSchema,
} from "@/lib/schemas";

describe("schemas — scalars", () => {
  it("idSchema accepts slugs and cuid-like ids", () => {
    expect(idSchema.safeParse("abc123").success).toBe(true);
    expect(idSchema.safeParse("").success).toBe(false);
  });

  it("searchSchema defaults q", () => {
    expect(searchSchema.parse({}).q).toBe("");
    expect(searchSchema.parse({ q: "lead" }).q).toBe("lead");
  });
});

describe("schemas — agents", () => {
  it("validates a full agent", () => {
    const ok = agentCreateSchema.safeParse({
      slug: "mercury",
      name: "Mercury",
      department: "COMMS",
      role: "Comms lead",
      personality: "Sharp, warm, proactive.",
      capabilities: ["email", "slack"],
    });
    expect(ok.success).toBe(true);
  });

  it("rejects bad slugs", () => {
    const bad = agentCreateSchema.safeParse({
      slug: "Mercury_1",
      name: "Mercury",
      department: "COMMS",
      role: "x",
      personality: "y",
      capabilities: [],
    });
    expect(bad.success).toBe(false);
  });

  it("rejects invalid departments", () => {
    const bad = agentCreateSchema.safeParse({
      slug: "mercury",
      name: "Mercury",
      department: "NOPE",
      role: "x",
      personality: "y",
      capabilities: [],
    });
    expect(bad.success).toBe(false);
  });

  it("chat message must be non-empty", () => {
    expect(agentChatSchema.safeParse({ message: "" }).success).toBe(false);
    expect(agentChatSchema.safeParse({ message: "hello" }).success).toBe(true);
  });
});

describe("schemas — revenue", () => {
  it("validates deal creation with defaults", () => {
    const parsed = dealCreateSchema.parse({
      title: "Acme renewal",
      contactId: "c1",
      value: 12000,
    });
    expect(parsed.stage).toBe("LEAD");
    expect(parsed.probability).toBe(10);
    expect(parsed.source).toBe("organic");
  });

  it("rejects negative deal values", () => {
    expect(dealCreateSchema.safeParse({ title: "x", contactId: "c1", value: -1 }).success).toBe(false);
  });

  it("validates stage changes", () => {
    expect(dealStageChangeSchema.safeParse({ toStage: "CLOSED_WON" }).success).toBe(true);
    expect(dealStageChangeSchema.safeParse({ toStage: "NOPE" }).success).toBe(false);
  });
});

describe("schemas — social", () => {
  it("validates a post", () => {
    const parsed = socialPostCreateSchema.parse({
      platform: "LINKEDIN",
      content: "Post body",
      scheduledAt: new Date().toISOString(),
    });
    expect(parsed.status).toBe("DRAFT");
  });

  it("rejects unknown platforms", () => {
    expect(socialPostCreateSchema.safeParse({ platform: "FACEBOOK", content: "x" }).success).toBe(false);
  });
});

describe("schemas — finances", () => {
  it("validates transactions", () => {
    const parsed = transactionCreateSchema.parse({
      date: new Date().toISOString(),
      description: "Stripe payout",
      amount: 2400,
      type: "INCOME",
      category: "INCOME_PRODUCT",
    });
    expect(parsed.recurring).toBe(false);
  });

  it("rejects NaN amounts", () => {
    expect(
      transactionCreateSchema.safeParse({
        date: new Date().toISOString(),
        description: "x",
        amount: NaN,
        type: "INCOME",
        category: "INCOME_PRODUCT",
      }).success,
    ).toBe(false);
  });

  it("validates invoices and statements", () => {
    const inv = invoiceCreateSchema.safeParse({
      issueDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      amount: 500,
      description: "Design retainer",
    });
    expect(inv.success).toBe(true);
    const st = statementRequestSchema.parse({ kind: "pnl" });
    expect(st.months).toBe(3);
    expect(statementRequestSchema.safeParse({ kind: "bogus" }).success).toBe(false);
  });
});

describe("schemas — knowledge", () => {
  it("validates brain dumps", () => {
    expect(brainDumpSchema.safeParse({ content: "x" }).success).toBe(false);
    expect(brainDumpSchema.safeParse({ content: "A real thought." }).success).toBe(true);
  });

  it("validates nodes with links", () => {
    const node = knowledgeNodeCreateSchema.parse({
      title: "Pricing note",
      summary: "How we price",
      content: "Tiered pricing",
      category: "DECISION",
      links: ["n1", "n2"],
    });
    expect(node.importance).toBe(50);
    expect(node.source).toBe("operator");
  });
});

describe("schemas — tasks", () => {
  it("applies defaults", () => {
    const parsed = taskCreateSchema.parse({ title: "Ship landing page" });
    expect(parsed.status).toBe("BACKLOG");
    expect(parsed.priority).toBe("P2");
    expect(parsed.department).toBe("OPERATIONS");
    expect(parsed.estimateHours).toBe(2);
  });

  it("rejects short titles and bad priorities", () => {
    expect(taskCreateSchema.safeParse({ title: "x" }).success).toBe(false);
    expect(taskCreateSchema.safeParse({ title: "ok", priority: "P9" }).success).toBe(false);
  });
});

describe("schemas — workflows / integrations", () => {
  it("validates workflow runs", () => {
    const run = workflowRunSchema.parse({});
    expect(run.trigger).toBe("manual");
  });

  it("validates integration connects", () => {
    expect(integrationConnectSchema.safeParse({ apiKey: "abc" }).success).toBe(false);
    expect(integrationConnectSchema.safeParse({ apiKey: "abcd" }).success).toBe(true);
  });
});

describe("schemas — comms", () => {
  it("validates reply sends", () => {
    const parsed = replySendSchema.parse({ messageId: "m1", content: "Sure!" });
    expect(parsed.tone).toBe("professional");
    expect(replySendSchema.safeParse({ messageId: "m1", content: "" }).success).toBe(false);
  });
});