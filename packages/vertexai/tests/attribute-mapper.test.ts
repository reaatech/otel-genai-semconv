import { describe, expect, it } from 'vitest';
import { mapVertexAIRequest } from '../src/index.js';

describe('Vertex AI Attribute Mappers', () => {
  it('should map request attributes', () => {
    const attrs = mapVertexAIRequest(
      {
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 500,
        },
      },
      'gemini-pro',
    );

    expect(attrs['gen_ai.request.model']).toBe('gemini-pro');
    expect(attrs['gen_ai.request.temperature']).toBe(0.7);
    expect(attrs['gen_ai.request.top_p']).toBe(0.9);
    expect(attrs['gen_ai.request.max_tokens']).toBe(500);
    expect(attrs['gen_ai.provider.name']).toBe('gcp.vertex_ai');
  });
});
