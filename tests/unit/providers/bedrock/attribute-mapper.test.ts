import { describe, it, expect } from 'vitest';
import {
  mapBedrockRequest,
  mapBedrockResponse,
  mapBedrockError,
} from '../../../../src/providers/bedrock/attribute-mapper.js';
import { GEN_AI_ATTRIBUTES } from '../../../../src/semconv/constants.js';

describe('mapBedrockRequest', () => {
  it('should map modelId and system', () => {
    const attrs = mapBedrockRequest(
      {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        body: '{}',
      },
      'anthropic.claude-3-sonnet-20240229-v1:0',
    );

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MODEL]).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
    expect(attrs[GEN_AI_ATTRIBUTES.PROVIDER_NAME]).toBe('aws.bedrock');
  });

  describe('anthropic model family', () => {
    it('should map anthropic request parameters', () => {
      const attrs = mapBedrockRequest(
        {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          body: JSON.stringify({
            max_tokens: 1024,
            temperature: 0.7,
            top_p: 0.95,
            top_k: 40,
            stop_sequences: ['END'],
          }),
        },
        'anthropic.claude-3-sonnet-20240229-v1:0',
      );

      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS]).toBe(1024);
      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBe(0.7);
      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TOP_P]).toBe(0.95);
      expect(attrs['gen_ai.request.top_k']).toBe(40);
      expect(attrs['gen_ai.request.stop_sequences']).toEqual(['END']);
    });
  });

  describe('amazon model family', () => {
    it('should map amazon titan request parameters', () => {
      const attrs = mapBedrockRequest(
        {
          modelId: 'amazon.titan-text-express-v1',
          body: JSON.stringify({
            maxTokenCount: 512,
            temperature: 0.5,
            topP: 0.9,
          }),
        },
        'amazon.titan-text-express-v1',
      );

      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS]).toBe(512);
      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBe(0.5);
      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TOP_P]).toBe(0.9);
    });
  });

  describe('cohere model family', () => {
    it('should map cohere request parameters', () => {
      const attrs = mapBedrockRequest(
        {
          modelId: 'cohere.command-text-v14',
          body: JSON.stringify({
            max_tokens: 1024,
            temperature: 0.8,
            p: 0.95,
            stop_sequences: ['STOP'],
          }),
        },
        'cohere.command-text-v14',
      );

      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS]).toBe(1024);
      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBe(0.8);
      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TOP_P]).toBe(0.95);
      expect(attrs['gen_ai.request.stop_sequences']).toEqual(['STOP']);
    });
  });

  describe('ai21 model family', () => {
    it('should map ai21 request parameters', () => {
      const attrs = mapBedrockRequest(
        {
          modelId: 'ai21.j2-ultra-v1',
          body: JSON.stringify({
            maxTokens: 2048,
            temperature: 0.6,
            topP: 0.9,
          }),
        },
        'ai21.j2-ultra-v1',
      );

      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS]).toBe(2048);
      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBe(0.6);
      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TOP_P]).toBe(0.9);
    });
  });

  it('should handle invalid JSON body gracefully', () => {
    const attrs = mapBedrockRequest(
      {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        body: 'not valid json',
      },
      'anthropic.claude-3-sonnet-20240229-v1:0',
    );

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MODEL]).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS]).toBeUndefined();
  });

  it('should handle empty body', () => {
    const attrs = mapBedrockRequest(
      {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        body: '{}',
      },
      'anthropic.claude-3-sonnet-20240229-v1:0',
    );

    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MODEL]).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBeUndefined();
  });
});

