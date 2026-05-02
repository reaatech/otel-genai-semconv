import type { Span } from '@opentelemetry/api';

export interface StreamingMetrics {
  timeToFirstTokenMs: number | null;
  totalDurationMs: number;
  chunkCount: number;
  outputTokens: number;
  startTime: number;
}

export class StreamingHandler {
  private readonly span: Span;
  private readonly metrics: StreamingMetrics;
  private readonly onChunk?: (chunk: unknown) => void;
  private completed: boolean;

  constructor(span: Span, options?: { onChunk?: (chunk: unknown) => void }) {
    this.span = span;
    this.completed = false;
    this.span.setAttribute('gen_ai.request.streaming', true);
    this.metrics = {
      timeToFirstTokenMs: null,
      totalDurationMs: 0,
      chunkCount: 0,
      outputTokens: 0,
      startTime: Date.now(),
    };
    this.onChunk = options?.onChunk;
  }

  processChunk(chunk: unknown, tokenDelta?: number): void {
    this.metrics.chunkCount++;

    if (this.metrics.timeToFirstTokenMs === null) {
      this.metrics.timeToFirstTokenMs = Date.now() - this.metrics.startTime;
      this.span.setAttribute(
        'gen_ai.streaming.time_to_first_token_ms',
        this.metrics.timeToFirstTokenMs,
      );
    }

    if (tokenDelta !== undefined) {
      this.metrics.outputTokens += tokenDelta;
    }

    this.onChunk?.(chunk);
  }

  complete(finalResponse?: { outputTokens?: number; finishReason?: string }): void {
    if (this.completed) {
      return;
    }
    this.completed = true;
    this.metrics.totalDurationMs = Date.now() - this.metrics.startTime;

    this.span.setAttribute('gen_ai.streaming.total_duration_ms', this.metrics.totalDurationMs);
    this.span.setAttribute('gen_ai.streaming.chunk_count', this.metrics.chunkCount);

    if (finalResponse?.outputTokens !== undefined) {
      this.span.setAttribute('gen_ai.usage.output_tokens', finalResponse.outputTokens);
    } else if (this.metrics.outputTokens > 0) {
      this.span.setAttribute('gen_ai.usage.output_tokens', this.metrics.outputTokens);
    }

    if (finalResponse?.finishReason) {
      this.span.setAttribute('gen_ai.response.finish_reasons', [finalResponse.finishReason]);
    }

    this.span.addEvent('gen_ai.streaming.complete', {
      duration_ms: this.metrics.totalDurationMs,
      chunks: this.metrics.chunkCount,
    });

    this.span.end();
  }

  error(err: Error): void {
    if (this.completed) {
      return;
    }
    this.completed = true;
    this.metrics.totalDurationMs = Date.now() - this.metrics.startTime;

    this.span.setAttribute('gen_ai.streaming.total_duration_ms', this.metrics.totalDurationMs);
    this.span.setAttribute('gen_ai.streaming.chunk_count', this.metrics.chunkCount);

    this.span.setStatus({
      code: 2,
      message: err.message,
    });

    this.span.recordException(err);
    this.span.end();
  }

  getMetrics(): Readonly<StreamingMetrics> {
    return { ...this.metrics };
  }
}

export function instrumentStream<T>(
  stream: AsyncIterable<T>,
  span: Span,
  options?: { onChunk?: (chunk: T) => void; getTokenCount?: (chunk: T) => number },
): AsyncIterable<T> {
  const handler = new StreamingHandler(span, {
    onChunk: options?.onChunk as ((chunk: unknown) => void) | undefined,
  });

  return {
    [Symbol.asyncIterator]() {
      const iterator = stream[Symbol.asyncIterator]();
      return {
        async next() {
          try {
            const result = await iterator.next();
            if (result.done) {
              handler.complete();
              return result;
            }

            const tokenCount = options?.getTokenCount?.(result.value);
            handler.processChunk(result.value, tokenCount);
            return result;
          } catch (error) {
            handler.error(error as Error);
            throw error;
          }
        },
        async throw(error) {
          handler.error(error);
          if (iterator.throw) {
            return iterator.throw(error);
          }
          throw error;
        },
        async return(value) {
          handler.complete();
          if (iterator.return) {
            return iterator.return(value);
          }
          return { done: true, value } as IteratorResult<T>;
        },
      };
    },
  };
}
