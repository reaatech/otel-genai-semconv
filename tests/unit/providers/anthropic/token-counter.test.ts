import { describe, it, expect, beforeEach } from 'vitest';
import { AnthropicTokenCounter } from '../../../../src/providers/anthropic/token-counter.js';

describe('AnthropicTokenCounter', () => {
  let counter: AnthropicTokenCounter;

  beforeEach(() => {
    counter = new AnthropicTokenCounter();
  });

  describe('countTokens', () => {
    it('should estimate tokens based on character count', () => {
      const text = 'Hello, world! This is a test.';
      const count = counter.countTokens(text, 'claude-3-5-sonnet-20241022');
      expect(count).toBe(Math.ceil(text.length / 4));
    });

    it('should return 0 for empty string', () => {
      const count = counter.countTokens('', 'claude-3-5-sonnet-20241022');
      expect(count).toBe(0);
    });

    it('should cache results', () => {
      const text = 'Hello world';
      const model = 'claude-3-5-sonnet-20241022';

      const count1 = counter.countTokens(text, model);
      const count2 = counter.countTokens(text, model);

      expect(count1).toBe(count2);
    });

    it('should use same estimation regardless of model', () => {
      const text = 'Hello world test';

      const claudeCount = counter.countTokens(text, 'claude-opus-20240229');
      const haikuCount = counter.countTokens(text, 'claude-haiku-20240307');

      expect(claudeCount).toBe(haikuCount);
    });
  });

  describe('countMessagesTokens', () => {
    it('should count tokens for all messages', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      const count = counter.countMessagesTokens(messages, 'claude-3-5-sonnet-20241022');

      expect(count).toBeGreaterThan(0);
    });

    it('should handle string content', () => {
      const messages = [{ role: 'user', content: 'Hello world' }];
      const count = counter.countMessagesTokens(messages, 'claude-3-5-sonnet-20241022');

      const expectedRole = counter.countTokens('user', 'claude-3-5-sonnet-20241022');
      const expectedContent = counter.countTokens('Hello world', 'claude-3-5-sonnet-20241022');

      expect(count).toBe(expectedRole + expectedContent + 3);
    });

    it('should handle non-string content by stringifying', () => {
      const messages = [{ role: 'user', content: { type: 'text', text: 'Hello' } }];
      const count = counter.countMessagesTokens(messages, 'claude-3-5-sonnet-20241022');

      expect(count).toBeGreaterThan(0);
    });

    it('should add 3 overhead tokens', () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const count = counter.countMessagesTokens(messages, 'claude-3-5-sonnet-20241022');

      const roleTokens = counter.countTokens('user', 'claude-3-5-sonnet-20241022');
      const contentTokens = counter.countTokens('Hello', 'claude-3-5-sonnet-20241022');

      expect(count).toBe(roleTokens + contentTokens + 3);
    });

    it('should handle empty messages array', () => {
      const count = counter.countMessagesTokens([], 'claude-3-5-sonnet-20241022');
      expect(count).toBe(3);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      counter.countTokens('Hello', 'claude-3-5-sonnet-20241022');
      counter.clearCache();

      counter.countTokens('Hello', 'claude-3-5-sonnet-20241022');
    });
  });
});
