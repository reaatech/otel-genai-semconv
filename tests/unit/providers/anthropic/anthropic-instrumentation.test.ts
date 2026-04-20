import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { AnthropicInstrumentation } from '../../../../src/providers/anthropic/anthropic-instrumentation.js';
import type { Message, MessageStreamEvent } from '@anthropic-ai/sdk/resources/messages';
import { Stream } from '@anthropic-ai/sdk/streaming';

const WRAPPED_SYMBOL = Symbol.for('otel.genai.anthropic.wrapped');
const ORIGINAL_CREATE_SYMBOL = Symbol.for('otel.genai.anthropic.original_create');

function createMockSpan() {
  return {
    setAttribute: vi.fn().mockReturnThis(),
    setAttributes: vi.fn().mockReturnThis(),
    addEvent: vi.fn().mockReturnThis(),
    setStatus: vi.fn().mockReturnThis(),
    recordException: vi.fn().mockReturnThis(),
    end: vi.fn(),
    isRecording: vi.fn().mockReturnValue(true),
    spanContext: vi.fn().mockReturnValue({ traceId: 'test-trace-id', spanId: 'test-span-id' }),
    updateName: vi.fn().mockReturnThis(),
  };
}

function createMockAnthropicClient() {
  const originalCreate = vi.fn();
  const messages = {
    create: originalCreate,
  };
  return { client: { messages }, originalCreate };
}

