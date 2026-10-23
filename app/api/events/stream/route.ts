import { eventBus } from "@/lib/events/bus";

export const dynamic = "force-dynamic";

/**
 * SSE stream of the live event bus. Used by PulseBar, LiveFeed and the
 * Conductor to keep the command center feeling alive.
 */
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* client gone */
        }
      }, 15_000);

      const unsubscribe = eventBus.subscribe((event) => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                id: event.id,
                type: event.type,
                actor: event.actor,
                summary: event.summary,
                priority: event.priority,
                payload: typeof event.payload === "string" ? event.payload : JSON.stringify(event.payload ?? {}),
                createdAt: event.createdAt,
              })}\n\n`,
            ),
          );
        } catch {
          /* client gone */
        }
      });

      controller.enqueue(encoder.encode(`event: ready\ndata: {"connected":true}\n\n`));

      return () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}