import type { PrismaClient } from "@prisma/client";
import type { Contact, Deal } from "@prisma/client";
import { mulberry32, pick } from "@/lib/utils";
import {
  BRAIN_DUMP_SEED,
  EDGE_RELATIONS,
  KNOWLEDGE_TITLES,
  TASK_SEED,
} from "@/lib/seed/constants2";
import { EVENT_TYPES } from "@/lib/seed/constants1";

const rng = mulberry32(999);

export async function seedMisc(
  prisma: PrismaClient,
  now: number,
  contacts: Contact[],
  deals: Deal[],
): Promise<{ events: number }> {
  // ---- knowledge nodes ----
  const nodeIds: string[] = [];
  for (const [title, category, summary] of KNOWLEDGE_TITLES) {
    const node = await prisma.knowledgeNode.create({
      data: {
        title,
        summary,
        content: `${summary}. Full context maintained by Cortex with linked entities across clients, products and decisions.`,
        category: category as never,
        source: pick(rng, ["operator", "brain-dump", "meeting", "agent", "research"]),
        importance: Math.floor(30 + rng() * 70),
        tags: JSON.stringify([category.toLowerCase(), "seed"]),
        createdAt: new Date(now - Math.floor(rng() * 90) * 86_400_000),
        updatedAt: new Date(now - Math.floor(rng() * 20) * 86_400_000),
      },
    });
    nodeIds.push(node.id);
  }

  // ---- knowledge edges (dense, deterministic) ----
  let edges = 0;
  for (let i = 0; i < nodeIds.length; i++) {
    const targets = 2 + Math.floor(rng() * 2);
    for (let k = 0; k < targets; k++) {
      const j = Math.floor(rng() * nodeIds.length);
      if (i === j) continue;
      const exists = await prisma.knowledgeEdge.findFirst({
        where: { fromId: nodeIds[i], toId: nodeIds[j] },
      });
      if (exists) continue;
      await prisma.knowledgeEdge.create({
        data: {
          fromId: nodeIds[i],
          toId: nodeIds[j],
          relationType: pick(rng, EDGE_RELATIONS),
          strength: Math.floor(30 + rng() * 70),
        },
      });
      edges++;
    }
  }

  // ---- brain dumps ----
  for (const dump of BRAIN_DUMP_SEED) {
    await prisma.brainDump.create({
      data: {
        content: dump,
        processed: rng() > 0.6,
        nodeId: rng() > 0.6 ? nodeIds[Math.floor(rng() * nodeIds.length)] : null,
        createdAt: new Date(now - Math.floor(rng() * 10) * 86_400_000),
      },
    });
  }

  // ---- tasks ----
  const deps: string[] = [];
  for (const t of TASK_SEED) {
    const task = await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        status: t.status as never,
        priority: t.priority as never,
        department: t.department as never,
        source: t.source,
        dueDate: new Date(now + t.dueIn * 86_400_000),
        estimateHours: 1 + Math.floor(rng() * 6),
        dependencies: JSON.stringify(deps),
        delegationNote: t.source !== "operator" ? `Delegated by ${t.source} agent: ${t.description}` : null,
        createdAt: new Date(now - Math.floor(rng() * 14) * 86_400_000),
        completedAt: t.status === "DONE" ? new Date(now - Math.floor(rng() * 5) * 86_400_000) : null,
      },
    });
    taskIds.push(task.id);
  }

  const misc2 = await seedMisc2(prisma, now, nodeIds);

  // ---- events ----
  let eventCount = 0;
  const actors = ["mercury", "atlas", "muse", "ledger", "cortex", "conductor", "operator"];
  for (let i = 0; i < 220; i++) {
    const type = pick(rng, EVENT_TYPES);
    const actor = pick(rng, actors);
    const contact = contacts[Math.floor(rng() * contacts.length)];
    const deal = deals[Math.floor(rng() * deals.length)];
    const aggregate = type.startsWith("DEAL")
      ? "deal"
      : type.startsWith("MESSAGE")
        ? "communication"
        : type.startsWith("AGENT")
          ? "agent"
          : type.startsWith("TASK")
            ? "task"
            : type.startsWith("TRANSACTION")
              ? "transaction"
              : "system";
    await prisma.event.create({
      data: {
        type,
        aggregate,
        aggregateId: aggregate === "deal" ? deal.id : aggregate === "communication" ? contact.id : `seed-${i}`,
        actor,
        summary: `${actor} ${type.toLowerCase().replaceAll("_", " ")} - ${aggregate === "deal" ? deal.title : aggregate === "communication" ? contact.name : "system event"}`,
        payload: JSON.stringify({ seed: true, index: i }),
        priority: pick(rng, ["LOW", "LOW", "MEDIUM", "HIGH"]),
        createdAt: new Date(now - Math.floor(rng() * 45) * 86_400_000 - Math.floor(rng() * 24) * 3_600_000),
      },
    });
    eventCount++;
  }

  void edges;
  return { events: eventCount + misc2 };
}

