import { describe, it, expect } from 'vitest';
import { CostCalculator } from '../../../src/utils/cost-calculator.js';

describe('CostCalculator', () => {
  const calculator = new CostCalculator();

  describe('OpenAI pricing', () => {
    it('should calculate cost for GPT-4', () => {
      const cost = calculator.calculate({
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 1000,
        outputTokens: 500,
      });

      // GPT-4: $0.03/1K input, $0.06/1K output
      expect(cost.input).toBe(0.03);
      expect(cost.output).toBe(0.03);
      expect(cost.total).toBe(0.06);
      expect(cost.currency).toBe('USD');
    });

    it('should calculate cost for GPT-4 Turbo', () => {
      const cost = calculator.calculate({
        provider: 'openai',
        model: 'gpt-4-turbo',
        inputTokens: 1000,
        outputTokens: 500,
      });

      // GPT-4 Turbo: $0.01/1K input, $0.03/1K output
      expect(cost.input).toBe(0.01);
      expect(cost.output).toBe(0.015);
      expect(cost.total).toBe(0.025);
    });

    it('should calculate cost for GPT-3.5 Turbo', () => {
      const cost = calculator.calculate({
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        inputTokens: 1000,
        outputTokens: 500,
      });

      // GPT-3.5 Turbo: $0.0005/1K input, $0.0015/1K output
      expect(cost.input).toBe(0.0005);
      expect(cost.output).toBe(0.00075);
      expect(cost.total).toBe(0.00125);
    });
  });

  describe('Anthropic pricing', () => {
    it('should calculate cost for Claude Opus', () => {
      const cost = calculator.calculate({
        provider: 'anthropic',
        model: 'claude-3-opus',
        inputTokens: 1000,
        outputTokens: 500,
      });

      // Claude Opus: $0.015/1K input, $0.075/1K output
      expect(cost.input).toBe(0.015);
      expect(cost.output).toBe(0.0375);
      expect(cost.total).toBe(0.0525);
    });

    it('should calculate cost for Claude Sonnet', () => {
      const cost = calculator.calculate({
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        inputTokens: 1000,
        outputTokens: 500,
      });

      // Claude Sonnet: $0.003/1K input, $0.015/1K output
      expect(cost.input).toBe(0.003);
      expect(cost.output).toBe(0.0075);
      expect(cost.total).toBe(0.0105);
    });

    it('should calculate cost for Claude Haiku', () => {
      const cost = calculator.calculate({
        provider: 'anthropic',
        model: 'claude-3-haiku',
        inputTokens: 1000,
        outputTokens: 500,
      });

      // Claude Haiku: $0.00025/1K input, $0.00125/1K output
      expect(cost.input).toBe(0.00025);
      expect(cost.output).toBe(0.000625);
      expect(cost.total).toBe(0.000875);
    });
  });

  describe('Custom pricing', () => {
    it('should use custom pricing when provided', () => {
      const customCalculator = new CostCalculator({
        customPricing: {
          'custom-model': { input: 0.05, output: 0.1, provider: 'openai' },
        },
      });

      const cost = customCalculator.calculate({
        provider: 'openai',
        model: 'custom-model',
        inputTokens: 1000,
        outputTokens: 500,
      });

      expect(cost.input).toBe(0.05);
      expect(cost.output).toBe(0.05);
      expect(cost.total).toBe(0.1);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero tokens', () => {
      const cost = calculator.calculate({
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 0,
        outputTokens: 0,
      });

      expect(cost.total).toBe(0);
    });

    it('should handle unknown models with default pricing', () => {
      const cost = calculator.calculate({
        provider: 'openai',
        model: 'unknown-model',
        inputTokens: 1000,
        outputTokens: 500,
      });

      // Should use default pricing
      expect(cost.total).toBeGreaterThan(0);
    });
  });
});
