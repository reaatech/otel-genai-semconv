/**
 * Unit tests for AttributeMapper
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AttributeMapper } from '../../../src/semconv/attribute-mapper.js';
import {
  GEN_AI_ATTRIBUTES,
  COST_ATTRIBUTES,
  STREAMING_ATTRIBUTES,
  FINISH_REASONS,
} from '../../../src/semconv/constants.js';

describe('AttributeMapper', () => {
  let mapper: AttributeMapper;

  beforeEach(() => {
    mapper = new AttributeMapper('openai');
  });

  describe('mapRequestAttributes', () => {
    it('should map basic request attributes', () => {
      const attrs = mapper.mapRequestAttributes({
        model: 'gpt-4-turbo',
        messages: [],
        temperature: 0.5,
        maxTokens: 2048,
        topP: 0.95,
      });

      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MODEL]).toBe('gpt-4-turbo');
      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBe(0.5);
      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS]).toBe(2048);
      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TOP_P]).toBe(0.95);
    });

    it('should include streaming flag when set', () => {
      const attrs = mapper.mapRequestAttributes({
        model: 'gpt-4',
        messages: [],
        streaming: true,
      });

      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_STREAMING]).toBe(true);
    });

    it('should map stop sequences as array', () => {
      const attrs = mapper.mapRequestAttributes({
        model: 'gpt-4',
        messages: [],
        stop: ['END', 'STOP'],
      });

      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_STOP_SEQUENCES]).toEqual(['END', 'STOP']);
    });

    it('should map single stop sequence as array', () => {
      const attrs = mapper.mapRequestAttributes({
        model: 'gpt-4',
        messages: [],
        stop: 'END',
      });

      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_STOP_SEQUENCES]).toEqual(['END']);
    });

    it('should map frequency and presence penalties', () => {
      const attrs = mapper.mapRequestAttributes({
        model: 'gpt-4',
        messages: [],
        frequencyPenalty: 0.5,
        presencePenalty: 0.3,
      });

      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_FREQUENCY_PENALTY]).toBe(0.5);
      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_PRESENCE_PENALTY]).toBe(0.3);
    });

    it('should map seed parameter', () => {
      const attrs = mapper.mapRequestAttributes({
        model: 'gpt-4',
        messages: [],
        seed: 42,
      });

      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_SEED]).toBe(42);
    });

    it('should map response format', () => {
      const attrs = mapper.mapRequestAttributes({
        model: 'gpt-4',
        messages: [],
        responseFormat: { type: 'json_object' },
      });

      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_RESPONSE_FORMAT]).toBe('json_object');
    });

    it('should omit undefined optional fields', () => {
      const attrs = mapper.mapRequestAttributes({
        model: 'gpt-4',
        messages: [],
      });

      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBeUndefined();
      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS]).toBeUndefined();
      expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_TOP_P]).toBeUndefined();
    });
  });

  describe('mapResponseAttributes', () => {
    it('should map response attributes', () => {
      const attrs = mapper.mapResponseAttributes({
        id: 'chatcmpl-abc123',
        model: 'gpt-4-0613',
        choices: [],
        finishReasons: ['stop'],
        usage: { inputTokens: 10, outputTokens: 20 },
      });

      expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_ID]).toBe('chatcmpl-abc123');
      expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_MODEL]).toBe('gpt-4-0613');
      expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['stop']);
    });
  });

  describe('mapUsageAttributes', () => {
    it('should map basic token usage', () => {
      const attrs = mapper.mapUsageAttributes({
        inputTokens: 100,
        outputTokens: 50,
      });

      expect(attrs[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS]).toBe(100);
      expect(attrs[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS]).toBe(50);
    });

    it('should include cached input tokens when present', () => {
      const attrs = mapper.mapUsageAttributes({
        inputTokens: 100,
        outputTokens: 50,
        cachedInputTokens: 25,
      });

      expect(attrs[GEN_AI_ATTRIBUTES.USAGE_CACHED_INPUT_TOKENS]).toBe(25);
    });
  });

  describe('mapCostAttributes', () => {
    it('should map cost data to cost attributes', () => {
      const attrs = mapper.mapCostAttributes({
        total: 0.005,
        input: 0.002,
        output: 0.003,
        currency: 'USD',
      });

      expect(attrs[COST_ATTRIBUTES.TOTAL]).toBe(0.005);
      expect(attrs[COST_ATTRIBUTES.INPUT]).toBe(0.002);
      expect(attrs[COST_ATTRIBUTES.OUTPUT]).toBe(0.003);
      expect(attrs[COST_ATTRIBUTES.CURRENCY]).toBe('USD');
    });
  });

  describe('mapStreamingAttributes', () => {
    it('should map streaming metrics', () => {
      const attrs = mapper.mapStreamingAttributes({
        timeToFirstTokenMs: 200,
        totalDurationMs: 3000,
        chunkCount: 50,
      });

      expect(attrs[STREAMING_ATTRIBUTES.TIME_TO_FIRST_TOKEN_MS]).toBe(200);
      expect(attrs[STREAMING_ATTRIBUTES.TOTAL_DURATION_MS]).toBe(3000);
      expect(attrs[STREAMING_ATTRIBUTES.CHUNK_COUNT]).toBe(50);
    });

    it('should handle partial streaming data', () => {
      const attrs = mapper.mapStreamingAttributes({
        timeToFirstTokenMs: 200,
      });

      expect(attrs[STREAMING_ATTRIBUTES.TIME_TO_FIRST_TOKEN_MS]).toBe(200);
      expect(attrs[STREAMING_ATTRIBUTES.TOTAL_DURATION_MS]).toBeUndefined();
      expect(attrs[STREAMING_ATTRIBUTES.CHUNK_COUNT]).toBeUndefined();
    });
  });

  describe('mapFinishReason', () => {
    it('should return standard finish reasons for known inputs', () => {
      expect(mapper.mapFinishReason('stop')).toBe(FINISH_REASONS.STOP);
      expect(mapper.mapFinishReason('length')).toBe(FINISH_REASONS.MAX_TOKENS);
      expect(mapper.mapFinishReason('content_filter')).toBe(FINISH_REASONS.CONTENT_FILTER);
    });

    it('should return OTHER for unknown reasons', () => {
      expect(mapper.mapFinishReason('unknown_reason')).toBe(FINISH_REASONS.OTHER);
    });

    it('should return OTHER for null/undefined', () => {
      expect(mapper.mapFinishReason(null)).toBe(FINISH_REASONS.OTHER);
    });
  });

  describe('mapAll', () => {
    it('should map all attributes from request and response', () => {
      const request = {
        model: 'gpt-4',
        messages: [] as Array<{ role: 'user'; content: string }>,
        temperature: 0.7,
        maxTokens: 100,
      };

      const response = {
        id: 'chatcmpl-123',
        model: 'gpt-4',
        choices: [] as Array<{
          index: number;
          message: { role: 'assistant'; content: string };
          finishReason: string;
        }>,
        finishReasons: ['stop'],
        usage: { inputTokens: 10, outputTokens: 20 },
      };

      const result = mapper.mapAll(request, response);

      expect(result.requestAttributes[GEN_AI_ATTRIBUTES.REQUEST_MODEL]).toBe('gpt-4');
      expect(result.responseAttributes[GEN_AI_ATTRIBUTES.RESPONSE_ID]).toBe('chatcmpl-123');
      expect(result.usageAttributes[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS]).toBe(10);
    });
  });

  describe('getProviderSystem', () => {
    it('should return correct system identifier for each provider', () => {
      expect(new AttributeMapper('openai').getProviderSystem()).toBe('openai');
      expect(new AttributeMapper('anthropic').getProviderSystem()).toBe('anthropic');
      expect(new AttributeMapper('vertexai').getProviderSystem()).toBe('gcp.vertex_ai');
      expect(new AttributeMapper('bedrock').getProviderSystem()).toBe('aws.bedrock');
    });
  });
});
