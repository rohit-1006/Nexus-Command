import type { Workflow, WorkflowRun } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/repositories/base";
import { idSchema, workflowCreateSchema, workflowRunSchema } from "@/lib/schemas";
import { jsonParse, jsonStringify } from "@/lib/utils";

export type WorkflowDefinition = {
  trigger: { type: string; label: string };
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    params?: Record<string, unknown>;
  }>;
};

export const workflowRepository = {
  async findAll(): Promise<Workflow[]> {
    return prisma.workflow.findMany({ orderBy: { createdAt: "desc" } });
  },

  async findTemplates(): Promise<Workflow[]> {
    return prisma.workflow.findMany({ where: { isTemplate: true }, orderBy: { name: "asc" } });
  },

  async findById(id: string): Promise<Workflow | null> {
    return prisma.workflow.findUnique({ where: { id } });
  },

  async create(input: unknown): Promise<Workflow> {
    const data = safe(workflowCreateSchema, input);
    if (!data.ok) throw new Error(`workflow.create invalid: ${data.error}`);
    return prisma.workflow.create({
      data: {
        name: data.data.name,
        description: data.data.description,
        definition: jsonStringify(data.data.definition),
        status: data.data.status,
        isTemplate: data.data.isTemplate,
      },
    });
  },

  async recordRun(workflowId: string, status: string, trigger: string, trace: unknown[]): Promise<WorkflowRun> {
    const run = await prisma.workflowRun.create({
      data: {
        workflowId,
        status,
        trigger,
        trace: jsonStringify(trace),
        finishedAt: new Date(),
      },
    });
    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (workflow) {
      await prisma.workflow.update({
        where: { id: workflowId },
        data: {
          runsCount: workflow.runsCount + 1,
          successRate:
            status === "COMPLETED"
              ? Math.round(((workflow.successRate * workflow.runsCount + 100) / (workflow.runsCount + 1)) * 10) / 10
              : Math.round((workflow.successRate * workflow.runsCount) / (workflow.runsCount + 1) * 10) / 10,
        },
      });
    }
    return run;
  },

  async runs(workflowId?: string, limit = 30): Promise<Array<WorkflowRun & { workflow: { name: string } }>> {
    return prisma.workflowRun.findMany({
      where: workflowId ? { workflowId } : {},
      orderBy: { startedAt: "desc" },
      take: limit,
      include: { workflow: { select: { name: true } } },
    });
  },
};

export function parseDefinition(workflow: Workflow): WorkflowDefinition {
  return jsonParse<WorkflowDefinition>(workflow.definition, { trigger: { type: "manual", label: "Manual" }, nodes: [] });
}

export function parseWorkflowRunInput(input: unknown): { trigger: string; payload: Record<string, unknown> } | { error: string } {
  const parsed = safe(workflowRunSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return { trigger: parsed.data.trigger, payload: parsed.data.payload };
}

export function parseWorkflowId(input: unknown): { id: string } | { error: string } {
  const parsed = safe(idSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return { id: parsed.data };
}