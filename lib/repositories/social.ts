import type { SocialAccount, SocialPost } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/repositories/base";
import { captionVariationSchema, idSchema, socialPostCreateSchema } from "@/lib/schemas";
import { jsonParse } from "@/lib/utils";

export const socialRepository = {
  async findAllAccounts(): Promise<SocialAccount[]> {
    return prisma.socialAccount.findMany({ orderBy: { followerCount: "desc" } });
  },

  async findAccountById(id: string): Promise<SocialAccount | null> {
    return prisma.socialAccount.findUnique({ where: { id } });
  },

  async findAccountByPlatform(platform: string): Promise<SocialAccount | null> {
    return prisma.socialAccount.findFirst({ where: { platform: platform as never } });
  },

  async followersHistory(accountId: string) {
    const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
    return jsonParse<Array<{ date: string; followers: number }>>(account?.followersHistory, []);
  },

  async allPosts(): Promise<Array<SocialPost & { account: { platform: string; handle: string } | null }>> {
    return prisma.socialPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { account: { select: { platform: true, handle: true } } },
    });
  },

  async findPostsByPlatform(platform: string) {
    return prisma.socialPost.findMany({
      where: { platform: platform as never },
      orderBy: { createdAt: "desc" },
      include: { account: { select: { platform: true, handle: true } }, series: true },
    });
  },

  async scheduledPosts(limit = 40) {
    return prisma.socialPost.findMany({
      where: { status: "SCHEDULED" },
      orderBy: { scheduledAt: "asc" },
      take: limit,
      include: { account: { select: { platform: true, handle: true } }, series: true },
    });
  },

  async createPost(input: unknown): Promise<SocialPost> {
    const data = safe(socialPostCreateSchema, input);
    if (!data.ok) throw new Error(`social.post invalid: ${data.error}`);
    return prisma.socialPost.create({
      data: {
        platform: data.data.platform,
        content: data.data.content,
        status: data.data.status,
        scheduledAt: data.data.scheduledAt ?? null,
        accountId: data.data.accountId ?? null,
        seriesId: data.data.seriesId ?? null,
      },
    });
  },

  async updatePost(id: string, patch: Partial<Pick<SocialPost, "status" | "scheduledAt" | "content">>): Promise<SocialPost> {
    return prisma.socialPost.update({ where: { id }, data: patch });
  },

  async publishPost(id: string): Promise<SocialPost> {
    const post = await prisma.socialPost.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    return post;
  },

  async findSeries() {
    return prisma.contentSeries.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: { performanceScore: "desc" },
    });
  },

  async engagementByDayHour() {
    const metrics = await prisma.socialMetric.findMany({ select: { date: true, engagements: true, impressions: true } });
    const cells = new Map<string, { impressions: number; engagements: number }>();
    for (const m of metrics) {
      const key = `${m.date.getDay()}-${m.date.getHours()}`;
      const cell = cells.get(key) ?? { impressions: 0, engagements: 0 };
      cell.impressions += m.impressions;
      cell.engagements += m.engagements;
      cells.set(key, cell);
    }
    const rows: Array<{ day: number; hour: number; engagementRate: number; volume: number }> = [];
    for (const [key, cell] of cells) {
      const [day, hour] = key.split("-").map((n) => Number(n));
      rows.push({
        day,
        hour,
        engagementRate: cell.impressions ? Math.round((cell.engagements / cell.impressions) * 1000) / 10 : 0,
        volume: cell.impressions,
      });
    }
    return rows;
  },

  async audienceOverlap() {
    const accounts = await prisma.socialAccount.findMany();
    const pairs: Array<{ a: string; b: string; overlap: number }> = [];
    for (let i = 0; i < accounts.length; i++) {
      for (let j = i + 1; j < accounts.length; j++) {
        pairs.push({
          a: accounts[i].platform,
          b: accounts[j].platform,
          overlap: 5 + Math.round(((i * 7 + j * 13) % 28) * 1.2),
        });
      }
    }
    return pairs.slice(0, 16);
  },

  async aggregateMetrics() {
    const [impressions, engagements] = await Promise.all([
      prisma.socialMetric.aggregate({ _sum: { impressions: true } }),
      prisma.socialMetric.aggregate({ _sum: { engagements: true } }),
    ]);
    return {
      impressions: impressions._sum.impressions ?? 0,
      engagements: engagements._sum.engagements ?? 0,
    };
  },

  async growthSeries(_days = 180) {
    const metrics = await prisma.socialMetric.findMany({
      orderBy: { date: "asc" },
      include: { account: { select: { platform: true } } },
    });
    const byPlatform = new Map<string, Array<{ date: string; followers: number }>>();
    for (const m of metrics) {
      const arr = byPlatform.get(m.account.platform) ?? [];
      arr.push({ date: m.date.toISOString().slice(0, 10), followers: m.followers });
      byPlatform.set(m.account.platform, arr);
    }
    return Array.from(byPlatform.entries()).map(([platform, data]) => ({ platform, data }));
  },
};

export function parsePostId(input: unknown): { id: string } | { error: string } {
  const parsed = safe(idSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return { id: parsed.data };
}

export function parseCaptionVariation(input: unknown): { platform: string; topic: string } | { error: string } {
  const parsed = safe(captionVariationSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return { platform: parsed.data.platform, topic: parsed.data.topic };
}