import { Activity, BarChart3, CalendarRange, Zap } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat";
import { TrendArea } from "@/components/charts/area";
import { SingleBars } from "@/components/charts/bar";
import { EventHeatmap } from "@/components/analytics/event-heatmap";
import { dealRepository, eventRepository, socialRepository, taskRepository } from "@/lib/repositories";
import { fmtMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AnalyticsPage() {
  const [revenueByDay, eventTypes, heatmap, overlap, tasks, socialAgg] = await Promise.all([
    dealRepository.revenueByDay(90),
    eventRepository.countByType(30),
    socialRepository.engagementByDayHour(),
    socialRepository.audienceOverlap(),
    taskRepository.countByStatus(),
    socialRepository.aggregateMetrics(),
  ]);

  const revenueTrend = revenueByDay.map((d) => ({ label: d.date.slice(5), value: d.value }));
  const revenueTotal = revenueByDay.reduce((a, d) => a + d.value, 0);
  const eventTotal = eventTypes.reduce((a, e) => a + e.count, 0);
  const totalTasks = Object.values(tasks).reduce((a, b) => a + b, 0);
  const engagementRate = socialAgg.impressions ? ((socialAgg.engagements / socialAgg.impressions) * 100).toFixed(1) : "0";

  const heatmapRows = Array.from({ length: 7 }).map((_, day) => ({
    day,
    label: DAY_LABELS[day],
    cells: Array.from({ length: 24 }).map((_, hour) => {
      const cell = heatmap.find((h) => h.day === day && h.hour === hour);
      return { hour, rate: cell?.engagementRate ?? 0, volume: cell?.volume ?? 0 };
    }),
  }));

  const maxRate = Math.max(1, ...heatmap.map((h) => h.engagementRate));

  return (
    <div>
      <PageHeader
        title="Analytics"
        desc="Cross-module KPIs: revenue realization, event volume, engagement, and task throughput in one view."
        badge={<span className="font-mono text-[10px] text-mut2">90-day window</span>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (90d)" value={fmtMoney(revenueTotal, { compact: true })} delta="realized from won deals" icon={<BarChart3 className="h-4 w-4" />} />
        <StatCard label="Events (30d)" value={String(eventTotal)} delta={`${eventTypes[0]?.type ?? "—"} top type`} deltaTone="neutral" icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Engagement" value={`${engagementRate}%`} delta="all platforms" deltaTone="ok" icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Task throughput" value={String(totalTasks)} delta={`${tasks.DONE} done`} deltaTone="neutral" icon={<CalendarRange className="h-4 w-4" />} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Revenue realization — 90 days</CardTitle>
            <CardDescription>Daily value of closed-won deals</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendArea data={revenueTrend} series={[{ key: "value", name: "Revenue", color: "var(--chart2)" }]} money height={250} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Event volume by type</CardTitle>
            <CardDescription>What the system talked about this month</CardDescription>
          </CardHeader>
          <CardContent>
            <SingleBars
              data={eventTypes.slice(0, 8).map((e) => ({ label: e.type.replace(/_/g, " ").toLowerCase(), count: e.count }))}
              dataKey="count"
              height={250}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Engagement heatmap</CardTitle>
            <CardDescription>Best times to post — engagement rate by day and hour</CardDescription>
          </CardHeader>
          <CardContent>
            <EventHeatmap rows={heatmapRows} maxRate={maxRate} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Audience overlap</CardTitle>
            <CardDescription>Cross-platform reach redundancy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {overlap.slice(0, 10).map((pair, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-24 truncate text-[10px] uppercase tracking-wide text-mut">{pair.a}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel3">
                  <div className="h-full rounded-full bg-acc" style={{ width: `${pair.overlap}%` }} />
                </div>
                <span className="w-10 text-right font-data text-[10px] text-mut">{pair.overlap}%</span>
                <span className="w-24 truncate text-[10px] uppercase tracking-wide text-mut">{pair.b}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}