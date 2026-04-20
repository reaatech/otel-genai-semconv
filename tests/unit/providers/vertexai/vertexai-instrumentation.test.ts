import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { VertexAIInstrumentation } from '../../../../src/providers/vertexai/vertexai-instrumentation.js';
import type { GenerateContentResponse } from '../../../../src/providers/vertexai/attribute-mapper.js';

const WRAPPED_SYMBOL = Symbol.for('otel.genai.vertexai.wrapped');
const ORIGINAL_GENERATE_SYMBOL = Symbol.for('otel.genai.vertexai.original_generate');

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

function createMockVertexAIModel() {
  const originalGenerateContent = vi.fn();
  const model = {
    generateContent: originalGenerateContent,
    model: 'gemini-1.5-pro',
  };
  return { model, originalGenerateContent };
}

describe('VertexAIInstrumentation', () => {
  let instrumentation: VertexAIInstrumentation;
  let mockSpan: ReturnType<typeof createMockSpan>;
  let getTracerSpy: any;

  beforeEach(() => {
    mockSpan = createMockSpan();
    const mockTracer = { startSpan: vi.fn().mockReturnValue(mockSpan) };
    getTracerSpy = vi
      .spyOn(trace, 'getTracer')
      .mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);
    instrumentation = new VertexAIInstrumentation();
  });

  afterEach(() => {
    getTracerSpy.mockRestore();
  });

  describe('instrument()', () => {
    it('should guard against double instrumentation', () => {
      const { model } = createMockVertexAIModel();

      instrumentation.instrument(model as any);
      const firstWrapped = model.generateContent;

      instrumentation.instrument(model as any);
      const secondWrapped = model.generateContent;

      expect(firstWrapped).toBe(secondWrapped);
      expect((model.generateContent as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL]).toBe(
        true,
      );
    });

    it('should store the original generateContent method', () => {
      const { model } = createMockVertexAIModel();

      instrumentation.instrument(model as any);

      const storedOriginal = (model.generateContent as unknown as Record<symbol, unknown>)[
        ORIGINAL_GENERATE_SYMBOL
      ];
      expect(storedOriginal).toBeDefined();
      expect((model.generateContent as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL]).toBe(
        true,
      );
    });

    it('should mark the method as wrapped', () => {
      const { model } = createMockVertexAIModel();

      instrumentation.instrument(model as any);

      expect((model.generateContent as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL]).toBe(
        true,
      );
    });
  });

  describe('uninstrument()', () => {
    it('should restore the original method', async () => {
      const { model, originalGenerateContent } = createMockVertexAIModel();
      const mockResponse = {
        candidates: [],
        usageMetadata: {},
      } as unknown as GenerateContentResponse;
      originalGenerateContent.mockResolvedValue(mockResponse);

      instrumentation.instrument(model as any);
      await model.generateContent('Hello' as any);

      instrumentation.uninstrument(model as any);

      expect(
        (model.generateContent as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL],
      ).toBeUndefined();
      expect(
        (model.generateContent as unknown as Record<symbol, unknown>)[ORIGINAL_GENERATE_SYMBOL],
      ).toBeUndefined();
    });

    it('should be safe to call on non-instrumented model', () => {
      const { model } = createMockVertexAIModel();
      const originalMethod = model.generateContent;

      instrumentation.uninstrument(model as any);

      expect(model.generateContent).toBe(originalMethod);
    });
  });

  describe('config hooks', () => {
    it('should call onStart hook with span and request', async () => {
      const onStart = vi.fn();
      const mockTracer = { startSpan: vi.fn().mockReturnValue(mockSpan) };
      getTracerSpy.mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);
      instrumentation = new VertexAIInstrumentation({ onStart });

      const { model, originalGenerateContent } = createMockVertexAIModel();
      const mockResponse = {
        candidates: [],
        usageMetadata: {},
      } as unknown as GenerateContentResponse;
      originalGenerateContent.mockResolvedValue(mockResponse);

      instrumentation.instrument(model as any);

      const request = { contents: [{ role: 'user', parts: [{ text: 'Hello' }] }] };
      await model.generateContent(request as any);

      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onStart.mock.calls[0]?.[1]).toEqual(request);
    });

    it('should call onEnd hook with span and response', async () => {
      const onEnd = vi.fn();
      instrumentation = new VertexAIInstrumentation({ onEnd });

      const { model, originalGenerateContent } = createMockVertexAIModel();
      const mockResponse = {
        candidates: [],
        usageMetadata: {},
      } as unknown as GenerateContentResponse;
      originalGenerateContent.mockResolvedValue(mockResponse);

      instrumentation.instrument(model as any);
      await model.generateContent('Hello' as any);

      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(onEnd.mock.calls[0]?.[1]).toBe(mockResponse);
    });
  });

  describe('config options', () => {
    it('should set projectId attribute when provided', async () => {
      const mockTracer = { startSpan: vi.fn().mockReturnValue(mockSpan) };
      getTracerSpy.mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);
      instrumentation = new VertexAIInstrumentation({ projectId: 'my-project' });

      const { model, originalGenerateContent } = createMockVertexAIModel();
      const mockResponse = {
        candidates: [],
        usageMetadata: {},
      } as unknown as GenerateContentResponse;
      originalGenerateContent.mockResolvedValue(mockResponse);

      instrumentation.instrument(model as any);
      await model.generateContent('Hello' as any);

      const startSpanCalls = mockTracer.startSpan.mock.calls;
      const startSpanAttrs = startSpanCalls[0]?.[1]?.attributes as
        | Record<string, unknown>
        | undefined;

      expect(startSpanAttrs?.['gcp.project_id']).toBe('my-project');
    });

    it('should set location attribute when provided', async () => {
      const mockTracer = { startSpan: vi.fn().mockReturnValue(mockSpan) };
      getTracerSpy.mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);
      instrumentation = new VertexAIInstrumentation({ location: 'us-central1' });

      const { model, originalGenerateContent } = createMockVertexAIModel();
      const mockResponse = {
        candidates: [],
        usageMetadata: {},
      } as unknown as GenerateContentResponse;
      originalGenerateContent.mockResolvedValue(mockResponse);

      instrumentation.instrument(model as any);
      await model.generateContent('Hello' as any);

      const startSpanCalls = mockTracer.startSpan.mock.calls;
      const startSpanAttrs = startSpanCalls[0]?.[1]?.attributes as
        | Record<string, unknown>
        | undefined;

      expect(startSpanAttrs?.['gcp.location']).toBe('us-central1');
    });
  });

  describe('non-streaming response handling', () => {
    it('should capture response attributes on span', async () => {
      const { model, originalGenerateContent } = createMockVertexAIModel();
      const mockResponse = {
        candidates: [
          { content: { parts: [{ text: 'Hello!' }], role: 'model' }, finishReason: 'STOP' },
        ],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
      } as unknown as GenerateContentResponse;
      originalGenerateContent.mockResolvedValue(mockResponse);

      instrumentation.instrument(model as any);
      await model.generateContent('Hello' as any);

      expect(mockSpan.setAttribute).toHaveBeenCalled();
      expect(mockSpan.addEvent).toHaveBeenCalled();
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should return the original response', async () => {
      const { model, originalGenerateContent } = createMockVertexAIModel();
      const mockResponse = {
        candidates: [],
        usageMetadata: {},
      } as unknown as GenerateContentResponse;
      originalGenerateContent.mockResolvedValue(mockResponse);

      instrumentation.instrument(model as any);
      const result = await model.generateContent('Hello' as any);

      expect(result).toBe(mockResponse);
    });

    it('should handle string input by normalizing to request format', async () => {
      const { model, originalGenerateContent } = createMockVertexAIModel();
      const mockResponse = {
        candidates: [],
        usageMetadata: {},
      } as unknown as GenerateContentResponse;
      originalGenerateContent.mockResolvedValue(mockResponse);

      instrumentation.instrument(model as any);
      await model.generateContent('Hello' as any);

      expect(originalGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      });
    });

    it('should handle errors and record them on span', async () => {
      const { model, originalGenerateContent } = createMockVertexAIModel();
      const error = new Error('Deadline exceeded');
      originalGenerateContent.mockRejectedValue(error);

      instrumentation.instrument(model as any);

      await expect(model.generateContent('Hello' as any)).rejects.toThrow('Deadline exceeded');

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Deadline exceeded',
      });
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', 'timeout_error');
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should add choice events for each candidate', async () => {
      const localMockSpan = createMockSpan();
      const mockTracer = { startSpan: vi.fn().mockReturnValue(localMockSpan) };
      getTracerSpy.mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);
      instrumentation = new VertexAIInstrumentation();

      const { model, originalGenerateContent } = createMockVertexAIModel();
      const mockResponse = {
        candidates: [
          { content: { parts: [{ text: 'Answer A' }], role: 'model' }, finishReason: 'STOP' },
          { content: { parts: [{ text: 'Answer B' }], role: 'model' }, finishReason: 'STOP' },
        ],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
      } as unknown as GenerateContentResponse;
      originalGenerateContent.mockResolvedValue(mockResponse);

      instrumentation.instrument(model as any);
      await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      } as any);

      const addEventCalls = localMockSpan.addEvent.mock.calls;
      const choiceEvents = addEventCalls.filter((c: unknown[]) => c[0] === 'gen_ai.choice');
      expect(choiceEvents).toHaveLength(2);
    });

    it('should add system instruction event when present', async () => {
      const { model, originalGenerateContent } = createMockVertexAIModel();
      const mockResponse = {
        candidates: [],
        usageMetadata: {},
      } as unknown as GenerateContentResponse;
      originalGenerateContent.mockResolvedValue(mockResponse);

      instrumentation.instrument(model as any);

      await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        systemInstruction: { parts: [{ text: 'You are helpful' }] },
      } as any);

      const addEventCalls = mockSpan.addEvent.mock.calls;
      expect(addEventCalls.some((c: unknown[]) => c[0] === 'gen_ai.system.message')).toBe(true);
    });
  });

  describe('error type mapping', () => {
    it('should map deadline errors to timeout_error', async () => {
      const { model, originalGenerateContent } = createMockVertexAIModel();
      const error = new Error('Deadline exceeded');
      (error as any).code = 4;
      originalGenerateContent.mockRejectedValue(error);

      instrumentation.instrument(model as any);

      await expect(model.generateContent('Hello' as any)).rejects.toThrow();

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', 'timeout_error');
    });

    it('should map permission denied errors', async () => {
      const { model, originalGenerateContent } = createMockVertexAIModel();
      const error = new Error('Permission denied');
      originalGenerateContent.mockRejectedValue(error);

      instrumentation.instrument(model as any);

      await expect(model.generateContent('Hello' as any)).rejects.toThrow();

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', 'permission_denied_error');
    });

    it('should map rate limit errors', async () => {
      const { model, originalGenerateContent } = createMockVertexAIModel();
      const error = new Error('Rate limit exceeded');
      originalGenerateContent.mockRejectedValue(error);

      instrumentation.instrument(model as any);

      await expect(model.generateContent('Hello' as any)).rejects.toThrow();

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', 'rate_limit_error');
    });
  });
});
