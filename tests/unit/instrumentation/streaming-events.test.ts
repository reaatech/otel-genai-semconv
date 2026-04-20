/**
 * Unit tests for StreamingEventsManager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  StreamingEventsManager,
  createStreamingEventsManager,
  StreamingEventsConfig,
} from '../../../src/instrumentation/streaming-events.js';

function createMockSpan(): any {
  return {
    addEvent: vi.fn(),
  };
}

describe('StreamingEventsManager', () => {
  let mockSpan: ReturnType<typeof createMockSpan>;

  beforeEach(() => {
    mockSpan = createMockSpan();
  });

  describe('constructor', () => {
    it('should use default config', () => {
      const manager = new StreamingEventsManager(mockSpan);
      expect(manager).toBeInstanceOf(StreamingEventsManager);
    });

    it('should accept custom config', () => {
      const config: StreamingEventsConfig = {
        emitChunkEvents: true,
        emitTokenEvents: true,
        maxBufferedEvents: 500,
      };
      const manager = new StreamingEventsManager(mockSpan, config);
      expect(manager).toBeInstanceOf(StreamingEventsManager);
    });

    it('should set default emitChunkEvents to false', () => {
      const manager = new StreamingEventsManager(mockSpan);
      manager.recordChunk(0, 'test');
      expect(manager.getEvents()).toHaveLength(0);
    });

    it('should set default emitTokenEvents to false', () => {
      const manager = new StreamingEventsManager(mockSpan);
      manager.recordToken('word', 0);
      expect(manager.getEvents()).toHaveLength(0);
    });

    it('should set default maxBufferedEvents to 1000', () => {
      const manager = new StreamingEventsManager(mockSpan);
      expect(manager.getEvents()).toHaveLength(0);
    });
  });

  describe('recordChunk', () => {
    it('should record chunk event when emitChunkEvents is enabled', () => {
      const manager = new StreamingEventsManager(mockSpan, { emitChunkEvents: true });

      manager.recordChunk(0, 'Hello');
      manager.recordChunk(1, ' World');

      const events = manager.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({
        type: 'chunk',
        timestamp: expect.any(Number),
        data: { index: 0, content: 'Hello' },
      });
      expect(events[1]).toEqual({
        type: 'chunk',
        timestamp: expect.any(Number),
        data: { index: 1, content: ' World' },
      });
    });

    it('should add event to span', () => {
      const manager = new StreamingEventsManager(mockSpan, { emitChunkEvents: true });

      manager.recordChunk(0, 'Hello');

      expect(mockSpan.addEvent).toHaveBeenCalledWith(
        'gen_ai.streaming.chunk',
        expect.objectContaining({
          type: 'chunk',
          data: expect.any(String),
        }),
      );
    });
  });

  describe('recordToken', () => {
    it('should record token event when emitTokenEvents is enabled', () => {
      const manager = new StreamingEventsManager(mockSpan, { emitTokenEvents: true });

      manager.recordToken('Hello', 0);
      manager.recordToken('World', 1);

      const events = manager.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({
        type: 'token',
        timestamp: expect.any(Number),
        data: { token: 'Hello', index: 0 },
      });
    });
  });

  describe('recordComplete', () => {
    it('should record complete event', () => {
      const manager = new StreamingEventsManager(mockSpan);

      manager.recordComplete({ tokens: 100, duration: 1234 });

      const events = manager.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'complete',
        timestamp: expect.any(Number),
        data: { tokens: 100, duration: 1234 },
      });
    });

    it('should record complete event with partial data', () => {
      const manager = new StreamingEventsManager(mockSpan);

      manager.recordComplete({ tokens: 50 });

      const events = manager.getEvents();
      expect(events[0]?.data).toEqual({ tokens: 50 });
    });
  });

  describe('recordError', () => {
    it('should record error event', () => {
      const manager = new StreamingEventsManager(mockSpan);
      const error = new Error('Stream failed');

      manager.recordError(error);

      const events = manager.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'error',
        timestamp: expect.any(Number),
        data: { message: 'Stream failed', name: 'Error' },
      });
    });
  });

  describe('maxBufferedEvents', () => {
    it('should remove oldest event when buffer is full', () => {
      const manager = new StreamingEventsManager(mockSpan, {
        emitChunkEvents: true,
        maxBufferedEvents: 3,
      });

      manager.recordChunk(0, 'a');
      manager.recordChunk(1, 'b');
      manager.recordChunk(2, 'c');
      manager.recordChunk(3, 'd');

      const events = manager.getEvents();
      expect(events).toHaveLength(3);
      expect(events[0]?.data).toEqual({ index: 1, content: 'b' });
      expect(events[2]?.data).toEqual({ index: 3, content: 'd' });
    });
  });

  describe('getEvents', () => {
    it('should return a copy of events', () => {
      const manager = new StreamingEventsManager(mockSpan, { emitChunkEvents: true });
      manager.recordChunk(0, 'test');

      const events1 = manager.getEvents();
      const events2 = manager.getEvents();

      expect(events1).toEqual(events2);
      expect(events1).not.toBe(events2);
    });

    it('should return empty array when no events', () => {
      const manager = new StreamingEventsManager(mockSpan);
      expect(manager.getEvents()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all buffered events', () => {
      const manager = new StreamingEventsManager(mockSpan, { emitChunkEvents: true });
      manager.recordChunk(0, 'a');
      manager.recordChunk(1, 'b');

      expect(manager.getEvents()).toHaveLength(2);

      manager.clear();

      expect(manager.getEvents()).toHaveLength(0);
    });
  });

  describe('resetStartTime', () => {
    it('should reset the start time', () => {
      const manager = new StreamingEventsManager(mockSpan, { emitChunkEvents: true });
      manager.recordChunk(0, 'first');

      manager.resetStartTime();

      manager.recordChunk(1, 'second');

      const events = manager.getEvents();
      expect(events[1]?.timestamp).toBeLessThan((events[0]?.timestamp ?? 0) + 1000);
    });
  });
});

describe('createStreamingEventsManager', () => {
  it('should create a StreamingEventsManager instance', () => {
    const mockSpan = createMockSpan();
    const manager = createStreamingEventsManager(mockSpan);
    expect(manager).toBeInstanceOf(StreamingEventsManager);
  });

  it('should accept config', () => {
    const mockSpan = createMockSpan();
    const manager = createStreamingEventsManager(mockSpan, { emitChunkEvents: true });
    expect(manager).toBeInstanceOf(StreamingEventsManager);
  });
});
