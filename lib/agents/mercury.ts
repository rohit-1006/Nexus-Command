import type { AgentDefinition } from "@/lib/agents/types";
import { communicationRepository, contactRepository, dealRepository } from "@/lib/repositories";
import { fmtDate, timeAgo } from "@/lib/utils";

export const mercury: AgentDefinition = {
  slug: "mercury",
  name: "Mercury",
  department: "COMMS",
  role: "Comms Director — triage, draft, never drop a thread",
  personality:
    "Fast, precise, zero tolerance for unanswered inbound. Mercury reads every message like a threat or an opportunity and keeps the operator's inbox as a clean, prioritized queue.",
  capabilities: [
    "Inbound triage & urgency scoring",
    "Reply drafting (3 tones)",
    "Cold-thread detection (>48h)",
    "Weekly comms digest",
    "Sentiment tracking per contact",
  ],
  avatarColor: "#22d3ee",
  avatarIcon: "Zap",
  memoryContext:
    "Mercury owns the omni-channel inbox (email, Slack, WhatsApp, SMS, voice). Operator replies personally to anything HIGH+; Mercury drafts everything else.",
  config: { model: "gpt-4o-mini", temperature: 0.6, coldThresholdHours: 48 },

  async run() {
    const log: string[] = [];
    log.push("[scan] Reading all channels…");
    const inbound = await communicationRepository.findAll({ limit: 80 });
    const unread = inbound.filter((c) => !c.read);
    const high = unread.filter((c) => c.priority === "HIGH" || c.priority === "CRITICAL");
    log.push(`[triage] ${unread.length} unread inbound; ${high.length} require operator attention`);

    const cold = await communicationRepository.coldThreads(48, 8);
    log.push(`[cold] ${cold.length} threads silent >48h: ${cold.map((c) => c.contact.name).join(", ") || "none"}`);

    const digest = {
      totalInbound: inbound.length,
      unread: unread.length,
      critical: high.length,
      coldThreads: cold.length,
      topSenders: inbound.slice(0, 5).map((m) => m.senderName),
      generated: new Date().toISOString(),
    };
    log.push("[digest] weekly comms digest assembled");

    const notifications: Array<{ title: string; body: string; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; category: string; link?: string }> = [];
    if (high.length > 0) {
      notifications.push({
        title: `${high.length} critical inbound ${high.length === 1 ? "message" : "messages"}`,
        body: `Mercury triaged ${high[0]?.senderName ?? "unknown"} and ${high.length - 1} others as priority. Draft replies are staged in the Comms hub.`,
        priority: "HIGH",
        category: "comms",
        link: "/comms",
      });
    }
    if (cold.length > 0) {
      notifications.push({
        title: `${cold.length} conversation${cold.length > 1 ? "s" : ""} going cold`,
        body: cold
          .slice(0, 3)
          .map((c) => `${c.contact.name} (${c.hoursSince}h since last inbound)`)
          .join(", "),
        priority: "MEDIUM",
        category: "comms",
        link: "/comms",
      });
    }

    const tasks = cold
      .filter((c) => c.hoursSince > 72)
      .slice(0, 3)
      .map((c) => ({
        title: `Re-engage ${c.contact.name}`,
        description: `Last inbound ${timeAgo(c.lastMessage.createdAt)} via ${c.lastMessage.channel}. Thread: "${c.lastMessage.preview.slice(0, 90)}…"`,
        priority: "P1" as const,
        department: "COMMS" as const,
        dueInDays: 1,
        delegationNote: `Cold-thread detection: no response in ${c.hoursSince}h. A personal touch here protects pipeline.`,
      }));

    return {
      summary: `Triaged ${unread.length} unread messages (${high.length} critical), detected ${cold.length} cold threads.`,
      log,
      output: digest,
      notifications,
      tasks,
      recommendations: [
        high.length
          ? `Approve draft replies for ${high.length} critical inbound — fastest path to zero-inbox.`
          : "Inbox is clear of critical items.",
        cold.length ? `Revive ${cold.length} cold conversation${cold.length > 1 ? "s" : ""} today.` : "No conversations are at risk of going cold.",
        "Schedule your 10-minute inbox sweep for the same time tomorrow — consistency compounds.",
      ],
    };
  },

  async respond(message: string) {
    const lower = message.toLowerCase();
    if (lower.includes("digest") || lower.includes("summary")) {
      const inbound = await communicationRepository.findAll({ limit: 50 });
      const unread = inbound.filter((c) => !c.read);
      const byChannel = new Map<string, number>();
      for (const m of inbound) byChannel.set(m.channel, (byChannel.get(m.channel) ?? 0) + 1);
      return `Comms digest — ${inbound.length} messages in the window, ${unread.length} unread. Channel mix: ${Array.from(byChannel.entries()).map(([c, n]) => `${c} ${n}`).join(", ")}. Top inbound sender: ${inbound[0]?.senderName ?? "n/a"}.`;
    }
    if (lower.includes("cold") || lower.includes("quiet") || lower.includes("stale")) {
      const cold = await communicationRepository.coldThreads(48, 10);
      if (!cold.length) return "Nothing is going cold right now — every inbound thread has been answered within 48 hours.";
      return `${cold.length} thread${cold.length > 1 ? "s" : ""} silent for 48h+: ${cold.map((c) => `${c.contact.name} (${c.hoursSince}h)`).join(", ")}. The ${cold[0]?.contact.name ?? ""} one is the most valuable — it's tied to a ${fmtDate(cold[0]?.lastMessage.createdAt ?? new Date())} inbound about their deal.`;
    }
    if (lower.includes("sentiment") || lower.includes("relationship")) {
      const contacts = await contactRepository.findAll();
      const negative = contacts.filter((c) => c.sentiment === "NEGATIVE");
      const positive = contacts.filter((c) => c.sentiment === "POSITIVE");
      return `Sentiment across ${contacts.length} contacts: ${positive.length} positive, ${contacts.length - positive.length - negative.length} neutral, ${negative.length} negative. ${negative.length ? `Worth attention: ${negative.map((c) => c.name).slice(0, 3).join(", ")}.` : "No negative relationships on the books."}`;
    }
    if (lower.includes("draft") || lower.includes("reply")) {
      const deals = await dealRepository.findOpen();
      const warm = deals.filter((d) => d.healthScore >= 60);
      return `I can draft replies for any message in the Comms hub — pick one and choose professional, casual, or assertive. Pattern I use: open with their words, add one concrete value line, close with a single clear ask. ${warm.length ? `The "${warm[0]?.title}" thread is ripe for a nudge — their last inbound was about timing.` : ""}`;
    }
    return `I'm tracking ${message.length > 40 ? "that" : "that"} — happy to: summarize any channel, hunt cold threads, draft replies in three tones, or give a sentiment read on any contact. What's the fastest win for your inbox today?`;
  },
};