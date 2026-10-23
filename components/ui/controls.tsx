"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ value: string; label: React.ReactNode; count?: number; dot?: string }>;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-lg border border-line bg-panel p-1", className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              active ? "bg-panel3 text-ink shadow-sm" : "text-mut hover:text-ink",
            )}
          >
            {t.dot ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.dot }} /> : null}
            {t.label}
            {t.count != null ? (
              <span className={cn("rounded px-1 font-mono text-[10px]", active ? "bg-acc/15 text-acc" : "bg-panel2 text-mut")}>
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 cursor-pointer rounded-lg border border-line-strong bg-panel2 px-2.5 text-xs text-ink outline-none focus:border-acc/60",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-panel text-ink">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 cursor-pointer"
    >
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-acc" : "bg-panel3",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      {label ? <span className="text-xs text-mut">{label}</span> : null}
    </button>
  );
}