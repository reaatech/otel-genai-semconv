import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { OpenAIInstrumentation } from '../../../../src/providers/openai/openai-instrumentation.js';
import type { ChatCompletion, ChatCompletionChunk } from 'openai/resources/chat/completions';
import { Stream as OpenAIStream } from 'openai/streaming';

const WRAPPED_SYMBOL = Symbol.for('otel.genai.openai.wrapped');
const ORIGINAL_CREATE_SYMBOL = Symbol.for('otel.genai.openai.original_create');

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

function createMockOpenAIClient() {
  const originalCreate = vi.fn();
  const completions = {
    create: originalCreate,
  };
  const chat = {
    completions: completions,
  };
  return { client: { chat, completions }, originalCreate };
}

describe('OpenAIInstrumentation', () => {
  let instrumentation: OpenAIInstrumentation;
  let mockSpan: ReturnType<typeof createMockSpan>;
  let getTracerSpy: any;

  beforeEach(() => {
    mockSpan = createMockSpan();
    const mockTracer = { startSpan: vi.fn().mockReturnValue(mockSpan) };
    getTracerSpy = vi
      .spyOn(trace, 'getTracer')
      .mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);
    instrumentation = new OpenAIInstrumentation();
  });

  afterEach(() => {
    getTracerSpy.mockRestore();
  });

  describe('instrument()', () => {
    it('should guard against double instrumentation', () => {
      const { client } = createMockOpenAIClient();

      instrumentation.instrument(client as any);
      const firstWrapped = client.chat.completions.create;

      instrumentation.instrument(client as any);
      const secondWrapped = client.chat.completions.create;

      expect(firstWrapped).toBe(secondWrapped);
      expect(
        (client.chat.completions.create as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL],
      ).toBe(true);
    });

    it('should store the original create method', () => {
      const { client } = createMockOpenAIClient();

      instrumentation.instrument(client as any);

      const storedOriginal = (client.chat.completions.create as unknown as Record<symbol, unknown>)[
        ORIGINAL_CREATE_SYMBOL
      ];
      expect(storedOriginal).toBeDefined();
      expect(
        (client.chat.completions.create as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL],
      ).toBe(true);
    });

    it('should mark the method as wrapped', () => {
      const { client } = createMockOpenAIClient();

      instrumentation.instrument(client as any);

      expect(
        (client.chat.completions.create as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL],
      ).toBe(true);
    });
  });

  describe('uninstrument()', () => {
    it('should restore the original method', async () => {
      const { client, originalCreate } = createMockOpenAIClient();
      const mockResponse = {
        id: 'test',
        model: 'gpt-4',
        choices: [],
        created: 1234567890,
        object: 'chat.completion',
      } as unknown as ChatCompletion;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);
      await client.chat.completions.create({ model: 'gpt-4', messages: [] } as any);

      instrumentation.uninstrument(client as any);

      expect(
        (client.chat.completions.create as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL],
      ).toBeUndefined();
      expect(
        (client.chat.completions.create as unknown as Record<symbol, unknown>)[
          ORIGINAL_CREATE_SYMBOL
        ],
      ).toBeUndefined();
    });

    it('should be safe to call on non-instrumented client', () => {
      const { client } = createMockOpenAIClient();
      const originalMethod = client.chat.completions.create;

      instrumentation.uninstrument(client as any);

      expect(client.chat.completions.create).toBe(originalMethod);
    });
  });

  describe('config hooks', () => {
    it('should call onStart hook with span and request', async () => {
      const onStart = vi.fn();
      instrumentation = new OpenAIInstrumentation({ onStart });
      getTracerSpy.mockReturnValue({
        startSpan: vi.fn().mockReturnValue(mockSpan),
      } as unknown as ReturnType<typeof trace.getTracer>);
      instrumentation = new OpenAIInstrumentation({ onStart });

      const { client, originalCreate } = createMockOpenAIClient();
      const mockResponse = {
        id: 'test',
        model: 'gpt-4',
        choices: [],
        created: 1234567890,
        object: 'chat.completion',
      } as unknown as ChatCompletion;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);

      const request = { model: 'gpt-4', messages: [{ role: 'user', content: 'Hello' }] } as any;
      await client.chat.completions.create(request);

      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onStart.mock.calls[0]?.[1]).toEqual(request);
    });

    it('should call onEnd hook with span and response', async () => {
      const onEnd = vi.fn();
      instrumentation = new OpenAIInstrumentation({ onEnd });

      const { client, originalCreate } = createMockOpenAIClient();
      const mockResponse = {
        id: 'test',
        model: 'gpt-4',
        choices: [],
        created: 1234567890,
        object: 'chat.completion',
      } as unknown as ChatCompletion;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);
      await client.chat.completions.create({ model: 'gpt-4', messages: [] } as any);

      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(onEnd.mock.calls[0]?.[1]).toBe(mockResponse);
    });
  });

  describe('non-streaming response handling', () => {
    it('should capture response attributes on span', async () => {
      const { client, originalCreate } = createMockOpenAIClient();
      const mockResponse = {
        id: 'chatcmpl-abc123',
        model: 'gpt-4-turbo-2024-04-09',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello!', refusal: null },
            finish_reason: 'stop',
          },
        ],
        created: 1234567890,
        object: 'chat.completion',
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      } as unknown as ChatCompletion;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);
      await client.chat.completions.create({ model: 'gpt-4', messages: [] } as any);

      expect(mockSpan.setAttribute).toHaveBeenCalled();
      expect(mockSpan.addEvent).toHaveBeenCalled();
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should return the original response', async () => {
      const { client, originalCreate } = createMockOpenAIClient();
      const mockResponse = {
        id: 'test',
        model: 'gpt-4',
        choices: [],
        created: 1234567890,
        object: 'chat.completion',
      } as unknown as ChatCompletion;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);
      const result = await client.chat.completions.create({ model: 'gpt-4', messages: [] } as any);

      expect(result).toBe(mockResponse);
    });

    it('should handle errors and record them on span', async () => {
      const { client, originalCreate } = createMockOpenAIClient();
      const error = new Error('Rate limit exceeded');
      originalCreate.mockRejectedValue(error);

      instrumentation.instrument(client as any);

      await expect(
        client.chat.completions.create({ model: 'gpt-4', messages: [] } as any),
      ).rejects.toThrow('Rate limit exceeded');

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Rate limit exceeded',
      });
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', 'rate_limit_error');
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should add message events for each message in the request', async () => {
      const { client, originalCreate } = createMockOpenAIClient();
      const mockResponse = {
        id: 'test',
        model: 'gpt-4',
        choices: [],
        created: 1234567890,
        object: 'chat.completion',
      } as unknown as ChatCompletion;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);

      await client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
        ],
      } as any);

      const addEventCalls = mockSpan.addEvent.mock.calls;
      expect(addEventCalls.some((c: unknown[]) => c[0] === 'gen_ai.system.message')).toBe(true);
      expect(addEventCalls.some((c: unknown[]) => c[0] === 'gen_ai.user.message')).toBe(true);
    });
  });

  describe('streaming response handling', () => {
    it('should wrap streaming response and yield all chunks', async () => {
      const { client, originalCreate } = createMockOpenAIClient();
      const chunks = [
        { id: 'chatcmpl-1', model: 'gpt-4', choices: [{ delta: { content: 'Hello' } }] },
        {
          id: 'chatcmpl-1',
          model: 'gpt-4',
          choices: [{ delta: { content: ' World' }, finish_reason: 'stop' }],
        },
      ] as unknown as ChatCompletionChunk[];

      const originalStream = new OpenAIStream(async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      }, new AbortController());
      originalCreate.mockResolvedValue(originalStream);

      instrumentation.instrument(client as any);

      const result = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [],
        stream: true,
      } as any);

      const collected: unknown[] = [];
      for await (const chunk of result as AsyncIterable<unknown>) {
        collected.push(chunk);
      }

      expect(collected).toHaveLength(2);
      expect(collected).toEqual(chunks);
      expect((result as OpenAIStream<ChatCompletionChunk>).controller).toBeDefined();
      expect(typeof (result as OpenAIStream<ChatCompletionChunk>).tee).toBe('function');
      expect(typeof (result as OpenAIStream<ChatCompletionChunk>).toReadableStream).toBe(
        'function',
      );
    });

    it('should capture streaming metrics on span', async () => {
      const { client, originalCreate } = createMockOpenAIClient();
      const chunks = [
        { id: 'chatcmpl-1', model: 'gpt-4', choices: [{ delta: { content: 'Hello' } }] },
        {
          id: 'chatcmpl-1',
          model: 'gpt-4',
          choices: [{ delta: { content: ' World' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
        },
      ] as unknown as ChatCompletionChunk[];

      originalCreate.mockResolvedValue(
        new OpenAIStream(async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        }, new AbortController()) as any,
      );

      instrumentation.instrument(client as any);

      const result = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [],
        stream: true,
      } as any);

      void (await consumeAsyncIterable(result as AsyncIterable<unknown>));

      const setAttrCalls = mockSpan.setAttribute.mock.calls;
      const attrMap = Object.fromEntries(setAttrCalls.map((c: unknown[]) => [c[0], c[1]]));

      expect(attrMap['gen_ai.streaming.time_to_first_token_ms']).toBeDefined();
      expect(attrMap['gen_ai.streaming.total_duration_ms']).toBeDefined();
      expect(attrMap['gen_ai.streaming.chunk_count']).toBe(2);
      expect(attrMap['gen_ai.response.id']).toBe('chatcmpl-1');
      expect(attrMap['gen_ai.response.model']).toBe('gpt-4');
      expect(attrMap['gen_ai.usage.input_tokens']).toBe(10);
      expect(attrMap['gen_ai.usage.output_tokens']).toBe(2);
    });

    it('should handle streaming errors', async () => {
      const { client, originalCreate } = createMockOpenAIClient();
      const error = new Error('Stream interrupted');

      originalCreate.mockResolvedValue(
        new OpenAIStream(async function* () {
          yield { choices: [{ delta: { content: 'Hello' } }] } as unknown as ChatCompletionChunk;
          throw error;
        }, new AbortController()) as any,
      );

      instrumentation.instrument(client as any);

      const result = await client.chat.completions.create({
        model: 'gpt-4',
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
      const { client, originalCreate } = createMockOpenAIClient();

      originalCreate.mockResolvedValue(
        new OpenAIStream(async function* () {
          yield { choices: [{ delta: { content: 'Done' } }] } as unknown as ChatCompletionChunk;
        }, new AbortController()) as any,
      );

      instrumentation.instrument(client as any);

      const result = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [],
        stream: true,
      } as any);

      void (await consumeAsyncIterable(result as AsyncIterable<unknown>));

      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should record cost attributes for non-streaming responses when enabled', async () => {
      instrumentation = new OpenAIInstrumentation({ trackCosts: true });
      const { client, originalCreate } = createMockOpenAIClient();
      const mockResponse = {
        id: 'chatcmpl-abc123',
        model: 'gpt-4',
        choices: [],
        created: 1234567890,
        object: 'chat.completion',
        usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 },
      } as unknown as ChatCompletion;
      originalCreate.mockResolvedValue(mockResponse);

      instrumentation.instrument(client as any);
      await client.chat.completions.create({ model: 'gpt-4', messages: [] } as any);

      const attrMap = Object.fromEntries(
        mockSpan.setAttribute.mock.calls.map((c: unknown[]) => [c[0], c[1]]),
      );
      expect(attrMap['llm.cost.total']).toBe(0.06);
      expect(attrMap['llm.cost.input']).toBe(0.03);
      expect(attrMap['llm.cost.output']).toBe(0.03);
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
