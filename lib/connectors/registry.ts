import type { Integration, IntegrationStatus } from "@prisma/client";

/**
 * Connector Honesty Protocol.
 *
 * Every external integration reports an honest, typed status:
 *   connected | not_configured | degraded | error
 * A green light is NEVER faked — if a service isn't wired it shows
 * "Awaiting Configuration". Real statuses come from the integration
 * repository (which itself is seeded honestly — demo connectors that
 * represent a live service are `not_configured` by default).
 */

export type ConnectorStatus = IntegrationStatus;

export const CONNECTOR_STATUS_META: Record<ConnectorStatus, { label: string; color: string; dot: string }> = {
  CONNECTED: { label: "Connected", color: "#34d399", dot: "#34d399" },
  NOT_CONFIGURED: { label: "Awaiting Configuration", color: "#64748b", dot: "#64748b" },
  DEGRADED: { label: "Degraded", color: "#fbbf24", dot: "#fbbf24" },
  ERROR: { label: "Error", color: "#f87171", dot: "#f87171" },
};

export interface ConnectorService {
  service: string;
  category: string;
  description: string;
}

export const CONNECTOR_CATALOG: ConnectorService[] = [
  { service: "Gmail", category: "Email", description: "Inbound/outbound email routing" },
  { service: "Outlook", category: "Email", description: "Microsoft 365 email" },
  { service: "IMAP", category: "Email", description: "Generic IMAP mailbox" },
  { service: "Google Calendar", category: "Calendar", description: "Meeting scheduling & sync" },
  { service: "Apple Calendar", category: "Calendar", description: "iCloud calendar" },
  { service: "Stripe", category: "Payments", description: "Card payments & MRR" },
  { service: "PayPal", category: "Payments", description: "Payments & invoicing" },
  { service: "HubSpot", category: "CRM", description: "Marketing & sales CRM" },
  { service: "Pipedrive", category: "CRM", description: "Pipeline CRM" },
  { service: "X API", category: "Social", description: "Twitter/X publishing & metrics" },
  { service: "LinkedIn", category: "Social", description: "LinkedIn publishing" },
  { service: "Instagram Graph", category: "Social", description: "Instagram publishing & insights" },
  { service: "Slack", category: "Messaging", description: "Team & direct messaging" },
  { service: "WhatsApp Business", category: "Messaging", description: "WhatsApp business API" },
  { service: "Telegram", category: "Messaging", description: "Telegram bot messaging" },
  { service: "Beehiiv", category: "Newsletter", description: "Newsletter publishing" },
  { service: "ConvertKit", category: "Newsletter", description: "Email list management" },
  { service: "Google Drive", category: "Storage", description: "Document storage" },
  { service: "Notion", category: "Storage", description: "Workspace & knowledge" },
  { service: "Dropbox", category: "Storage", description: "File sync & share" },
  { service: "GA4", category: "Analytics", description: "Web analytics" },
  { service: "Plausible", category: "Analytics", description: "Privacy-first analytics" },
  { service: "Zapier", category: "Automation", description: "Cross-app automation" },
  { service: "Make", category: "Automation", description: "Visual automation" },
  { service: "OpenAI", category: "AI", description: "LLM provider (agents)" },
  { service: "Anthropic", category: "AI", description: "LLM provider (agents)" },
  { service: "Gemini", category: "AI", description: "LLM provider (agents)" },
  { service: "Typeform", category: "Webhooks", description: "Form submissions inbound" },
  { service: "Calendly", category: "Webhooks", description: "Booking events inbound" },
  { service: "ManyChat", category: "Webhooks", description: "Chat automations inbound" },
];

export function statusLabel(status: IntegrationStatus): string {
  return CONNECTOR_STATUS_META[status].label;
}

export function statusColor(status: IntegrationStatus): string {
  return CONNECTOR_STATUS_META[status].color;
}

export function isLive(status: IntegrationStatus): boolean {
  return status === "CONNECTED";
}

export function summarizeIntegrations(integrations: Integration[]): {
  connected: number;
  notConfigured: number;
  degraded: number;
  error: number;
  total: number;
} {
  const counts: Record<IntegrationStatus, number> = {
    CONNECTED: 0,
    NOT_CONFIGURED: 0,
    DEGRADED: 0,
    ERROR: 0,
  };
  for (const i of integrations) counts[i.status]++;
  return {
    connected: counts.CONNECTED,
    notConfigured: counts.NOT_CONFIGURED,
    degraded: counts.DEGRADED,
    error: counts.ERROR,
    total: integrations.length,
  };
}