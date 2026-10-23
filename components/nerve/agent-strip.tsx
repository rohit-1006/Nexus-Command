import Link from "next/link";
import { Bot } from "lucide-react";
import { StatusDot } from "@/components/ui/badge";

const STATUS_COLOR: Record<string, string> = {
  RUNNING: "var(--ok)",
  IDLE: "var(--mut2)",
  PAUSED: "var(--warn)",
  ERROR: "var(--crit)",
};

export function AgentStrip({
  agents,
}: {
  agents: Array<{ slug: string; name: string; role: string; status: string; avatarColor: string; runsCount: number; successRate: number }>;
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {agents.map((a) => (
        <Link
          key={a.slug}
          href={`/agents?agent=${a.slug}`}
          className="group rounded-xl border border-line bg-panel p-3 transition-colors hover:border-line-strong"
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
              style={{ background: `${a.avatarColor}22`, border: `1px solid ${a.avatarColor}44` }}
            >
              <Bot className="h-3.5 w-3.5" style={{ color: a.avatarColor }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-bold">{a.name}</div>
              <div className="truncate text-[9px] uppercase tracking-wider text-mut2">{a.slug}</div>
            </div>
            <StatusDot color={STATUS_COLOR[a.status] ?? "var(--mut2)"} pulse={a.status === "RUNNING"} />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[9px] text-mut2">
            <span>{a.runsCount} runs</span>
            <span className={a.successRate >= 85 ? "text-ok" : "text-warn"}>{a.successRate}% ok</span>
          </div>
        </Link>
      ))}
    </div>
  );
}