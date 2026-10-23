import { describe, it, expect, beforeAll } from "vitest";
import { GET as eventsGet } from "@/app/api/events/route";
import { POST as tasksPost } from "@/app/api/tasks/route";
import { GET as searchGet } from "@/app/api/search/route";
import { GET as notificationsGet } from "@/app/api/notifications/route";
import { POST as knowledgeDump } from "@/app/api/knowledge/brain-dump/route";
import { prisma } from "@/lib/db";

let contactId = "";

beforeAll(async () => {
  const c = await prisma.contact.create({
    data: {
      name: "Api Test Contact",
      company: "Api Co",
      email: "api@test.dev",
      role: "Founder",
      tags: "[]",
      lastTouchAt: new Date(),
    },
  });
  contactId = c.id;
});

describe("api — GET endpoints", () => {
  it("events list returns events", async () => {
    const res = await eventsGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.events)).toBe(true);
  });

  it("notifications list returns notifications", async () => {
    const res = await notificationsGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("search returns results for a query", async () => {
    const res = await searchGet(new Request("http://localhost/api/search?q=pricing"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.results)).toBe(true);
  });
});

describe("api — POST validation", () => {
  it("tasks rejects invalid bodies", async () => {
    const res = await tasksPost(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "x" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("tasks accepts valid bodies and persists", async () => {
    const res = await tasksPost(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Api task", priority: "P0", department: "OPERATIONS" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.task.title).toBe("Api task");
    expect(body.task.status).toBe("BACKLOG");
  });

  it("brain dump rejects short content", async () => {
    const res = await knowledgeDump(
      new Request("http://localhost/api/knowledge/brain-dump", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: "x" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("brain dump accepts valid content", async () => {
    const res = await knowledgeDump(
      new Request("http://localhost/api/knowledge/brain-dump", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: "A useful note about the api test." }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it("handles malformed json", async () => {
    const res = await tasksPost(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});