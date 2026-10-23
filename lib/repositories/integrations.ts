import type { Integration } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/repositories/base";
import { integrationConnectSchema, integrationWebhookSchema } from "@/lib/schemas";

export const integrationRepository = {
  async findAll(): Promise<Integration[]> {
    return prisma.integration.findMany({ orderBy: [{ status: "asc" }, { category: "asc" }] });
  },

  async findById(id: string): Promise<Integration | null> {
    return prisma.integration.findUnique({ where: { id } });
  },

  async connect(id: string, input: unknown): Promise<Integration> {
    const data = safe(integrationConnectSchema, input);
    if (!data.ok) throw new Error(`integration.connect invalid: ${data.error}`);
    const masked = `${data.data.apiKey.slice(0, 4)}…${data.data.apiKey.slice(-4)}`;
    return prisma.integration.update({
      where: { id },
      data: {
        status: "CONNECTED",
        connectedAt: new Date(),
        lastSyncAt: new Date(),
        apiKeyMasked: masked,
        config: JSON.stringify({ ...data.data.config, rotatedAt: new Date().toISOString() }),
      },
    });
  },

  async disconnect(id: string): Promise<Integration> {
    return prisma.integration.update({
      where: { id },
      data: { status: "NOT_CONFIGURED", connectedAt: null, apiKeyMasked: null },
    });
  },

  async setStatus(id: string, status: string): Promise<Integration> {
    return prisma.integration.update({ where: { id }, data: { status: status as never } });
  },

  async setSync(id: string, dataPoints: number): Promise<Integration> {
    return prisma.integration.update({
      where: { id },
      data: { lastSyncAt: new Date(), dataPointsSynced: { increment: dataPoints } },
    });
  },

  async create(input: {
    service: string;
    category: string;
    status: string;
    config?: Record<string, unknown>;
    notes?: string;
  }): Promise<Integration> {
    return prisma.integration.create({
      data: {
        service: input.service,
        category: input.category,
        status: input.status as never,
        config: JSON.stringify(input.config ?? {}),
        notes: input.notes ?? null,
      },
    });
  },

  async webhooks(): Promise<Integration[]> {
    return prisma.integration.findMany({ where: { category: "Webhooks" } });
  },
};

export function parseConnectInput(input: unknown): { apiKey: string; config: Record<string, unknown> } | { error: string } {
  const parsed = safe(integrationConnectSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return { apiKey: parsed.data.apiKey, config: parsed.data.config };
}

export function parseWebhookInput(input: unknown): { source: string; url: string; secret: string } | { error: string } {
  const parsed = safe(integrationWebhookSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return parsed.data;
}