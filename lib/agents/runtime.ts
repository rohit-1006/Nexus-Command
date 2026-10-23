import type { Agent, Priority } from "@prisma/client";
import { eventBus } from "@/lib/events/bus";
import {
  agentMessageRepository,
  agentRepository,
  agentRunRepository,
} from "@/lib/repositories";
import { notify } from "@/lib/repositories/events";
import { taskRepository } from "@/lib/repositories/tasks";
import type { AgentChatResponse, AgentDefinition, AgentRunResult } from "@/lib/agents/types";

/**
 * Executes an agent's run() with full lifecycle:
 * status transition → persistence → events → tasks → notifications → messaging.
 */
export async function runAgent(agent: Agent, definition: AgentDefinition, reason: string): Promise<AgentRunResult> {
  const started = Date.now();
  await agentRepository.setStatus(agent.slug, "RUNNING");
  await eventBus.emit({
    type: "AGENT_RUN_STARTED",
    aggregate: "agent",
    aggregateId: agent.id,
    actor: agent.slug,
    summary: `${agent.name} started a run`,
    payload: { reason },
    priority: "LOW",
  });

  let result: AgentRunResult;
  let success = true;
  try {
    result = await definition.run();
  } catch (err) {
    success = false;
    result = {
      summary: `Run failed: ${err instanceof Error ? err.message : "unknown error"}`,
      log: [`[error] ${err instanceof Error ? err.stack ?? err.message : String(err)}`],
      output: { error: true },
      recommendations: [],
    };
    await eventBus.emit({
      type: "AGENT_RUN_FAILED",
      aggregate: "agent",
      aggregateId: agent.id,
      actor: agent.slug,
      summary: `${agent.name} run failed`,
      payload: { error: String(err) },
      priority: "HIGH",
    });
  }

  const durationMs = Date.now() - started;

  await agentRunRepository.create({
    agentId: agent.id,
    status: success ? "COMPLETED" : "FAILED",
    summary: result.summary,
    log: result.log,
    input: reason,
    output: result.output,
    durationMs,
  });

  await agentRepository.setStatus(agent.slug, "IDLE");
  await agentRepository.touchRunStats(agent.slug, success);

  await eventBus.emit({
    type: success ? "AGENT_RUN_COMPLETED" : "AGENT_RUN_FAILED",
    aggregate: "agent",
    aggregateId: agent.id,
    actor: agent.slug,
    summary: `${agent.name} ${success ? "completed" : "failed"} — ${result.summary}`,
    payload: { durationMs, output: result.output },
    priority: "LOW",
  });

  for (const ev of result.events ?? []) {
    await eventBus.emit({ ...ev, actor: agent.slug });
  }

  for (const task of result.tasks ?? []) {
    await taskRepository.create({
      title: task.title,
      description: task.description,
      priority: task.priority,
      department: task.department,
      source: agent.slug,
      delegationNote: task.delegationNote,
      dueDate: task.dueInDays != null ? new Date(Date.now() + task.dueInDays * 86_400_000) : undefined,
    });
    await eventBus.emit({
      type: "TASK_CREATED",
      aggregate: "task",
      aggregateId: `pending-${Date.now()}`,
      actor: agent.slug,
      summary: `${agent.name} delegated: "${task.title}"`,
      priority: "MEDIUM",
    });
  }

  for (const n of result.notifications ?? []) {
    await notify({ ...n, priority: n.priority as Priority });
    await eventBus.emit({
      type: "NOTIFICATION_SENT",
      aggregate: "notification",
      aggregateId: `notify-${Date.now()}`,
      actor: agent.slug,
      summary: n.title,
      priority: n.priority as Priority,
    });
  }

  for (const m of result.agentMessages ?? []) {
    await agentMessageRepository.send({
      agentId: agent.id,
      senderName: agent.name,
      kind: "AGENT_TO_AGENT",
      content: m.content,
      targetId: m.toAgent,
    });
    await eventBus.emit({
      type: "AGENT_MESSAGE_SENT",
      aggregate: "agent",
      aggregateId: agent.id,
      actor: agent.slug,
      summary: `${agent.name} → ${m.toAgent}`,
      priority: "LOW",
    });
  }

  return result;
}

/** Deterministic chat reply generator. Falls back to persona-based responses. */
export async function chatWithAgent(
  agent: Agent,
  definition: AgentDefinition,
  message: string,
): Promise<AgentChatResponse> {
  await agentMessageRepository.send({
    agentId: agent.id,
    senderName: "Operator",
    kind: "OPERATOR_TO_AGENT",
    content: message,
    targetId: "operator",
  });

  let reply: string;
  let log: string[] = [];
  try {
    reply = await definition.respond(message);
  } catch (err) {
    reply = `I hit an internal fault while thinking about that. Here's what I know: ${err instanceof Error ? err.message : "unknown"}. My memory context is intact — try rephrasing.`;
  }

  await agentMessageRepository.send({
    agentId: agent.id,
    senderName: agent.name,
    kind: "AGENT_TO_OPERATOR",
    content: reply,
    targetId: "operator",
  });
  log = [`[chat] operator → ${agent.name}`, `[chat] ${agent.name} replied (${reply.length} chars)`];

  return { reply, log };
}