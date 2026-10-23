import { NextResponse } from "next/server";
import { scoreSearch, searchIndex } from "@/lib/repositories";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const index = await searchIndex();
  return NextResponse.json({ results: scoreSearch(index, q) });
}