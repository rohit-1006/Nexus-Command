import { Heart, Eye, Users, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat";
import { TrendArea } from "@/components/charts/area";
import { Donut } from "@/components/charts/donut";
import { socialRepository } from "@/lib/repositories";
import { fmtNumber, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PLATFORM_COLOR: Record<string, string> = {
  twitter: "#22d3ee",
  linkedin: "#8b93ff",
  youtube: "#f87171",
  instagram: "#f472b6",
  tiktok: "#34d399",
  newsletter: "#fbbf24",
  blog: "#a78bfa",
  github: "#e2e8f0",
};

export default async function SocialPage() {
  const [accounts, posts, series, growth, metrics] = await Promise.all([
    socialRepository.findAllAccounts(),
    socialRepository.allPosts(),
    socialRepository.findSeries(),
    socialRepository.growthSeries(180),
    socialRepository.aggregateMetrics(),
  ]);

  const totalFollowers = accounts.reduce((a, x) => a + x.followerCount, 0);
  const totalEngagements = metrics.engagements;
  const totalImpressions = metrics.impressions;
  const published = posts.filter((p) => p.status === "PUBLISHED").length;
  const scheduled = posts.filter((p) => p.status === "SCHEDULED").length;

  const growthChart = growth
    .filter((g) => g.platform === "twitter" || g.platform === "linkedin" || g.platform === "youtube")
    .map((g) => ({ ...g, data: g.data }));

  const byPlatformDonut = accounts.map((a) => ({
    name: a.platform,
    value: a.followerCount,
    color: PLATFORM_COLOR[a.platform],
  }));

  const mostRecent = posts.slice(0, 12);

  return (
    <div>
      <PageHeader
        title="Social Presence"
        desc="Audience growth, engagement, and content cadence across eight surfaces. Muse runs the voice; you run the calendar."
        badge={<span className="font-mono text-[10px] text-mut2">{accounts.length} platforms · {published} published</span>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total followers" value={fmtNumber(totalFollowers)} delta={`${fmtNumber(totalEngagements)} engagements`} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Impressions" value={fmtNumber(totalImpressions)} delta="rolling window" deltaTone="neutral" icon={<Eye className="h-4 w-4" />} />
        <StatCard label="Engagement rate" value={`${totalImpressions ? ((totalEngagements / totalImpressions) * 100).toFixed(1) : 0}%`} delta="above bench" deltaTone="ok" icon={<Heart className="h-4 w-4" />} />
        <StatCard label="Scheduled" value={String(scheduled)} delta={`${published} live`} deltaTone="neutral" icon={<CalendarClock className="h-4 w-4" />} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Audience growth — 6 months</CardTitle>
            <CardDescription>Followers per platform, straight from the metric series</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendArea
              data={growthChart.length ? (() => {
                const max = Math.max(...growthChart.map((g) => g.data.length));
                const merged: Array<Record<string, string | number>> = [];
                for (let i = 0; i < max; i++) {
                  const row: Record<string, string | number> = { label: growthChart[0]?.data[i]?.date.slice(5) ?? `${i}` };
                  for (const g of growthChart) row[g.platform] = g.data[i]?.followers ?? 0;
                  merged.push(row);
                }
                return merged;
              })() : []}
              series={growthChart.map((g) => ({ key: g.platform, name: g.platform, color: PLATFORM_COLOR[g.platform] }))}
              height={250}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Audience split</CardTitle>
            <CardDescription>Followers by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut data={byPlatformDonut} height={250} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Recent posts</CardTitle>
            <CardDescription>Latest activity across all surfaces</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {mostRecent.map((p) => (
              <div key={p.id} className="rounded-lg border border-line bg-panel2 p-3">
                <div className="flex items-center gap-2">
                  <span className="font-data text-[10px] font-bold uppercase" style={{ color: PLATFORM_COLOR[p.account?.platform ?? p.platform] ?? "#8d8da0" }}>
                    {p.account?.platform ?? p.platform}
                  </span>
                  <Badge tone={p.status === "PUBLISHED" ? "ok" : p.status === "SCHEDULED" ? "info" : "muted"}>{p.status}</Badge>
                  <span className="ml-auto font-data text-[9px] text-mut2">{timeAgo(p.createdAt)}</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink/85">{p.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Content series</CardTitle>
            <CardDescription>Ranked by performance score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {series.map((s) => (
              <div key={s.id} className="rounded-lg border border-line bg-panel2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold">{s.name}</span>
                  <span className="font-data text-[10px] text-mut2">{s._count.posts} posts</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-mut">{s.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel3">
                    <div className="h-full rounded-full bg-acc" style={{ width: `${Math.min(100, s.performanceScore)}%` }} />
                  </div>
                  <span className="font-data text-[10px] font-bold text-acc">{s.performanceScore}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}