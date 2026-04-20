import { describe, it, expect } from 'vitest';
import {
  mapOpenAIRequest,
  mapOpenAIResponse,
  mapOpenAIError,
} from '../../../../src/providers/openai/attribute-mapper.js';
import { GEN_AI_ATTRIBUTES } from '../../../../src/semconv/constants.js';
import type { ChatCompletionCreateParams, ChatCompletion } from 'openai/resources/chat/completions';

describe('mapOpenAIRequest', () => {
  it('should map required fields', () => {
    const attrs = mapOpenAIRequest({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
    } as ChatCompletionCreateParams);

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MODEL]).toBe('gpt-4-turbo');
    expect(attrs[GEN_AI_ATTRIBUTES.PROVIDER_NAME]).toBe('openai');
  });

  it('should map optional sampling parameters', () => {
    const attrs = mapOpenAIRequest({
      model: 'gpt-4',
      messages: [],
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 1024,
    } as ChatCompletionCreateParams);

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBe(0.7);
    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TOP_P]).toBe(0.95);
    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS]).toBe(1024);
  });

  it('should map frequency and presence penalties', () => {
    const attrs = mapOpenAIRequest({
      model: 'gpt-4',
      messages: [],
      frequency_penalty: 0.3,
      presence_penalty: 0.5,
    } as ChatCompletionCreateParams);

    expect(attrs['gen_ai.request.frequency_penalty']).toBe(0.3);
    expect(attrs['gen_ai.request.presence_penalty']).toBe(0.5);
  });

  it('should map candidates_per_prompt', () => {
    const attrs = mapOpenAIRequest({
      model: 'gpt-4',
      messages: [],
      n: 3,
    } as ChatCompletionCreateParams);

    expect(attrs['gen_ai.request.candidates_per_prompt']).toBe(3);
  });

  it('should map seed', () => {
    const attrs = mapOpenAIRequest({
      model: 'gpt-4',
      messages: [],
      seed: 42,
    } as ChatCompletionCreateParams);

    expect(attrs['gen_ai.request.seed']).toBe(42);
  });

  it('should set streaming flag when stream is true', () => {
    const attrs = mapOpenAIRequest({
      model: 'gpt-4',
      messages: [],
      stream: true,
    } as ChatCompletionCreateParams);

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_STREAMING]).toBe(true);
  });

  it('should not set streaming flag when stream is false', () => {
    const attrs = mapOpenAIRequest({
      model: 'gpt-4',
      messages: [],
      stream: false,
    } as ChatCompletionCreateParams);

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_STREAMING]).toBeUndefined();
  });

  it('should map stop sequences', () => {
    const attrs = mapOpenAIRequest({
      model: 'gpt-4',
      messages: [],
      stop: ['END', 'STOP'],
    } as ChatCompletionCreateParams);

    expect(attrs['gen_ai.request.stop_sequences']).toEqual(['END', 'STOP']);
  });

  it('should not map stop when not an array', () => {
    const attrs = mapOpenAIRequest({
      model: 'gpt-4',
      messages: [],
      stop: 'END',
    } as ChatCompletionCreateParams);

    expect(attrs['gen_ai.request.stop_sequences']).toBeUndefined();
  });

  it('should map tool names', () => {
    const attrs = mapOpenAIRequest({
      model: 'gpt-4',
      messages: [],
      tools: [
        { type: 'function', function: { name: 'get_weather', description: '', parameters: {} } },
        { type: 'function', function: { name: 'get_time', description: '', parameters: {} } },
      ],
    } as ChatCompletionCreateParams);

    expect(attrs['gen_ai.request.tool_names']).toEqual(['get_weather', 'get_time']);
  });

  it('should map enduser.id', () => {
    const attrs = mapOpenAIRequest({
      model: 'gpt-4',
      messages: [],
      user: 'user-123',
    } as ChatCompletionCreateParams);

    expect(attrs['enduser.id']).toBe('user-123');
  });

  it('should omit undefined optional fields', () => {
    const attrs = mapOpenAIRequest({
      model: 'gpt-4',
      messages: [],
    } as ChatCompletionCreateParams);

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBeUndefined();
    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TOP_P]).toBeUndefined();
    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS]).toBeUndefined();
    expect(attrs['gen_ai.request.stop_sequences']).toBeUndefined();
    expect(attrs['gen_ai.request.tool_names']).toBeUndefined();
    expect(attrs['enduser.id']).toBeUndefined();
  });
});

