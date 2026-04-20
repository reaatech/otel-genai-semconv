import { TextEncoder } from 'util';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { BedrockInstrumentation } from '../../../../src/providers/bedrock/bedrock-instrumentation.js';
import type { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

const WRAPPED_SYMBOL = Symbol.for('otel.genai.bedrock.wrapped');
const ORIGINAL_SEND_SYMBOL = Symbol.for('otel.genai.bedrock.original_send');

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

function createMockBedrockClient() {
  const originalSend = vi.fn();
  const client = {
    send: originalSend,
    config: { region: 'us-east-1' },
  } as unknown as BedrockRuntimeClient;
  return { client, originalSend };
}

function createInvokeModelCommand(modelId: string, body: string) {
  return {
    constructor: { name: 'InvokeModelCommand' },
    input: { modelId, body },
  };
}

function createOtherCommand() {
  return {
    constructor: { name: 'SomeOtherCommand' },
  };
}

describe('BedrockInstrumentation', () => {
  let instrumentation: BedrockInstrumentation;
  let mockSpan: ReturnType<typeof createMockSpan>;
  let getTracerSpy: any;

  beforeEach(() => {
    mockSpan = createMockSpan();
    const mockTracer = { startSpan: vi.fn().mockReturnValue(mockSpan) };
    getTracerSpy = vi
      .spyOn(trace, 'getTracer')
      .mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);
    instrumentation = new BedrockInstrumentation();
  });

  afterEach(() => {
    getTracerSpy.mockRestore();
  });

  describe('instrument()', () => {
    it('should guard against double instrumentation', () => {
      const { client } = createMockBedrockClient();

      instrumentation.instrument(client);
      const firstWrapped = client.send;

      instrumentation.instrument(client);
      const secondWrapped = client.send;

      expect(firstWrapped).toBe(secondWrapped);
      expect((client as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL]).toBe(true);
    });

    it('should store the original send method', () => {
      const { client } = createMockBedrockClient();

      instrumentation.instrument(client);

      const storedOriginal = (client as unknown as Record<symbol, unknown>)[ORIGINAL_SEND_SYMBOL];
      expect(storedOriginal).toBeDefined();
      expect((client as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL]).toBe(true);
    });

    it('should mark the client as wrapped', () => {
      const { client } = createMockBedrockClient();

      instrumentation.instrument(client);

      expect((client as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL]).toBe(true);
    });
  });

  describe('uninstrument()', () => {
    it('should restore the original send method', async () => {
      const { client, originalSend } = createMockBedrockClient();
      const mockResponse = { output: { body: new TextEncoder().encode('{"completion":"Hello"}') } };
      originalSend.mockResolvedValue(mockResponse);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await client.send(command as any);

      instrumentation.uninstrument(client);

      expect((client as unknown as Record<symbol, unknown>)[ORIGINAL_SEND_SYMBOL]).toBeUndefined();
      expect((client as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL]).toBeUndefined();
    });

    it('should be safe to call on non-instrumented client', () => {
      const { client } = createMockBedrockClient();
      const originalMethod = client.send;

      instrumentation.uninstrument(client);

      expect(client.send).toBe(originalMethod);
    });
  });

  describe('config hooks', () => {
    it('should call onStart hook with span and request', async () => {
      const onStart = vi.fn();
      const mockTracer = { startSpan: vi.fn().mockReturnValue(mockSpan) };
      getTracerSpy.mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);
      instrumentation = new BedrockInstrumentation({ onStart });

      const { client, originalSend } = createMockBedrockClient();
      const mockResponse = { output: { body: new TextEncoder().encode('{"completion":"Hello"}') } };
      originalSend.mockResolvedValue(mockResponse);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await client.send(command as any);

      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onStart.mock.calls[0]?.[1]).toEqual({ modelId: 'anthropic.claude-v2', body: '{}' });
    });

    it('should call onEnd hook with span and response', async () => {
      const onEnd = vi.fn();
      instrumentation = new BedrockInstrumentation({ onEnd });

      const { client, originalSend } = createMockBedrockClient();
      const mockResponse = { output: { body: new TextEncoder().encode('{"completion":"Hello"}') } };
      originalSend.mockResolvedValue(mockResponse);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await client.send(command as any);

      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(onEnd.mock.calls[0]?.[1]).toBe(mockResponse);
    });
  });

  describe('config options', () => {
    it('should set region attribute when provided', async () => {
      const mockTracer = { startSpan: vi.fn().mockReturnValue(mockSpan) };
      getTracerSpy.mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);
      instrumentation = new BedrockInstrumentation({ region: 'us-west-2' });

      const { client, originalSend } = createMockBedrockClient();
      const mockResponse = { output: { body: new TextEncoder().encode('{"completion":"Hello"}') } };
      originalSend.mockResolvedValue(mockResponse);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await client.send(command as any);

      const startSpanCalls = mockTracer.startSpan.mock.calls;
      const startSpanAttrs = startSpanCalls[0]?.[1]?.attributes as
        | Record<string, unknown>
        | undefined;

      expect(startSpanAttrs?.['aws.region']).toBe('us-west-2');
    });

    it('should set provider family attribute', async () => {
      const { client, originalSend } = createMockBedrockClient();
      const mockResponse = { output: { body: new TextEncoder().encode('{"completion":"Hello"}') } };
      originalSend.mockResolvedValue(mockResponse);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await client.send(command as any);

      const setAttrCalls = mockSpan.setAttribute.mock.calls;
      const attrMap = Object.fromEntries(setAttrCalls.map((c: unknown[]) => [c[0], c[1]]));

      expect(attrMap['gen_ai.provider.family']).toBe('anthropic');
    });
  });

  describe('model tracking', () => {
    it('should instrument only tracked model families', async () => {
      instrumentation = new BedrockInstrumentation({ trackModelFamilies: ['anthropic'] });
      getTracerSpy.mockReturnValue({
        startSpan: vi.fn().mockReturnValue(mockSpan),
      } as unknown as ReturnType<typeof trace.getTracer>);
      instrumentation = new BedrockInstrumentation({ trackModelFamilies: ['anthropic'] });

      const { client, originalSend } = createMockBedrockClient();
      const mockResponse = { output: { body: new TextEncoder().encode('{"completion":"Hello"}') } };
      originalSend.mockResolvedValue(mockResponse);

      instrumentation.instrument(client);

      const anthropicCmd = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await client.send(anthropicCmd as any);

      expect(mockSpan.setAttribute).toHaveBeenCalled();

      mockSpan.setAttribute.mockClear();

      const amazonCmd = createInvokeModelCommand('amazon.titan-text', '{}');
      await client.send(amazonCmd as any);

      expect(mockSpan.setAttribute).not.toHaveBeenCalled();
    });

    it('should pass through non-InvokeModelCommand commands without instrumentation', async () => {
      const { client, originalSend } = createMockBedrockClient();
      const mockResponse = { $metadata: {} };
      originalSend.mockResolvedValue(mockResponse);

      instrumentation.instrument(client);

      const command = createOtherCommand();
      const result = await client.send(command as any);

      expect(result).toBe(mockResponse);
      expect(mockSpan.setAttribute).not.toHaveBeenCalled();
    });

    it('should pass through commands with unknown modelId', async () => {
      const { client, originalSend } = createMockBedrockClient();
      const mockResponse = { output: { body: new TextEncoder().encode('{}') } };
      originalSend.mockResolvedValue(mockResponse);

      instrumentation = new BedrockInstrumentation({ trackModelFamilies: ['anthropic'] });
      getTracerSpy.mockReturnValue({
        startSpan: vi.fn().mockReturnValue(mockSpan),
      } as unknown as ReturnType<typeof trace.getTracer>);
      instrumentation = new BedrockInstrumentation({ trackModelFamilies: ['anthropic'] });
      instrumentation.instrument(client);

      const command = createInvokeModelCommand('unknown.model', '{}');
      await client.send(command as any);

      expect(mockSpan.setAttribute).not.toHaveBeenCalled();
    });
  });

  describe('response handling', () => {
    it('should capture response attributes on span', async () => {
      const { client, originalSend } = createMockBedrockClient();
      const responseBody = { completion: 'Hello!', stop_reason: 'stop' };
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify(responseBody)),
      };
      originalSend.mockResolvedValue(mockResponse);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await client.send(command as any);

      expect(mockSpan.setAttribute).toHaveBeenCalled();
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle errors and record them on span', async () => {
      const { client, originalSend } = createMockBedrockClient();
      const error = new Error('ThrottlingException');
      originalSend.mockRejectedValue(error);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await expect(client.send(command as any)).rejects.toThrow('ThrottlingException');

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'ThrottlingException',
      });
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', 'rate_limit_error');
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should add choice event with finish reason', async () => {
      const { client, originalSend } = createMockBedrockClient();
      const responseBody = { completion: 'Hello!', stop_reason: 'stop' };
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify(responseBody)),
      };
      originalSend.mockResolvedValue(mockResponse);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await client.send(command as any);

      const addEventCalls = mockSpan.addEvent.mock.calls;
      expect(addEventCalls.some((c: unknown[]) => c[0] === 'gen_ai.choice')).toBe(true);
    });

    it('should handle missing response body gracefully', async () => {
      const { client, originalSend } = createMockBedrockClient();
      const mockResponse = { $metadata: {} };
      originalSend.mockResolvedValue(mockResponse);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await client.send(command as any);

      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should record cost attributes from top-level response body', async () => {
      instrumentation = new BedrockInstrumentation({ trackCosts: true });
      const { client, originalSend } = createMockBedrockClient();
      const responseBody = {
        model: 'anthropic.claude-3-opus',
        stop_reason: 'end_turn',
        usage: { input_tokens: 1000, output_tokens: 500 },
      };
      originalSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify(responseBody)),
      });

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-3-opus', '{}');
      await client.send(command as any);

      const attrMap = Object.fromEntries(
        mockSpan.setAttribute.mock.calls.map((c: unknown[]) => [c[0], c[1]]),
      );
      expect(attrMap['llm.cost.total']).toBe(0.0525);
      expect(attrMap['llm.cost.input']).toBe(0.015);
      expect(attrMap['llm.cost.output']).toBe(0.0375);
      expect(attrMap['llm.cost.currency']).toBe('USD');
    });
  });

  describe('error type mapping', () => {
    it('should map throttling errors to rate_limit_error', async () => {
      const { client, originalSend } = createMockBedrockClient();
      const error = new Error('ThrottlingException');
      originalSend.mockRejectedValue(error);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await expect(client.send(command as any)).rejects.toThrow();

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', 'rate_limit_error');
    });

    it('should map access denied errors', async () => {
      const { client, originalSend } = createMockBedrockClient();
      const error = new Error('AccessDeniedException');
      originalSend.mockRejectedValue(error);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await expect(client.send(command as any)).rejects.toThrow();

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', 'access_denied_error');
    });

    it('should map validation errors', async () => {
      const { client, originalSend } = createMockBedrockClient();
      const error = new Error('ValidationException');
      originalSend.mockRejectedValue(error);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await expect(client.send(command as any)).rejects.toThrow();

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', 'validation_error');
    });

    it('should map not found errors', async () => {
      const { client, originalSend } = createMockBedrockClient();
      const error = new Error('Resource not found');
      originalSend.mockRejectedValue(error);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await expect(client.send(command as any)).rejects.toThrow();

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', 'not_found_error');
    });

    it('should map server errors', async () => {
      const { client, originalSend } = createMockBedrockClient();
      const error = new Error('Internal server error');
      originalSend.mockRejectedValue(error);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await expect(client.send(command as any)).rejects.toThrow();

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', 'server_error');
    });

    it('should default to unknown_error for unrecognized errors', async () => {
      const { client, originalSend } = createMockBedrockClient();
      const error = new Error('Some random error');
      originalSend.mockRejectedValue(error);

      instrumentation.instrument(client);

      const command = createInvokeModelCommand('anthropic.claude-v2', '{}');
      await expect(client.send(command as any)).rejects.toThrow();

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', 'unknown_error');
    });
  });
});
