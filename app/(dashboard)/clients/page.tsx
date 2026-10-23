import { Users, HeartHandshake, AlertTriangle, Star } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat";
import { Donut } from "@/components/charts/donut";
import { Avatar } from "@/components/ui/avatar";
import { contactRepository, contactColor } from "@/lib/repositories";
import { fmtMoney, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STAGE_TONE: Record<string, "ok" | "info" | "warn" | "crit" | "acc" | "muted"> = {
  ACTIVE: "ok",
  PARTNER: "acc",
  LEAD: "info",
  CHURN_RISK: "crit",
  INACTIVE: "muted",
};

const SENTIMENT_COLOR: Record<string, string> = {
  POSITIVE: "#34d399",
  NEUTRAL: "#8d8da0",
  NEGATIVE: "#f87171",
};

export default async function ClientsPage() {
  const contacts = await contactRepository.findAll();

  const byStage = new Map<string, number>();
  for (const c of contacts) byStage.set(c.relationshipStage, (byStage.get(c.relationshipStage) ?? 0) + 1);
  const stageChart = Array.from(byStage.entries()).map(([name, value]) => ({ name, value }));

  const byCompany = new Map<string, { count: number; ltv: number }>();
  for (const c of contacts) {
    const g = byCompany.get(c.company) ?? { count: 0, ltv: 0 };
    g.count += 1;
    g.ltv += c.ltv;
    byCompany.set(c.company, g);
  }
  const topCompanies = Array.from(byCompany.entries())
    .sort((a, b) => b[1].ltv - a[1].ltv)
    .slice(0, 8);

  const totalLtv = contacts.reduce((a, c) => a + c.ltv, 0);
  const atRisk = contacts.filter((c) => c.relationshipStage === "CHURN_RISK");
  const active = contacts.filter((c) => c.relationshipStage === "ACTIVE" || c.relationshipStage === "PARTNER").length;

  return (
    <div>
      <PageHeader
        title="Clients & Contacts"
        desc="Relationships with their own health: engagement, sentiment, and lifetime value — watched by Mercury, triaged by the crew."
        badge={<span className="font-mono text-[10px] text-mut2">{contacts.length} contacts · {topCompanies.length} key accounts</span>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total contacts" value={String(contacts.length)} delta={`${active} active`} deltaTone="ok" icon={<Users className="h-4 w-4" />} />
        <StatCard label="Lifetime value" value={fmtMoney(totalLtv, { compact: true })} delta="sum of all LTV" deltaTone="neutral" icon={<Star className="h-4 w-4" />} />
        <StatCard label="At risk" value={String(atRisk.length)} delta={atRisk.length ? "needs outreach" : "none"} deltaTone={atRisk.length ? "crit" : "ok"} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Partners" value={String(contacts.filter((c) => c.relationshipStage === "PARTNER").length)} delta="deep relationships" deltaTone="neutral" icon={<HeartHandshake className="h-4 w-4" />} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Relationship stages</CardTitle>
            <CardDescription>Portfolio distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut data={stageChart} height={230} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Top accounts by LTV</CardTitle>
            <CardDescription>Where the value concentrates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {topCompanies.map(([company, g]) => (
              <div key={company} className="flex items-center gap-3">
                <span className="w-44 truncate text-xs font-medium text-ink/90">{company}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel3">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(g.ltv / Math.max(1, topCompanies[0][1].ltv)) * 100}%`,
                      background: "var(--acc)",
                      boxShadow: "0 0 8px var(--glow)",
                    }}
                  />
                </div>
                <span className="w-20 text-right font-data text-[11px] text-mut">{g.count} contacts</span>
                <span className="w-24 text-right font-data text-xs font-semibold">{fmtMoney(g.ltv, { compact: true })}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact roster</CardTitle>
          <CardDescription>Every relationship, with live health signals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {contacts.map((c) => {
              const engagement = c.engagementScore;
              return (
                <div key={c.id} className="rounded-xl border border-line bg-panel2 p-3.5 transition-colors hover:border-line-strong">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} color={contactColor(c.name)} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold">{c.name}</div>
                      <div className="truncate text-[10px] text-mut">{c.role} · {c.company}</div>
                    </div>
                    <Badge tone={STAGE_TONE[c.relationshipStage] ?? "muted"}>{c.relationshipStage.replace("_", " ")}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-2.5 text-center">
                    <div>
                      <div className="font-data text-xs font-bold" style={{ color: SENTIMENT_COLOR[c.sentiment] ?? "#8d8da0" }}>
                        {c.sentiment.charAt(0) + c.sentiment.slice(1).toLowerCase()}
                      </div>
                      <div className="text-[8px] uppercase tracking-wider text-mut2">sentiment</div>
                    </div>
                    <div>
                      <div className="font-data text-xs font-bold">{engagement}</div>
                      <div className="text-[8px] uppercase tracking-wider text-mut2">engagement</div>
                    </div>
                    <div>
                      <div className="font-data text-xs font-bold">{fmtMoney(c.ltv, { compact: true })}</div>
                      <div className="text-[8px] uppercase tracking-wider text-mut2">ltv</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel3">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, engagement)}%`,
                          background: engagement >= 70 ? "var(--ok)" : engagement >= 40 ? "var(--warn)" : "var(--crit)",
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-mut2">last {c.lastTouchAt ? fmtDate(c.lastTouchAt) : "never"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}