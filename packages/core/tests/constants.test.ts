import { describe, it, expect } from 'vitest';
import { GEN_AI_ATTRIBUTES, GEN_AI_EVENTS, ERROR_TYPES, FINISH_REASONS } from '../src/index.js';

describe('@reaatech/otel-genai-semconv-core', () => {
  it('should export GenAI attribute constants', () => {
    expect(GEN_AI_ATTRIBUTES.REQUEST_MODEL).toBe('gen_ai.request.model');
    expect(GEN_AI_ATTRIBUTES.RESPONSE_MODEL).toBe('gen_ai.response.model');
    expect(GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS).toBe('gen_ai.usage.input_tokens');
  });

  it('should export event names', () => {
    expect(GEN_AI_EVENTS.CHOICE).toBe('gen_ai.choice');
    expect(GEN_AI_EVENTS.SYSTEM_MESSAGE).toBe('gen_ai.system.message');
  });

  it('should export error types', () => {
    expect(ERROR_TYPES.RATE_LIMIT).toBe('rate_limit');
    expect(ERROR_TYPES.AUTHENTICATION).toBe('authentication');
    expect(ERROR_TYPES.TIMEOUT).toBe('timeout');
  });

  it('should export finish reasons', () => {
    expect(FINISH_REASONS.STOP).toBe('stop');
    expect(FINISH_REASONS.MAX_TOKENS).toBe('max_tokens');
    expect(FINISH_REASONS.TOOL_CALLS).toBe('tool_calls');
  });
});
