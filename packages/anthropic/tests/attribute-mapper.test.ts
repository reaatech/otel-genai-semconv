import { describe, expect, it } from 'vitest';
import { mapAnthropicRequest, mapAnthropicResponse } from '../src/index.js';

describe('Anthropic Attribute Mappers', () => {
  it('should map request attributes', () => {
    const attrs = mapAnthropicRequest({
      model: 'claude-3-opus-20240229',
      max_tokens: 200,
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(attrs['gen_ai.request.model']).toBe('claude-3-opus-20240229');
    expect(attrs['gen_ai.request.max_tokens']).toBe(200);
    expect(attrs['gen_ai.provider.name']).toBe('anthropic');
  });

  it('should map response attributes', () => {
    const attrs = mapAnthropicResponse({
      id: 'msg_123',
      model: 'claude-3-opus-20240229',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello!' }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    expect(attrs['gen_ai.response.id']).toBe('msg_123');
    expect(attrs['gen_ai.response.model']).toBe('claude-3-opus-20240229');
    expect(attrs['gen_ai.usage.input_tokens']).toBe(10);
    expect(attrs['gen_ai.usage.output_tokens']).toBe(20);
  });
});
