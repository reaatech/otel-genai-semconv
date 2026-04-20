/**
 * Unit tests for CircuitBreaker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  createCircuitBreaker,
  createCircuitBreakerRegistry,
  CircuitState,
} from '../../../src/instrumentation/circuit-breaker.js';
import { LLMErrorType } from '../../../src/instrumentation/error-handler.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      recoveryTimeoutMs: 100,
    });
  });

  describe('getState', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(LLMErrorType.RATE_LIMIT);
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      await new Promise((r) => setTimeout(r, 150));
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });
  });

  describe('canExecute', () => {
    it('should allow execution when closed', () => {
      expect(breaker.canExecute()).toBe(true);
    });

    it('should block execution when open', () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(LLMErrorType.RATE_LIMIT);
      }
      expect(breaker.canExecute()).toBe(false);
    });
  });

  describe('recordSuccess', () => {
    it('should increment success counters', () => {
      breaker.recordSuccess();
      const stats = breaker.getStats();
      expect(stats.totalSuccesses).toBe(1);
      expect(stats.totalRequests).toBe(1);
      expect(stats.consecutiveSuccesses).toBe(1);
    });

    it('should reset consecutive failures', () => {
      breaker.recordFailure(LLMErrorType.RATE_LIMIT);
      breaker.recordSuccess();
      const stats = breaker.getStats();
      expect(stats.consecutiveFailures).toBe(0);
      expect(stats.consecutiveSuccesses).toBe(1);
    });

    it('should close circuit from half-open after threshold', async () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(LLMErrorType.RATE_LIMIT);
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      await new Promise((r) => setTimeout(r, 150));
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      breaker.recordSuccess();
      breaker.recordSuccess();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('recordFailure', () => {
    it('should increment failure counters', () => {
      breaker.recordFailure(LLMErrorType.RATE_LIMIT);
      const stats = breaker.getStats();
      expect(stats.totalFailures).toBe(1);
      expect(stats.consecutiveFailures).toBe(1);
    });

    it('should reset consecutive successes', () => {
      breaker.recordSuccess();
      breaker.recordFailure(LLMErrorType.RATE_LIMIT);
      const stats = breaker.getStats();
      expect(stats.consecutiveSuccesses).toBe(0);
      expect(stats.consecutiveFailures).toBe(1);
    });

    it('should open circuit after threshold', () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(LLMErrorType.RATE_LIMIT);
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should reopen circuit from half-open on failure', async () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(LLMErrorType.RATE_LIMIT);
      }

      await new Promise((r) => setTimeout(r, 150));
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      breaker.recordFailure(LLMErrorType.RATE_LIMIT);
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should not count non-tracked error types', () => {
      const freshBreaker = new CircuitBreaker({ failureThreshold: 3 });
      freshBreaker.recordFailure(LLMErrorType.INVALID_REQUEST);
      const stats = freshBreaker.getStats();
      expect(stats.totalFailures).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return current statistics', () => {
      breaker.recordSuccess();
      breaker.recordFailure(LLMErrorType.RATE_LIMIT);

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.totalSuccesses).toBe(1);
      expect(stats.totalFailures).toBe(1);
      expect(stats.state).toBe(CircuitState.CLOSED);
    });
  });

  describe('reset', () => {
    it('should reset all counters', () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(LLMErrorType.RATE_LIMIT);
      }
      breaker.reset();

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalFailures).toBe(0);
      expect(stats.state).toBe(CircuitState.CLOSED);
    });
  });
});

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = new CircuitBreakerRegistry({ failureThreshold: 3 });
  });

  describe('get', () => {
    it('should create and return circuit breaker for provider', () => {
      const breaker1 = registry.get('openai');
      const breaker2 = registry.get('openai');
      expect(breaker1).toBe(breaker2);
    });

    it('should create separate breakers for different providers', () => {
      const openai = registry.get('openai');
      const anthropic = registry.get('anthropic');
      expect(openai).not.toBe(anthropic);
    });
  });

  describe('getAll', () => {
    it('should return all registered breakers', () => {
      registry.get('openai');
      registry.get('anthropic');

      const all = registry.getAll();
      expect(all.size).toBe(2);
      expect(all.has('openai')).toBe(true);
      expect(all.has('anthropic')).toBe(true);
    });
  });

  describe('getAllStats', () => {
    it('should return stats for all providers', () => {
      const openai = registry.get('openai');
      openai.recordSuccess();

      const anthropic = registry.get('anthropic');
      anthropic.recordFailure(LLMErrorType.RATE_LIMIT);

      const stats = registry.getAllStats();
      expect(stats.size).toBe(2);
      expect(stats.get('openai')?.totalSuccesses).toBe(1);
      expect(stats.get('anthropic')?.totalFailures).toBe(1);
    });
  });

  describe('resetAll', () => {
    it('should reset all circuit breakers', () => {
      const openai = registry.get('openai');
      openai.recordFailure(LLMErrorType.RATE_LIMIT);

      registry.resetAll();

      expect(openai.getStats().totalFailures).toBe(0);
    });
  });
});

describe('factory functions', () => {
  it('should create circuit breaker via factory', () => {
    const breaker = createCircuitBreaker();
    expect(breaker).toBeInstanceOf(CircuitBreaker);
  });

  it('should create registry via factory', () => {
    const registry = createCircuitBreakerRegistry();
    expect(registry).toBeInstanceOf(CircuitBreakerRegistry);
  });
});
