import type { AgentDefinition } from "@/lib/agents/types";
import { conductor } from "@/lib/agents/conductor";
import { mercury } from "@/lib/agents/mercury";
import { atlas } from "@/lib/agents/atlas";
import { muse } from "@/lib/agents/muse";
import { ledger } from "@/lib/agents/ledger";
import { cortex } from "@/lib/agents/cortex";
import { agentRepository } from "@/lib/repositories";

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  conductor,
  mercury,
  atlas,
  muse,
  ledger,
  cortex,
];

const bySlug = new Map(AGENT_DEFINITIONS.map((a) => [a.slug, a]));

export function getAgentDefinition(slug: string): AgentDefinition | null {
  return bySlug.get(slug) ?? null;
}

/** Idempotent — creates Agent rows for every registered definition. */
export async function ensureAgents(): Promise<void> {
  for (const def of AGENT_DEFINITIONS) {
    const existing = await agentRepository.findBySlug(def.slug);
    if (!existing) {
      await agentRepository.create({
        slug: def.slug,
        name: def.name,
        department: def.department,
        role: def.role,
        personality: def.personality,
        capabilities: def.capabilities,
        memoryContext: def.memoryContext,
        config: def.config,
        avatarColor: def.avatarColor,
        avatarIcon: def.avatarIcon,
      });
    }
  }
}

export { conductor, mercury, atlas, muse, ledger, cortex };