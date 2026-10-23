"use client";

import * as React from "react";
import { Bot, Play, MessageSquare, Loader2, Sparkles, ScrollText } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";

type Agent = {
  id: string;
  slug: string;
  name: string;
  department: string;
  role: string;
  personality: string;
  capabilities: string;
  avatarColor: string;
  avatarIcon: string;
  memoryContext: string;
  status: string;
  runsCount: number;
  successRate: number;
  lastRunAt: string | Date | null;
};

const DEPT_COLOR: Record<string, string> = {
  COMMS: "#22d3ee",
  REVENUE: "#34d399",
  CONTENT: "#f472b6",
  FINANCE: "#fbbf24",
  OPERATIONS: "#8b93ff",
  STRATEGY: "#a78bfa",
};

export function AgentCrewGrid({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const [running, setRunning] = React.useState<string | null>(null);
  const [runResult, setRunResult] = React.useState<{ slug: string; summary: string; log: string[]; recommendations: string[] } | null>(null);
  const [chatAgent, setChatAgent] = React.useState<Agent | null>(null);
  const [chatMsgs, setChatMsgs] = React.useState<Array<{ role: "user" | "agent"; text: string }>>([]);
  const [chatInput, setChatInput] = React.useState("");
  const [chatLoading, setChatLoading] = React.useState(false);

  const triggerRun = async (agent: Agent) => {
    if (running) return;
    setRunning(agent.slug);
    try {
      const res = await fetch(`/api/agents/${agent.slug}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Triggered manually from the command center." }),
      });
      const data = await res.json();
      setRunResult({ slug: agent.slug, summary: data.summary, log: data.log ?? [], recommendations: data.recommendations ?? [] });
      router.refresh();
    } finally {
      setRunning(null);
    }
  };

  const openChat = (agent: Agent) => {
    setChatAgent(agent);
    setChatMsgs([]);
    setChatInput("");
  };

  const sendChat = async (text: string) => {
    if (!chatAgent || !text.trim() || chatLoading) return;
    const message = text.trim();
    setChatMsgs((m) => [...m, { role: "user", text: message }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch(`/api/agents/${chatAgent.slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setChatMsgs((m) => [...m, { role: "agent", text: data.reply ?? "I'm not sure how to answer that yet." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => {
          const color = agent.avatarColor || DEPT_COLOR[agent.department] || "#8b93ff";
          const capabilities = parseCaps(agent.capabilities);
          return (
            <Card key={agent.id} className="group relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                    style={{ background: `${color}22`, border: `1px solid ${color}44` }}
                  >
                    <Bot className="h-5 w-5" style={{ color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{agent.name}</span>
                      <StatusDot
                        color={agent.status === "RUNNING" ? "var(--ok)" : agent.status === "ERROR" ? "var(--crit)" : "var(--mut2)"}
                        pulse={agent.status === "RUNNING"}
                      />
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-mut2">{agent.slug} · {agent.department}</div>
                  </div>
                  <Badge tone={agent.status === "RUNNING" ? "ok" : agent.status === "ERROR" ? "crit" : "muted"}>{agent.status}</Badge>
                </div>

                <p className="mt-3 text-[11px] leading-relaxed text-mut">{agent.role}</p>

                <div className="mt-3 flex flex-wrap gap-1">
                  {capabilities.map((cap) => (
                    <span key={cap} className="rounded-md border border-line bg-panel2 px-1.5 py-0.5 text-[9px] text-mut">{cap}</span>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3 text-center">
                  <div>
                    <div className="font-data text-base font-bold">{agent.runsCount}</div>
                    <div className="text-[9px] uppercase tracking-wider text-mut2">runs</div>
                  </div>
                  <div>
                    <div className={`font-data text-base font-bold ${agent.successRate >= 85 ? "text-ok" : "text-warn"}`}>{agent.successRate}%</div>
                    <div className="text-[9px] uppercase tracking-wider text-mut2">success</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" className="flex-1" variant="outline" onClick={() => openChat(agent)}>
                    <MessageSquare className="h-3.5 w-3.5" /> Talk
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => triggerRun(agent)} disabled={running === agent.slug}>
                    {running === agent.slug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Run
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={!!runResult}
        onClose={() => setRunResult(null)}
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-acc" /> Run complete
          </span>
        }
        className="max-w-xl"
      >
        {runResult && (
          <div className="space-y-4">
            <p className="text-sm text-ink">{runResult.summary}</p>
            {runResult.recommendations.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-mut2">Recommendations</div>
                {runResult.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-line bg-panel2 px-3 py-2 text-xs text-ink/85">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-acc" /> {r}
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-mut2">
                <ScrollText className="h-3 w-3" /> Run log
              </div>
              <pre className="max-h-48 overflow-y-auto rounded-lg border border-line bg-bg-soft p-3 font-mono text-[10px] leading-relaxed text-mut">
                {runResult.log.join("\n")}
              </pre>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={!!chatAgent}
        onClose={() => setChatAgent(null)}
        title={chatAgent ? `${chatAgent.name} — conversation` : ""}
        className="max-w-lg"
      >
        {chatAgent && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-line bg-panel2 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-mut2">Memory context</div>
              <p className="mt-1 text-[11px] leading-relaxed text-mut">{chatAgent.memoryContext}</p>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {chatMsgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      m.role === "user" ? "bg-acc/15 text-ink" : "border border-line bg-panel2 text-ink"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-[10px] text-mut">
                  <Loader2 className="h-3 w-3 animate-spin" /> {chatAgent.name} is thinking…
                </div>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChat(chatInput);
              }}
              className="flex items-center gap-2"
            >
              <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Message the agent…" className="flex-1" />
              <Button type="submit" size="icon" disabled={!chatInput.trim() || chatLoading}>
                <MessageSquare className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </Dialog>
    </>
  );
}

function parseCaps(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}