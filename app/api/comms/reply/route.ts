import { NextResponse } from "next/server";
import { communicationRepository } from "@/lib/repositories";

export async function POST(req: Request) {
  let body: { messageId?: string; content?: string; tone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.messageId || !body.content?.trim()) {
    return NextResponse.json({ error: "messageId and content are required" }, { status: 400 });
  }
  try {
    const reply = await communicationRepository.sendReply({
      messageId: body.messageId,
      content: body.content.trim(),
      tone: body.tone ?? "professional",
    });
    return NextResponse.json({ ok: true, reply });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to send reply" }, { status: 500 });
  }
}