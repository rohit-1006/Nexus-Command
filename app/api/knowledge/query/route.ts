import { NextResponse } from "next/server";
import { knowledgeRepository } from "@/lib/repositories";

export async function POST(req: Request) {
  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.question?.trim()) return NextResponse.json({ error: "question is required" }, { status: 400 });
  const results = await knowledgeRepository.queryInterface({ question: body.question });
  if ("error" in results) return NextResponse.json({ error: results.error }, { status: 400 });
  return NextResponse.json({ results });
}