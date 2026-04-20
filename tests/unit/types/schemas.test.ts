/**
 * Unit tests for Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  TokenUsageSchema,
  ModelInfoSchema,
  CostDataSchema,
  PricingInfoSchema,
  ContentBlockSchema,
  MessageSchema,
  ToolSchema,
  ToolChoiceSchema,
  ResponseFormatSchema,
  LLMRequestSchema,
  ChoiceSchema,
  LLMResponseSchema,
  SpanContextSchema,
  InstrumentationConfigSchema,
  GenAISpanAttributesSchema,
  StreamingEventSchema,
} from '../../../src/types/schemas.js';

describe('TokenUsageSchema', () => {
  it('should validate valid token usage', () => {
    const data = { inputTokens: 100, outputTokens: 50, totalTokens: 150 };
    const result = TokenUsageSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate minimal token usage', () => {
    const data = { inputTokens: 0, outputTokens: 0 };
    const result = TokenUsageSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should reject negative tokens', () => {
    expect(() => TokenUsageSchema.parse({ inputTokens: -1, outputTokens: 0 })).toThrow();
  });

  it('should reject non-integer tokens', () => {
    expect(() => TokenUsageSchema.parse({ inputTokens: 1.5, outputTokens: 0 })).toThrow();
  });
});

describe('ModelInfoSchema', () => {
  it('should validate valid model info', () => {
    const data = { provider: 'openai', model: 'gpt-4' };
    const result = ModelInfoSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate with optional fields', () => {
    const data = { provider: 'anthropic', model: 'claude-3', version: '1.0', family: 'claude' };
    const result = ModelInfoSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should reject invalid provider', () => {
    expect(() => ModelInfoSchema.parse({ provider: 'invalid', model: 'm' })).toThrow();
  });

  it('should reject empty model name', () => {
    expect(() => ModelInfoSchema.parse({ provider: 'openai', model: '' })).toThrow();
  });
});

describe('CostDataSchema', () => {
  it('should validate valid cost data', () => {
    const data = { total: 0.05, input: 0.02, output: 0.03, currency: 'USD' };
    const result = CostDataSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should reject negative costs', () => {
    expect(() =>
      CostDataSchema.parse({ total: -1, input: 0, output: 0, currency: 'USD' }),
    ).toThrow();
  });

  it('should reject invalid currency code', () => {
    expect(() => CostDataSchema.parse({ total: 0, input: 0, output: 0, currency: 'US' })).toThrow();
  });
});

describe('PricingInfoSchema', () => {
  it('should validate valid pricing info', () => {
    const data = { input: 0.03, output: 0.06 };
    const result = PricingInfoSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate with optional fields', () => {
    const data = { input: 0.03, output: 0.06, currency: 'USD', effectiveDate: '2024-01-01' };
    const result = PricingInfoSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should reject negative pricing', () => {
    expect(() => PricingInfoSchema.parse({ input: -1, output: 0 })).toThrow();
  });
});

describe('ContentBlockSchema', () => {
  it('should validate text content block', () => {
    const data = { type: 'text', text: 'Hello world' };
    const result = ContentBlockSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate image content block', () => {
    const data = { type: 'image', imageUrl: 'https://example.com/img.png', mimeType: 'image/png' };
    const result = ContentBlockSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should reject invalid type', () => {
    expect(() => ContentBlockSchema.parse({ type: 'invalid' })).toThrow();
  });
});

describe('MessageSchema', () => {
  it('should validate user message', () => {
    const data = { role: 'user', content: 'Hello' };
    const result = MessageSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate assistant message', () => {
    const data = { role: 'assistant', content: 'Hi there!' };
    const result = MessageSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate system message', () => {
    const data = { role: 'system', content: 'You are helpful.' };
    const result = MessageSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate message with tool calls', () => {
    const data = {
      role: 'assistant',
      content: '',
      toolCalls: [
        {
          id: 'call_1',
          type: 'function' as const,
          function: { name: 'get_weather', arguments: '{"city":"SF"}' },
        },
      ],
    };
    const result = MessageSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate message with array content', () => {
    const data = {
      role: 'user',
      content: [{ type: 'text', text: 'Hello' }],
    };
    const result = MessageSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should reject invalid role', () => {
    expect(() => MessageSchema.parse({ role: 'invalid', content: 'test' })).toThrow();
  });
});

describe('ToolSchema', () => {
  it('should validate valid tool', () => {
    const data = {
      type: 'function' as const,
      function: { name: 'get_weather', description: 'Get weather', parameters: {} },
    };
    const result = ToolSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should reject non-function type', () => {
    expect(() =>
      ToolSchema.parse({ type: 'invalid', function: { name: 'f', parameters: {} } }),
    ).toThrow();
  });
});

describe('ToolChoiceSchema', () => {
  it('should validate auto choice', () => {
    const data = { type: 'auto' };
    const result = ToolChoiceSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate function choice', () => {
    const data = { type: 'function', function: { name: 'get_weather' } };
    const result = ToolChoiceSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate any choice', () => {
    const data = { type: 'any' };
    const result = ToolChoiceSchema.parse(data);
    expect(result).toEqual(data);
  });
});

describe('ResponseFormatSchema', () => {
  it('should validate text format', () => {
    const data = { type: 'text' };
    const result = ResponseFormatSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate json_object format', () => {
    const data = { type: 'json_object' };
    const result = ResponseFormatSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate json_schema format', () => {
    const data = { type: 'json_schema', jsonSchema: { type: 'object' } };
    const result = ResponseFormatSchema.parse(data);
    expect(result).toEqual(data);
  });
});

describe('LLMRequestSchema', () => {
  it('should validate minimal request', () => {
    const data = { model: 'gpt-4' };
    const result = LLMRequestSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate full request', () => {
    const data = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 0.7,
      maxTokens: 100,
      topP: 0.9,
      streaming: false,
    };
    const result = LLMRequestSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should reject temperature out of range', () => {
    expect(() => LLMRequestSchema.parse({ model: 'gpt-4', temperature: 3 })).toThrow();
  });

  it('should reject invalid topP', () => {
    expect(() => LLMRequestSchema.parse({ model: 'gpt-4', topP: 1.5 })).toThrow();
  });

  it('should accept valid stop patterns', () => {
    const data = { model: 'gpt-4', stop: ['END', 'STOP'] };
    const result = LLMRequestSchema.parse(data);
    expect(result.stop).toEqual(['END', 'STOP']);
  });

  it('should accept seed', () => {
    const data = { model: 'gpt-4', seed: 42 };
    const result = LLMRequestSchema.parse(data);
    expect(result.seed).toBe(42);
  });
});

describe('ChoiceSchema', () => {
  it('should validate choice', () => {
    const data = {
      index: 0,
      message: { role: 'assistant', content: 'Hello' },
      finishReason: 'stop',
    };
    const result = ChoiceSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should accept null finishReason', () => {
    const data = {
      index: 0,
      message: { role: 'assistant', content: 'Hello' },
      finishReason: null,
    };
    const result = ChoiceSchema.parse(data);
    expect(result.finishReason).toBeNull();
  });

  it('should reject negative index', () => {
    expect(() =>
      ChoiceSchema.parse({
        index: -1,
        message: { role: 'assistant', content: 'Hi' },
        finishReason: 'stop',
      }),
    ).toThrow();
  });
});

describe('LLMResponseSchema', () => {
  it('should validate response', () => {
    const data = {
      id: 'resp-123',
      model: 'gpt-4',
      choices: [
        { index: 0, message: { role: 'assistant', content: 'Hello' }, finishReason: 'stop' },
      ],
      usage: { inputTokens: 10, outputTokens: 5 },
      finishReasons: ['stop'],
    };
    const result = LLMResponseSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should reject empty model', () => {
    expect(() =>
      LLMResponseSchema.parse({
        id: 'r1',
        model: '',
        choices: [],
        usage: { inputTokens: 0, outputTokens: 0 },
        finishReasons: [],
      }),
    ).toThrow();
  });
});

describe('SpanContextSchema', () => {
  it('should validate span context', () => {
    const data = {
      traceId: 'abc123',
      spanId: 'def456',
      traceFlags: 1,
    };
    const result = SpanContextSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should accept optional parentSpanId', () => {
    const data = {
      traceId: 'abc123',
      spanId: 'def456',
      parentSpanId: 'ghi789',
      traceFlags: 0,
    };
    const result = SpanContextSchema.parse(data);
    expect(result.parentSpanId).toBe('ghi789');
  });

  it('should reject invalid traceFlags', () => {
    expect(() =>
      SpanContextSchema.parse({
        traceId: 'abc',
        spanId: 'def',
        traceFlags: 300,
      }),
    ).toThrow();
  });
});

describe('InstrumentationConfigSchema', () => {
  it('should validate empty config', () => {
    const result = InstrumentationConfigSchema.parse({});
    expect(result).toEqual({});
  });

  it('should validate full config', () => {
    const data = {
      captureRequestHeaders: true,
      captureResponseHeaders: true,
      trackCosts: true,
      piiRedactionEnabled: true,
      customAttributes: { env: 'prod' },
    };
    const result = InstrumentationConfigSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should accept pricing config', () => {
    const data = {
      trackCosts: true,
      pricing: {
        'gpt-4': { input: 0.03, output: 0.06 },
      },
    };
    const result = InstrumentationConfigSchema.parse(data);
    expect(result.pricing).toEqual(data.pricing);
  });
});

describe('GenAISpanAttributesSchema', () => {
  it('should validate span attributes', () => {
    const data = {
      'gen_ai.request.model': 'gpt-4',
      'gen_ai.request.temperature': 0.7,
      'gen_ai.usage.input_tokens': 100,
      'gen_ai.usage.output_tokens': 50,
      'llm.cost.total': 0.005,
    };
    const result = GenAISpanAttributesSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate finish_reasons array', () => {
    const data = { 'gen_ai.response.finish_reasons': ['stop', 'length'] };
    const result = GenAISpanAttributesSchema.parse(data);
    expect(result['gen_ai.response.finish_reasons']).toEqual(['stop', 'length']);
  });

  it('should reject negative token counts', () => {
    expect(() =>
      GenAISpanAttributesSchema.parse({
        'gen_ai.usage.input_tokens': -1,
      }),
    ).toThrow();
  });
});

describe('StreamingEventSchema', () => {
  it('should validate chunk event', () => {
    const data = { type: 'chunk', tokenCount: 5, timeToFirstTokenMs: 100 };
    const result = StreamingEventSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should validate complete event', () => {
    const data = { type: 'complete', totalDurationMs: 5000 };
    const result = StreamingEventSchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should reject invalid event type', () => {
    expect(() => StreamingEventSchema.parse({ type: 'invalid' })).toThrow();
  });

  it('should reject negative durations', () => {
    expect(() => StreamingEventSchema.parse({ type: 'chunk', timeToFirstTokenMs: -1 })).toThrow();
  });
});

describe('Type inference', () => {
  it('should infer correct types', () => {
    const usage = TokenUsageSchema.parse({ inputTokens: 100, outputTokens: 50 });
    expect(typeof usage.inputTokens).toBe('number');

    const model = ModelInfoSchema.parse({ provider: 'openai', model: 'gpt-4' });
    expect(model.provider).toBe('openai');

    const cost = CostDataSchema.parse({ total: 0.05, input: 0.02, output: 0.03, currency: 'USD' });
    expect(cost.currency).toBe('USD');
  });
});
