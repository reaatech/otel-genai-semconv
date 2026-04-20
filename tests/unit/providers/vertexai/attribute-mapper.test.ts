import { describe, it, expect } from 'vitest';
import {
  mapVertexAIRequest,
  mapVertexAIResponse,
  mapVertexAIError,
} from '../../../../src/providers/vertexai/attribute-mapper.js';
import { GEN_AI_ATTRIBUTES } from '../../../../src/semconv/constants.js';

describe('mapVertexAIRequest', () => {
  it('should map model and system', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      },
      'gemini-1.5-pro',
    );

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MODEL]).toBe('gemini-1.5-pro');
    expect(attrs[GEN_AI_ATTRIBUTES.PROVIDER_NAME]).toBe('gcp.vertex_ai');
  });

  it('should map temperature', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [],
        generationConfig: { temperature: 0.7 },
      },
      'gemini-1.5-pro',
    );

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBe(0.7);
  });

  it('should map topP', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [],
        generationConfig: { topP: 0.95 },
      },
      'gemini-1.5-pro',
    );

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TOP_P]).toBe(0.95);
  });

  it('should map topK', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [],
        generationConfig: { topK: 40 },
      },
      'gemini-1.5-pro',
    );

    expect(attrs['gen_ai.request.top_k']).toBe(40);
  });

  it('should map maxOutputTokens', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [],
        generationConfig: { maxOutputTokens: 2048 },
      },
      'gemini-1.5-pro',
    );

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS]).toBe(2048);
  });

  it('should map stopSequences', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [],
        generationConfig: { stopSequences: ['END', 'STOP'] },
      },
      'gemini-1.5-pro',
    );

    expect(attrs['gen_ai.request.stop_sequences']).toEqual(['END', 'STOP']);
  });

  it('should map candidateCount', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [],
        generationConfig: { candidateCount: 3 },
      },
      'gemini-1.5-pro',
    );

    expect(attrs['gen_ai.request.candidates_per_prompt']).toBe(3);
  });

  it('should map presencePenalty', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [],
        generationConfig: { presencePenalty: 0.3 },
      },
      'gemini-1.5-pro',
    );

    expect(attrs['gen_ai.request.presence_penalty']).toBe(0.3);
  });

  it('should map frequencyPenalty', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [],
        generationConfig: { frequencyPenalty: 0.5 },
      },
      'gemini-1.5-pro',
    );

    expect(attrs['gen_ai.request.frequency_penalty']).toBe(0.5);
  });

  it('should map tool names', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [],
        tools: [
          { functionDeclarations: [{ name: 'get_weather' }] },
          { functionDeclarations: [{ name: 'get_time' }] },
        ],
      },
      'gemini-1.5-pro',
    );

    expect(attrs['gen_ai.request.tool_names']).toEqual(['get_weather', 'get_time']);
  });

  it('should not map tool_names when tools array is empty', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [],
        tools: [],
      },
      'gemini-1.5-pro',
    );

    expect(attrs['gen_ai.request.tool_names']).toBeUndefined();
  });

  it('should not map tool_names when functionDeclarations is empty', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [],
        tools: [{ functionDeclarations: [] }],
      },
      'gemini-1.5-pro',
    );

    expect(attrs['gen_ai.request.tool_names']).toBeUndefined();
  });

  it('should handle request without generationConfig', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [],
      },
      'gemini-1.5-pro',
    );

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBeUndefined();
    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TOP_P]).toBeUndefined();
    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS]).toBeUndefined();
  });

  it('should handle undefined generationConfig fields', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [],
        generationConfig: {},
      },
      'gemini-1.5-pro',
    );

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBeUndefined();
    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TOP_P]).toBeUndefined();
  });
});

describe('mapVertexAIResponse', () => {
  it('should map system', () => {
    const attrs = mapVertexAIResponse({});

    expect(attrs[GEN_AI_ATTRIBUTES.PROVIDER_NAME]).toBe('gcp.vertex_ai');
  });

  it('should map modelVersion', () => {
    const attrs = mapVertexAIResponse({
      modelVersion: 'gemini-1.5-pro-001',
    });

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_MODEL]).toBe('gemini-1.5-pro-001');
  });

  it('should map finish reason STOP to stop', () => {
    const attrs = mapVertexAIResponse({
      candidates: [{ finishReason: 'STOP' }],
    });

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['stop']);
  });

  it('should map finish reason MAX_TOKENS to length', () => {
    const attrs = mapVertexAIResponse({
      candidates: [{ finishReason: 'MAX_TOKENS' }],
    });

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['length']);
  });

  it('should map finish reason SAFETY to content_filter', () => {
    const attrs = mapVertexAIResponse({
      candidates: [{ finishReason: 'SAFETY' }],
    });

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['content_filter']);
  });

  it('should map finish reason RECITATION to content_filter', () => {
    const attrs = mapVertexAIResponse({
      candidates: [{ finishReason: 'RECITATION' }],
    });

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['content_filter']);
  });

  it('should map finish reason OTHER to unknown', () => {
    const attrs = mapVertexAIResponse({
      candidates: [{ finishReason: 'OTHER' }],
    });

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['unknown']);
  });

  it('should map finish reason UNKNOWN to unknown', () => {
    const attrs = mapVertexAIResponse({
      candidates: [{ finishReason: 'UNKNOWN' }],
    });

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['unknown']);
  });

  it('should map multiple finish reasons', () => {
    const attrs = mapVertexAIResponse({
      candidates: [{ finishReason: 'STOP' }, { finishReason: 'MAX_TOKENS' }],
    });

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['stop', 'length']);
  });

  it('should filter out null finish reasons', () => {
    const attrs = mapVertexAIResponse({
      candidates: [{ finishReason: null }],
    });

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toBeUndefined();
  });

  it('should handle empty candidates', () => {
    const attrs = mapVertexAIResponse({
      candidates: [],
    });

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toBeUndefined();
  });

  it('should handle missing modelVersion', () => {
    const attrs = mapVertexAIResponse({});

    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_MODEL]).toBeUndefined();
  });
});

describe('mapVertexAIError', () => {
  it('should map basic error fields', () => {
    const error = new Error('Resource not found');
    error.name = 'NotFoundError';

    const attrs = mapVertexAIError(error);

    expect(attrs['error.message']).toBe('Resource not found');
    expect(attrs['error.type']).toBe('NotFoundError');
  });

  it('should map error code to http.status_code', () => {
    const error = new Error('Not found');
    (error as any).code = 404;

    const attrs = mapVertexAIError(error);

    expect(attrs['http.status_code']).toBe(404);
  });

  it('should handle error without code', () => {
    const error = new Error('Something went wrong');

    const attrs = mapVertexAIError(error);

    expect(attrs['http.status_code']).toBeUndefined();
  });
});