describe('mapBedrockResponse', () => {
  describe('anthropic model family', () => {
    it('should map anthropic response', () => {
      const attrs = mapBedrockResponse(
        JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
        'anthropic.claude-3-sonnet-20240229-v1:0',
      );

      expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_MODEL]).toBe('claude-3-sonnet-20240229');
      expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['stop']);
      expect(attrs[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS]).toBe(10);
      expect(attrs[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS]).toBe(20);
    });

    it('should map stop_reason max_tokens to length', () => {
      const attrs = mapBedrockResponse(
        JSON.stringify({
          stop_reason: 'max_tokens',
        }),
        'anthropic.claude-3-sonnet-20240229-v1:0',
      );

      expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['length']);
    });

    it('should map stop_reason tool_use to tool_calls', () => {
      const attrs = mapBedrockResponse(
        JSON.stringify({
          stop_reason: 'tool_use',
        }),
        'anthropic.claude-3-sonnet-20240229-v1:0',
      );

      expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['tool_calls']);
    });

    it('should default usage tokens to 0 when missing', () => {
      const attrs = mapBedrockResponse(
        JSON.stringify({
          usage: {},
        }),
        'anthropic.claude-3-sonnet-20240229-v1:0',
      );

      expect(attrs[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS]).toBe(0);
      expect(attrs[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS]).toBe(0);
    });
  });

  describe('amazon model family', () => {
    it('should map amazon titan response', () => {
      const attrs = mapBedrockResponse(
        JSON.stringify({
          inputTextTokenCount: 10,
          results: [{ tokenCount: 20 }],
          completionReason: 'FINISH_ON_STOP_SEQUENCE',
        }),
        'amazon.titan-text-express-v1',
      );

      expect(attrs[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS]).toBe(10);
      expect(attrs[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS]).toBe(20);
      expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['FINISH_ON_STOP_SEQUENCE']);
    });
  });

  describe('cohere model family', () => {
    it('should map cohere response', () => {
      const attrs = mapBedrockResponse(
        JSON.stringify({
          finish_reason: 'COMPLETE',
        }),
        'cohere.command-text-v14',
      );

      expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['COMPLETE']);
    });
  });

  describe('ai21 model family', () => {
    it('should map ai21 response', () => {
      const attrs = mapBedrockResponse(
        JSON.stringify({
          completions: [
            {
              data: { tokens: [{ token: 'Hello', logprob: 0 }] },
              finishReason: { reason: 'endoftext' },
            },
          ],
        }),
        'ai21.j2-ultra-v1',
      );

      expect(attrs[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS]).toBe(1);
      expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['endoftext']);
    });

    it('should handle empty completions', () => {
      const attrs = mapBedrockResponse(
        JSON.stringify({
          completions: [],
        }),
        'ai21.j2-ultra-v1',
      );

      expect(attrs[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS]).toBeUndefined();
      expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toBeUndefined();
    });
  });

  it('should handle invalid JSON body gracefully', () => {
    const attrs = mapBedrockResponse('not valid json', 'anthropic.claude-3-sonnet-20240229-v1:0');

    expect(attrs[GEN_AI_ATTRIBUTES.PROVIDER_NAME]).toBe('aws.bedrock');
    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_MODEL]).toBeUndefined();
  });

  it('should handle empty response body', () => {
    const attrs = mapBedrockResponse('{}', 'anthropic.claude-3-sonnet-20240229-v1:0');

    expect(attrs[GEN_AI_ATTRIBUTES.PROVIDER_NAME]).toBe('aws.bedrock');
  });

  it('should handle unknown model family', () => {
    const attrs = mapBedrockResponse('{}', 'unknown.model-v1');

    expect(attrs[GEN_AI_ATTRIBUTES.PROVIDER_NAME]).toBe('aws.bedrock');
  });
});

describe('mapBedrockError', () => {
  it('should map basic error fields', () => {
    const error = new Error('ThrottlingException');
    error.name = 'ThrottlingException';

    const attrs = mapBedrockError(error);

    expect(attrs['error.message']).toBe('ThrottlingException');
    expect(attrs['error.type']).toBe('ThrottlingException');
  });

  it('should map HTTP status code from metadata', () => {
    const error = new Error('Not found');
    (error as any).$metadata = { httpStatusCode: 404 };

    const attrs = mapBedrockError(error);

    expect(attrs['http.status_code']).toBe(404);
  });

  it('should handle error without metadata', () => {
    const error = new Error('Something went wrong');

    const attrs = mapBedrockError(error);

    expect(attrs['http.status_code']).toBeUndefined();
  });

  it('should handle error with undefined metadata', () => {
    const error = new Error('Something went wrong');
    (error as any).$metadata = undefined;

    const attrs = mapBedrockError(error);

    expect(attrs['http.status_code']).toBeUndefined();
  });
});
