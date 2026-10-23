import type { Communication, Contact, Sentiment } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/repositories/base";
import { communicationCreateSchema, idSchema } from "@/lib/schemas";
import { colorFor } from "@/lib/utils";

export const contactRepository = {
  async findAll(): Promise<Contact[]> {
    return prisma.contact.findMany({ orderBy: { createdAt: "desc" } });
  },

  async findById(id: string): Promise<Contact | null> {
    return prisma.contact.findUnique({ where: { id } });
  },

  async findByCompany(company: string): Promise<Contact[]> {
    return prisma.contact.findMany({ where: { company } });
  },

  async findActive(limit = 100): Promise<Contact[]> {
    return prisma.contact.findMany({
      where: { relationshipStage: { in: ["ACTIVE", "PARTNER"] } },
      orderBy: { ltv: "desc" },
      take: limit,
    });
  },

  async findChurnRisks(): Promise<Contact[]> {
    return prisma.contact.findMany({
      where: { relationshipStage: "CHURN_RISK" },
      include: { deals: true, communications: { orderBy: { createdAt: "desc" }, take: 5 } },
    });
  },

  async updateHealth(id: string, patch: Partial<Pick<Contact, "engagementScore" | "sentiment" | "relationshipStage">>): Promise<Contact> {
    return prisma.contact.update({ where: { id }, data: patch });
  },

  async update(id: string, patch: Partial<Omit<Contact, "id" | "createdAt">>): Promise<Contact> {
    return prisma.contact.update({ where: { id }, data: patch });
  },

  async intelligence(id: string) {
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        deals: { orderBy: { value: "desc" }, take: 5 },
        communications: { orderBy: { createdAt: "desc" }, take: 20 },
        invoices: true,
      },
    });
    return contact;
  },
};

export const communicationRepository = {
  async findAll(opts?: {
    channel?: string;
    unreadOnly?: boolean;
    limit?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (opts?.channel) where.channel = opts.channel;
    if (opts?.unreadOnly) where.read = false;
    return prisma.communication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts?.limit ?? 100,
      include: { contact: true },
    });
  },

  async findById(id: string): Promise<Communication | null> {
    return prisma.communication.findUnique({
      where: { id },
      include: { contact: true },
    });
  },

  async findThread(threadKey: string, limit = 30): Promise<Communication[]> {
    return prisma.communication.findMany({
      where: { threadKey },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: { contact: true },
    });
  },

  async findForContact(contactId: string, limit = 30): Promise<Communication[]> {
    return prisma.communication.findMany({
      where: { contactId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async create(input: unknown): Promise<Communication> {
    const data = safe(communicationCreateSchema, input);
    if (!data.ok) throw new Error(`communication.create invalid: ${data.error}`);
    return prisma.communication.create({
      data: {
        contactId: data.data.contactId,
        channel: data.data.channel,
        direction: data.data.direction,
        senderName: data.data.senderName,
        senderColor: data.data.senderColor,
        subject: data.data.subject ?? null,
        preview: data.data.preview,
        body: data.data.body,
        priority: data.data.priority,
        sentiment: data.data.sentiment,
        aiSummary: data.data.aiSummary ?? null,
        threadKey: data.data.threadKey ?? null,
        read: data.data.read,
      },
    });
  },

  async markRead(id: string): Promise<Communication> {
    return prisma.communication.update({ where: { id }, data: { read: true } });
  },

  async markUnread(id: string): Promise<Communication> {
    return prisma.communication.update({ where: { id }, data: { read: false } });
  },

  async sendReply(input: { messageId: string; content: string; tone: string }): Promise<Communication> {
    const parsed = safe(idSchema, input.messageId);
    if (!parsed.ok) throw new Error(`reply invalid: ${parsed.error}`);
    const original = await prisma.communication.findUnique({
      where: { id: input.messageId },
      include: { contact: true },
    });
    if (!original) throw new Error("Original message not found");

    const threadKey = original.threadKey ?? `thread-${original.contactId}-${original.channel}`;
    await prisma.communication.update({
      where: { id: original.id },
      data: { threadKey, read: true },
    });

    return prisma.communication.create({
      data: {
        contactId: original.contactId,
        channel: original.channel,
        direction: "OUTBOUND",
        senderName: "Operator",
        senderColor: "#34d399",
        subject: original.subject ? `Re: ${original.subject}` : undefined,
        preview: input.content.slice(0, 140),
        body: input.content,
        priority: "LOW",
        sentiment: "NEUTRAL",
        threadKey,
        read: true,
      },
      include: { contact: true },
    });
  },

  async coldThreads(hours = 48, limit = 10) {
    const cutoff = new Date(Date.now() - hours * 3600_000);
    const threads = await prisma.communication.findMany({
      where: {
        direction: "INBOUND",
        createdAt: { lt: cutoff },
      },
      orderBy: { createdAt: "desc" },
      include: { contact: true },
      distinct: ["threadKey"],
    });
    const result: Array<{ threadKey: string; contact: Contact; lastMessage: Communication; hoursSince: number }> = [];
    for (const thread of threads) {
      const key = thread.threadKey ?? `thread-${thread.contactId}-${thread.channel}`;
      const latest = await prisma.communication.findFirst({
        where: { threadKey: key },
        orderBy: { createdAt: "desc" },
      });
      if (!latest) continue;
      const outboundAfter = await prisma.communication.findFirst({
        where: { threadKey: key, direction: "OUTBOUND", createdAt: { gt: latest.createdAt } },
      });
      if (outboundAfter) continue; // already responded
      const hoursSince = Math.round((Date.now() - latest.createdAt.getTime()) / 3600_000);
      if (hoursSince >= hours) {
        result.push({ threadKey: key, contact: thread.contact, lastMessage: latest, hoursSince });
      }
      if (result.length >= limit) break;
    }
    return result;
  },

  async sentimentTrend(contactId: string) {
    const messages = await prisma.communication.findMany({
      where: { contactId, sentiment: { in: ["POSITIVE", "NEUTRAL", "NEGATIVE"] } },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    const score: Record<Sentiment, number> = { POSITIVE: 1, NEUTRAL: 0, NEGATIVE: -1 };
    return messages.map((m) => ({
      date: m.createdAt,
      score: score[m.sentiment],
      label: m.sentiment,
    }));
  },
};

export function parseMessageId(input: unknown): { id: string } | { error: string } {
  const parsed = safe(idSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return { id: parsed.data };
}

export function contactColor(name: string): string {
  return colorFor(name);
}