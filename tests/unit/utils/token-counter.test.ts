/**
 * Unit tests for TokenCounter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TokenCounter,
  EstimationTokenCounter,
  getDefaultTokenCounter,
} from '../../../src/utils/token-counter.js';

describe('EstimationTokenCounter', () => {
  let counter: EstimationTokenCounter;

  beforeEach(() => {
    counter = new EstimationTokenCounter();
  });

  describe('countTokens', () => {
    it('should estimate tokens based on character count', () => {
      const text = 'Hello, world! This is a test.';
      const count = counter.countTokens(text);
      expect(count).toBe(Math.ceil(text.length / 4));
    });

    it('should return 0 for empty string', () => {
      expect(counter.countTokens('')).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(counter.countTokens(null as unknown as string)).toBe(0);
      expect(counter.countTokens(undefined as unknown as string)).toBe(0);
    });

    it('should use custom charsPerToken', () => {
      const customCounter = new EstimationTokenCounter(3);
      const text = 'Hello world';
      expect(customCounter.countTokens(text)).toBe(Math.ceil(text.length / 3));
    });
  });

  describe('countMessageTokens', () => {
    it('should count role and content tokens', () => {
      const count = counter.countMessageTokens({
        role: 'user',
        content: 'Hello world',
      });
      expect(count).toBeGreaterThan(0);
    });

    it('should add extra tokens for formatting', () => {
      const count = counter.countMessageTokens({
        role: 'user',
        content: 'Hello',
      });
      const expected = counter.countTokens('user') + counter.countTokens('Hello') + 3;
      expect(count).toBe(expected);
    });
  });

  describe('countConversationTokens', () => {
    it('should count all messages', () => {
      const count = counter.countConversationTokens([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]);
      expect(count).toBeGreaterThan(0);
    });

    it('should add separator tokens', () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const count = counter.countConversationTokens(messages);
      const singleCount = counter.countMessageTokens(messages[0]!);
      expect(count).toBe(singleCount + 3);
    });
  });
});

describe('TokenCounter', () => {
  let counter: TokenCounter;

  beforeEach(() => {
    counter = new TokenCounter();
  });

  describe('countTokens', () => {
    it('should count tokens for text', () => {
      const count = counter.countTokens('Hello world');
      expect(count).toBeGreaterThan(0);
    });

    it('should return 0 for empty string', () => {
      expect(counter.countTokens('')).toBe(0);
    });

    it('should cache results', () => {
      const count1 = counter.countTokens('Hello world');
      const count2 = counter.countTokens('Hello world');
      expect(count1).toBe(count2);
    });
  });

  describe('countMessageTokens', () => {
    it('should count message tokens', () => {
      const count = counter.countMessageTokens({
        role: 'user',
        content: 'Hello world',
      });
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('countConversationTokens', () => {
    it('should count conversation tokens', () => {
      const count = counter.countConversationTokens([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
      ]);
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('forProvider', () => {
    it('should create counter for specific provider', () => {
      const openaiCounter = TokenCounter.forProvider('openai');
      expect(openaiCounter).toBeInstanceOf(TokenCounter);

      const anthropicCounter = TokenCounter.forProvider('anthropic');
      expect(anthropicCounter).toBeInstanceOf(TokenCounter);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      counter.countTokens('Hello');
      counter.clearCache();
      counter.countTokens('Hello');
    });
  });
});

describe('getDefaultTokenCounter', () => {
  it('should return a TokenCounter instance', () => {
    const counter = getDefaultTokenCounter();
    expect(counter).toBeInstanceOf(TokenCounter);
  });

  it('should return the same instance', () => {
    const counter1 = getDefaultTokenCounter();
    const counter2 = getDefaultTokenCounter();
    expect(counter1).toBe(counter2);
  });
});
