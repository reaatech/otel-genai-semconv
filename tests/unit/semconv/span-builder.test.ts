/**
 * Unit tests for SpanBuilder
 */

import { describe, it, expect, vi } from 'vitest';
import { SpanBuilder, createSpanBuilder } from '../../../src/semconv/span-builder.js';

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: () => ({
      startSpan: vi.fn(() => ({
        setAttribute: vi.fn(),
        setAttributes: vi.fn(),
        addEvent: vi.fn(),
        recordException: vi.fn(),
        setStatus: vi.fn(),
        end: vi.fn(),
        isRecording: () => true,
        spanContext: () => ({ traceId: 'test-trace', spanId: 'test-span' }),
      })),
    }),
  },
  SpanKind: { CLIENT: 3 },
  SpanStatusCode: { OK: 1, ERROR: 2, UNSET: 0 },
}));

describe('SpanBuilder', () => {
  describe('construction', () => {
    it('should create a span builder with required options', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      expect(builder).toBeInstanceOf(SpanBuilder);
    });

    it('should default operation to chat completion', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      expect(builder).toBeInstanceOf(SpanBuilder);
    });

    it('should accept custom operation', () => {
      const builder = new SpanBuilder({ provider: 'openai', operation: 'embedding' });
      expect(builder).toBeInstanceOf(SpanBuilder);
    });
  });

  describe('factory function', () => {
    it('should create span builder via factory', () => {
      const builder = createSpanBuilder({ provider: 'anthropic' });
      expect(builder).toBeInstanceOf(SpanBuilder);
    });
  });

  describe('startSpan', () => {
    it('should start a span with request attributes', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      const span = builder.startSpan({
        model: 'gpt-4',
        messages: [],
        temperature: 0.7,
      });

      expect(span).toBeDefined();
      expect(builder.getSpan()).toBeDefined();
    });

    it('should use correct span name for chat completion', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      builder.startSpan({ model: 'gpt-4', messages: [] });
      expect(builder.getSpan()).toBeDefined();
    });

    it('should accept custom span name', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      const span = builder.startSpan({ model: 'gpt-4', messages: [] }, 'custom_span_name');
      expect(span).toBeDefined();
    });

    it('should add custom attributes', () => {
      const builder = new SpanBuilder({
        provider: 'openai',
        customAttributes: { 'custom.attr': 'value' },
      });
      const span = builder.startSpan({ model: 'gpt-4', messages: [] });
      expect(span).toBeDefined();
    });
  });

  describe('addResponse', () => {
    it('should throw if span not started', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      expect(() => {
        builder.addResponse({
          id: 'test',
          model: 'gpt-4',
          choices: [],
          finishReasons: ['stop'],
          usage: { inputTokens: 10, outputTokens: 20 },
        });
      }).toThrow('Span not started');
    });

    it('should add response after span started', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      builder.startSpan({ model: 'gpt-4', messages: [] });
      expect(() => {
        builder.addResponse({
          id: 'chatcmpl-123',
          model: 'gpt-4',
          choices: [
            { index: 0, message: { role: 'assistant', content: 'Hello' }, finishReason: 'stop' },
          ],
          finishReasons: ['stop'],
          usage: { inputTokens: 10, outputTokens: 20 },
        });
      }).not.toThrow();
    });
  });

  describe('addCostAttributes', () => {
    it('should throw if span not started', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      expect(() => {
        builder.addCostAttributes({ total: 0.01, input: 0.005, output: 0.005, currency: 'USD' });
      }).toThrow('Span not started');
    });

    it('should add cost attributes after span started', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      builder.startSpan({ model: 'gpt-4', messages: [] });
      expect(() => {
        builder.addCostAttributes({ total: 0.01, input: 0.005, output: 0.005, currency: 'USD' });
      }).not.toThrow();
    });
  });

  describe('recordError', () => {
    it('should throw if span not started', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      expect(() => {
        builder.recordError(new Error('test error'));
      }).toThrow('Span not started');
    });

    it('should record error after span started', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      builder.startSpan({ model: 'gpt-4', messages: [] });
      expect(() => {
        builder.recordError(new Error('test error'));
      }).not.toThrow();
    });
  });

  describe('setOk', () => {
    it('should throw if span not started', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      expect(() => {
        builder.setOk();
      }).toThrow('Span not started');
    });

    it('should set ok status after span started', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      builder.startSpan({ model: 'gpt-4', messages: [] });
      expect(() => {
        builder.setOk();
      }).not.toThrow();
    });
  });

  describe('endSpan', () => {
    it('should end the span', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      builder.startSpan({ model: 'gpt-4', messages: [] });
      builder.endSpan();
      expect(builder.getSpan()).toBeNull();
    });

    it('should be safe to call when no span started', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      expect(() => {
        builder.endSpan();
      }).not.toThrow();
    });
  });

  describe('addStreamingAttributes', () => {
    it('should throw if span not started', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      expect(() => {
        builder.addStreamingAttributes({ timeToFirstTokenMs: 100 });
      }).toThrow('Span not started');
    });

    it('should add streaming attributes after span started', () => {
      const builder = new SpanBuilder({ provider: 'openai' });
      builder.startSpan({ model: 'gpt-4', messages: [] });
      expect(() => {
        builder.addStreamingAttributes({
          timeToFirstTokenMs: 150,
          totalDurationMs: 2000,
          chunkCount: 30,
        });
      }).not.toThrow();
    });
  });
});