describe('mapOpenAIResponse', () => {
  it('should map response fields', () => {
    const attrs = mapOpenAIResponse({
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
    } as unknown as ChatCompletion);

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_MODEL]).toBe('gpt-4-turbo-2024-04-09');
    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_ID]).toBe('chatcmpl-abc123');
    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['stop']);
    expect(attrs[GEN_AI_ATTRIBUTES.PROVIDER_NAME]).toBe('openai');
  });

  it('should map token usage', () => {
    const attrs = mapOpenAIResponse({
      id: 'chatcmpl-123',
      model: 'gpt-4',
      choices: [],
      created: 1234567890,
      object: 'chat.completion',
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    } as unknown as ChatCompletion);

    expect(attrs[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS]).toBe(100);
    expect(attrs[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS]).toBe(50);
  });

  it('should map created timestamp', () => {
    const attrs = mapOpenAIResponse({
      id: 'chatcmpl-123',
      model: 'gpt-4',
      choices: [],
      created: 1234567890,
      object: 'chat.completion',
    } as unknown as ChatCompletion);

    expect(attrs['gen_ai.response.created']).toBe(1234567890);
  });

  it('should map service tier', () => {
    const attrs = mapOpenAIResponse({
      id: 'chatcmpl-123',
      model: 'gpt-4',
      choices: [],
      service_tier: 'flex',
      object: 'chat.completion',
    } as unknown as ChatCompletion);

    expect(attrs['gen_ai.response.service_tier']).toBe('flex');
  });

  it('should map multiple finish reasons', () => {
    const attrs = mapOpenAIResponse({
      id: 'chatcmpl-123',
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'A', refusal: null },
          finish_reason: 'stop',
        },
        {
          index: 1,
          message: { role: 'assistant', content: 'B', refusal: null },
          finish_reason: 'length',
        },
      ],
      created: 1234567890,
      object: 'chat.completion',
    } as unknown as ChatCompletion);

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['stop', 'length']);
  });

  it('should map unknown finish reason when null', () => {
    const attrs = mapOpenAIResponse({
      id: 'chatcmpl-123',
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hi', refusal: null },
          finish_reason: null as unknown as 'stop',
        },
      ],
      created: 1234567890,
      object: 'chat.completion',
    } as unknown as ChatCompletion);

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['unknown']);
  });

  it('should handle missing usage', () => {
    const attrs = mapOpenAIResponse({
      id: 'chatcmpl-123',
      model: 'gpt-4',
      choices: [],
      created: 1234567890,
      object: 'chat.completion',
    } as unknown as ChatCompletion);

    expect(attrs[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS]).toBeUndefined();
    expect(attrs[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS]).toBeUndefined();
  });

  it('should handle missing optional fields', () => {
    const attrs = mapOpenAIResponse({
      id: 'chatcmpl-123',
      model: 'gpt-4',
      choices: [],
      created: 1234567890,
      object: 'chat.completion',
    } as unknown as ChatCompletion);

    expect(attrs['gen_ai.response.created']).toBe(1234567890);
    expect(attrs['gen_ai.response.service_tier']).toBeUndefined();
  });
});

describe('mapOpenAIError', () => {
  it('should map basic error fields', () => {
    const error = new Error('Rate limit exceeded');
    error.name = 'APIError';

    const attrs = mapOpenAIError(error);

    expect(attrs['error.message']).toBe('Rate limit exceeded');
    expect(attrs['error.type']).toBe('APIError');
  });

  it('should map HTTP status code', () => {
    const error = new Error('Not found');
    (error as any).status = 404;

    const attrs = mapOpenAIError(error);

    expect(attrs['http.status_code']).toBe(404);
  });

  it('should map error code', () => {
    const error = new Error('Invalid API key');
    (error as any).code = 'invalid_api_key';

    const attrs = mapOpenAIError(error);

    expect(attrs['error.code']).toBe('invalid_api_key');
  });

  it('should handle error without status or code', () => {
    const error = new Error('Something went wrong');

    const attrs = mapOpenAIError(error);

    expect(attrs['http.status_code']).toBeUndefined();
    expect(attrs['error.code']).toBeUndefined();
  });
});
