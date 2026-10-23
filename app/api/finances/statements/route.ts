import { NextResponse } from "next/server";
import { financeRepository, parseStatementRequest } from "@/lib/repositories";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = parseStatementRequest(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const statement = await financeRepository.statements({ kind: parsed.kind, months: parsed.months });
  return NextResponse.json({ statement });
}