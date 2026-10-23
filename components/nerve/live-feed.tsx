"use client";

import * as React from "react";
import { useEventStream } from "@/hooks/use-events";
import { cn, timeAgo } from "@/lib/utils";

const PRIORITY_TONE: Record<string, string> = {
  CRITICAL: "#f87171",
  HIGH: "#fbbf24",
  MEDIUM: "#22d3ee",
  LOW: "#8d8da0",
};

export function LiveFeed({ initial }: { initial: Array<{ id: string; type: string; actor: string; summary: string; createdAt: string; priority: string }> }) {
  const { events, connected } = useEventStream();
  const all = React.useMemo(() => {
    const merged = [...events, ...initial];
    const seen = new Set<string>();
    return merged.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true))).slice(0, 14);
  }, [events, initial]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-data text-[10px] text-mut2">{all.length} frames buffered</span>
        <span className={cn("font-mono text-[10px]", connected ? "text-ok" : "text-warn")}>
          {connected ? "● stream open" : "○ reconnecting"}
        </span>
      </div>
      <div className="scrollbar-none max-h-[300px] space-y-1 overflow-y-auto pr-1">
        {all.map((e) => (
          <div key={e.id} className="flex items-start gap-2 rounded-lg border border-line bg-panel2 px-2.5 py-1.5">
            <span
              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: PRIORITY_TONE[e.priority ?? ""] ?? "#8d8da0", boxShadow: `0 0 5px ${PRIORITY_TONE[e.priority ?? ""] ?? "transparent"}` }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate font-mono text-[10px] font-semibold text-ink">{e.type}</span>
                <span className="shrink-0 font-mono text-[9px] text-mut2">#{e.id}</span>
              </div>
              <p className="truncate text-[10px] text-mut">{e.summary}</p>
            </div>
            <span className="shrink-0 font-data text-[9px] text-mut2">
              {e.actor} · {timeAgo(e.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}