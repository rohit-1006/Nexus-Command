import type { Event, EventType, Priority } from "@prisma/client";
import { eventRepository } from "@/lib/repositories/events";

export interface DomainEventInput {
  type: EventType;
  aggregate: string;
  aggregateId: string;
  actor: string;
  summary: string;
  payload?: Record<string, unknown>;
  priority?: Priority;
}

type Listener = (event: Event) => void;

/**
 * Typed domain event bus. Every significant action in the system emits an
 * event here. Events are persisted (single source of truth for the activity
 * feed + audit log) AND broadcast live to SSE subscribers.
 */
class EventBus {
  private listeners = new Set<Listener>();
  private ring: Event[] = [];
  private readonly ringSize = 250;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  recent(): Event[] {
    return [...this.ring];
  }

  async emit(input: DomainEventInput): Promise<Event> {
    const event = await eventRepository.create(input);
    this.ring.push(event);
    if (this.ring.length > this.ringSize) this.ring.shift();
    for (const fn of this.listeners) {
      try {
        fn(event);
      } catch {
        // a failing subscriber must never break the bus
      }
    }
    return event;
  }

  async emitMany(inputs: DomainEventInput[]): Promise<Event[]> {
    const events: Event[] = [];
    for (const input of inputs) {
      events.push(await this.emit(input));
    }
    return events;
  }
}

export const eventBus = new EventBus();