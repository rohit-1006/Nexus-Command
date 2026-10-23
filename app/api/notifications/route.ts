import { NextResponse } from "next/server";
import { notificationRepository } from "@/lib/repositories";

export async function GET() {
  const items = await notificationRepository.findAll({ limit: 30 });
  return NextResponse.json({
    items: items.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      severity: n.priority,
      category: n.category,
      read: n.read,
      createdAt: n.createdAt.toISOString().slice(0, 10),
    })),
  });
}