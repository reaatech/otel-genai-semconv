/**
 * Integration tests for otel-genai-semconv
 * Tests end-to-end instrumentation flow with mocked providers.
 */

import { describe, it, expect } from 'vitest';
import { AttributeMapper } from '../../src/semconv/attribute-mapper.js';
import { TokenCounter } from '../../src/utils/token-counter.js';
import { CostCalculator } from '../../src/utils/cost-calculator.js';
import { ErrorHandler, LLMErrorType } from '../../src/instrumentation/error-handler.js';
import { CircuitBreaker, CircuitState } from '../../src/instrumentation/circuit-breaker.js';
import { HookManager } from '../../src/instrumentation/hooks.js';
import { PIIRedactor } from '../../src/utils/pii-redactor.js';
import { GEN_AI_ATTRIBUTES, FINISH_REASONS } from '../../src/semconv/constants.js';

describe('Integration: End-to-end instrumentation flow', () => {
  describe('Full LLM call instrumentation', () => {
    it('should map request, response, usage, and cost in sequence', () => {
      const mapper = new AttributeMapper('openai');
      const calculator = new CostCalculator();
      const counter = new TokenCounter();

      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user' as const, content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 100,
      };

      const requestAttrs = mapper.mapRequestAttributes(request);
      expect(requestAttrs[GEN_AI_ATTRIBUTES.REQUEST_MODEL]).toBe('gpt-4');
      expect(requestAttrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE]).toBe(0.7);

      const response = {
        id: 'chatcmpl-123',
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: { role: 'assistant' as const, content: 'Hi!' },
            finishReason: 'stop',
          },
        ],
        finishReasons: ['stop'],
        usage: { inputTokens: 10, outputTokens: 5 },
      };

      const responseAttrs = mapper.mapResponseAttributes(response);
      expect(responseAttrs[GEN_AI_ATTRIBUTES.RESPONSE_ID]).toBe('chatcmpl-123');
      expect(responseAttrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(['stop']);

      const usageAttrs = mapper.mapUsageAttributes(response.usage);
      expect(usageAttrs[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS]).toBe(10);
      expect(usageAttrs[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS]).toBe(5);

      const cost = calculator.calculate({
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 10,
        outputTokens: 5,
      });
      expect(cost.total).toBeGreaterThan(0);
      expect(cost.currency).toBe('USD');

      const tokenCount = counter.countTokens('Hello');
      expect(tokenCount).toBeGreaterThan(0);
    });
  });

  describe('Error handling and recovery', () => {
    it('should classify error, determine retryability, and track in circuit breaker', () => {
      const errorHandler = new ErrorHandler();
      const circuitBreaker = new CircuitBreaker({ failureThreshold: 3 });

      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      const errorType = errorHandler.classifyError(rateLimitError);
      expect(errorType).toBe(LLMErrorType.RATE_LIMIT);
      expect(errorHandler.isRetryable(errorType)).toBe(true);

      circuitBreaker.recordFailure(errorType);
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      circuitBreaker.recordFailure(errorType);
      circuitBreaker.recordFailure(errorType);
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.canExecute()).toBe(false);
    });

    it('should not retry non-retryable errors', () => {
      const errorHandler = new ErrorHandler();
      const circuitBreaker = new CircuitBreaker({ failureThreshold: 3 });

      const authError = new Error('Invalid API key');
      (authError as any).status = 401;

      const errorType = errorHandler.classifyError(authError);
      expect(errorType).toBe(LLMErrorType.AUTHENTICATION);
      expect(errorHandler.isRetryable(errorType)).toBe(false);

      circuitBreaker.recordFailure(errorType);
      expect(circuitBreaker.getStats().totalFailures).toBe(0);
    });
  });

  describe('Hook lifecycle', () => {
    it('should execute hooks in order with correct context', () => {
      const hooks = new HookManager();
      const executed: string[] = [];

      hooks.onStart((ctx) => {
        expect(ctx.provider).toBe('openai');
        expect(ctx.model).toBe('gpt-4');
        executed.push('onStart');
      });

      hooks.onEnd((ctx) => {
        expect(ctx.response.id).toBe('chatcmpl-123');
        executed.push('onEnd');
      });

      hooks.onError((ctx) => {
        expect(ctx.error.message).toBe('test error');
        executed.push('onError');
      });

      const mockSpan = { setAttribute: () => {} };

      hooks.executeOnStart({
        span: mockSpan as any,
        provider: 'openai',
        model: 'gpt-4',
        request: { model: 'gpt-4', messages: [] },
      });

      hooks.executeOnEnd({
        span: mockSpan as any,
        provider: 'openai',
        model: 'gpt-4',
        response: {
          id: 'chatcmpl-123',
          model: 'gpt-4',
          choices: [],
          finishReasons: ['stop'],
          usage: { inputTokens: 10, outputTokens: 5 },
        },
      });

      hooks.executeOnError({
        span: mockSpan as any,
        provider: 'openai',
        model: 'gpt-4',
        error: new Error('test error'),
      });

      expect(executed).toEqual(['onStart', 'onEnd', 'onError']);
    });
  });

  describe('PII redaction in telemetry', () => {
    it('should redact PII from span attribute values', () => {
      const redactor = new PIIRedactor();

      const email = 'user@example.com';
      expect(redactor.containsPII(email)).toBe(true);

      const redacted = redactor.redact(`User email: ${email}`);
      expect(redacted).toBe('User email: [REDACTED_EMAIL]');

      const clean = redactor.redact('Hello world');
      expect(clean).toBe('Hello world');
    });
  });

  describe('Finish reason normalization across providers', () => {
    it('should normalize all provider finish reasons to OTel standard', () => {
      const mapper = new AttributeMapper('openai');

      expect(mapper.mapFinishReason('stop')).toBe(FINISH_REASONS.STOP);
      expect(mapper.mapFinishReason('end_turn')).toBe(FINISH_REASONS.STOP);

      expect(mapper.mapFinishReason('length')).toBe(FINISH_REASONS.MAX_TOKENS);
      expect(mapper.mapFinishReason('max_tokens')).toBe(FINISH_REASONS.MAX_TOKENS);

      expect(mapper.mapFinishReason('content_filter')).toBe(FINISH_REASONS.CONTENT_FILTER);
      expect(mapper.mapFinishReason('safety')).toBe(FINISH_REASONS.CONTENT_FILTER);

      expect(mapper.mapFinishReason('function_call')).toBe(FINISH_REASONS.TOOL_CALLS);
      expect(mapper.mapFinishReason('tool_calls')).toBe(FINISH_REASONS.TOOL_CALLS);
      expect(mapper.mapFinishReason('tool_use')).toBe(FINISH_REASONS.TOOL_CALLS);
    });
  });

  describe('Cost calculation accuracy', () => {
    it('should calculate costs correctly for all providers', () => {
      const calc = new CostCalculator();

      const openaiCost = calc.calculate({
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 1000,
        outputTokens: 1000,
      });
      expect(openaiCost.input).toBe(0.03);
      expect(openaiCost.output).toBe(0.06);

      const anthropicCost = calc.calculate({
        provider: 'anthropic',
        model: 'claude-3-opus',
        inputTokens: 1000,
        outputTokens: 1000,
      });
      expect(anthropicCost.input).toBe(0.015);
      expect(anthropicCost.output).toBe(0.075);

      const vertexCost = calc.calculate({
        provider: 'vertexai',
        model: 'gemini-pro',
        inputTokens: 1000,
        outputTokens: 1000,
      });
      expect(vertexCost.input).toBe(0.00025);
      expect(vertexCost.output).toBe(0.0005);

      const bedrockCost = calc.calculate({
        provider: 'bedrock',
        model: 'anthropic.claude-3-opus',
        inputTokens: 1000,
        outputTokens: 1000,
      });
      expect(bedrockCost.input).toBe(0.015);
      expect(bedrockCost.output).toBe(0.075);
    });
  });

  describe('Token counting', () => {
    it('should count tokens with caching', () => {
      const counter = new TokenCounter();

      const count1 = counter.countTokens('Hello world test');
      const count2 = counter.countTokens('Hello world test');

      expect(count1).toBe(count2);
      expect(count1).toBeGreaterThan(0);
    });

    it('should estimate tokens for different providers', () => {
      const openaiCounter = TokenCounter.forProvider('openai');
      const anthropicCounter = TokenCounter.forProvider('anthropic');

      const text = 'Hello world, this is a test message.';

      const openaiCount = openaiCounter.countTokens(text);
      const anthropicCount = anthropicCounter.countTokens(text);

      expect(openaiCount).toBeGreaterThan(0);
      expect(anthropicCount).toBeGreaterThan(0);
    });
  });
});
