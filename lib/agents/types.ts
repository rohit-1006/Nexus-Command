import type { Department, EventType, Priority } from "@prisma/client";

export interface AgentRunResult {
  summary: string;
  log: string[];
  output: Record<string, unknown>;
  tasks?: Array<{
    title: string;
    description: string;
    priority: "P0" | "P1" | "P2" | "P3";
    department: Department;
    dueInDays?: number;
    delegationNote: string;
  }>;
  notifications?: Array<{
    title: string;
    body: string;
    priority: Priority;
    category: string;
    link?: string;
  }>;
  agentMessages?: Array<{ toAgent: string; content: string }>;
  events?: Array<{
    type: EventType;
    aggregate: string;
    aggregateId: string;
    summary: string;
    payload?: Record<string, unknown>;
    priority?: Priority;
  }>;
  recommendations: string[];
}

export interface AgentDefinition {
  slug: string;
  name: string;
  department: Department;
  role: string;
  personality: string;
  capabilities: string[];
  avatarColor: string;
  avatarIcon: string;
  memoryContext: string;
  config: Record<string, unknown>;
  run: () => Promise<AgentRunResult>;
  respond: (message: string) => Promise<string>;
}

export interface AgentChatResponse {
  reply: string;
  log: string[];
}