import { describe, it, expect } from "vitest";
import { AGENT_DEFINITIONS, getAgentDefinition } from "@/lib/agents/registry";

describe("agent registry", () => {
  it("registers exactly six agents", () => {
    expect(AGENT_DEFINITIONS).toHaveLength(6);
  });

  it("has unique slugs across departments", () => {
    const slugs = AGENT_DEFINITIONS.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(6);
    const departments = AGENT_DEFINITIONS.map((a) => a.department);
    expect(new Set(departments).size).toBe(6);
  });

  it("every agent has complete metadata", () => {
    for (const a of AGENT_DEFINITIONS) {
      expect(a.name.length).toBeGreaterThan(1);
      expect(a.role.length).toBeGreaterThan(5);
      expect(a.personality.length).toBeGreaterThan(20);
      expect(a.capabilities.length).toBeGreaterThan(0);
      expect(a.avatarColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(typeof a.run).toBe("function");
      expect(typeof a.respond).toBe("function");
    }
  });

  it("resolves agents by slug", () => {
    const conductor = getAgentDefinition("conductor");
    expect(conductor?.name).toBeDefined();
    expect(getAgentDefinition("nope")).toBeNull();
  });
});

describe("agent runtime — chat replies", () => {
  it("every agent can respond to operator messages", async () => {
    for (const a of AGENT_DEFINITIONS) {
      const reply = await a.respond("What are you working on?");
      expect(reply).toBeTruthy();
      expect(reply.length).toBeGreaterThan(10);
    }
  }, 30000);
});

describe("agent runtime — runs produce structured output", () => {
  it("every agent run returns a summary, log, output, and recommendations", async () => {
    for (const a of AGENT_DEFINITIONS) {
      const result = await a.run();
      expect(result.summary.length).toBeGreaterThan(10);
      expect(Array.isArray(result.log)).toBe(true);
      expect(result.log.length).toBeGreaterThan(0);
      expect(result.output).toBeTypeOf("object");
      expect(Array.isArray(result.recommendations)).toBe(true);
      if (result.tasks) {
        for (const t of result.tasks) expect(t.title.length).toBeGreaterThan(3);
      }
    }
  }, 60000);
});