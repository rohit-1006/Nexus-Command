"use client";

import * as React from "react";
import { Search, Bell } from "lucide-react";
import { useUI } from "@/stores/ui";
import { useClock, useThemeColors } from "@/hooks/use-theme";
import { useEventStream } from "@/hooks/use-events";
import { ThemeSwitcher } from "./theme-switcher";
import { Popover } from "@/components/ui/popover";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

function PulseBar() {
  const { connected, events } = useEventStream();
  const c = useThemeColors();
  const pulse = useUI((s) => s.pulse);
  const latest = events[0];

  React.useEffect(() => {
    if (latest) pulse(latest.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest?.id]);

  const accent = connected ? c.ok : c.warn;

  return (
    <div
      className="flex h-9 items-center gap-4 overflow-hidden border-t border-line px-4 text-[11px]"
      style={{ background: `linear-gradient(90deg, transparent, ${accent}14, transparent)` }}
    >
      <div className="flex items-center gap-1.5 font-mono">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
        <span style={{ color: accent }}>{connected ? "LIVE" : "RECONNECTING"}</span>
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <span className="text-mut">event</span>
        <span className="font-mono text-ink">{latest ? `#${latest.id} ${latest.type}` : "awaiting telemetry"}</span>
        <span className="text-mut2">·</span>
        <span className="text-mut">actor</span>
        <span className="font-mono text-ink">{latest?.actor ?? "—"}</span>
      </div>
      <div className="ml-auto hidden items-center gap-3 lg:flex">
        <span className="text-mut">crew 6/6 online</span>
        <span className="text-mut2">uptime 99.9%</span>
      </div>
      <div className="flex items-center gap-[3px]">
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="h-3.5 w-[2px] rounded-full"
            style={{ background: i < (events.length % 16) ? accent : c.line, opacity: 0.75 }}
          />
        ))}
      </div>
    </div>
  );
}

function SignalPanel() {
  const [items, setItems] = React.useState<
    Array<{ id: string; title: string; body: string; createdAt: string; read: boolean; severity: string }>
  >([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-xs font-semibold">Signal Center</span>
        <Badge tone="muted">{items.filter((i) => !i.read).length} unread</Badge>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            <div className="skeleton h-12 rounded-lg" />
            <div className="skeleton h-12 rounded-lg" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-xs text-mut">No signals. All quiet.</div>
        ) : (
          items.slice(0, 12).map((item) => (
            <div key={item.id} className="border-b border-line px-4 py-3 transition-colors hover:bg-panel2">
              <div className="flex items-center gap-2">
                <StatusDot color={item.severity === "HIGH" ? "var(--crit)" : "var(--warn)"} pulse={!item.read} />
                <span className="text-xs font-semibold">{item.title}</span>
                <span className="ml-auto text-[10px] text-mut2">{item.createdAt}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-mut">{item.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function TopBar() {
  const setPaletteOpen = useUI((s) => s.setPaletteOpen);
  const now = useClock(1000);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPaletteOpen]);

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4">
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex w-full max-w-md items-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-2 text-xs text-mut transition-colors hover:border-line-strong hover:text-ink"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search nexus…</span>
          <span className="ml-auto hidden items-center gap-1 sm:flex">
            <kbd className="rounded border border-line-strong bg-panel px-1.5 font-mono text-[10px]">⌘</kbd>
            <kbd className="rounded border border-line-strong bg-panel px-1.5 font-mono text-[10px]">K</kbd>
          </span>
        </button>

        <div className="ml-auto flex items-center gap-2.5">
          <Popover
            trigger={
              <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel text-mut transition-colors hover:border-line-strong hover:text-ink">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse-dot rounded-full bg-crit" />
              </button>
            }
            className="w-96"
          >
            <SignalPanel />
          </Popover>
          <ThemeSwitcher />
          <div className="hidden items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 lg:flex">
            <span className="font-mono text-[11px] text-mut">
              {now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            <span className="font-mono text-[11px] font-semibold text-ink">
              {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
          <Avatar name="Rohit Verma" color="#8b93ff" size="md" />
        </div>
      </div>
      <PulseBar />
    </div>
  );
}