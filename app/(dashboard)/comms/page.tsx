import { Inbox, MessageSquare, TrendingUp, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat";
import { InboxPanel } from "@/components/comms/inbox-panel";
import { communicationRepository, contactRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

const CHANNELS = ["email", "slack", "whatsapp", "sms", "linkedin"] as const;

export default async function CommsPage() {
  const [all, contacts, cold] = await Promise.all([
    communicationRepository.findAll({ limit: 300 }),
    contactRepository.findAll(),
    communicationRepository.coldThreads(48, 6),
  ]);

  const unread = all.filter((c) => !c.read);
  const critical = unread.filter((c) => c.priority === "HIGH" || c.priority === "CRITICAL");
  const outbound = all.filter((c) => c.direction === "OUTBOUND").length;
  const responseRate = outbound + all.filter((c) => c.direction === "INBOUND").length
    ? Math.round((outbound / Math.max(1, all.filter((c) => c.direction === "INBOUND").length)) * 100)
    : 0;

  const byChannel = CHANNELS.map((ch) => ({
    channel: ch,
    count: all.filter((c) => c.channel === ch.toUpperCase()).length,
    unread: all.filter((c) => c.channel === ch.toUpperCase() && !c.read).length,
  }));

  const coldCount = cold.length;

  return (
    <div>
      <PageHeader
        title="Communications"
        desc="Every signal across email, Slack, WhatsApp, SMS and LinkedIn — unified, prioritized, and drafted for you."
        badge={<span className="font-mono text-[10px] text-mut2">{all.length} total · {unread.length} unread</span>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unread inbox" value={String(unread.length)} delta={`${critical.length} critical`} deltaTone={critical.length ? "crit" : "ok"} icon={<Inbox className="h-4 w-4" />} />
        <StatCard label="Response rate" value={`${responseRate}%`} delta="24h window" deltaTone="neutral" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Cold threads" value={String(coldCount)} delta="older than 48h" deltaTone={coldCount ? "warn" : "ok"} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Contacts" value={String(contacts.length)} delta={`${contacts.filter((c) => c.relationshipStage === "CHURN_RISK").length} at risk`} deltaTone="warn" icon={<MessageSquare className="h-4 w-4" />} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {byChannel.map((ch) => (
          <div key={ch.channel} className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5">
            <span className="text-[11px] font-medium capitalize">{ch.channel}</span>
            <span className="font-mono text-[10px] text-mut">{ch.count}</span>
            {ch.unread > 0 && <span className="font-mono text-[10px] font-bold text-acc">{ch.unread} unread</span>}
          </div>
        ))}
      </div>

      <InboxPanel initial={all} />
    </div>
  );
}