/**
 * Unit tests for metrics
 */

import { describe, it, expect } from 'vitest';
import {
  initMetrics,
  createGenAIMeter,
  GENAI_METRICS,
} from '../../../src/observability/metrics.js';

describe('initMetrics', () => {
  it('should initialize MeterProvider with default config', () => {
    const meterProvider = initMetrics();
    expect(meterProvider).toBeDefined();
    expect(typeof meterProvider.getMeter).toBe('function');
  });

  it('should accept custom service name', () => {
    const meterProvider = initMetrics({ serviceName: 'my-service' });
    expect(meterProvider).toBeDefined();
  });

  it('should accept custom export interval', () => {
    const meterProvider = initMetrics({ exportIntervalMs: 30000 });
    expect(meterProvider).toBeDefined();
  });

  it('should create meter with correct service name', () => {
    const meterProvider = initMetrics({ serviceName: 'custom-service' });
    const meter = meterProvider.getMeter('otel-genai-semconv', '1.0.0');
    expect(meter).toBeDefined();
  });
});

describe('createGenAIMeter', () => {
  it('should create all expected metrics instruments', () => {
    const meterProvider = initMetrics();
    const genAIMeter = createGenAIMeter(meterProvider);

    expect(genAIMeter.requestsTotal).toBeDefined();
    expect(genAIMeter.requestDuration).toBeDefined();
    expect(genAIMeter.tokensInput).toBeDefined();
    expect(genAIMeter.tokensOutput).toBeDefined();
    expect(genAIMeter.costTotal).toBeDefined();
    expect(genAIMeter.errorsTotal).toBeDefined();
    expect(genAIMeter.streamingTTFT).toBeDefined();
  });

  it('should have add method on requestsTotal counter', () => {
    const meterProvider = initMetrics();
    const genAIMeter = createGenAIMeter(meterProvider);

    expect(typeof genAIMeter.requestsTotal.add).toBe('function');
  });

  it('should have record method on requestDuration histogram', () => {
    const meterProvider = initMetrics();
    const genAIMeter = createGenAIMeter(meterProvider);

    expect(typeof genAIMeter.requestDuration.record).toBe('function');
  });

  it('should have add method on tokensInput counter', () => {
    const meterProvider = initMetrics();
    const genAIMeter = createGenAIMeter(meterProvider);

    expect(typeof genAIMeter.tokensInput.add).toBe('function');
  });

  it('should have add method on tokensOutput counter', () => {
    const meterProvider = initMetrics();
    const genAIMeter = createGenAIMeter(meterProvider);

    expect(typeof genAIMeter.tokensOutput.add).toBe('function');
  });

  it('should have record method on costTotal histogram', () => {
    const meterProvider = initMetrics();
    const genAIMeter = createGenAIMeter(meterProvider);

    expect(typeof genAIMeter.costTotal.record).toBe('function');
  });

  it('should have add method on errorsTotal counter', () => {
    const meterProvider = initMetrics();
    const genAIMeter = createGenAIMeter(meterProvider);

    expect(typeof genAIMeter.errorsTotal.add).toBe('function');
  });

  it('should have record method on streamingTTFT histogram', () => {
    const meterProvider = initMetrics();
    const genAIMeter = createGenAIMeter(meterProvider);

    expect(typeof genAIMeter.streamingTTFT.record).toBe('function');
  });

  it('should record metrics with attributes', () => {
    const meterProvider = initMetrics();
    const genAIMeter = createGenAIMeter(meterProvider);

    expect(() => {
      genAIMeter.requestsTotal.add(1, { provider: 'openai', model: 'gpt-4', status: 'success' });
      genAIMeter.requestDuration.record(1234, { provider: 'openai', model: 'gpt-4' });
      genAIMeter.tokensInput.add(100, { provider: 'openai', model: 'gpt-4' });
      genAIMeter.tokensOutput.add(50, { provider: 'openai', model: 'gpt-4' });
      genAIMeter.costTotal.record(0.005, { provider: 'openai', model: 'gpt-4' });
      genAIMeter.errorsTotal.add(1, { provider: 'openai', error_type: 'rate_limit' });
      genAIMeter.streamingTTFT.record(500, { provider: 'openai', model: 'gpt-4' });
    }).not.toThrow();
  });
});

describe('GENAI_METRICS', () => {
  it('should have expected metric names', () => {
    expect(GENAI_METRICS.REQUESTS_TOTAL).toBe('genai.requests.total');
    expect(GENAI_METRICS.REQUEST_DURATION_MS).toBe('genai.request.duration_ms');
    expect(GENAI_METRICS.TOKENS_INPUT).toBe('genai.tokens.input');
    expect(GENAI_METRICS.TOKENS_OUTPUT).toBe('genai.tokens.output');
    expect(GENAI_METRICS.COST_TOTAL).toBe('genai.cost.total');
    expect(GENAI_METRICS.ERRORS_TOTAL).toBe('genai.errors.total');
    expect(GENAI_METRICS.STREAMING_TTFT_MS).toBe('genai.streaming.time_to_first_token_ms');
  });
});
