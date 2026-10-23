"use client";

import * as React from "react";
import { Check, ChevronRight, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, timeAgo } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/controls";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  source: string;
  department: string;
  dueDate: string | Date | null;
  estimateHours: number;
  delegationNote: string | null;
  completedAt: string | Date | null;
  createdAt: string | Date;
};

const COLUMNS = ["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

const PRIORITY_CLASS: Record<string, string> = {
  P0: "border-crit/40 bg-crit/15 text-crit",
  P1: "border-warn/40 bg-warn/15 text-warn",
  P2: "border-info/40 bg-info/15 text-info",
  P3: "border-line bg-panel2 text-mut",
};

const COLUMN_TONE: Record<string, string> = {
  BACKLOG: "var(--mut2)",
  TODO: "var(--info)",
  IN_PROGRESS: "var(--acc)",
  BLOCKED: "var(--crit)",
  DONE: "var(--ok)",
};

export function TaskBoard({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [moving, setMoving] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", description: "", priority: "P1", status: "TODO" });

  const move = async (task: Task, status: string) => {
    if (task.status === status || moving) return;
    setMoving(task.id);
    try {
      const res = await fetch("/api/tasks/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status }),
      });
      if (res.ok) router.refresh();
    } finally {
      setMoving(null);
    }
  };

  const createTask = async () => {
    if (!form.title.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        status: form.status,
        source: "operator",
        department: "OPERATIONS",
        estimateHours: 1,
      }),
    });
    if (res.ok) {
      setCreateOpen(false);
      setForm({ title: "", description: "", priority: "P1", status: "TODO" });
      router.refresh();
    }
  };

  const columns = COLUMNS.map((status) => ({
    status,
    tasks: tasks.filter((t) => t.status === status),
  }));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-mut2">
          Kanban — {COLUMNS.length} lanes
        </span>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New task
        </Button>
      </div>

      <div className="scrollbar-none grid grid-cols-2 gap-3 overflow-x-auto pb-2 md:grid-cols-5">
        {columns.map((col) => (
          <div key={col.status} className="min-w-[220px] flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: COLUMN_TONE[col.status] }} />
              <span className="text-xs font-semibold">{col.status.replace("_", " ")}</span>
              <span className="font-data text-[10px] text-mut2">{col.tasks.length}</span>
            </div>
            <div className="space-y-2">
              {col.tasks.map((task) => (
                <div key={task.id} className="group rounded-xl border border-line bg-panel p-3 transition-colors hover:border-line-strong">
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn("rounded-md border px-1.5 py-0.5 text-[9px] font-bold", PRIORITY_CLASS[task.priority] ?? PRIORITY_CLASS.P3)}>
                      {task.priority}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-mut2">{task.source}</span>
                  </div>
                  <div className="mt-2 text-xs font-semibold leading-snug text-ink">{task.title}</div>
                  {task.description ? (
                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-mut">{task.description}</p>
                  ) : null}
                  {task.delegationNote ? (
                    <div className="mt-2 rounded-md border border-acc/25 bg-acc/5 px-2 py-1 text-[9px] leading-relaxed text-acc2">
                      {task.delegationNote}
                    </div>
                  ) : null}
                  <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2">
                    <span className="text-[9px] text-mut2">{timeAgo(task.createdAt)}</span>
                    {task.dueDate ? (
                      <span className={cn("font-data text-[9px]", new Date(task.dueDate) < new Date() ? "text-crit" : "text-mut2")}>
                        due {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    ) : null}
                    <button
                      onClick={() => move(task, "DONE")}
                      disabled={task.status === "DONE" || moving === task.id}
                      className="ml-auto flex h-6 w-6 items-center justify-center rounded-md border border-line text-mut transition-colors hover:border-ok/40 hover:text-ok disabled:opacity-40"
                      title="Mark done"
                    >
                      {moving === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : task.status === "DONE" ? <Check className="h-3 w-3 text-ok" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              ))}
              {col.tasks.length === 0 && (
                <div className="rounded-xl border border-dashed border-line p-4 text-center text-[10px] text-mut2">empty lane</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="New task">
        <div className="space-y-3">
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Task title…"
            autoFocus
          />
          <Textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            className="min-h-[72px]"
          />
          <div className="flex items-center gap-2">
            <Select
              value={form.priority}
              onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
              options={["P0", "P1", "P2", "P3"].map((p) => ({ value: p, label: p }))}
            />
            <Select
              value={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v }))}
              options={COLUMNS.map((s) => ({ value: s, label: s.replace("_", " ") }))}
            />
            <Button className="ml-auto" onClick={createTask} disabled={!form.title.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}