import { describe, it, expect } from 'vitest';
import { CostCalculator } from '../src/index.js';

describe('CostCalculator', () => {
  it('should calculate cost for known models', () => {
    const calculator = new CostCalculator();
    const cost = calculator.calculate({
      provider: 'openai',
      model: 'gpt-4',
      inputTokens: 1000,
      outputTokens: 500,
    });

    expect(cost.currency).toBe('USD');
    expect(cost.total).toBeGreaterThan(0);
    expect(cost.input).toBeGreaterThan(0);
    expect(cost.output).toBeGreaterThan(0);
  });

  it('should return zero for zero tokens', () => {
    const calculator = new CostCalculator();
    const cost = calculator.calculate({
      provider: 'openai',
      model: 'gpt-4',
      inputTokens: 0,
      outputTokens: 0,
    });

    expect(cost.total).toBe(0);
  });
});
