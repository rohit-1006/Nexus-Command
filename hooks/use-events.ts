"use client";

import { useEffect, useRef, useState } from "react";

export type LiveEvent = {
  id: string;
  type: string;
  actor: string;
  payload: string;
  createdAt: string;
  summary?: string;
  priority?: string;
};

/**
 * SSE connection to /api/events/stream. On each event the callback fires
 * (used by PulseBar + Conductor to feel alive). Auto-reconnects.
 */
export function useEventStream(onEvent?: (e: LiveEvent) => void): { events: LiveEvent[]; connected: boolean } {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      es = new EventSource("/api/events/stream");
      es.onopen = () => setConnected(true);
      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (!closed) retry = setTimeout(connect, 3000);
      };
      es.onmessage = (msg) => {
        try {
          const e = JSON.parse(msg.data) as LiveEvent;
          setEvents((prev) => [e, ...prev].slice(0, 60));
          cbRef.current?.(e);
        } catch {
          /* ignore malformed frames */
        }
      };
    };

    connect();
    return () => {
      closed = true;
      es?.close();
      if (retry) clearTimeout(retry);
    };
  }, []);

  return { events, connected };
}