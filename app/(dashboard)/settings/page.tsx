import { Info, RotateCcw, ShieldCheck, UserCog } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat";
import { SettingsPanels } from "@/components/settings/panels";
import { agentRepository, userRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [operator, agents] = await Promise.all([
    userRepository.getOperator(),
    agentRepository.findAll(),
  ]);

  return (
    <div>
      <PageHeader
        title="Settings"
        desc="Operator profile, crew configuration, notification policies, and system administration."
        badge={<span className="font-mono text-[10px] text-mut2">nexus v1.0</span>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Operator" value={operator?.name ?? "—"} delta={operator?.company ?? "—"} icon={<UserCog className="h-4 w-4" />} />
        <StatCard label="Crew size" value={String(agents.length)} delta={`${agents.filter((a) => a.status === "IDLE").length} idle`} deltaTone="neutral" icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard label="Environment" value="Local" delta="SQLite · simulated AI" deltaTone="neutral" icon={<Info className="h-4 w-4" />} />
        <StatCard label="Data" value="Seeded" delta="deterministic rng" deltaTone="neutral" icon={<RotateCcw className="h-4 w-4" />} />
      </div>

      <SettingsPanels agents={agents} />
    </div>
  );
}