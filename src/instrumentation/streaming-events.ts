/**
 * Streaming events for LLM instrumentation
 */

import { Span } from '@opentelemetry/api';

/**
 * Streaming event data
 */
export interface StreamingEvent {
  /** Event type */
  type: 'chunk' | 'token' | 'complete' | 'error';
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Event data */
  data: unknown;
}

/**
 * Configuration for streaming event emission
 */
export interface StreamingEventsConfig {
  /** Emit events for each chunk (default: false) */
  emitChunkEvents?: boolean;
  /** Emit events for each token (default: false) */
  emitTokenEvents?: boolean;
  /** Maximum events to buffer (default: 1000) */
  maxBufferedEvents?: number;
}

/**
 * Manager for streaming events
 */
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

  /**
   * Record a chunk event
   */
  recordChunk(chunkIndex: number, content: string): void {
    if (this.config.emitChunkEvents) {
      this.addEvent({
        type: 'chunk',
        timestamp: Date.now() - this.startTime,
        data: { index: chunkIndex, content },
      });
    }
  }

  /**
   * Record a token event
   */
  recordToken(token: string, tokenIndex: number): void {
    if (this.config.emitTokenEvents) {
      this.addEvent({
        type: 'token',
        timestamp: Date.now() - this.startTime,
        data: { token, index: tokenIndex },
      });
    }
  }

  /**
   * Record completion
   */
  recordComplete(finalData: { tokens?: number; duration?: number }): void {
    this.addEvent({
      type: 'complete',
      timestamp: Date.now() - this.startTime,
      data: finalData,
    });
  }

  /**
   * Record error
   */
  recordError(error: Error): void {
    this.addEvent({
      type: 'error',
      timestamp: Date.now() - this.startTime,
      data: { message: error.message, name: error.name },
    });
  }

  /**
   * Add an event to the buffer
   */
  private addEvent(event: StreamingEvent): void {
    if (this.events.length >= this.config.maxBufferedEvents) {
      // Remove oldest event
      this.events.shift();
    }
    this.events.push(event);

    // Add to span as OTel event
    try {
      this.span.addEvent('gen_ai.streaming.chunk', {
        type: event.type,
        timestamp: event.timestamp,
        data: JSON.stringify(event.data),
      });
    } catch {
      // Skip event if data is not serializable
    }
  }

  /**
   * Get all buffered events
   */
  getEvents(): ReadonlyArray<StreamingEvent> {
    return [...this.events];
  }

  /**
   * Clear buffered events
   */
  clear(): void {
    this.events.length = 0;
  }

  /**
   * Reset start time
   */
  resetStartTime(): void {
    this.startTime = Date.now();
  }
}

/**
 * Create a streaming events manager
 */
export function createStreamingEventsManager(
  span: Span,
  config?: StreamingEventsConfig,
): StreamingEventsManager {
  return new StreamingEventsManager(span, config);
}
