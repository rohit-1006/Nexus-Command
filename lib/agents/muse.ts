import type { AgentDefinition } from "@/lib/agents/types";
import { socialRepository } from "@/lib/repositories";
import { fmtNumber } from "@/lib/utils";

export const muse: AgentDefinition = {
  slug: "muse",
  name: "Muse",
  department: "SOCIAL",
  role: "Content Strategist — ideas, captions, and audience intelligence",
  personality:
    "Creative but metric-literate. Muse dreams in hooks and validates in engagement rates. It never posts for the sake of posting — everything has a series, a platform, and a reason.",
  capabilities: [
    "Content idea generation from trend signals",
    "Platform-optimized captions & threads",
    "Top-performer replication analysis",
    "Best-time posting windows",
    "Content series performance tracking",
  ],
  avatarColor: "#f472b6",
  avatarIcon: "Sparkles",
  memoryContext:
    "Muse manages 8 platforms (X, LinkedIn, Instagram, YouTube, TikTok, Newsletter, Threads, Bluesky). Three active series: 'Founder Diaries', 'SaaS Metrics Deep-Dive', 'Build in Public'.",
  config: { model: "gpt-4o", temperature: 0.8, maxPostsPerRun: 3 },

  async run() {
    const log: string[] = [];
    const accounts = await socialRepository.findAllAccounts();
    const posts = await socialRepository.allPosts();
    log.push(`[scan] ${accounts.length} platforms, ${posts.length} posts loaded`);

    const top = [...posts]
      .filter((p) => p.status === "PUBLISHED")
      .sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0))
      .slice(0, 3);
    log.push(`[top] best performers: ${top.map((p) => `${p.platform} (${fmtNumber(p.reach ?? 0)})`).join(", ")}`);

    const series = await socialRepository.findSeries();
    const bestSeries = series.sort((a, b) => b.performanceScore - a.performanceScore)[0];

    const ideas = [
      "The 3 numbers I check before 9am (and why you should too)",
      "How I run a $5M solo business with 6 AI agents — full architecture",
      "One framework that doubled my close rate this quarter",
      "What my calendar looks like when revenue is up 40% MoM",
      "The tool stack: $0 to $X — every tool I actually pay for",
    ];

    const drafts = ideas.slice(0, 3).map((idea, i) => ({
      platform: (["X", "LINKEDIN", "NEWSLETTER"] as const)[i],
      content: idea,
      estimatedReach: Math.round((accounts[0]?.followerCount ?? 5000) * (0.05 + i * 0.02)),
    }));

    const health = Math.round(
      accounts.reduce((a, acc) => a + acc.healthScore, 0) / Math.max(1, accounts.length),
    );

    const output = {
      platformHealth: health,
      topPerformers: top.map((p) => ({ platform: p.platform, reach: p.reach, likes: p.likes })),
      bestSeries: bestSeries ? { name: bestSeries.name, score: bestSeries.performanceScore } : null,
      ideas: drafts,
      bestTimes: accounts.map((a) => ({ platform: a.platform, time: a.bestPostingTime })),
      generated: new Date().toISOString(),
    };

    const tasks = drafts.slice(0, 2).map((d, i) => ({
      title: `Write & schedule: "${d.content.slice(0, 40)}…"`,
      description: `Muse's highest-potential draft for ${d.platform} (est. ${fmtNumber(d.estimatedReach)} reach). Series fit: ${bestSeries?.name ?? "Founder Diaries"}.`,
      priority: ("P2" as const),
      department: "SOCIAL" as const,
      dueInDays: 2 + i,
      delegationNote: `Generated from trend scan — ${d.platform} has the weakest content cadence this week.`,
    }));

    return {
      summary: `Scanned ${accounts.length} platforms, isolated ${top.length} top performers, drafted ${drafts.length} new content ideas.`,
      log,
      output,
      tasks,
      agentMessages: top.length
        ? [{
            toAgent: "mercury",
            content: `Heads up — "${top[0]?.content.slice(0, 60)}" went viral on ${top[0]?.platform} (${fmtNumber(top[0]?.reach ?? 0)} reach). Expect an inbound wave; route anything relevant to me and I'll thread it into content.`,
          }]
        : [],
      recommendations: [
        bestSeries ? `Double down on "${bestSeries.name}" — it scores ${bestSeries.performanceScore}/100.` : "Start a new series; engagement is unfocused.",
        top[0] ? `Replicate the ${top[0]?.platform} winner structure — ${top[0]?.content.slice(0, 50)}…` : "Publish consistently — volume is the gap.",
        accounts[0] ? `Post on ${accounts[0].platform} at ${accounts[0].bestPostingTime} — your highest-engagement window.` : "",
      ].filter(Boolean),
    };
  },

  async respond(message: string) {
    const lower = message.toLowerCase();
    if (lower.includes("idea") || lower.includes("content")) {
      const series = await socialRepository.findSeries();
      const topSeries = series.sort((a, b) => b.performanceScore - a.performanceScore)[0];
      return `Here are three hooks I'd test this week: 1) "The 3 numbers I check before 9am" — personal, repeatable. 2) "How I run a $5M solo business with 6 AI agents" — your architecture is the story. 3) "${topSeries?.name ?? "Founder Diaries"} part 2" — your best series is underfed. Want a caption draft for any of them?`;
    }
    if (lower.includes("best time") || lower.includes("when")) {
      const accounts = await socialRepository.findAllAccounts();
      const sorted = [...accounts].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 3);
      return `Best windows right now: ${sorted.map((a) => `${a.platform} at ${a.bestPostingTime} (${a.engagementRate}% ER)`).join(", ")}. The pattern holds across platforms — morning hours win for thought-leadership content.`;
    }
    if (lower.includes("performance") || lower.includes("top") || lower.includes("winner")) {
      const posts = await socialRepository.allPosts();
      const top = posts.filter((p) => p.status === "PUBLISHED").sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0))[0];
      if (!top) return "No published posts to analyze yet.";
      return `Your top post: "${top.content.slice(0, 80)}…" on ${top.platform} — ${fmtNumber(top.reach ?? 0)} reach, ${top.likes ?? 0} likes, ${top.comments ?? 0} comments. The pattern: short personal story, concrete number, one platform. I can replicate it.`;
    }
    return `I'm your content brain — ideas, captions, best times, series strategy, and post-mortems on every platform. Ask me for three hooks, the best posting window, or your top performer's anatomy.`;
  },
};