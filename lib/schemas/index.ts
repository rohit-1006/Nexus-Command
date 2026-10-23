import { z } from "zod";

// ---------------------------------------------------------------- scalars

export const idSchema = z.string().min(1).max(64);
export const isoDateSchema = z.string().datetime({ offset: true }).or(z.date());
export const nullableIsoDateSchema = isoDateSchema.nullable().optional();

// ---------------------------------------------------------------- enums

export const departmentSchema = z.enum([
  "COMMS", "REVENUE", "SOCIAL", "FINANCE", "KNOWLEDGE", "OPERATIONS", "STRATEGY",
]);
export const channelSchema = z.enum(["EMAIL", "SLACK", "WHATSAPP", "SMS", "VOICE"]);
export const directionSchema = z.enum(["INBOUND", "OUTBOUND"]);
export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const sentimentSchema = z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]);
export const dealStageSchema = z.enum([
  "LEAD", "QUALIFIED", "DISCOVERY", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST",
]);
export const taskStatusSchema = z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "DONE"]);
export const taskPrioritySchema = z.enum(["P0", "P1", "P2", "P3"]);
export const postStatusSchema = z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"]);
export const socialPlatformSchema = z.enum([
  "X", "LINKEDIN", "INSTAGRAM", "YOUTUBE", "TIKTOK", "NEWSLETTER", "THREADS", "BLUESKY",
]);
export const transactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);
export const transactionCategorySchema = z.enum([
  "SOFTWARE", "MARKETING", "CONTRACTORS", "INFRASTRUCTURE", "EDUCATION",
  "TRAVEL", "LEGAL", "OTHER", "INCOME_PRODUCT", "INCOME_SERVICE",
  "INCOME_SUBSCRIPTION", "INCOME_AFFILIATE", "INCOME_OTHER",
]);
export const knowledgeCategorySchema = z.enum([
  "CLIENT", "PRODUCT", "PROCESS", "INSIGHT", "DECISION", "MEETING", "RESEARCH",
]);
export const integrationStatusSchema = z.enum(["CONNECTED", "NOT_CONFIGURED", "DEGRADED", "ERROR"]);

// ---------------------------------------------------------------- entities

export const agentCreateSchema = z.object({
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(60),
  department: departmentSchema,
  role: z.string().min(2).max(120),
  personality: z.string().min(2).max(2000),
  capabilities: z.array(z.string()).max(40),
  memoryContext: z.string().max(4000).default(""),
  config: z.record(z.unknown()).default({}),
  avatarColor: z.string().default("#22d3ee"),
  avatarIcon: z.string().default("Bot"),
});

export const agentUpdateSchema = agentCreateSchema.partial();

export const agentRunTriggerSchema = z.object({
  reason: z.string().min(2).max(500).default("Manual trigger from operator"),
});

export const agentChatSchema = z.object({
  message: z.string().min(1).max(4000),
});

export const agentBroadcastSchema = z.object({
  directive: z.string().min(2).max(4000),
});

// ---------------------------------------------------------------- comms

export const communicationCreateSchema = z.object({
  contactId: idSchema,
  channel: channelSchema,
  direction: directionSchema,
  senderName: z.string().min(1).max(120),
  senderColor: z.string().default("#3b82f6"),
  subject: z.string().max(300).optional(),
  preview: z.string().min(1).max(400),
  body: z.string().min(1).max(8000),
  priority: prioritySchema.default("MEDIUM"),
  sentiment: sentimentSchema.default("NEUTRAL"),
  aiSummary: z.string().max(2000).optional(),
  threadKey: z.string().max(120).optional(),
  read: z.boolean().default(true),
});

export const replyDraftSchema = z.object({
  messageId: idSchema,
  tone: z.enum(["professional", "casual", "assertive"]),
});

export const replySendSchema = z.object({
  messageId: idSchema,
  content: z.string().min(1).max(8000),
  tone: z.enum(["professional", "casual", "assertive"]).default("professional"),
});

export const dictationSchema = z.object({
  transcript: z.string().min(1).max(8000),
  channel: channelSchema.optional(),
});

// ---------------------------------------------------------------- revenue

export const dealCreateSchema = z.object({
  title: z.string().min(2).max(200),
  contactId: idSchema,
  stage: dealStageSchema.default("LEAD"),
  value: z.number().nonnegative().max(100_000_000),
  probability: z.number().int().min(0).max(100).default(10),
  source: z.string().min(2).max(120).default("organic"),
  nextAction: z.string().max(300).default(""),
});

