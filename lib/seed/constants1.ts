import type { ChannelType, Priority, Sentiment } from "@prisma/client";

export const CONTACT_SEED: Array<{
  name: string;
  company: string;
  role: string;
  stage: "PROSPECT" | "ACTIVE" | "PARTNER" | "CHURN_RISK" | "INACTIVE";
  ltv: number;
  nps: number | null;
  tags: string[];
}> = [
  { name: "Priya Sharma", company: "Helios Media", role: "VP Growth", stage: "ACTIVE", ltv: 184000, nps: 9, tags: ["enterprise", "saas"] },
  { name: "Marcus Webb", company: "Vantage Labs", role: "CTO", stage: "ACTIVE", ltv: 221000, nps: 8, tags: ["enterprise", "product"] },
  { name: "Sofia Contreras", company: "Orbital Finance", role: "COO", stage: "ACTIVE", ltv: 156000, nps: 7, tags: ["enterprise", "fintech"] },
  { name: "Daniel Kim", company: "Pulse Analytics", role: "Founder", stage: "PROSPECT", ltv: 0, nps: null, tags: ["startup"] },
  { name: "Amara Okafor", company: "Kite Digital", role: "Head of Ops", stage: "ACTIVE", ltv: 98000, nps: 8, tags: ["mid-market"] },
  { name: "Lucas Meyer", company: "Quantia Systems", role: "CEO", stage: "CHURN_RISK", ltv: 124000, nps: 5, tags: ["enterprise", "at-risk"] },
  { name: "Elena Petrova", company: "Northwind Retail", role: "CMO", stage: "PROSPECT", ltv: 0, nps: null, tags: ["retail"] },
  { name: "James O'Connor", company: "Apex Logistics", role: "VP Sales", stage: "ACTIVE", ltv: 76000, nps: 9, tags: ["mid-market"] },
  { name: "Hana Suzuki", company: "Zenith Robotics", role: "CTO", stage: "PROSPECT", ltv: 0, nps: null, tags: ["startup", "hardware"] },
  { name: "Omar Haddad", company: "Crescent Health", role: "Director of IT", stage: "ACTIVE", ltv: 143000, nps: 7, tags: ["healthcare", "enterprise"] },
  { name: "Chloe Laurent", company: "Atelier Mode", role: "Founder", stage: "ACTIVE", ltv: 45000, nps: 10, tags: ["fashion"] },
  { name: "Ravi Patel", company: "Brightpath Energy", role: "COO", stage: "PROSPECT", ltv: 0, nps: null, tags: ["energy"] },
  { name: "Ingrid Larsen", company: "Fjord Insights", role: "Head of Research", stage: "ACTIVE", ltv: 88000, nps: 6, tags: ["research"] },
  { name: "Tomas Silva", company: "Solace Travel", role: "CEO", stage: "INACTIVE", ltv: 32000, nps: 4, tags: ["travel"] },
  { name: "Aisha Bello", company: "Terra Agro", role: "VP Engineering", stage: "PROSPECT", ltv: 0, nps: null, tags: ["agritech"] },
  { name: "Nathan Brooks", company: "Ironclad Security", role: "CISO", stage: "ACTIVE", ltv: 198000, nps: 9, tags: ["security", "enterprise"] },
  { name: "Yuki Tanaka", company: "Sakura Games", role: "Founder", stage: "ACTIVE", ltv: 67000, nps: 8, tags: ["gaming"] },
  { name: "Maria Garcia", company: "Vela Ventures", role: "Partner", stage: "ACTIVE", ltv: 112000, nps: 7, tags: ["vc"] },
  { name: "Peter Novak", company: "Orion Aerospace", role: "PM Director", stage: "PROSPECT", ltv: 0, nps: null, tags: ["aerospace"] },
  { name: "Fatima Al-Rashid", company: "Sahara Fintech", role: "CEO", stage: "ACTIVE", ltv: 165000, nps: 8, tags: ["fintech", "enterprise"] },
  { name: "George Miller", company: "Summit Realty", role: "Managing Partner", stage: "INACTIVE", ltv: 28000, nps: 5, tags: ["realestate"] },
  { name: "Nina Volkov", company: "Arctic Logistics", role: "VP Ops", stage: "PROSPECT", ltv: 0, nps: null, tags: ["logistics"] },
  { name: "Carlos Mendes", company: "Amazonia Bio", role: "CTO", stage: "ACTIVE", ltv: 91000, nps: 7, tags: ["biotech"] },
  { name: "Sara Lindqvist", company: "Nordic Fitness", role: "Founder", stage: "ACTIVE", ltv: 52000, nps: 8, tags: ["fitness"] },
  { name: "David Cohen", company: "Manhattan Legal", role: "Managing Partner", stage: "PROSPECT", ltv: 0, nps: null, tags: ["legal"] },
];

export const DEAL_TITLES = [
  "Enterprise Analytics Suite",
  "Platform Migration",
  "Annual Support Retainer",
  "Data Pipeline Modernization",
  "Compliance Package",
  "Integration Expansion",
  "Team License Expansion",
  "White-label Pilot",
  "Advisory Engagement",
  "Multi-year Platform Deal",
  "Ops Automation Rollout",
  "Security Review Package",
  "Regional Expansion License",
  "Growth Partnership",
  "Legacy System Replacement",
] as const;

