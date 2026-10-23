import type { Agent, AgentMessage, AgentRun, AgentStatus, Department } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/repositories/base";
import {
  agentBroadcastSchema,
  agentChatSchema,
  agentCreateSchema,
  agentRunTriggerSchema,
  agentUpdateSchema,
  idSchema,
} from "@/lib/schemas";
import { jsonParse, jsonStringify } from "@/lib/utils";

export const agentRepository = {
  async findAll(): Promise<Agent[]> {
    return prisma.agent.findMany({ orderBy: { department: "asc" } });
  },

  async findBySlug(slug: string): Promise<Agent | null> {
    return prisma.agent.findUnique({ where: { slug } });
  },

  async findById(id: string): Promise<Agent | null> {
    return prisma.agent.findUnique({ where: { id } });
  },

  async create(input: unknown): Promise<Agent> {
    const data = safe(agentCreateSchema, input);
    if (!data.ok) throw new Error(`agent.create invalid: ${data.error}`);
    const { capabilities, config, memoryContext, ...rest } = data.data;
    return prisma.agent.create({
      data: {
        ...rest,
        capabilities: jsonStringify(capabilities),
        config: jsonStringify(config),
        memoryContext,
      },
    });
  },

  async update(slug: string, input: unknown): Promise<Agent> {
    const data = safe(agentUpdateSchema, input);
    if (!data.ok) throw new Error(`agent.update invalid: ${data.error}`);
    const { capabilities, config, ...rest } = data.data;
    return prisma.agent.update({
      where: { slug },
      data: {
        ...rest,
        ...(capabilities ? { capabilities: jsonStringify(capabilities) } : {}),
        ...(config ? { config: jsonStringify(config) } : {}),
      },
    });
  },

  async setStatus(slug: string, status: AgentStatus): Promise<Agent> {
    return prisma.agent.update({
      where: { slug },
      data: { status, ...(status === "IDLE" ? { lastRunAt: new Date() } : {}) },
    });
  },

  async touchRunStats(slug: string, success: boolean): Promise<void> {
    const agent = await prisma.agent.findUnique({ where: { slug } });
    if (!agent) return;
    const runsCount = agent.runsCount + 1;
    const successRate = ((agent.successRate * agent.runsCount + (success ? 100 : 0)) / runsCount);
    await prisma.agent.update({
      where: { slug },
      data: { runsCount, successRate: Math.round(successRate * 10) / 10 },
    });
  },
};

export const agentRunRepository = {
  async create(input: {
    agentId: string;
    status: string;
    summary: string;
    log: string[];
    input: string;
    output: Record<string, unknown>;
    durationMs: number;
  }): Promise<AgentRun> {
    return prisma.agentRun.create({
      data: {
        agentId: input.agentId,
        status: input.status,
        summary: input.summary,
        log: input.log.join("\n"),
        input: input.input,
        output: jsonStringify(input.output),
        durationMs: input.durationMs,
        finishedAt: new Date(),
      },
    });
  },

  async findForAgent(agentId: string, limit = 12): Promise<AgentRun[]> {
    return prisma.agentRun.findMany({
      where: { agentId },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  },

  async findRecent(limit = 40) {
    return prisma.agentRun.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
      include: { agent: true },
    });
  },

  async findById(id: string): Promise<AgentRun | null> {
    return prisma.agentRun.findUnique({ where: { id } });
  },
};

export const agentMessageRepository = {
  async send(input: {
    agentId: string;
    senderName: string;
    kind: "OPERATOR_TO_AGENT" | "AGENT_TO_OPERATOR" | "AGENT_TO_AGENT" | "BROADCAST";
    content: string;
    targetId?: string;
  }): Promise<AgentMessage> {
    return prisma.agentMessage.create({
      data: {
        agentId: input.agentId,
        senderName: input.senderName,
        kind: input.kind,
        content: input.content,
        targetId: input.targetId,
      },
    });
  },

  async findForAgent(agentId: string, limit = 50): Promise<AgentMessage[]> {
    return prisma.agentMessage.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async findInterAgent(limit = 40): Promise<AgentMessage[]> {
    return prisma.agentMessage.findMany({
      where: { kind: "AGENT_TO_AGENT" },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { agent: true },
    });
  },

  async recentAll(limit = 60): Promise<AgentMessage[]> {
    return prisma.agentMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { agent: true },
    });
  },
};

export function parseAgentChat(input: unknown): { message: string } | { error: string } {
  const parsed = safe(agentChatSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return { message: parsed.data.message };
}

export function parseAgentRunTrigger(input: unknown): { reason: string } | { error: string } {
  const parsed = safe(agentRunTriggerSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return { reason: parsed.data.reason };
}

export function parseBroadcast(input: unknown): { directive: string } | { error: string } {
  const parsed = safe(agentBroadcastSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return { directive: parsed.data.directive };
}

export function parseId(input: unknown): { id: string } | { error: string } {
  const parsed = safe(idSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return { id: parsed.data };
}

export function parseCapabilities(agent: Agent): string[] {
  return jsonParse<string[]>(agent.capabilities, []);
}

export function parseAgentConfig(agent: Agent): Record<string, unknown> {
  return jsonParse<Record<string, unknown>>(agent.config, {});
}

export type AgentWithDepartment = { slug: string; department: Department };