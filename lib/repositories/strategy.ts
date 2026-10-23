import type { Decision, Okr } from "@prisma/client";
import { prisma } from "@/lib/db";

export const okrRepository = {
  async findAll(): Promise<Okr[]> {
    return prisma.okr.findMany({ orderBy: [{ quarter: "desc" }, { kind: "asc" }] });
  },

  async findQuarter(quarter: string): Promise<Okr[]> {
    return prisma.okr.findMany({ where: { quarter }, orderBy: { kind: "asc" } });
  },

  async create(input: { quarter: string; kind: string; objective: string; parentId?: string; progress?: number; confidence?: number }): Promise<Okr> {
    return prisma.okr.create({ data: input });
  },

  async updateProgress(id: string, progress: number, confidence?: number): Promise<Okr> {
    return prisma.okr.update({ where: { id }, data: { progress, ...(confidence != null ? { confidence } : {}) } });
  },
};

export const decisionRepository = {
  async findAll(): Promise<Decision[]> {
    return prisma.decision.findMany({ orderBy: { date: "desc" } });
  },

  async create(input: {
    title: string;
    context: string;
    alternatives: unknown[];
    decision: string;
    tags: string;
  }): Promise<Decision> {
    return prisma.decision.create({
      data: {
        title: input.title,
        context: input.context,
        alternatives: JSON.stringify(input.alternatives),
        decision: input.decision,
        tags: input.tags,
      },
    });
  },

  async updateOutcome(id: string, outcome: string): Promise<Decision> {
    return prisma.decision.update({ where: { id }, data: { outcome, status: "RESOLVED" } });
  },
};

export const userRepository = {
  async getOperator() {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    return user;
  },

  async ensureOperator(input: {
    name: string;
    email: string;
    company: string;
    timezone?: string;
  }) {
    const existing = await prisma.user.findFirst();
    if (existing) return existing;
    return prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        company: input.company,
        timezone: input.timezone ?? "America/New_York",
      },
    });
  },

  async update(id: string, patch: Partial<{ name: string; email: string; company: string; timezone: string }>): Promise<void> {
    await prisma.user.update({ where: { id }, data: patch });
  },
};