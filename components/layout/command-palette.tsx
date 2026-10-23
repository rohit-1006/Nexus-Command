"use client";

import * as React from "react";
import { Search, CornerDownLeft } from "lucide-react";
import { useUI } from "@/stores/ui";
import type { SearchResult } from "@/lib/repositories/search";
import { cn } from "@/lib/utils";

const CATEGORY_TONE: Record<SearchResult["category"], string> = {
  Contact: "#34d399",
  Agent: "#a78bfa",
  Knowledge: "#22d3ee",
  Task: "#fbbf24",
  Route: "#8b93ff",
  Deal: "#34d399",
  Invoice: "#f472b6",
  Series: "#fbbf24",
};

export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen);
  const setOpen = useUI((s) => s.setPaletteOpen);
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setQ("");
    setResults([]);
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setActive(0);
      } catch {
        setResults([]);
      }
    }, 120);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, open]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results.length]);

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    window.location.href = href;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-xl animate-fade-up overflow-hidden rounded-2xl border border-line-strong bg-panel shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-mut" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[active]) go(results[active].href);
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search contacts, agents, knowledge, tasks, routes…"
            className="h-14 w-full bg-transparent text-sm text-ink outline-none placeholder:text-mut2"
          />
          <kbd className="rounded border border-line-strong bg-panel2 px-1.5 py-0.5 font-mono text-[10px] text-mut">esc</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-10 text-center text-xs text-mut">
              {q ? `No results for "${q}"` : "Type to search the entire nexus."}
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.category}-${r.id}`}
                onClick={() => go(r.href)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  i === active ? "bg-acc/10" : "hover:bg-panel2",
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: CATEGORY_TONE[r.category], boxShadow: `0 0 6px ${CATEGORY_TONE[r.category]}` }}
                />
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate text-[13px]", i === active ? "text-ink" : "text-ink/90")}>{r.label}</div>
                  <div className="truncate text-[11px] text-mut">{r.subtitle}</div>
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-mut2">{r.category}</span>
                {i === active ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-acc" /> : null}
              </button>
            ))
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[10px] text-mut2">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-line bg-panel2 px-1 font-mono">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-line bg-panel2 px-1 font-mono">↵</kbd> open
          </span>
          <span className="ml-auto">{results.length} matches</span>
        </div>
      </div>
    </div>
  );
}