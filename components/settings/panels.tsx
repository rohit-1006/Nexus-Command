"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { THEME_NAMES, type ThemeId } from "@/stores/ui";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const THEMES: Array<{ id: ThemeId; bg: string; acc: string }> = [
  { id: "obsidian", bg: "#0a0a0f", acc: "#8b93ff" },
  { id: "arctic", bg: "#eef2f8", acc: "#2563eb" },
  { id: "ember", bg: "#120d08", acc: "#f59e0b" },
  { id: "forest", bg: "#08100b", acc: "#34d399" },
  { id: "ultraviolet", bg: "#0b0814", acc: "#a78bfa" },
];

type Agent = { id: string; slug: string; name: string; department: string; status: string };

export function SettingsPanels({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [notifPolicy, setNotifPolicy] = React.useState({ critical: true, digests: true, agentRuns: false });
  const [reseedBusy, setReseedBusy] = React.useState(false);
  const [reseedMsg, setReseedMsg] = React.useState<string | null>(null);

  const reseed = async () => {
    if (reseedBusy) return;
    setReseedBusy(true);
    setReseedMsg(null);
    try {
      const res = await fetch("/api/admin/reseed", { method: "POST" });
      const data = await res.json();
      setReseedMsg(res.ok ? `Seeded: ${data.summary}` : data.error ?? "Reseed failed");
      if (res.ok) setTimeout(() => router.refresh(), 800);
    } catch {
      setReseedMsg("Reseed failed");
    } finally {
      setReseedBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Themes are live tokens — every surface restyles instantly</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                theme === t.id ? "border-acc/60 bg-acc/10" : "border-line bg-panel2 hover:border-line-strong",
              )}
            >
              <span
                className="block h-14 rounded-lg border border-line-strong"
                style={{ background: t.bg, boxShadow: `inset 0 0 0 3px ${t.acc}44` }}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-semibold">{THEME_NAMES[t.id]}</span>
                {theme === t.id && <span className="h-1.5 w-1.5 rounded-full bg-acc" />}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crew</CardTitle>
          <CardDescription>Pause or resume agent cadence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {agents.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-line bg-panel2 px-3 py-2">
              <span className="text-xs font-semibold">{a.name}</span>
              <Badge tone={a.status === "RUNNING" ? "ok" : a.status === "ERROR" ? "crit" : "muted"}>{a.status}</Badge>
              <span className="ml-auto text-[10px] text-mut2">{a.department}</span>
              <Switch checked={a.status !== "PAUSED"} onChange={() => {}} />
            </div>
          ))}
          <p className="text-[10px] text-mut2">Switch toggles are visual in this environment; status is managed by the runtime.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Signal policy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold">Critical alerts</div>
              <div className="text-[10px] text-mut">P0 tasks, failed runs, churn risk</div>
            </div>
            <Switch checked={notifPolicy.critical} onChange={(v) => setNotifPolicy((p) => ({ ...p, critical: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold">Daily digests</div>
              <div className="text-[10px] text-mut">Conductor briefing at 04:30</div>
            </div>
            <Switch checked={notifPolicy.digests} onChange={(v) => setNotifPolicy((p) => ({ ...p, digests: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold">Agent runs</div>
              <div className="text-[10px] text-mut">Every run completion, low priority</div>
            </div>
            <Switch checked={notifPolicy.agentRuns} onChange={(v) => setNotifPolicy((p) => ({ ...p, agentRuns: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data management</CardTitle>
          <CardDescription>Wipe and reseed the demo universe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={reseed} disabled={reseedBusy}>
              {reseedBusy ? "Reseeding…" : "Reseed demo data"}
            </Button>
            {reseedMsg && (
              <span className={cn("font-data text-[10px]", reseedBusy ? "text-mut" : "text-ok")}>{reseedMsg}</span>
            )}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-mut2">
            Reseeding destroys all current data and regenerates the deterministic universe (contacts, deals, events, agents, workflows, knowledge). Idempotent — safe to run repeatedly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}