export const dealUpdateSchema = dealCreateSchema.partial();

export const dealStageChangeSchema = z.object({
  toStage: dealStageSchema,
  note: z.string().max(500).optional(),
});

// ---------------------------------------------------------------- social

export const socialPostCreateSchema = z.object({
  platform: socialPlatformSchema,
  content: z.string().min(1).max(4000),
  status: postStatusSchema.default("DRAFT"),
  scheduledAt: isoDateSchema.optional(),
  accountId: idSchema.optional(),
  seriesId: idSchema.optional(),
});

export const captionVariationSchema = z.object({
  platform: socialPlatformSchema,
  topic: z.string().min(2).max(300),
});

// ---------------------------------------------------------------- finances

export const transactionCreateSchema = z.object({
  date: isoDateSchema,
  description: z.string().min(2).max(300),
  amount: z.number().finite(),
  type: transactionTypeSchema,
  category: transactionCategorySchema,
  vendor: z.string().max(200).optional(),
  recurring: z.boolean().default(false),
  invoiceId: idSchema.optional(),
  note: z.string().max(500).optional(),
});

export const invoiceCreateSchema = z.object({
  contactId: idSchema.optional(),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE"]).default("DRAFT"),
  issueDate: isoDateSchema,
  dueDate: isoDateSchema,
  amount: z.number().positive(),
  description: z.string().min(2).max(400),
});

export const statementRequestSchema = z.object({
  kind: z.enum(["pnl", "balance", "cashflow"]),
  months: z.number().int().min(1).max(12).default(3),
});

// ---------------------------------------------------------------- knowledge

export const brainDumpSchema = z.object({
  content: z.string().min(2).max(12000),
});

export const knowledgeQuerySchema = z.object({
  question: z.string().min(2).max(1000),
});

export const knowledgeNodeCreateSchema = z.object({
  title: z.string().min(2).max(200),
  summary: z.string().min(2).max(2000),
  content: z.string().min(2).max(20000),
  category: knowledgeCategorySchema,
  source: z.string().min(2).max(200).default("operator"),
  importance: z.number().int().min(0).max(100).default(50),
  tags: z.array(z.string()).default([]),
  links: z.array(idSchema).default([]),
});

// ---------------------------------------------------------------- tasks

export const taskCreateSchema = z.object({
  title: z.string().min(2).max(300),
  description: z.string().max(4000).default(""),
  status: taskStatusSchema.default("BACKLOG"),
  priority: taskPrioritySchema.default("P2"),
  source: z.string().min(1).max(80).default("operator"),
  department: departmentSchema.default("OPERATIONS"),
  dueDate: isoDateSchema.optional(),
  estimateHours: z.number().int().min(1).max(200).default(2),
  dependencies: z.array(idSchema).default([]),
  delegationNote: z.string().max(2000).optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial();

// ---------------------------------------------------------------- workflows

export const workflowCreateSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).default(""),
  definition: z.record(z.unknown()),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).default("ACTIVE"),
  isTemplate: z.boolean().default(false),
});

export const workflowRunSchema = z.object({
  trigger: z.string().min(1).max(500).default("manual"),
  payload: z.record(z.unknown()).default({}),
});

// ---------------------------------------------------------------- integrations

export const integrationConnectSchema = z.object({
  apiKey: z.string().min(4).max(500),
  config: z.record(z.unknown()).default({}),
});

export const integrationWebhookSchema = z.object({
  source: z.string().min(2).max(120),
  url: z.string().min(2).max(500),
  secret: z.string().min(4).max(200),
});

// ---------------------------------------------------------------- misc

export const notificationUpdateSchema = z.object({
  read: z.boolean(),
});

export const broadcastSchema = z.object({
  message: z.string().min(1).max(4000),
});

export const searchSchema = z.object({
  q: z.string().max(200).default(""),
});

// ---------------------------------------------------------------- types re-export

export type AgentCreateInput = z.infer<typeof agentCreateSchema>;
export type CommunicationCreateInput = z.infer<typeof communicationCreateSchema>;
export type DealCreateInput = z.infer<typeof dealCreateSchema>;
export type SocialPostCreateInput = z.infer<typeof socialPostCreateSchema>;
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type KnowledgeNodeCreateInput = z.infer<typeof knowledgeNodeCreateSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type WorkflowCreateInput = z.infer<typeof workflowCreateSchema>;
export type IntegrationConnectInput = z.infer<typeof integrationConnectSchema>;