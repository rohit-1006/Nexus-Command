import { TrendingUp, Target, PieChart, Zap } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat";
import { TrendArea } from "@/components/charts/area";
import { Donut } from "@/components/charts/donut";
import { DealStageCell } from "@/components/revenue/deal-stage-cell";
import { dealRepository } from "@/lib/repositories";
import { fmtMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STAGE_BAR_COLORS = ["#22d3ee", "#8b93ff", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#f87171"];

export default async function RevenuePage() {
  const [deals, funnel, stages, sources] = await Promise.all([
    dealRepository.findAll(),
    dealRepository.funnel(),
    dealRepository.stageBreakdown(),
    dealRepository.sourceBreakdown(),
  ]);

  const open = deals.filter((d) => d.stage !== "CLOSED_WON" && d.stage !== "CLOSED_LOST");
  const atRisk = open.filter((d) => d.healthScore < 45);
  const forecast = stages
    .filter((s) => s.stage !== "CLOSED_LOST")
    .map((s) => ({
      stage: s.stage,
      value: s.value,
      weighted: s.stage === "CLOSED_WON"
        ? s.value
        : deals.filter((d) => d.stage === s.stage).reduce((a, d) => a + (d.value * d.probability) / 100, 0),
    }));

  const stageChart = stages.map((s, i) => ({ label: s.stage, value: s.value, color: STAGE_BAR_COLORS[i % STAGE_BAR_COLORS.length] }));
  const sourceChart = sources.map((s) => ({ name: s.source, value: s.value }));
  void stageChart;

  return (
    <div>
      <PageHeader
        title="Revenue"
        desc="Pipeline velocity, deal health, and a probabilistic forecast — maintained by Atlas, reconciled by the Ledger."
        badge={<span className="font-mono text-[10px] text-mut2">{deals.length} deals tracked</span>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open pipeline" value={fmtMoney(funnel.openValue, { compact: true })} delta={`${open.length} active deals`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Weighted forecast" value={fmtMoney(funnel.weightedValue, { compact: true })} delta="probability-adjusted" deltaTone="neutral" icon={<Target className="h-4 w-4" />} />
        <StatCard label="Close rate" value={`${funnel.closed ? Math.round((funnel.closed / Math.max(1, funnel.closed + funnel.leads)) * 100) : 0}%`} delta={`${funnel.closed} won`} deltaTone="ok" icon={<Zap className="h-4 w-4" />} />
        <StatCard label="At-risk deals" value={String(atRisk.length)} delta={atRisk.length ? "health < 45" : "all healthy"} deltaTone={atRisk.length ? "crit" : "ok"} icon={<PieChart className="h-4 w-4" />} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Pipeline value by stage</CardTitle>
            <CardDescription>Raw vs probability-weighted — the shaded line is what Atlas actually expects to land</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendArea
              data={forecast}
              series={[
                { key: "value", name: "Raw value", color: "var(--chart1)" },
                { key: "weighted", name: "Weighted", color: "var(--chart2)" },
              ]}
              money
              height={240}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Deal sources</CardTitle>
            <CardDescription>Where pipeline comes from</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut data={sourceChart} money height={230} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active pipeline</CardTitle>
          <CardDescription>Sorted by stage, then value — change stage with the selector</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-widest text-mut2">
                  <th className="pb-2 pr-3 font-semibold">Deal</th>
                  <th className="pb-2 pr-3 font-semibold">Contact</th>
                  <th className="pb-2 pr-3 font-semibold">Value</th>
                  <th className="pb-2 pr-3 font-semibold">Prob.</th>
                  <th className="pb-2 pr-3 font-semibold">Health</th>
                  <th className="pb-2 pr-3 font-semibold">Stage</th>
                  <th className="pb-2 font-semibold">Atlas move</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.id} className="border-b border-line last:border-0 hover:bg-panel2/60">
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-ink">{d.title}</div>
                      <div className="text-[10px] text-mut2">{d.source} · {d.daysInStage}d in stage</div>
                    </td>
                    <td className="py-2.5 pr-3 text-mut">{d.contact.name}</td>
                    <td className="py-2.5 pr-3 font-data font-semibold">{fmtMoney(d.value)}</td>
                    <td className="py-2.5 pr-3 font-data">{d.probability}%</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-panel3">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, d.healthScore)}%`,
                              background: d.healthScore >= 60 ? "var(--ok)" : d.healthScore >= 45 ? "var(--warn)" : "var(--crit)",
                            }}
                          />
                        </div>
                        <span className="font-data text-[10px] text-mut">{d.healthScore}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <DealStageCell dealId={d.id} stage={d.stage} />
                    </td>
                    <td className="max-w-[220px] py-2.5 text-[10px] leading-snug text-mut">{d.suggestedMove || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}