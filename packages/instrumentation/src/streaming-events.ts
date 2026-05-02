import type { Span } from '@opentelemetry/api';

export interface StreamingEvent {
  type: 'chunk' | 'token' | 'complete' | 'error';
  timestamp: number;
  data: unknown;
}

export interface StreamingEventsConfig {
  emitChunkEvents?: boolean;
  emitTokenEvents?: boolean;
  maxBufferedEvents?: number;
}

export class StreamingEventsManager {
  private readonly span: Span;
  private readonly config: Required<StreamingEventsConfig>;
  private readonly events: StreamingEvent[] = [];
  private startTime: number = Date.now();

  constructor(span: Span, config: StreamingEventsConfig = {}) {
    this.span = span;
    this.config = {
      emitChunkEvents: false,
      emitTokenEvents: false,
      maxBufferedEvents: 1000,
      ...config,
    };
  }

  recordChunk(chunkIndex: number, content: string): void {
    if (this.config.emitChunkEvents) {
      this.addEvent({
        type: 'chunk',
        timestamp: Date.now() - this.startTime,
        data: { index: chunkIndex, content },
      });
    }
  }

  recordToken(token: string, tokenIndex: number): void {
    if (this.config.emitTokenEvents) {
      this.addEvent({
        type: 'token',
        timestamp: Date.now() - this.startTime,
        data: { token, index: tokenIndex },
      });
    }
  }

  recordComplete(finalData: { tokens?: number; duration?: number }): void {
    this.addEvent({
      type: 'complete',
      timestamp: Date.now() - this.startTime,
      data: finalData,
    });
  }

  recordError(error: Error): void {
    this.addEvent({
      type: 'error',
      timestamp: Date.now() - this.startTime,
      data: { message: error.message, name: error.name },
    });
  }

  private addEvent(event: StreamingEvent): void {
    if (this.events.length >= this.config.maxBufferedEvents) {
      this.events.shift();
    }
    this.events.push(event);

    try {
      this.span.addEvent('gen_ai.streaming.chunk', {
        type: event.type,
        timestamp: event.timestamp,
        data: JSON.stringify(event.data),
      });
    } catch {}
  }

  getEvents(): ReadonlyArray<StreamingEvent> {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }

  resetStartTime(): void {
    this.startTime = Date.now();
  }
}

export function createStreamingEventsManager(
  span: Span,
  config?: StreamingEventsConfig,
): StreamingEventsManager {
  return new StreamingEventsManager(span, config);
}
