import { describe, it, expect, beforeEach } from 'vitest';
import { VertexAITokenCounter } from '../../../../src/providers/vertexai/token-counter.js';

describe('VertexAITokenCounter', () => {
  let counter: VertexAITokenCounter;

  beforeEach(() => {
    counter = new VertexAITokenCounter();
  });

  describe('countTokens', () => {
    it('should estimate tokens based on character count', () => {
      const text = 'Hello, world! This is a test.';
      const count = counter.countTokens(text, 'gemini-1.5-pro');
      expect(count).toBe(Math.ceil(text.length / 4));
    });

    it('should return 0 for empty string', () => {
      const count = counter.countTokens('', 'gemini-1.5-pro');
      expect(count).toBe(0);
    });

    it('should cache results', () => {
      const text = 'Hello world';
      const model = 'gemini-1.5-pro';

      const count1 = counter.countTokens(text, model);
      const count2 = counter.countTokens(text, model);

      expect(count1).toBe(count2);
    });

    it('should use same estimation regardless of model', () => {
      const text = 'Hello world test';

      const proCount = counter.countTokens(text, 'gemini-1.5-pro');
      const flashCount = counter.countTokens(text, 'gemini-1.5-flash');

      expect(proCount).toBe(flashCount);
    });
  });

  describe('countContentsTokens', () => {
    it('should count tokens for all contents', () => {
      const contents = [
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: 'Hi there!' }] },
      ];

      const count = counter.countContentsTokens(contents, 'gemini-1.5-pro');

      expect(count).toBeGreaterThan(0);
    });

    it('should handle parts without text', () => {
      const contents = [{ role: 'user', parts: [{} as any] }];

      const count = counter.countContentsTokens(contents, 'gemini-1.5-pro');

      expect(count).toBeGreaterThan(0);
    });

    it('should skip parts with empty text', () => {
      const contents = [{ role: 'user', parts: [{ text: '' }] }];

      const count = counter.countContentsTokens(contents, 'gemini-1.5-pro');

      const roleTokens = counter.countTokens('user', 'gemini-1.5-pro');
      expect(count).toBe(roleTokens);
    });

    it('should handle empty contents array', () => {
      const count = counter.countContentsTokens([], 'gemini-1.5-pro');
      expect(count).toBe(0);
    });

    it('should count role tokens for each content', () => {
      const contents = [
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: 'Hi' }] },
      ];

      const count = counter.countContentsTokens(contents, 'gemini-1.5-pro');

      const userRoleTokens = counter.countTokens('user', 'gemini-1.5-pro');
      const modelRoleTokens = counter.countTokens('model', 'gemini-1.5-pro');
      const userTextTokens = counter.countTokens('Hello', 'gemini-1.5-pro');
      const modelTextTokens = counter.countTokens('Hi', 'gemini-1.5-pro');

      expect(count).toBe(userRoleTokens + userTextTokens + modelRoleTokens + modelTextTokens);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      counter.countTokens('Hello', 'gemini-1.5-pro');
      counter.clearCache();

      counter.countTokens('Hello', 'gemini-1.5-pro');
    });
  });
});
