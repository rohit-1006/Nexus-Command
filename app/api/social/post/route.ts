import { NextResponse } from "next/server";
import { socialRepository } from "@/lib/repositories";
import { eventBus } from "@/lib/events/bus";

export async function POST(req: Request) {
  let body: { content?: string; platform?: string; status?: string; scheduledAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.content?.trim() || !body.platform) {
    return NextResponse.json({ error: "content and platform are required" }, { status: 400 });
  }

  const account = await socialRepository.findAccountByPlatform(body.platform);
  const post = await socialRepository.createPost({
    content: body.content,
    platform: body.platform,
    status: body.status ?? "DRAFT",
    accountId: account?.id ?? null,
    scheduledAt: body.scheduledAt ?? undefined,
  });

  await eventBus.emit({
    type: "SOCIAL_POST_CREATED",
    aggregate: "social",
    aggregateId: post.id,
    actor: "operator",
    summary: `Post drafted for ${body.platform}`,
    payload: { platform: body.platform },
    priority: "LOW",
  });

  return NextResponse.json({ ok: true, post });
}