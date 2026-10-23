import * as React from "react";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/charts/spark";

export function StatCard({
  label,
  value,
  delta,
  deltaTone = "ok",
  icon,
  spark,
  className,
  sub,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "ok" | "warn" | "crit" | "neutral";
  icon?: React.ReactNode;
  spark?: number[];
  className?: string;
  sub?: string;
}) {
  const toneCls = {
    ok: "text-ok",
    warn: "text-warn",
    crit: "text-crit",
    neutral: "text-mut",
  }[deltaTone];

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-line bg-panel p-4", className)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-mut">{label}</div>
          <div className="mt-1.5 font-data text-2xl font-bold tracking-tight text-ink">{value}</div>
          {delta ? (
            <div className={cn("mt-1 font-data text-[11px] font-semibold", toneCls)}>{delta}</div>
          ) : null}
          {sub ? <div className="mt-0.5 text-[10px] text-mut2">{sub}</div> : null}
        </div>
        {icon ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel2 text-acc">
            {icon}
          </div>
        ) : null}
      </div>
      {spark && spark.length > 1 ? (
        <div className="absolute bottom-0 left-0 right-0">
          <Sparkline data={spark.map((v) => ({ v }))} height={36} />
        </div>
      ) : null}
    </div>
  );
}