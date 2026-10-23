import { Compass, Target, Scale, Rocket } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat";
import { Progress } from "@/components/ui/progress";
import { decisionRepository, okrRepository, userRepository } from "@/lib/repositories";
import { jsonParse, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StrategyPage() {
  const [okrs, decisions, operator] = await Promise.all([
    okrRepository.findAll(),
    decisionRepository.findAll(),
    userRepository.getOperator(),
  ]);

  const quarters = Array.from(new Set(okrs.map((o) => o.quarter))).sort().reverse();
  const objectives = okrs.filter((o) => o.kind === "OBJECTIVE");
  const avgProgress = objectives.length ? Math.round(objectives.reduce((a, o) => a + o.progress, 0) / objectives.length) : 0;
  const avgConfidence = objectives.length ? Math.round(objectives.reduce((a, o) => a + o.confidence, 0) / objectives.length) : 0;
  const resolvedDecisions = decisions.filter((d) => d.status === "RESOLVED").length;

  return (
    <div>
      <PageHeader
        title="Strategy"
        desc="North star, OKR momentum, and the decision log — the company memory of why things are the way they are."
        badge={<span className="font-mono text-[10px] text-mut2">{quarters[0] ?? "—"} cycle</span>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Avg OKR progress" value={`${avgProgress}%`} delta={`${objectives.length} objectives`} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Confidence" value={`${avgConfidence}%`} delta="crew consensus" deltaTone="neutral" icon={<Compass className="h-4 w-4" />} />
        <StatCard label="Decisions" value={String(decisions.length)} delta={`${resolvedDecisions} resolved`} deltaTone="neutral" icon={<Scale className="h-4 w-4" />} />
        <StatCard label="North star" value="ARR $5M" delta="by EOY · $4.2M tracked" deltaTone="neutral" icon={<Rocket className="h-4 w-4" />} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          {quarters.map((quarter) => {
            const quarterOkrs = okrs.filter((o) => o.quarter === quarter);
            const objs = quarterOkrs.filter((o) => o.kind === "OBJECTIVE");
            return (
              <Card key={quarter}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {quarter}
                    <Badge tone="acc">OBJECTIVES</Badge>
                  </CardTitle>
                  <CardDescription>{objs.length} objectives · {quarterOkrs.length - objs.length} key results</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {objs.map((obj) => {
                    const krs = quarterOkrs.filter((k) => k.parentId === obj.id);
                    return (
                      <div key={obj.id} className="rounded-xl border border-line bg-panel2 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-semibold">{obj.objective}</div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="font-data text-xs font-bold">{obj.progress}%</span>
                            <Badge tone={obj.confidence >= 75 ? "ok" : obj.confidence >= 55 ? "warn" : "crit"}>{obj.confidence}% conf</Badge>
                          </div>
                        </div>
                        <Progress value={obj.progress} className="mt-3" />
                        {krs.length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-line pt-3">
                            {krs.map((kr) => (
                              <div key={kr.id} className="flex items-center gap-3">
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-acc" />
                                <span className="flex-1 text-[11px] text-ink/85">{kr.objective}</span>
                                <span className="font-data text-[10px] font-semibold text-acc">{kr.progress}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4 lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Decision log</CardTitle>
              <CardDescription>Why we do what we do — {resolvedDecisions} resolved</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {decisions.map((d) => {
                const alternatives = jsonParse<Array<{ label: string; pros: string; cons: string }>>(d.alternatives, []);
                return (
                  <div key={d.id} className="rounded-xl border border-line bg-panel2 p-4">
                    <div className="flex items-center gap-2">
                      <Badge tone={d.status === "RESOLVED" ? "ok" : "warn"}>{d.status}</Badge>
                      <span className="font-data text-[9px] text-mut2">{fmtDate(d.date, { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold">{d.title}</div>
                    <p className="mt-1 text-[11px] leading-relaxed text-mut">{d.context}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {d.tags.split(",").filter(Boolean).map((t) => (
                        <span key={t} className="rounded-md border border-line bg-panel px-1.5 py-0.5 text-[9px] text-mut2">{t.trim()}</span>
                      ))}
                    </div>
                    <div className="mt-2.5 rounded-lg border border-acc/25 bg-acc/5 px-3 py-2 text-[11px] text-acc2">
                      <span className="font-semibold">Decision:</span> {d.decision}
                    </div>
                    {alternatives.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-[9px] font-semibold uppercase tracking-widest text-mut2">Alternatives considered</div>
                        {alternatives.map((alt, i) => (
                          <div key={i} className="text-[10px] text-mut">
                            · {alt.label}
                          </div>
                        ))}
                      </div>
                    )}
                    {d.outcome && (
                      <div className="mt-2 text-[10px] text-ok">
                        <span className="font-semibold">Outcome:</span> {d.outcome}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operator profile</CardTitle>
              <CardDescription>Who runs the nexus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 text-xs">
              <div className="flex justify-between"><span className="text-mut">Name</span><span className="font-semibold">{operator?.name ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-mut">Company</span><span className="font-semibold">{operator?.company ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-mut">Email</span><span className="font-semibold">{operator?.email ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-mut">Timezone</span><span className="font-semibold">{operator?.timezone ?? "—"}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}