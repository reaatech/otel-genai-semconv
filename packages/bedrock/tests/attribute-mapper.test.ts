import { describe, expect, it } from 'vitest';
import { mapBedrockRequest, mapBedrockResponse } from '../src/index.js';

describe('Bedrock Attribute Mappers', () => {
  it('should map request attributes for anthropic family', () => {
    const attrs = mapBedrockRequest(
      {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        body: JSON.stringify({ max_tokens: 200, temperature: 0.7 }),
      },
      'anthropic.claude-3-sonnet-20240229-v1:0',
    );

    expect(attrs['gen_ai.request.model']).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
    expect(attrs['gen_ai.request.max_tokens']).toBe(200);
    expect(attrs['gen_ai.request.temperature']).toBe(0.7);
    expect(attrs['gen_ai.provider.name']).toBe('aws.bedrock');
  });

  it('should map response attributes for anthropic family', () => {
    const attrs = mapBedrockResponse(
      JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 20 },
      }),
      'anthropic.claude-3-sonnet-20240229-v1:0',
    );

    expect(attrs['gen_ai.response.model']).toBe('claude-3-sonnet-20240229');
    expect(attrs['gen_ai.usage.input_tokens']).toBe(10);
    expect(attrs['gen_ai.usage.output_tokens']).toBe(20);
    expect(attrs['gen_ai.response.finish_reasons']).toEqual(['stop']);
  });
});
