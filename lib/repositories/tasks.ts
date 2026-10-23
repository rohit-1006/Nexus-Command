import type { Task } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/repositories/base";
import { idSchema, taskCreateSchema, taskUpdateSchema } from "@/lib/schemas";

export const taskRepository = {
  async findAll(): Promise<Task[]> {
    return prisma.task.findMany({ orderBy: [{ priority: "asc" }, { dueDate: "asc" }] });
  },

  async findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({ where: { id } });
  },

  async findByStatus(status: string): Promise<Task[]> {
    return prisma.task.findMany({ where: { status: status as never }, orderBy: { priority: "asc" } });
  },

  async create(input: unknown): Promise<Task> {
    const data = safe(taskCreateSchema, input);
    if (!data.ok) throw new Error(`task.create invalid: ${data.error}`);
    return prisma.task.create({
      data: {
        title: data.data.title,
        description: data.data.description,
        status: data.data.status,
        priority: data.data.priority,
        source: data.data.source,
        department: data.data.department,
        dueDate: data.data.dueDate ?? null,
        estimateHours: data.data.estimateHours,
        dependencies: JSON.stringify(data.data.dependencies),
        delegationNote: data.data.delegationNote ?? null,
      },
    });
  },

  async update(id: string, input: unknown): Promise<Task> {
    const data = safe(taskUpdateSchema, input);
    if (!data.ok) throw new Error(`task.update invalid: ${data.error}`);
    const { dependencies, ...rest } = data.data;
    const isDone = rest.status === "DONE";
    return prisma.task.update({
      where: { id },
      data: {
        ...rest,
        ...(dependencies ? { dependencies: JSON.stringify(dependencies) } : {}),
        ...(isDone ? { completedAt: new Date() } : {}),
      },
    });
  },

  async move(id: string, status: string): Promise<Task> {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new Error("Task not found");
    return prisma.task.update({
      where: { id },
      data: {
        status: status as never,
        ...(status === "DONE" ? { completedAt: new Date() } : { completedAt: null }),
      },
    });
  },

  async applyPriorities(updates: Array<{ id: string; priority: string; reason: string }>): Promise<void> {
    for (const u of updates) {
      await prisma.task.update({ where: { id: u.id }, data: { priority: u.priority as never } });
    }
  },

  async findByDependency(dependencyId: string): Promise<Task[]> {
    const all = await prisma.task.findMany();
    return all.filter((t) => JSON.parse(t.dependencies ?? "[]").includes(dependencyId));
  },

  async dependencies(taskId: string): Promise<Task[]> {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return [];
    const ids = JSON.parse(task.dependencies ?? "[]") as string[];
    if (!ids.length) return [];
    return prisma.task.findMany({ where: { id: { in: ids } } });
  },

  async delegated(): Promise<Task[]> {
    return prisma.task.findMany({
      where: { source: { not: "operator" }, delegationNote: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  },

  async countByStatus() {
    const groups = await prisma.task.groupBy({ by: ["status"], _count: true });
    const map: Record<string, number> = { BACKLOG: 0, TODO: 0, IN_PROGRESS: 0, BLOCKED: 0, DONE: 0 };
    for (const g of groups) map[g.status] = g._count;
    return map;
  },
};

export function parseTaskId(input: unknown): { id: string } | { error: string } {
  const parsed = safe(idSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return { id: parsed.data };
}