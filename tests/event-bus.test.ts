import { describe, it, expect, vi, afterEach } from "vitest";
import { eventBus } from "@/lib/events/bus";
import { eventRepository } from "@/lib/repositories";
import { prisma } from "@/lib/db";

async function seedContact() {
  const existing = await prisma.contact.findFirst();
  if (existing) return existing;
  return prisma.contact.create({
    data: {
      name: "Bus Test Contact",
      company: "Test Co",
      email: "bus@test.dev",
      role: "Founder",
      tags: "[]",
      lastTouchAt: new Date(),
    },
  });
}

describe("event bus", () => {
  afterEach(async () => {
    await prisma.event.deleteMany({});
    await prisma.communication.deleteMany({});
    await prisma.contact.deleteMany({});
  });

  it("subscribes, emits, and notifies listeners", async () => {
    const listener = vi.fn();
    const unsubscribe = eventBus.subscribe(listener);
    const contact = await seedContact();

    await eventBus.emit({
      type: "MESSAGE_RECEIVED",
      aggregate: "contact",
      aggregateId: contact.id,
      actor: "mercury",
      summary: "Inbound from test",
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const received = listener.mock.calls[0][0];
    expect(received.type).toBe("MESSAGE_RECEIVED");
    expect(received.summary).toBe("Inbound from test");
    expect(received.aggregateId).toBe(contact.id);

    unsubscribe();
    await eventBus.emit({
      type: "MESSAGE_RECEIVED",
      aggregate: "contact",
      aggregateId: contact.id,
      actor: "mercury",
      summary: "Second",
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("persists events to the store", async () => {
    const contact = await seedContact();
    const ev = await eventBus.emit({
      type: "CONTACT_UPDATED",
      aggregate: "contact",
      aggregateId: contact.id,
      actor: "operator",
      summary: "Contact updated",
      priority: "HIGH",
    });
    const stored = await eventRepository.findAll({ limit: 50 });
    const found = stored.find((e) => e.id === ev.id);
    expect(found?.priority).toBe("HIGH");
  });

  it("keeps a bounded recent ring", async () => {
    const contact = await seedContact();
    for (let i = 0; i < 300; i++) {
      await eventBus.emit({
        type: "SYSTEM_BOOT",
        aggregate: "system",
        aggregateId: `sys-${i}`,
        actor: "test",
        summary: `event ${i}`,
      });
    }
    expect(eventBus.recent().length).toBeLessThanOrEqual(250);
  });

  it("emitMany persists every event", async () => {
    const contact = await seedContact();
    const evs = await eventBus.emitMany([
      {
        type: "SYSTEM_BOOT",
        aggregate: "system",
        aggregateId: "a",
        actor: "test",
        summary: "a",
      },
      {
        type: "SYSTEM_BOOT",
        aggregate: "system",
        aggregateId: "b",
        actor: "test",
        summary: "b",
      },
    ]);
    expect(evs).toHaveLength(2);
    const all = await eventRepository.findAll({ limit: 50 });
    expect(all.some((e) => e.summary === "b")).toBe(true);
  });
});