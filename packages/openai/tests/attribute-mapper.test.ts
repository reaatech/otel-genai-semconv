import { describe, expect, it } from 'vitest';
import { mapOpenAIRequest, mapOpenAIResponse } from '../src/index.js';

describe('OpenAI Attribute Mappers', () => {
  it('should map request attributes', () => {
    const attrs = mapOpenAIRequest({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 0.7,
      max_tokens: 500,
    });

    expect(attrs['gen_ai.request.model']).toBe('gpt-4');
    expect(attrs['gen_ai.request.temperature']).toBe(0.7);
    expect(attrs['gen_ai.request.max_tokens']).toBe(500);
    expect(attrs['gen_ai.provider.name']).toBe('openai');
  });

  it('should map response attributes', () => {
    const attrs = mapOpenAIResponse({
      id: 'chatcmpl-123',
      model: 'gpt-4-0613',
      object: 'chat.completion',
      created: 1234567890,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hello!', refusal: null },
          finish_reason: 'stop',
          logprobs: null,
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    });

    expect(attrs['gen_ai.response.id']).toBe('chatcmpl-123');
    expect(attrs['gen_ai.response.model']).toBe('gpt-4-0613');
    expect(attrs['gen_ai.usage.input_tokens']).toBe(10);
    expect(attrs['gen_ai.usage.output_tokens']).toBe(20);
  });
});
