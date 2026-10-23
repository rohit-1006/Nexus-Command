"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { timeAgo } from "@/lib/utils";

type ConnectorProps = {
  id: string;
  service: string;
  category: string;
  status: string;
  statusTone: "ok" | "warn" | "crit" | "muted";
  apiKeyMasked: string | null;
  lastSyncAt: string | Date | null;
  dataPointsSynced: number;
  connectedAt: string | Date | null;
  notes: string | null;
};

const SERVICE_COLOR: Record<string, string> = {
  Stripe: "#a78bfa",
  Gmail: "#f87171",
  Slack: "#34d399",
  LinkedIn: "#8b93ff",
  Twitter: "#22d3ee",
  "OpenAI": "#22d3ee",
  "Anthropic": "#fbbf24",
  Instagram: "#f472b6",
  GitHub: "#e2e8f0",
  Notion: "#e2e8f0",
};

export function ConnectorRow(props: ConnectorProps) {
  const router = useRouter();
  const [connectOpen, setConnectOpen] = React.useState(false);
  const [apiKey, setApiKey] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const connect = async () => {
    if (!apiKey.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/integrations/${props.id}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, config: {} }),
      });
      if (res.ok) {
        setConnectOpen(false);
        setApiKey("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel2 px-3 py-2.5 transition-colors hover:border-line-strong">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold uppercase"
        style={{ background: `${SERVICE_COLOR[props.service] ?? "#8b93ff"}22`, color: SERVICE_COLOR[props.service] ?? "#8b93ff" }}
      >
        {props.service.slice(0, 2)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{props.service}</span>
          <span className="text-[9px] uppercase tracking-wider text-mut2">{props.category}</span>
        </div>
        <div className="text-[10px] text-mut">
          {props.status === "CONNECTED"
            ? `key ${props.apiKeyMasked ?? "—"} · ${props.dataPointsSynced.toLocaleString()} points synced · ${props.lastSyncAt ? `last sync ${timeAgo(props.lastSyncAt)}` : ""}`
            : props.status === "ERROR"
              ? props.notes ?? "Connection error — check credentials"
              : props.status === "DEGRADED"
                ? props.notes ?? "Degraded — elevated latency"
                : "No credentials configured"}
        </div>
      </div>
      <Badge tone={props.statusTone}>{props.status.replace("_", " ")}</Badge>
      {props.status === "NOT_CONFIGURED" ? (
        <Button size="sm" variant="outline" onClick={() => setConnectOpen(true)}>
          Connect
        </Button>
      ) : null}

      <Dialog open={connectOpen} onClose={() => setConnectOpen(false)} title={`Connect ${props.service}`}>
        <div className="space-y-3">
          <p className="text-[11px] leading-relaxed text-mut">
            Paste an API key to connect. Nexus stores only a masked fingerprint and uses the key for deterministic, simulated syncs in this environment.
          </p>
          <Input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-…"
            type="password"
            autoFocus
          />
          <Button className="w-full" onClick={connect} disabled={!apiKey.trim() || busy}>
            {busy ? "Connecting…" : "Connect"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}