export const SOURCES = ["organic", "referral", "paid", "social", "direct"] as const;

export const SUBJECTS = [
  "Quarterly review call",
  "Pricing question",
  "Meeting notes follow-up",
  "Renewal discussion",
  "New requirement",
  "Invoice question",
  "Onboarding feedback",
  "Security questionnaire",
  "Expansion opportunity",
  "Contract terms",
];

export const BODY_FRAGMENTS = [
  "We reviewed the latest metrics and are impressed with the momentum - can we talk next steps?",
  "Our team hit a few questions around integration limits; mind circling back when you have a moment?",
  "Thanks for the demo - we'd like to move to a paid pilot if the timeline holds.",
  "The contract has been routed to legal for a final pass; expect a signed copy by Friday.",
  "We're seeing strong adoption in the first two teams and want to expand coverage.",
  "Just following up on the proposal from last week - any questions on the commercial side?",
  "Could you share the updated security questionnaire? Our compliance review needs it.",
  "We love the new dashboard. Is there a roadmap item for custom report exports?",
  "The pilot exceeded expectations. Let's talk about a full rollout next quarter.",
  "Reminder: the invoice is due this week - let me know if you need an extension.",
  "Happy with the service so far. What would a long-term agreement look like?",
  "We've decided to postpone the expansion until after our next funding round.",
  "Can we reschedule Thursday's call? Our exec team is in an offsite.",
  "The integration with our CRM is causing some friction - support ticket raised.",
];

export const CHANNELS: ChannelType[] = ["EMAIL", "EMAIL", "SLACK", "WHATSAPP", "SMS", "VOICE"];
export const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "MEDIUM", "HIGH", "HIGH", "CRITICAL"];
export const SENTIMENTS: Sentiment[] = ["POSITIVE", "POSITIVE", "NEUTRAL", "NEUTRAL", "NEUTRAL", "NEGATIVE"];

export const EVENT_TYPES = [
  "AGENT_RUN_COMPLETED",
  "AGENT_RUN_STARTED",
  "MESSAGE_RECEIVED",
  "MESSAGE_SENT",
  "DEAL_STAGE_CHANGED",
  "DEAL_CREATED",
  "TRANSACTION_LOGGED",
  "INVOICE_CREATED",
  "KNOWLEDGE_CREATED",
  "KNOWLEDGE_LINKED",
  "TASK_CREATED",
  "TASK_MOVED",
  "WORKFLOW_RUN_COMPLETED",
  "SOCIAL_POST_PUBLISHED",
  "NOTIFICATION_SENT",
  "CONTACT_UPDATED",
  "FORECAST_GENERATED",
  "DIGEST_GENERATED",
  "BRAIN_DUMP_PROCESSED",
  "SYSTEM_BOOT",
] as const;

export const AGENT_RUN_SUMMARIES: Record<string, string[]> = {
  conductor: [
    "Daily briefing generated - 47 overnight events synthesized, 3 priority actions surfaced.",
    "Priority arbitration: instructed Atlas to deprioritize pipeline cleanup in favor of forecast.",
    "Weekly strategy digest delivered to operator.",
    "Cross-department health check: all systems nominal.",
    "Briefing: revenue week trending 12% above plan.",
  ],
  mercury: [
    "Triaged 14 unread messages (3 critical), drafted 6 replies.",
    "Cold-thread sweep: 2 conversations silent >48h flagged.",
    "Weekly comms digest assembled: 61 messages, 4 channels.",
    "Drafted assertive follow-ups for 5 proposal threads.",
    "Inbox triage: 9 messages processed, 2 required operator attention.",
  ],
  atlas: [
    "Scored 15 deals; 2 flagged at-risk (<45 health).",
    "90-day forecast generated with confidence bands.",
    "Pipeline gap analysis: referral source underweight.",
    "Churn radar: 1 account showing disengagement signals.",
    "Weekly revenue report: $412K weighted pipeline.",
  ],
  muse: [
    "Generated 5 content ideas from trend scan.",
    "Analyzed top post: 48K reach on LinkedIn - replication drafted.",
    "Best-time analysis updated for 8 platforms.",
    "Series performance review: 'Founder Diaries' scoring 87/100.",
    "Captioned 3 drafts for scheduled publishing.",
  ],
  ledger: [
    "Reconciled 23 transactions; 2 anomalies flagged.",
    "Monthly close: $386K in, $142K out, 63% margin.",
    "Runway model updated: cash-flow positive.",
    "Tax reserve re-estimated: $31K per quarter.",
    "Categorized 17 transactions automatically.",
  ],
  cortex: [
    "Processed 3 brain dumps into structured nodes.",
    "Graph review: 40 nodes, 62 edges, 2 orphans.",
    "Missing-link detection: suggested 5 new edges.",
    "Weekly state-of-knowledge report generated.",
    "Structured meeting notes into 2 client nodes.",
  ],
};