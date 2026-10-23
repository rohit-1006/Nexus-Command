import { Plug, RefreshCw, ShieldAlert, ServerOff } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat";
import { ConnectorRow } from "@/components/integrations/connector-row";
import { integrationRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "ok" | "warn" | "crit" | "muted"> = {
  CONNECTED: "ok",
  DEGRADED: "warn",
  ERROR: "crit",
  NOT_CONFIGURED: "muted",
};

export default async function IntegrationsPage() {
  const integrations = await integrationRepository.findAll();
  const connected = integrations.filter((i) => i.status === "CONNECTED");
  const degraded = integrations.filter((i) => i.status === "DEGRADED");
  const errors = integrations.filter((i) => i.status === "ERROR");
  const notConfigured = integrations.filter((i) => i.status === "NOT_CONFIGURED");

  return (
    <div>
      <PageHeader
        title="Integrations"
        desc="Connector Honesty Protocol: every service reports its true status. No fake green lights."
        badge={<span className="font-mono text-[10px] text-mut2">{connected.length} connected · {errors.length} errors</span>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Connected" value={String(connected.length)} delta="live sync" deltaTone="ok" icon={<Plug className="h-4 w-4" />} />
        <StatCard label="Degraded" value={String(degraded.length)} delta="latency or partial" deltaTone="warn" icon={<ShieldAlert className="h-4 w-4" />} />
        <StatCard label="Errors" value={String(errors.length)} delta="needs attention" deltaTone="crit" icon={<ServerOff className="h-4 w-4" />} />
        <StatCard label="Unconfigured" value={String(notConfigured.length)} delta="tap to connect" deltaTone="neutral" icon={<RefreshCw className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connector registry</CardTitle>
          <CardDescription>Honest status for every third-party surface Nexus talks to</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 pt-0">
          {integrations.map((i) => (
            <ConnectorRow
              key={i.id}
              id={i.id}
              service={i.service}
              category={i.category}
              status={i.status}
              statusTone={STATUS_TONE[i.status] ?? "muted"}
              apiKeyMasked={i.apiKeyMasked}
              lastSyncAt={i.lastSyncAt}
              dataPointsSynced={i.dataPointsSynced}
              connectedAt={i.connectedAt}
              notes={i.notes}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}