describe('AnthropicInstrumentation', () => {
  let instrumentation: AnthropicInstrumentation;
  let mockSpan: ReturnType<typeof createMockSpan>;
  let getTracerSpy: any;

  beforeEach(() => {
    mockSpan = createMockSpan();
    const mockTracer = { startSpan: vi.fn().mockReturnValue(mockSpan) };
    getTracerSpy = vi
      .spyOn(trace, 'getTracer')
      .mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);
    instrumentation = new AnthropicInstrumentation();
  });

  afterEach(() => {
    getTracerSpy.mockRestore();
  });

  describe('instrument()', () => {
    it('should guard against double instrumentation', () => {
      const { client } = createMockAnthropicClient();

      instrumentation.instrument(client as any);
      const firstWrapped = client.messages.create;

      instrumentation.instrument(client as any);
      const secondWrapped = client.messages.create;

      expect(firstWrapped).toBe(secondWrapped);
      expect((client.messages.create as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL]).toBe(
        true,
      );
    });

    it('should store the original create method', () => {
      const { client } = createMockAnthropicClient();

      instrumentation.instrument(client as any);

      const storedOriginal = (client.messages.create as unknown as Record<symbol, unknown>)[
        ORIGINAL_CREATE_SYMBOL
      ];
      expect(storedOriginal).toBeDefined();
      expect((client.messages.create as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL]).toBe(
        true,
      );
    });

    it('should mark the method as wrapped', () => {
      const { client } = createMockAnthropicClient();

      instrumentation.instrument(client as any);

      expect((client.messages.create as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL]).toBe(
        true,
      );
    });
  });

  describe('uninstrument()', () => {
    it('should restore the original method', async () => {
      const { client, originalCreate } = createMockAnthropicClient();
      const mockResponse = {
        id: 'test',
        model: 'claude-opus',
        content: [],
        role: 'assistant',
        usage: { input_tokens: 10, output_tokens: 20 },
      } as unknown as Message;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);
      await client.messages.create({ model: 'claude-opus', max_tokens: 1024, messages: [] } as any);

      instrumentation.uninstrument(client as any);

      expect(
        (client.messages.create as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL],
      ).toBeUndefined();
      expect(
        (client.messages.create as unknown as Record<symbol, unknown>)[ORIGINAL_CREATE_SYMBOL],
      ).toBeUndefined();
    });

    it('should be safe to call on non-instrumented client', () => {
      const { client } = createMockAnthropicClient();
      const originalMethod = client.messages.create;

      instrumentation.uninstrument(client as any);

      expect(client.messages.create).toBe(originalMethod);
    });
  });

  describe('config hooks', () => {
    it('should call onStart hook with span and request', async () => {
      const onStart = vi.fn();
      const mockTracer = { startSpan: vi.fn().mockReturnValue(mockSpan) };
      getTracerSpy.mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);
      instrumentation = new AnthropicInstrumentation({ onStart });

      const { client, originalCreate } = createMockAnthropicClient();
      const mockResponse = {
        id: 'test',
        model: 'claude-opus',
        content: [],
        role: 'assistant',
        usage: { input_tokens: 10, output_tokens: 20 },
      } as unknown as Message;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);

      const request = {
        model: 'claude-opus',
        max_tokens: 1024,
        messages: [{ role: 'user', content: 'Hello' }],
      } as any;
      await client.messages.create(request);

      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onStart.mock.calls[0]?.[1]).toEqual(request);
    });

    it('should call onEnd hook with span and response', async () => {
      const onEnd = vi.fn();
      instrumentation = new AnthropicInstrumentation({ onEnd });

      const { client, originalCreate } = createMockAnthropicClient();
      const mockResponse = {
        id: 'test',
        model: 'claude-opus',
        content: [],
        role: 'assistant',
        usage: { input_tokens: 10, output_tokens: 20 },
      } as unknown as Message;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);
      await client.messages.create({ model: 'claude-opus', max_tokens: 1024, messages: [] } as any);

      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(onEnd.mock.calls[0]?.[1]).toBe(mockResponse);
    });
  });

  describe('non-streaming response handling', () => {
    it('should capture response attributes on span', async () => {
      const { client, originalCreate } = createMockAnthropicClient();
      const mockResponse = {
        id: 'msg_abc123',
        model: 'claude-opus-20240229',
        content: [{ type: 'text', text: 'Hello!' }],
        role: 'assistant',
        usage: { input_tokens: 10, output_tokens: 20 },
        stop_reason: 'end_turn',
      } as unknown as Message;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);
      await client.messages.create({ model: 'claude-opus', max_tokens: 1024, messages: [] } as any);

      expect(mockSpan.setAttribute).toHaveBeenCalled();
      expect(mockSpan.addEvent).toHaveBeenCalled();
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should return the original response', async () => {
      const { client, originalCreate } = createMockAnthropicClient();
      const mockResponse = {
        id: 'test',
        model: 'claude-opus',
        content: [],
        role: 'assistant',
        usage: { input_tokens: 10, output_tokens: 20 },
      } as unknown as Message;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);
      const result = await client.messages.create({
        model: 'claude-opus',
        max_tokens: 1024,
        messages: [],
      } as any);

      expect(result).toBe(mockResponse);
    });

    it('should handle errors and record them on span', async () => {
      const { client, originalCreate } = createMockAnthropicClient();
      const error = new Error('Rate limit exceeded');
      originalCreate.mockRejectedValue(error);

      instrumentation.instrument(client as any);

      await expect(
        client.messages.create({ model: 'claude-opus', max_tokens: 1024, messages: [] } as any),
      ).rejects.toThrow('Rate limit exceeded');

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Rate limit exceeded',
      });
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', 'rate_limit_error');
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should add system message event when system prompt is provided', async () => {
      const { client, originalCreate } = createMockAnthropicClient();
      const mockResponse = {
        id: 'test',
        model: 'claude-opus',
        content: [],
        role: 'assistant',
        usage: { input_tokens: 10, output_tokens: 20 },
      } as unknown as Message;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);

      await client.messages.create({
        model: 'claude-opus',
        max_tokens: 1024,
        messages: [{ role: 'user', content: 'Hello' }],
        system: 'You are helpful',
      } as any);

      const addEventCalls = mockSpan.addEvent.mock.calls;
      expect(addEventCalls.some((c: unknown[]) => c[0] === 'gen_ai.system.message')).toBe(true);
    });

    it('should capture tool_use events in response', async () => {
      const { client, originalCreate } = createMockAnthropicClient();
      const mockResponse = {
        id: 'test',
        model: 'claude-opus',
        content: [{ type: 'tool_use', name: 'get_weather', input: { location: 'NYC' } }],
        role: 'assistant',
        usage: { input_tokens: 10, output_tokens: 20 },
      } as unknown as Message;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);
      await client.messages.create({ model: 'claude-opus', max_tokens: 1024, messages: [] } as any);

      const addEventCalls = mockSpan.addEvent.mock.calls;
      expect(addEventCalls.some((c: unknown[]) => c[0] === 'gen_ai.tool_call')).toBe(true);
    });
  });

  describe('streaming response handling', () => {
    it('should wrap streaming response and yield all events', async () => {
      const { client, originalCreate } = createMockAnthropicClient();
      const events = [
        { type: 'content_block_start', content_block: { type: 'text', text: 'Hello' } },
        { type: 'content_block_delta', delta: { text: ' World' } },
      ] as unknown as MessageStreamEvent[];

      const mockStream = new Stream(async function* () {
        for (const event of events) {
          yield event;
        }
      }, new AbortController()) as Stream<MessageStreamEvent>;

      originalCreate.mockResolvedValue(mockStream);

      instrumentation.instrument(client as any);

      const result = await client.messages.create({
        model: 'claude-opus',
        max_tokens: 1024,
        messages: [],
        stream: true,
      } as any);

      const collected: unknown[] = [];
      for await (const event of result as AsyncIterable<unknown>) {
        collected.push(event);
      }

      expect(collected).toHaveLength(2);
      expect((result as Stream<MessageStreamEvent>).controller).toBeDefined();
      expect(typeof (result as Stream<MessageStreamEvent>).tee).toBe('function');
      expect(typeof (result as Stream<MessageStreamEvent>).toReadableStream).toBe('function');
    });

    it('should capture streaming metrics on span', async () => {
      const { client, originalCreate } = createMockAnthropicClient();
      const events = [
        {
          type: 'message_start',
          message: {
            id: 'msg_123',
            model: 'claude-opus',
            usage: { input_tokens: 10, output_tokens: 0 },
          },
        },
        { type: 'content_block_start', content_block: { type: 'text', text: 'Hello' } },
        { type: 'message_delta', usage: { output_tokens: 5 } },
      ] as unknown as MessageStreamEvent[];

      const mockStream = new Stream(async function* () {
        for (const event of events) {
          yield event;
        }
      }, new AbortController()) as Stream<MessageStreamEvent>;

      originalCreate.mockResolvedValue(mockStream);

      instrumentation.instrument(client as any);

      const result = await client.messages.create({
        model: 'claude-opus',
        max_tokens: 1024,
        messages: [],
        stream: true,
      } as any);

      void (await consumeAsyncIterable(result as AsyncIterable<unknown>));

      const setAttrCalls = mockSpan.setAttribute.mock.calls;
      const attrMap = Object.fromEntries(setAttrCalls.map((c: unknown[]) => [c[0], c[1]]));

      expect(attrMap['gen_ai.streaming.time_to_first_token_ms']).toBeDefined();
      expect(attrMap['gen_ai.streaming.total_duration_ms']).toBeDefined();
      expect(attrMap['gen_ai.streaming.chunk_count']).toBe(3);
    });

    it('should accumulate token usage from streaming events', async () => {
      const { client, originalCreate } = createMockAnthropicClient();
      const events = [
        {
          type: 'message_start',
          message: {
            id: 'msg_123',
            model: 'claude-opus',
            usage: { input_tokens: 50, output_tokens: 0 },
          },
        },
        { type: 'content_block_start', content_block: { type: 'text', text: 'Hello' } },
        { type: 'message_delta', usage: { output_tokens: 25 } },
      ] as unknown as MessageStreamEvent[];

      const mockStream = new Stream(async function* () {
        for (const event of events) {
          yield event;
        }
      }, new AbortController()) as Stream<MessageStreamEvent>;

      originalCreate.mockResolvedValue(mockStream);

      instrumentation.instrument(client as any);

      const result = await client.messages.create({
        model: 'claude-opus',
        max_tokens: 1024,
        messages: [],
        stream: true,
      } as any);

      void (await consumeAsyncIterable(result as AsyncIterable<unknown>));

      const setAttrCalls = mockSpan.setAttribute.mock.calls;
      const attrMap = Object.fromEntries(setAttrCalls.map((c: unknown[]) => [c[0], c[1]]));

      expect(attrMap['gen_ai.usage.input_tokens']).toBe(50);
      expect(attrMap['gen_ai.usage.output_tokens']).toBe(25);
    });

    it('should handle streaming errors', async () => {
      const { client, originalCreate } = createMockAnthropicClient();
      const error = new Error('Stream interrupted');

      const mockStream = new Stream(async function* () {
        yield { type: 'content_block_start' } as unknown as MessageStreamEvent;
        throw error;
      }, new AbortController()) as Stream<MessageStreamEvent>;

      originalCreate.mockResolvedValue(mockStream);

      instrumentation.instrument(client as any);

      const result = await client.messages.create({
        model: 'claude-opus',
        max_tokens: 1024,
        messages: [],
        stream: true,
      } as any);

      await expect(consumeAsyncIterable(result as AsyncIterable<unknown>)).rejects.toThrow(
        'Stream interrupted',
      );

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Stream interrupted',
      });
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    });

    it('should end span after stream completes', async () => {
      const { client, originalCreate } = createMockAnthropicClient();

      const mockStream = new Stream(async function* () {
        yield {
          type: 'message_start',
          message: {
            id: 'msg_123',
            model: 'claude-opus',
            usage: { input_tokens: 10, output_tokens: 0 },
          },
        } as unknown as MessageStreamEvent;
      }, new AbortController()) as Stream<MessageStreamEvent>;

      originalCreate.mockResolvedValue(mockStream);

      instrumentation.instrument(client as any);

      const result = await client.messages.create({
        model: 'claude-opus',
        max_tokens: 1024,
        messages: [],
        stream: true,
      } as any);

      void (await consumeAsyncIterable(result as AsyncIterable<unknown>));

      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should record cost attributes for non-streaming responses when enabled', async () => {
      instrumentation = new AnthropicInstrumentation({ trackCosts: true });
      const { client, originalCreate } = createMockAnthropicClient();
      const mockResponse = {
        id: 'msg_abc123',
        model: 'claude-3-opus',
        content: [{ type: 'text', text: 'Hello!' }],
        role: 'assistant',
        usage: { input_tokens: 1000, output_tokens: 500 },
        stop_reason: 'end_turn',
      } as unknown as Message;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);
      await client.messages.create({
        model: 'claude-3-opus',
        max_tokens: 1024,
        messages: [],
      } as any);

      const attrMap = Object.fromEntries(
        mockSpan.setAttribute.mock.calls.map((c: unknown[]) => [c[0], c[1]]),
      );
      expect(attrMap['llm.cost.total']).toBe(0.0525);
      expect(attrMap['llm.cost.input']).toBe(0.015);
      expect(attrMap['llm.cost.output']).toBe(0.0375);
      expect(attrMap['llm.cost.currency']).toBe('USD');
    });
  });
});

async function consumeAsyncIterable<T>(iterable: AsyncIterable<T>): Promise<void> {
  const iterator = iterable[Symbol.asyncIterator]();
  while (!(await iterator.next()).done) {
    // consume
  }
}
