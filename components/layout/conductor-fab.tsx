"use client";

import * as React from "react";
import { Bot, Send, X, Sparkles, Loader2 } from "lucide-react";
import { useUI } from "@/stores/ui";
import { useEventStream } from "@/hooks/use-events";
import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "conductor"; text: string };

const QUICK_PROMPTS = [
  "What's my top priority today?",
  "How much runway do I have?",
  "Summarize my revenue pipeline",
  "How's the team's health?",
];

export function ConductorFab() {
  const open = useUI((s) => s.conductorOpen);
  const setOpen = useUI((s) => s.setConductorOpen);
  const { events } = useEventStream();
  const [msgs, setMsgs] = React.useState<Msg[]>([
    {
      role: "conductor",
      text: "Good morning. This is your daily briefing. Revenue is the highest-leverage surface today; comms needs your morning attention. Everything else is on autopilot. Ask me anything.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [briefing, setBriefing] = React.useState<string>("Loading briefing…");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/conductor/briefing")
      .then((r) => r.json())
      .then((d) => {
        if (d.briefing) setBriefing(d.briefing);
      })
      .catch(() => setBriefing("Briefing unavailable."));
  }, [open]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs, loading]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || loading) return;
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/conductor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "conductor", text: data.reply ?? "I couldn't parse that. Try a question about revenue, runway, inbox, tasks, or system health." }]);
    } catch {
      setMsgs((m) => [...m, { role: "conductor", text: "Connection error — the conductor is momentarily unreachable." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-acc text-white shadow-[0_0_30px_var(--glow)] transition-transform hover:scale-105"
        aria-label="Open Conductor"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-6 w-6" />}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-bg bg-ok animate-pulse-dot" />
        )}
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-acc" />
            The Conductor
          </span>
        }
        subtitle={
          <span className="flex items-center gap-2">
            <Badge tone="ok">chief of staff</Badge>
            <span className="text-mut2">event bus: {events.length} frames</span>
          </span>
        }
        width="max-w-lg"
      >
        <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 140px)" }}>
          <div className="rounded-xl border border-line bg-panel p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-warn" />
              Daily Briefing
            </div>
            <p className="text-[11px] leading-relaxed text-mut">{briefing}</p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex gap-2.5", m.role === "user" && "flex-row-reverse")}>
                {m.role === "conductor" ? (
                  <Avatar name="The Conductor" color="#a78bfa" size="sm" />
                ) : (
                  <Avatar name="Jordan Reyes" color="#8b93ff" size="sm" />
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                    m.role === "conductor"
                      ? "rounded-tl-sm border border-line bg-panel2 text-ink"
                      : "rounded-tr-sm bg-acc/15 text-ink",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 pl-1 text-xs text-mut">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> conductor synthesizing…
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="rounded-full border border-line bg-panel2 px-2.5 py-1 text-[10px] text-mut transition-colors hover:border-acc/40 hover:text-ink"
              >
                {p}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the conductor anything…"
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || loading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Sheet>
    </>
  );
}