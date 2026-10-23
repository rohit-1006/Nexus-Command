import { CheckSquare, Clock, AlertOctagon, ListTodo } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat";
import { TaskBoard } from "@/components/tasks/task-board";
import { taskRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, counts, delegated] = await Promise.all([
    taskRepository.findAll(),
    taskRepository.countByStatus(),
    taskRepository.delegated(),
  ]);

  const open = counts.BACKLOG + counts.TODO + counts.IN_PROGRESS + counts.BLOCKED;

  return (
    <div>
      <PageHeader
        title="Tasks"
        desc="The work ledger. Every P0 survives contact; every delegated task carries its delegation note."
        badge={<span className="font-mono text-[10px] text-mut2">{open} open · {counts.DONE} done</span>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open tasks" value={String(open)} delta={`${counts.BLOCKED} blocked`} deltaTone={counts.BLOCKED ? "crit" : "ok"} icon={<ListTodo className="h-4 w-4" />} />
        <StatCard label="In progress" value={String(counts.IN_PROGRESS)} delta="active work" deltaTone="neutral" icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Done" value={String(counts.DONE)} delta={`${tasks.length} total`} deltaTone="neutral" icon={<CheckSquare className="h-4 w-4" />} />
        <StatCard label="Delegated by agents" value={String(delegated.length)} delta="with notes" deltaTone="neutral" icon={<AlertOctagon className="h-4 w-4" />} />
      </div>

      <TaskBoard tasks={tasks} />
    </div>
  );
}