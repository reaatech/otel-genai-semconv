/**
 * Semconv compliance tests
 * Validates that span attributes, event names, and error types
 * conform to the OpenTelemetry GenAI semantic conventions.
 */

import { describe, it, expect } from 'vitest';
import {
  GEN_AI_ATTRIBUTES,
  COST_ATTRIBUTES,
  STREAMING_ATTRIBUTES,
  GEN_AI_EVENTS,
  FINISH_REASONS,
  ERROR_TYPES,
  OPERATIONS,
  SPAN_NAMES,
  PROVIDER_SYSTEMS,
  METRIC_NAMES,
} from '../../src/semconv/constants.js';

describe('Semconv Compliance', () => {
  describe('Attribute naming', () => {
    it('should follow gen_ai. prefix convention for request attributes', () => {
      expect(GEN_AI_ATTRIBUTES.REQUEST_MODEL).toBe('gen_ai.request.model');
      expect(GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE).toBe('gen_ai.request.temperature');
      expect(GEN_AI_ATTRIBUTES.REQUEST_TOP_P).toBe('gen_ai.request.top_p');
      expect(GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS).toBe('gen_ai.request.max_tokens');
      expect(GEN_AI_ATTRIBUTES.REQUEST_STREAMING).toBe('gen_ai.request.streaming');
    });

    it('should follow gen_ai. prefix convention for response attributes', () => {
      expect(GEN_AI_ATTRIBUTES.RESPONSE_MODEL).toBe('gen_ai.response.model');
      expect(GEN_AI_ATTRIBUTES.RESPONSE_ID).toBe('gen_ai.response.id');
      expect(GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS).toBe('gen_ai.response.finish_reasons');
    });

    it('should follow gen_ai. prefix convention for usage attributes', () => {
      expect(GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS).toBe('gen_ai.usage.input_tokens');
      expect(GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS).toBe('gen_ai.usage.output_tokens');
    });

    it('should follow llm. prefix convention for cost attributes', () => {
      expect(COST_ATTRIBUTES.TOTAL).toBe('llm.cost.total');
      expect(COST_ATTRIBUTES.INPUT).toBe('llm.cost.input');
      expect(COST_ATTRIBUTES.OUTPUT).toBe('llm.cost.output');
      expect(COST_ATTRIBUTES.CURRENCY).toBe('llm.cost.currency');
    });

    it('should follow gen_ai.streaming. prefix convention', () => {
      expect(STREAMING_ATTRIBUTES.TIME_TO_FIRST_TOKEN_MS).toBe(
        'gen_ai.streaming.time_to_first_token_ms',
      );
      expect(STREAMING_ATTRIBUTES.TOTAL_DURATION_MS).toBe('gen_ai.streaming.total_duration_ms');
      expect(STREAMING_ATTRIBUTES.CHUNK_COUNT).toBe('gen_ai.streaming.chunk_count');
    });
  });

  describe('Event naming', () => {
    it('should use gen_ai. prefix for all event names', () => {
      expect(GEN_AI_EVENTS.CHOICE).toBe('gen_ai.choice');
      expect(GEN_AI_EVENTS.SYSTEM_MESSAGE).toBe('gen_ai.system.message');
      expect(GEN_AI_EVENTS.USER_MESSAGE).toBe('gen_ai.user.message');
      expect(GEN_AI_EVENTS.ASSISTANT_MESSAGE).toBe('gen_ai.assistant.message');
      expect(GEN_AI_EVENTS.TOOL_CALL).toBe('gen_ai.tool.call');
      expect(GEN_AI_EVENTS.USAGE).toBe('gen_ai.usage');
    });
  });

  describe('Span names', () => {
    it('should map operations to standard span names', () => {
      expect(SPAN_NAMES[OPERATIONS.CHAT_COMPLETION]).toBe('gen_ai.chat.completion');
      expect(SPAN_NAMES[OPERATIONS.TEXT_COMPLETION]).toBe('gen_ai.text.completion');
      expect(SPAN_NAMES[OPERATIONS.EMBEDDING]).toBe('gen_ai.embedding');
      expect(SPAN_NAMES[OPERATIONS.IMAGE_GENERATION]).toBe('gen_ai.image.generation');
    });
  });

  describe('Finish reasons', () => {
    it('should have standard finish reason values', () => {
      expect(FINISH_REASONS.STOP).toBe('stop');
      expect(FINISH_REASONS.MAX_TOKENS).toBe('max_tokens');
      expect(FINISH_REASONS.CONTENT_FILTER).toBe('content_filter');
      expect(FINISH_REASONS.ERROR).toBe('error');
      expect(FINISH_REASONS.TOOL_CALLS).toBe('tool_calls');
      expect(FINISH_REASONS.LENGTH).toBe('length');
      expect(FINISH_REASONS.OTHER).toBe('other');
    });
  });

  describe('Error types', () => {
    it('should have standard error type values', () => {
      expect(ERROR_TYPES.RATE_LIMIT).toBe('rate_limit');
      expect(ERROR_TYPES.AUTHENTICATION).toBe('authentication');
      expect(ERROR_TYPES.INVALID_REQUEST).toBe('invalid_request');
      expect(ERROR_TYPES.SERVER_ERROR).toBe('server_error');
      expect(ERROR_TYPES.TIMEOUT).toBe('timeout');
      expect(ERROR_TYPES.CONTEXT_LENGTH).toBe('context_length');
      expect(ERROR_TYPES.MODEL_NOT_FOUND).toBe('model_not_found');
      expect(ERROR_TYPES.QUOTA_EXCEEDED).toBe('quota_exceeded');
      expect(ERROR_TYPES.UNKNOWN).toBe('unknown');
    });
  });

  describe('Provider systems', () => {
    it('should have standard provider system identifiers', () => {
      expect(PROVIDER_SYSTEMS.OPENAI).toBe('openai');
      expect(PROVIDER_SYSTEMS.ANTHROPIC).toBe('anthropic');
      expect(PROVIDER_SYSTEMS.VERTEX_AI).toBe('gcp.vertex_ai');
      expect(PROVIDER_SYSTEMS.BEDROCK).toBe('aws.bedrock');
    });
  });

  describe('Metric names', () => {
    it('should follow genai. prefix convention for metrics', () => {
      expect(METRIC_NAMES.REQUESTS_TOTAL).toBe('genai.requests.total');
      expect(METRIC_NAMES.REQUEST_DURATION_MS).toBe('genai.request.duration_ms');
      expect(METRIC_NAMES.TOKENS_INPUT).toBe('genai.tokens.input');
      expect(METRIC_NAMES.TOKENS_OUTPUT).toBe('genai.tokens.output');
      expect(METRIC_NAMES.COST_TOTAL).toBe('genai.cost.total');
      expect(METRIC_NAMES.ERRORS_TOTAL).toBe('genai.errors.total');
    });
  });

  describe('AttributeMapper semconv compliance', async () => {
    const { AttributeMapper } = await import('../../src/semconv/attribute-mapper.js');

    it('should map request attributes with correct semconv keys', () => {
      const mapper = new AttributeMapper('openai');
      const attrs = mapper.mapRequestAttributes({
        model: 'gpt-4',
        messages: [],
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
        streaming: false,
      });

      expect(attrs['gen_ai.request.model']).toBe('gpt-4');
      expect(attrs['gen_ai.request.temperature']).toBe(0.7);
      expect(attrs['gen_ai.request.max_tokens']).toBe(100);
      expect(attrs['gen_ai.request.top_p']).toBe(0.9);
      expect(attrs['gen_ai.request.streaming']).toBe(false);
    });

    it('should map response attributes with correct semconv keys', () => {
      const mapper = new AttributeMapper('openai');
      const attrs = mapper.mapResponseAttributes({
        id: 'chatcmpl-123',
        model: 'gpt-4',
        choices: [],
        finishReasons: ['stop'],
        usage: { inputTokens: 10, outputTokens: 20 },
      });

      expect(attrs['gen_ai.response.model']).toBe('gpt-4');
      expect(attrs['gen_ai.response.id']).toBe('chatcmpl-123');
      expect(attrs['gen_ai.response.finish_reasons']).toEqual(['stop']);
    });

    it('should map usage attributes with correct semconv keys', () => {
      const mapper = new AttributeMapper('openai');
      const attrs = mapper.mapUsageAttributes({
        inputTokens: 100,
        outputTokens: 50,
        cachedInputTokens: 25,
      });

      expect(attrs['gen_ai.usage.input_tokens']).toBe(100);
      expect(attrs['gen_ai.usage.output_tokens']).toBe(50);
      expect(attrs['gen_ai.usage.cached_input_tokens']).toBe(25);
    });

    it('should map cost attributes with correct semconv keys', () => {
      const mapper = new AttributeMapper('openai');
      const attrs = mapper.mapCostAttributes({
        total: 0.0045,
        input: 0.0015,
        output: 0.003,
        currency: 'USD',
      });

      expect(attrs['llm.cost.total']).toBe(0.0045);
      expect(attrs['llm.cost.input']).toBe(0.0015);
      expect(attrs['llm.cost.output']).toBe(0.003);
      expect(attrs['llm.cost.currency']).toBe('USD');
    });

    it('should map streaming attributes with correct semconv keys', () => {
      const mapper = new AttributeMapper('openai');
      const attrs = mapper.mapStreamingAttributes({
        timeToFirstTokenMs: 150,
        totalDurationMs: 2500,
        chunkCount: 42,
      });

      expect(attrs['gen_ai.streaming.time_to_first_token_ms']).toBe(150);
      expect(attrs['gen_ai.streaming.total_duration_ms']).toBe(2500);
      expect(attrs['gen_ai.streaming.chunk_count']).toBe(42);
    });

    it('should normalize provider-specific finish reasons to OTel standard', () => {
      const mapper = new AttributeMapper('openai');

      // OpenAI
      expect(mapper.mapFinishReason('stop')).toBe('stop');
      expect(mapper.mapFinishReason('length')).toBe('max_tokens');
      expect(mapper.mapFinishReason('content_filter')).toBe('content_filter');
      expect(mapper.mapFinishReason('function_call')).toBe('tool_calls');
      expect(mapper.mapFinishReason('tool_calls')).toBe('tool_calls');

      // Anthropic
      expect(mapper.mapFinishReason('end_turn')).toBe('stop');
      expect(mapper.mapFinishReason('stop_sequence')).toBe('stop');
      expect(mapper.mapFinishReason('max_tokens')).toBe('max_tokens');

      // Vertex AI
      expect(mapper.mapFinishReason('safety')).toBe('content_filter');
      expect(mapper.mapFinishReason('recitation')).toBe('content_filter');

      // Bedrock
      expect(mapper.mapFinishReason('end_turn')).toBe('stop');
      expect(mapper.mapFinishReason('tool_use')).toBe('tool_calls');

      // Unknown
      expect(mapper.mapFinishReason('something_else')).toBe('other');
      expect(mapper.mapFinishReason(null)).toBe('other');
    });
  });
});
