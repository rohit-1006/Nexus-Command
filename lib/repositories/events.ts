import type { Event, Notification } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { DomainEventInput } from "@/lib/events/bus";
import { safe } from "@/lib/repositories/base";
import { notificationUpdateSchema } from "@/lib/schemas";

export const eventRepository = {
  async create(input: DomainEventInput): Promise<Event> {
    return prisma.event.create({
      data: {
        type: input.type,
        aggregate: input.aggregate,
        aggregateId: input.aggregateId,
        actor: input.actor,
        summary: input.summary,
        payload: input.payload ? JSON.stringify(input.payload) : "{}",
        priority: input.priority ?? "MEDIUM",
      },
    });
  },

  async findAll(opts?: { limit?: number; type?: string; priority?: string }): Promise<Event[]> {
    const where: Record<string, unknown> = {};
    if (opts?.type) where.type = opts.type;
    if (opts?.priority) where.priority = opts.priority;
    return prisma.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts?.limit ?? 250,
    });
  },

  async countByType(days = 30): Promise<Array<{ type: string; count: number }>> {
    const since = new Date(Date.now() - days * 86_400_000);
    const events = await prisma.event.findMany({ where: { createdAt: { gte: since } }, select: { type: true } });
    const groups = new Map<string, number>();
    for (const e of events) groups.set(e.type, (groups.get(e.type) ?? 0) + 1);
    return Array.from(groups.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  },
};

export const notificationRepository = {
  async findAll(opts?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: opts?.unreadOnly ? { read: false } : {},
      orderBy: { createdAt: "desc" },
      take: opts?.limit ?? 50,
    });
  },

  async unreadCount(): Promise<number> {
    return prisma.notification.count({ where: { read: false } });
  },

  async create(input: { title: string; body: string; priority: string; category: string; link?: string }): Promise<Notification> {
    return prisma.notification.create({
      data: {
        title: input.title,
        body: input.body,
        priority: input.priority as never,
        category: input.category,
        link: input.link ?? null,
      },
    });
  },

  async markAllRead(): Promise<number> {
    const result = await prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
    return result.count;
  },

  async markRead(id: string): Promise<Notification> {
    return prisma.notification.update({ where: { id }, data: { read: true } });
  },

  async update(id: string, input: unknown): Promise<Notification> {
    const data = safe(notificationUpdateSchema, input);
    if (!data.ok) throw new Error(`notification.update invalid: ${data.error}`);
    return prisma.notification.update({ where: { id }, data });
  },
};

export async function notify(input: {
  title: string;
  body: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: string;
  link?: string;
}): Promise<void> {
  const priority = input.priority ?? "MEDIUM";
  await notificationRepository.create({
    title: input.title,
    body: input.body,
    priority,
    category: input.category,
    link: input.link,
  });
}