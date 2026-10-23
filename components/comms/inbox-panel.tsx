"use client";

import * as React from "react";
import { Send, ChevronDown, Reply, Sparkles, CheckCheck } from "lucide-react";
import { Tabs } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn, timeAgo, colorFor } from "@/lib/utils";

type Comm = {
  id: string;
  channel: string;
  direction: string;
  senderName: string;
  senderColor: string | null;
  subject: string | null;
  preview: string;
  body: string;
  priority: string;
  sentiment: string;
  read: boolean;
  createdAt: string | Date;
  aiSummary: string | null;
  contact: { id: string; name: string; company: string; role: string } | null;
};

const PRIORITY_TONE: Record<string, "crit" | "warn" | "info" | "ok"> = {
  CRITICAL: "crit",
  HIGH: "warn",
  MEDIUM: "info",
  LOW: "ok",
};

const SENTIMENT_COLOR: Record<string, string> = {
  POSITIVE: "#34d399",
  NEUTRAL: "#8d8da0",
  NEGATIVE: "#f87171",
};

export function InboxPanel({ initial }: { initial: Comm[] }) {
  const [tab, setTab] = React.useState("all");
  const [selected, setSelected] = React.useState<Comm | null>(null);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    if (tab === "unread") return initial.filter((c) => !c.read);
    if (tab === "critical") return initial.filter((c) => c.priority === "HIGH" || c.priority === "CRITICAL");
    return initial;
  }, [initial, tab]);

  const counts = React.useMemo(
    () => ({
      all: initial.length,
      unread: initial.filter((c) => !c.read).length,
      critical: initial.filter((c) => c.priority === "HIGH" || c.priority === "CRITICAL").length,
    }),
    [initial],
  );

  const sendReply = async () => {
    if (!selected || !draft.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/comms/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: selected.id, content: draft, tone: "professional" }),
      });
      if (res.ok) {
        setSent(selected.id);
        setDraft("");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <div className="mb-3">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "all", label: "All", count: counts.all },
              { value: "unread", label: "Unread", count: counts.unread },
              { value: "critical", label: "Critical", count: counts.critical },
            ]}
          />
        </div>
        <div className="scrollbar-none max-h-[68vh] space-y-1.5 overflow-y-auto pr-1">
          {filtered.slice(0, 80).map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-colors",
                selected?.id === c.id ? "border-acc/50 bg-acc/5" : "border-line bg-panel hover:border-line-strong",
              )}
            >
              <div className="flex items-center gap-2">
                <Avatar name={c.contact?.name ?? c.senderName} color={c.senderColor ?? colorFor(c.senderName)} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("truncate text-xs font-semibold", !c.read && "text-acc")}>
                      {c.contact?.name ?? c.senderName}
                    </span>
                    <span className="shrink-0 font-data text-[9px] text-mut2">{timeAgo(c.createdAt)}</span>
                  </div>
                  <div className="text-[10px] text-mut2">
                    {c.contact?.company ?? "—"} · <span className="uppercase">{c.channel}</span> · {c.direction.toLowerCase()}
                  </div>
                </div>
              </div>
              <p className="mt-2 truncate text-[11px] font-medium text-ink/90">{c.subject ?? c.preview}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Badge tone={PRIORITY_TONE[c.priority] ?? "muted"}>{c.priority}</Badge>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: SENTIMENT_COLOR[c.sentiment] ?? "#8d8da0" }} />
                {!c.read && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-acc animate-pulse-dot" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-8">
        {selected ? (
          <div className="rounded-xl border border-line bg-panel">
            <div className="border-b border-line p-5">
              <div className="flex items-center gap-3">
                <Avatar name={selected.contact?.name ?? selected.senderName} color={selected.senderColor ?? colorFor(selected.senderName)} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{selected.contact?.name ?? selected.senderName}</div>
                  <div className="text-[11px] text-mut">
                    {selected.contact?.role ?? "Contact"} · {selected.contact?.company ?? "—"} · via {selected.channel}
                  </div>
                </div>
                <Badge tone={PRIORITY_TONE[selected.priority] ?? "muted"}>{selected.priority}</Badge>
              </div>
              <div className="mt-3 text-sm font-semibold">{selected.subject ?? "(no subject)"}</div>
              <div className="mt-1 text-[11px] text-mut2">
                {new Date(selected.createdAt).toLocaleString()} · {selected.direction.toLowerCase()} · sentiment: {selected.sentiment.toLowerCase()}
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto p-5">
              {selected.aiSummary ? (
                <div className="mb-4 rounded-lg border border-acc/25 bg-acc/5 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-acc">
                    <Sparkles className="h-3 w-3" /> Mercury summary
                  </div>
                  <p className="text-xs leading-relaxed text-ink/90">{selected.aiSummary}</p>
                </div>
              ) : null}
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink/90">{selected.body}</div>
            </div>

            <div className="border-t border-line p-4">
              {sent === selected.id ? (
                <div className="flex items-center gap-2 rounded-lg border border-ok/30 bg-ok/10 px-3 py-2.5 text-xs text-ok">
                  <CheckCheck className="h-4 w-4" /> Reply sent — queued on the outbound channel.
                </div>
              ) : (
                <>
                  <div className="mb-2 flex items-center gap-2 text-[11px] text-mut">
                    <Reply className="h-3.5 w-3.5" /> Compose reply
                    <span className="text-mut2">· tone: professional</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Draft a reply… Mercury can help if you type 'draft'."
                      className="min-h-[72px] flex-1 resize-none"
                    />
                    <Button size="icon" onClick={sendReply} disabled={!draft.trim() || sending}>
                      {sending ? <ChevronDown className="h-4 w-4 animate-spin-slow" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-line-strong text-xs text-mut2">
            Select a message to open the thread and reply.
          </div>
        )}
      </div>
    </div>
  );
}