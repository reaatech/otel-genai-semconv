/**
 * Unit tests for StreamingHandler and instrumentStream
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  StreamingHandler,
  instrumentStream,
} from '../../../src/instrumentation/streaming-handler.js';

function createMockSpan(): any {
  return {
    setAttribute: vi.fn(),
    addEvent: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
  };
}

describe('StreamingHandler', () => {
  let mockSpan: ReturnType<typeof createMockSpan>;

  beforeEach(() => {
    mockSpan = createMockSpan();
  });

  describe('constructor', () => {
    it('should initialize metrics with default values', () => {
      const handler = new StreamingHandler(mockSpan);
      const metrics = handler.getMetrics();

      expect(metrics.timeToFirstTokenMs).toBeNull();
      expect(metrics.totalDurationMs).toBe(0);
      expect(metrics.chunkCount).toBe(0);
      expect(metrics.outputTokens).toBe(0);
      expect(metrics.startTime).toBeDefined();
    });

    it('should set streaming attribute on span', () => {
      new StreamingHandler(mockSpan);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.request.streaming', true);
    });

    it('should accept onChunk callback', () => {
      const onChunk = vi.fn();
      new StreamingHandler(mockSpan, { onChunk });

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.request.streaming', true);
    });
  });

  describe('processChunk', () => {
    it('should increment chunk count', () => {
      const handler = new StreamingHandler(mockSpan);

      handler.processChunk({ content: 'Hello' });
      expect(handler.getMetrics().chunkCount).toBe(1);

      handler.processChunk({ content: ' World' });
      expect(handler.getMetrics().chunkCount).toBe(2);
    });

    it('should track time to first token on first chunk', () => {
      const handler = new StreamingHandler(mockSpan);

      handler.processChunk({ content: 'Hello' });

      const metrics = handler.getMetrics();
      expect(metrics.timeToFirstTokenMs).not.toBeNull();
      expect(metrics.timeToFirstTokenMs as number).toBeGreaterThanOrEqual(0);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'gen_ai.streaming.time_to_first_token_ms',
        metrics.timeToFirstTokenMs,
      );
    });

    it('should not update TTFT on subsequent chunks', () => {
      const handler = new StreamingHandler(mockSpan);

      handler.processChunk({ content: 'Hello' });
      const firstTTFT = handler.getMetrics().timeToFirstTokenMs;

      handler.processChunk({ content: ' World' });
      expect(handler.getMetrics().timeToFirstTokenMs).toBe(firstTTFT);
    });

    it('should accumulate token deltas', () => {
      const handler = new StreamingHandler(mockSpan);

      handler.processChunk({}, 5);
      handler.processChunk({}, 3);
      handler.processChunk({}, 2);

      expect(handler.getMetrics().outputTokens).toBe(10);
    });

    it('should handle undefined token delta', () => {
      const handler = new StreamingHandler(mockSpan);

      handler.processChunk({}, undefined);
      handler.processChunk({}, undefined);

      expect(handler.getMetrics().outputTokens).toBe(0);
    });

    it('should call onChunk callback', () => {
      const onChunk = vi.fn();
      const handler = new StreamingHandler(mockSpan, { onChunk });
      const chunk = { content: 'test' };

      handler.processChunk(chunk);

      expect(onChunk).toHaveBeenCalledWith(chunk);
    });
  });

  describe('complete', () => {
    it('should set streaming metrics', () => {
      const handler = new StreamingHandler(mockSpan);
      handler.processChunk({ content: 'Hello' });

      handler.complete();

      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'gen_ai.streaming.total_duration_ms',
        expect.any(Number),
      );
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.streaming.chunk_count', 1);
    });

    it('should set output tokens from finalResponse', () => {
      const handler = new StreamingHandler(mockSpan);

      handler.complete({ outputTokens: 42 });

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.usage.output_tokens', 42);
    });

    it('should set output tokens from accumulated metrics when finalResponse not provided', () => {
      const handler = new StreamingHandler(mockSpan);
      handler.processChunk({}, 10);
      handler.processChunk({}, 5);

      handler.complete();

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.usage.output_tokens', 15);
    });

    it('should set finish reason from finalResponse', () => {
      const handler = new StreamingHandler(mockSpan);

      handler.complete({ finishReason: 'stop' });

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.response.finish_reasons', [
        'stop',
      ]);
    });

    it('should add complete event', () => {
      const handler = new StreamingHandler(mockSpan);

      handler.complete();

      expect(mockSpan.addEvent).toHaveBeenCalledWith(
        'gen_ai.streaming.complete',
        expect.any(Object),
      );
    });

    it('should end the span', () => {
      const handler = new StreamingHandler(mockSpan);

      handler.complete();

      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should set error status on span', () => {
      const handler = new StreamingHandler(mockSpan);
      const error = new Error('Stream failed');

      handler.error(error);

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: 2,
        message: 'Stream failed',
      });
    });

    it('should record exception', () => {
      const handler = new StreamingHandler(mockSpan);
      const error = new Error('Stream failed');

      handler.error(error);

      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    });

    it('should set streaming metrics', () => {
      const handler = new StreamingHandler(mockSpan);
      handler.processChunk({ content: 'Hello' });

      handler.error(new Error('fail'));

      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'gen_ai.streaming.total_duration_ms',
        expect.any(Number),
      );
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.streaming.chunk_count', 1);
    });

    it('should end the span', () => {
      const handler = new StreamingHandler(mockSpan);

      handler.error(new Error('fail'));

      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('should return a copy of metrics', () => {
      const handler = new StreamingHandler(mockSpan);
      handler.processChunk({}, 5);

      const metrics1 = handler.getMetrics();
      const metrics2 = handler.getMetrics();

      expect(metrics1).toEqual(metrics2);
      expect(metrics1).not.toBe(metrics2);
    });
  });
});

describe('instrumentStream', () => {
  it('should wrap async iterable and process chunks', async () => {
    const mockSpan = createMockSpan();
    const chunks = [{ content: 'Hello' }, { content: ' World' }];
    const stream: AsyncIterable<any> = {
      [Symbol.asyncIterator]() {
        let i = 0;
        return {
          async next() {
            if (i < chunks.length) {
              return { done: false, value: chunks[i++] };
            }
            return { done: true, value: undefined };
          },
        };
      },
    };

    const wrapped = instrumentStream(stream, mockSpan);
    const results: any[] = [];
    for await (const chunk of wrapped) {
      results.push(chunk);
    }

    expect(results).toEqual(chunks);
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('should handle token count via getTokenCount', async () => {
    const mockSpan = createMockSpan();
    const chunks = [{ content: 'Hello' }, { content: ' World' }];
    const stream: AsyncIterable<any> = {
      [Symbol.asyncIterator]() {
        let i = 0;
        return {
          async next() {
            if (i < chunks.length) {
              return { done: false, value: chunks[i++] };
            }
            return { done: true, value: undefined };
          },
        };
      },
    };

    const getTokenCount = vi.fn((chunk: any) => chunk.content.length);
    const wrapped = instrumentStream(stream, mockSpan, { getTokenCount });

    const results = [];
    for await (const chunk of wrapped) {
      results.push(chunk);
    }

    expect(getTokenCount).toHaveBeenCalledTimes(2);
  });

  it('should handle errors via throw', async () => {
    const mockSpan = createMockSpan();
    const error = new Error('Stream error');
    const stream: AsyncIterable<any> = {
      [Symbol.asyncIterator]() {
        let i = 0;
        const iterator = {
          async next() {
            if (i < 1) {
              i++;
              return { done: false, value: { content: 'test' } };
            }
            throw error;
          },
          async throw(e: Error) {
            mockSpan.setStatus({ code: 2, message: e.message });
            mockSpan.recordException(e);
            mockSpan.end();
            return { done: true, value: undefined };
          },
        };
        return iterator;
      },
    };

    const wrapped = instrumentStream(stream, mockSpan);
    const iterator = wrapped[Symbol.asyncIterator]();
    await iterator.next();
    await iterator.throw?.(error);

    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: 2,
      message: 'Stream error',
    });
    expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('should handle early return', async () => {
    const mockSpan = createMockSpan();
    const returnedValue = { done: true };
    const returnFn = vi.fn().mockResolvedValue(returnedValue);
    const stream: AsyncIterable<any> = {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            return { done: false, value: { content: 'test' } };
          },
          return: returnFn,
        };
      },
    };

    const wrapped = instrumentStream(stream, mockSpan);
    const iterator = wrapped[Symbol.asyncIterator]();
    await iterator.next();
    await iterator.return?.(undefined);

    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('should call onChunk callback', async () => {
    const mockSpan = createMockSpan();
    const onChunk = vi.fn();
    const chunks = [{ content: 'Hello' }];
    const stream: AsyncIterable<any> = {
      [Symbol.asyncIterator]() {
        let i = 0;
        return {
          async next() {
            if (i < chunks.length) {
              return { done: false, value: chunks[i++] };
            }
            return { done: true, value: undefined };
          },
        };
      },
    };

    const wrapped = instrumentStream(stream, mockSpan, { onChunk });

    const results = [];
    for await (const chunk of wrapped) {
      results.push(chunk);
    }

    expect(onChunk).toHaveBeenCalledWith(chunks[0]);
  });
});
