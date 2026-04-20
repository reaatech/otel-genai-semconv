/**
 * Unit tests for RetryHandler
 */

import { describe, it, expect, vi } from 'vitest';
import {
  RetryHandler,
  createRetryHandler,
  RetryConfig,
} from '../../../src/instrumentation/retry-handler.js';
import { LLMErrorType } from '../../../src/instrumentation/error-handler.js';

describe('RetryHandler', () => {
  describe('constructor', () => {
    it('should use default config', () => {
      const handler = new RetryHandler();
      expect(handler).toBeInstanceOf(RetryHandler);
      expect(handler.canRetry()).toBe(true);
    });

    it('should accept custom config', () => {
      const config: RetryConfig = {
        maxRetries: 5,
        initialDelayMs: 500,
        maxDelayMs: 10000,
        backoffMultiplier: 3,
        jitter: false,
        retryableErrorTypes: [LLMErrorType.RATE_LIMIT],
      };
      const h = new RetryHandler(config);
      expect(h).toBeInstanceOf(RetryHandler);
    });
  });

  describe('shouldRetry', () => {
    it('should return true for rate limit by default', () => {
      const handler = new RetryHandler();
      expect(handler.shouldRetry(LLMErrorType.RATE_LIMIT)).toBe(true);
    });

    it('should return true for timeout by default', () => {
      const handler = new RetryHandler();
      expect(handler.shouldRetry(LLMErrorType.TIMEOUT)).toBe(true);
    });

    it('should return true for network by default', () => {
      const handler = new RetryHandler();
      expect(handler.shouldRetry(LLMErrorType.NETWORK)).toBe(true);
    });

    it('should return true for server by default', () => {
      const handler = new RetryHandler();
      expect(handler.shouldRetry(LLMErrorType.SERVER)).toBe(true);
    });

    it('should return false for authentication by default', () => {
      const handler = new RetryHandler();
      expect(handler.shouldRetry(LLMErrorType.AUTHENTICATION)).toBe(false);
    });

    it('should return false for invalid request by default', () => {
      const handler = new RetryHandler();
      expect(handler.shouldRetry(LLMErrorType.INVALID_REQUEST)).toBe(false);
    });

    it('should respect custom retryable error types', () => {
      const h = new RetryHandler({
        retryableErrorTypes: [LLMErrorType.NOT_FOUND],
      });
      expect(h.shouldRetry(LLMErrorType.NOT_FOUND)).toBe(true);
      expect(h.shouldRetry(LLMErrorType.RATE_LIMIT)).toBe(false);
    });
  });

  describe('canRetry', () => {
    it('should return true initially', () => {
      const handler = new RetryHandler();
      expect(handler.canRetry()).toBe(true);
    });

    it('should return false after max retries exceeded', () => {
      const h = new RetryHandler({ maxRetries: 2 });
      h.recordAttempt(100);
      h.recordAttempt(200);
      h.recordAttempt(400);
      expect(h.canRetry()).toBe(false);
    });

    it('should return true when under max retries', () => {
      const h = new RetryHandler({ maxRetries: 3 });
      h.recordAttempt(100);
      h.recordAttempt(200);
      h.recordAttempt(400);
      expect(h.canRetry()).toBe(true);
    });
  });

  describe('getCurrentAttempt', () => {
    it('should return 0 initially', () => {
      const handler = new RetryHandler();
      expect(handler.getCurrentAttempt()).toBe(0);
    });

    it('should increment after each recorded attempt', () => {
      const handler = new RetryHandler();
      handler.recordAttempt(100);
      expect(handler.getCurrentAttempt()).toBe(1);

      handler.recordAttempt(200);
      expect(handler.getCurrentAttempt()).toBe(2);
    });
  });

  describe('calculateDelay', () => {
    it('should return initial delay for first retry', () => {
      const h = new RetryHandler({ initialDelayMs: 1000, jitter: false });
      expect(h.calculateDelay()).toBe(1000);
    });

    it('should apply exponential backoff', () => {
      const h = new RetryHandler({
        initialDelayMs: 1000,
        maxDelayMs: 60000,
        backoffMultiplier: 2,
        jitter: false,
      });
      h.recordAttempt(100);
      expect(h.calculateDelay()).toBe(2000);

      h.recordAttempt(200);
      expect(h.calculateDelay()).toBe(4000);

      h.recordAttempt(400);
      expect(h.calculateDelay()).toBe(8000);
    });

    it('should cap at max delay', () => {
      const h = new RetryHandler({
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
        jitter: false,
      });
      h.recordAttempt(100);
      h.recordAttempt(200);
      h.recordAttempt(400);
      h.recordAttempt(800);
      expect(h.calculateDelay()).toBe(5000);
    });

    it('should add jitter when enabled', () => {
      const h = new RetryHandler({
        initialDelayMs: 1000,
        jitter: true,
      });
      const delay = h.calculateDelay();
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThan(1250);
    });

    it('should not add jitter when disabled', () => {
      const h = new RetryHandler({
        initialDelayMs: 1000,
        jitter: false,
      });
      expect(h.calculateDelay()).toBe(1000);
    });
  });

  describe('recordAttempt', () => {
    it('should record attempt with metadata', () => {
      const handler = new RetryHandler();
      const error = new Error('Rate limited');
      const attempt = handler.recordAttempt(1500, error, LLMErrorType.RATE_LIMIT);

      expect(attempt.attempt).toBe(0);
      expect(attempt.delayMs).toBe(1500);
      expect(attempt.error).toBe(error);
      expect(attempt.errorType).toBe(LLMErrorType.RATE_LIMIT);
      expect(attempt.timestamp).toBeDefined();
    });
  });

  describe('getTotalDelay', () => {
    it('should return 0 when no attempts', () => {
      const handler = new RetryHandler();
      expect(handler.getTotalDelay()).toBe(0);
    });

    it('should sum all delays', () => {
      const handler = new RetryHandler();
      handler.recordAttempt(100);
      handler.recordAttempt(200);
      handler.recordAttempt(400);
      expect(handler.getTotalDelay()).toBe(700);
    });
  });

  describe('getAttempts', () => {
    it('should return empty array initially', () => {
      const handler = new RetryHandler();
      expect(handler.getAttempts()).toEqual([]);
    });

    it('should return copy of attempts', () => {
      const handler = new RetryHandler();
      handler.recordAttempt(100);
      const attempts1 = handler.getAttempts();
      const attempts2 = handler.getAttempts();

      expect(attempts1).toEqual(attempts2);
      expect(attempts1).not.toBe(attempts2);
    });
  });

  describe('reset', () => {
    it('should clear all attempts', () => {
      const handler = new RetryHandler();
      handler.recordAttempt(100);
      handler.recordAttempt(200);
      expect(handler.getAttempts()).toHaveLength(2);

      handler.reset();
      expect(handler.getAttempts()).toHaveLength(0);
      expect(handler.getCurrentAttempt()).toBe(0);
      expect(handler.getTotalDelay()).toBe(0);
    });
  });

  describe('executeWithRetry', () => {
    it('should execute function and return result on success', async () => {
      const handler = new RetryHandler();
      const fn = vi.fn(async () => {
        return 'success';
      });

      const result = await handler.executeWithRetry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const h = new RetryHandler({ maxRetries: 3, initialDelayMs: 10, jitter: false });
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await h.executeWithRetry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const h = new RetryHandler({ maxRetries: 2, initialDelayMs: 10, jitter: false });
      const fn = vi.fn().mockRejectedValue(new Error('always fail'));

      await expect(h.executeWithRetry(fn)).rejects.toThrow('always fail');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should call onError callback', async () => {
      const h = new RetryHandler({ maxRetries: 2, initialDelayMs: 10, jitter: false });
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      const onError = vi.fn().mockResolvedValue(true);

      await expect(h.executeWithRetry(fn, onError)).rejects.toThrow('fail');
      expect(onError).toHaveBeenCalled();
    });

    it('should stop retrying when onError returns false', async () => {
      const h = new RetryHandler({ maxRetries: 5, initialDelayMs: 10, jitter: false });
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      const onError = vi.fn().mockResolvedValue(false);

      await expect(h.executeWithRetry(fn, onError)).rejects.toThrow('fail');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('should pass attempt number to fn', async () => {
      const h = new RetryHandler({ maxRetries: 2, initialDelayMs: 10, jitter: false });
      const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success');

      await h.executeWithRetry(fn);
      expect(fn).toHaveBeenNthCalledWith(1, 0);
      expect(fn).toHaveBeenNthCalledWith(2, 1);
    });
  });
});

describe('createRetryHandler', () => {
  it('should create a RetryHandler instance', () => {
    const handler = createRetryHandler();
    expect(handler).toBeInstanceOf(RetryHandler);
  });

  it('should accept config', () => {
    const handler = createRetryHandler({ maxRetries: 5 });
    expect(handler).toBeInstanceOf(RetryHandler);
  });
});
