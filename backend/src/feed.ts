import { EventEmitter } from "node:events";

// Tiny pub/sub behind the SSE endpoint. Keyed by grant id; "*" gets everything.
export interface FeedEvent {
  id: string;
  at: string;
  eventType: string;
  actorType: string;
  payload: Record<string, unknown>;
  chainSignature?: string | null;
}

class Feed {
  private bus = new EventEmitter();
  constructor() {
    this.bus.setMaxListeners(200);
  }
  publish(grantId: string | undefined, event: FeedEvent) {
    if (grantId) this.bus.emit(grantId, event);
    this.bus.emit("*", event);
  }
  subscribe(grantId: string, listener: (e: FeedEvent) => void) {
    this.bus.on(grantId, listener);
    return () => this.bus.off(grantId, listener);
  }
}

export const feed = new Feed();
