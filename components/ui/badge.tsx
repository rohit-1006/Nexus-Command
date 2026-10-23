import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "default" | "ok" | "warn" | "crit" | "info" | "muted" | "acc";

const toneClasses: Record<BadgeTone, string> = {
  default: "border-line-strong bg-panel2 text-ink",
  ok: "border-ok/30 bg-ok/10 text-ok",
  warn: "border-warn/30 bg-warn/10 text-warn",
  crit: "border-crit/30 bg-crit/10 text-crit",
  info: "border-info/30 bg-info/10 text-info",
  muted: "border-line bg-panel text-mut",
  acc: "border-acc/30 bg-acc/10 text-acc",
};

export function Badge({
  className,
  tone = "default",
  children,
}: {
  className?: string;
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ color, pulse = false }: { color: string; pulse?: boolean }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", pulse && "animate-pulse-dot")}
      style={{ background: color }}
    />
  );
}