const taskIds: string[] = [];

async function seedMisc2(
  prisma: PrismaClient,
  now: number,
  nodeIds: string[],
): Promise<number> {
  // ---- workflows + runs ----
  const { WORKFLOW_TEMPLATES } = await import("@/lib/seed/constants2");
  let eventCount = 0;
  const workflows = [];
  for (const wf of WORKFLOW_TEMPLATES) {
    const workflow = await prisma.workflow.create({
      data: {
        name: wf.name,
        description: wf.description,
        definition: JSON.stringify(wf.definition),
        status: "ACTIVE",
        isTemplate: true,
        runsCount: 4 + Math.floor(rng() * 8),
        successRate: 88 + Math.floor(rng() * 12),
        createdAt: new Date(now - Math.floor(rng() * 60) * 86_400_000),
      },
    });
    workflows.push(workflow);
    for (let r = 0; r < workflow.runsCount; r++) {
      const ok = rng() > 0.15;
      await prisma.workflowRun.create({
        data: {
          workflowId: workflow.id,
          status: ok ? "COMPLETED" : "FAILED",
          trigger: (wf.definition.trigger as { label?: string } | undefined)?.label ?? "manual",
          trace: JSON.stringify([
            { step: "trigger", status: "ok" },
            { step: "execute", status: ok ? "ok" : "error", note: ok ? "" : "timeout on third-party call" },
          ]),
          startedAt: new Date(now - r * 2 * 86_400_000 - Math.floor(rng() * 24) * 3_600_000),
          finishedAt: new Date(now - r * 2 * 86_400_000 - Math.floor(rng() * 20) * 60_000),
        },
      });
    }
    eventCount += workflow.runsCount;
  }

  // ---- integrations ----
  const { INTEGRATION_SEED } = await import("@/lib/seed/constants2");
  for (const integ of INTEGRATION_SEED) {
    await prisma.integration.create({
      data: {
        service: integ.service,
        category: integ.category,
        status: integ.status as never,
        lastSyncAt: integ.status === "CONNECTED" ? new Date(now - Math.floor(rng() * 24) * 3_600_000) : null,
        dataPointsSynced: integ.points ?? 0,
        config: JSON.stringify({}),
        apiKeyMasked: integ.status === "CONNECTED" ? "sk-…aBcD" : null,
        connectedAt: integ.status === "CONNECTED" ? new Date(now - Math.floor(rng() * 90) * 86_400_000) : null,
        notes: integ.notes ?? null,
      },
    });
  }

  // ---- notifications ----
  const { NOTIFICATION_SEED } = await import("@/lib/seed/constants2");
  for (const n of NOTIFICATION_SEED) {
    await prisma.notification.create({
      data: {
        title: n.title,
        body: n.body,
        priority: n.priority as never,
        category: n.category,
        link: n.link ?? null,
        read: rng() > 0.4,
        createdAt: new Date(now - Math.floor(rng() * 30) * 86_400_000 - Math.floor(rng() * 10) * 3_600_000),
      },
    });
    eventCount++;
  }

  // ---- OKRs ----
  const { OKR_SEED } = await import("@/lib/seed/constants2");
  for (const o of OKR_SEED) {
    await prisma.okr.create({
      data: {
        quarter: o.quarter,
        kind: o.kind,
        objective: o.objective,
        parentId: o.parentId,
        progress: o.progress,
        confidence: o.confidence,
        createdAt: new Date(now - 40 * 86_400_000),
      },
    });
  }

  // ---- decisions ----
  const { DECISION_SEED } = await import("@/lib/seed/constants2");
  for (const d of DECISION_SEED) {
    await prisma.decision.create({
      data: {
        title: d.title,
        context: d.context,
        alternatives: JSON.stringify(d.alternatives),
        decision: d.decision,
        outcome: d.outcome,
        status: d.status,
        tags: d.tags,
        date: new Date(now - (10 + Math.floor(rng() * 70)) * 86_400_000),
      },
    });
  }

  // ---- agent runs ----
  const { AGENT_RUN_SUMMARIES } = await import("@/lib/seed/constants1");
  const agents = await prisma.agent.findMany();
  for (const agent of agents) {
    const summaries = AGENT_RUN_SUMMARIES[agent.slug] ?? ["Routine maintenance run completed."];
    for (let r = 0; r < 12; r++) {
      const summary = summaries[r % summaries.length];
      const ok = rng() > 0.08;
      const started = new Date(now - (r * 1.5 + 0.5) * 86_400_000 - Math.floor(rng() * 8) * 3_600_000);
      await prisma.agentRun.create({
        data: {
          agentId: agent.id,
          startedAt: started,
          finishedAt: new Date(started.getTime() + 400 + Math.floor(rng() * 9000)),
          status: ok ? "COMPLETED" : "FAILED",
          summary,
          log: [
            `[boot] ${agent.name} online`,
            `[scan] loaded domain state`,
            `[work] ${summary}`,
            `[done] ${ok ? "completed cleanly" : "recovered from transient error"}`,
          ].join("\n"),
          input: ok ? "scheduled run" : "scheduled run",
          output: JSON.stringify({ seeded: true, ok }),
          durationMs: 400 + Math.floor(rng() * 9000),
        },
      });
    }
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        lastRunAt: new Date(now - Math.floor(rng() * 8) * 3_600_000),
        runsCount: 12,
        successRate: 92,
      },
    });
    eventCount += 12;
  }

  // ---- inter-agent messages ----
  const bySlug = new Map(agents.map((a) => [a.slug, a]));
  const muse = bySlug.get("muse");
  const mercury = bySlug.get("mercury");
  const atlas = bySlug.get("atlas");
  if (muse && mercury) {
    await prisma.agentMessage.create({
      data: {
        agentId: muse.id,
        senderName: "Muse",
        kind: "AGENT_TO_AGENT",
        content: "Heads up - the LinkedIn post reached 48K. Expect an inbound wave; I'll thread anything relevant into content.",
        targetId: mercury.id,
        createdAt: new Date(now - 2 * 86_400_000),
      },
    });
  }
  if (atlas && mercury) {
    await prisma.agentMessage.create({
      data: {
        agentId: atlas.id,
        senderName: "Atlas",
        kind: "AGENT_TO_AGENT",
        content: "Quantia Systems deal health dropped to 34. Their last 2 emails are unanswered - prioritize any inbound from them.",
        targetId: mercury.id,
        createdAt: new Date(now - 1 * 86_400_000),
      },
    });
  }
  if (muse) {
    await prisma.agentMessage.create({
      data: {
        agentId: muse.id,
        senderName: "Muse",
        kind: "AGENT_TO_AGENT",
        content: "Cortex - I have 3 new post-mortems from the viral thread. Worth capturing as insight nodes?",
        targetId: bySlug.get("cortex")?.id,
        createdAt: new Date(now - 6 * 3_600_000),
      },
    });
  }

  void nodeIds;
  return eventCount;
}