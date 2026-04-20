import { describe, it, expect } from 'vitest';
import {
  mapAnthropicRequest,
  mapAnthropicResponse,
  mapAnthropicError,
} from '../../../../src/providers/anthropic/attribute-mapper.js';
import { GEN_AI_ATTRIBUTES } from '../../../../src/semconv/constants.js';
import type { MessageCreateParams, Message } from '@anthropic-ai/sdk/resources/messages';

describe('mapAnthropicRequest', () => {
  it('should map required fields', () => {
    const attrs = mapAnthropicRequest({
      model: 'claude-opus-20240229',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hello' }],
    } as MessageCreateParams);

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MODEL]).toBe('claude-opus-20240229');
    expect(attrs[GEN_AI_ATTRIBUTES.PROVIDER_NAME]).toBe('anthropic');
  });

  it('should map max_tokens', () => {
    const attrs = mapAnthropicRequest({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [],
    } as MessageCreateParams);

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS]).toBe(2048);
  });

  it('should map sampling parameters', () => {
    const attrs = mapAnthropicRequest({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [],
      temperature: 0.7,
      top_p: 0.95,
    } as MessageCreateParams);

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBe(0.7);
    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TOP_P]).toBe(0.95);
  });

  it('should map top_k', () => {
    const attrs = mapAnthropicRequest({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [],
      top_k: 40,
    } as MessageCreateParams);

    expect(attrs['gen_ai.request.top_k']).toBe(40);
  });

  it('should map stop sequences', () => {
    const attrs = mapAnthropicRequest({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [],
      stop_sequences: ['END', 'STOP'],
    } as MessageCreateParams);

    expect(attrs['gen_ai.request.stop_sequences']).toEqual(['END', 'STOP']);
  });

  it('should not map empty stop sequences', () => {
    const attrs = mapAnthropicRequest({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [],
      stop_sequences: [],
    } as MessageCreateParams);

    expect(attrs['gen_ai.request.stop_sequences']).toBeUndefined();
  });

  it('should set streaming flag', () => {
    const attrs = mapAnthropicRequest({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [],
      stream: true,
    } as MessageCreateParams);

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_STREAMING]).toBe(true);
  });

  it('should map tool names', () => {
    const attrs = mapAnthropicRequest({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [],
      tools: [
        { name: 'get_weather', description: '', input_schema: {} },
        { name: 'get_time', description: '', input_schema: {} },
      ],
    } as unknown as MessageCreateParams);

    expect(attrs['gen_ai.request.tool_names']).toEqual(['get_weather', 'get_time']);
  });

  it('should map metadata user_id', () => {
    const attrs = mapAnthropicRequest({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [],
      metadata: { user_id: 'user-456' },
    } as MessageCreateParams);

    expect(attrs['enduser.id']).toBe('user-456');
  });

  it('should omit undefined optional fields', () => {
    const attrs = mapAnthropicRequest({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [],
    } as MessageCreateParams);

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBeUndefined();
    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TOP_P]).toBeUndefined();
    expect(attrs['gen_ai.request.top_k']).toBeUndefined();
    expect(attrs['gen_ai.request.stop_sequences']).toBeUndefined();
    expect(attrs['enduser.id']).toBeUndefined();
  });
});

describe('mapAnthropicResponse', () => {
  it('should map response fields', () => {
    const attrs = mapAnthropicResponse({
      id: 'msg_abc123',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello!' }],
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 20 },
    } as unknown as Message);

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_MODEL]).toBe('claude-3-5-sonnet-20241022');
    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_ID]).toBe('msg_abc123');
    expect(attrs[GEN_AI_ATTRIBUTES.PROVIDER_NAME]).toBe('anthropic');
  });

  it('should map stop_reason end_turn to stop', () => {
    const attrs = mapAnthropicResponse({
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [],
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    } as unknown as Message);

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['stop']);
  });

  it('should map stop_reason stop_sequence to stop', () => {
    const attrs = mapAnthropicResponse({
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [],
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'stop_sequence',
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    } as unknown as Message);

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['stop']);
  });

  it('should map stop_reason max_tokens to length', () => {
    const attrs = mapAnthropicResponse({
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [],
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'max_tokens',
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    } as unknown as Message);

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['length']);
  });

  it('should map stop_reason tool_use to tool_calls', () => {
    const attrs = mapAnthropicResponse({
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [],
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'tool_use' as any,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    } as unknown as Message);

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['tool_calls']);
  });

  it('should pass through unknown stop reasons', () => {
    const attrs = mapAnthropicResponse({
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [],
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'some_unknown_reason' as any,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    } as unknown as Message);

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['some_unknown_reason']);
  });

  it('should handle null stop_reason', () => {
    const attrs = mapAnthropicResponse({
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [],
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    } as unknown as Message);

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toBeUndefined();
  });

  it('should map token usage', () => {
    const attrs = mapAnthropicResponse({
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [],
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 100, output_tokens: 50 },
    } as unknown as Message);

    expect(attrs[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS]).toBe(100);
    expect(attrs[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS]).toBe(50);
  });

  it('should handle missing usage', () => {
    const attrs = mapAnthropicResponse({
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [],
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'end_turn',
      stop_sequence: null,
    } as unknown as Message);

    expect(attrs[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS]).toBeUndefined();
    expect(attrs[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS]).toBeUndefined();
  });
});

describe('mapAnthropicError', () => {
  it('should map basic error fields', () => {
    const error = new Error('Rate limit exceeded');
    error.name = 'RateLimitError';

    const attrs = mapAnthropicError(error);

    expect(attrs['error.message']).toBe('Rate limit exceeded');
    expect(attrs['error.type']).toBe('RateLimitError');
  });

  it('should map HTTP status code', () => {
    const error = new Error('Forbidden');
    (error as any).status = 403;

    const attrs = mapAnthropicError(error);

    expect(attrs['http.status_code']).toBe(403);
  });

  it('should handle error without status', () => {
    const error = new Error('Something went wrong');

    const attrs = mapAnthropicError(error);

    expect(attrs['http.status_code']).toBeUndefined();
  });
});
