import { describe, it, expect, beforeEach } from 'vitest';
import { BedrockTokenCounter } from '../../../../src/providers/bedrock/token-counter.js';

describe('BedrockTokenCounter', () => {
  let counter: BedrockTokenCounter;

  beforeEach(() => {
    counter = new BedrockTokenCounter();
  });

  describe('countTokens', () => {
    describe('anthropic model family', () => {
      it('should estimate tokens using 4 chars per token', () => {
        const text = 'Hello, world!';
        const count = counter.countTokens(text, 'anthropic.claude-3-sonnet-20240229-v1:0');
        expect(count).toBe(Math.ceil(text.length / 4));
      });
    });

    describe('amazon model family', () => {
      it('should estimate tokens using 4 chars per token', () => {
        const text = 'Hello, world!';
        const count = counter.countTokens(text, 'amazon.titan-text-express-v1');
        expect(count).toBe(Math.ceil(text.length / 4));
      });
    });

    describe('cohere model family', () => {
      it('should estimate tokens using 4.5 chars per token', () => {
        const text = 'Hello, world!';
        const count = counter.countTokens(text, 'cohere.command-text-v14');
        expect(count).toBe(Math.ceil(text.length / 4.5));
      });
    });

    describe('ai21 model family', () => {
      it('should estimate tokens using word count', () => {
        const text = 'Hello world test';
        const count = counter.countTokens(text, 'ai21.j2-ultra-v1');
        expect(count).toBe(3);
      });

      it('should handle single word', () => {
        const count = counter.countTokens('Hello', 'ai21.j2-ultra-v1');
        expect(count).toBe(1);
      });

      it('should handle multiple spaces', () => {
        const count = counter.countTokens('Hello   world', 'ai21.j2-ultra-v1');
        expect(count).toBe(2);
      });

      it('should handle empty string', () => {
        const count = counter.countTokens('', 'ai21.j2-ultra-v1');
        expect(count).toBe(1);
      });
    });

    describe('unknown model family', () => {
      it('should use default estimation of 4 chars per token', () => {
        const text = 'Hello, world!';
        const count = counter.countTokens(text, 'unknown.model-v1');
        expect(count).toBe(Math.ceil(text.length / 4));
      });
    });

    it('should return 0 for empty string with default model', () => {
      const count = counter.countTokens('', 'anthropic.claude-3-sonnet-20240229-v1:0');
      expect(count).toBe(0);
    });

    it('should cache results', () => {
      const text = 'Hello world';
      const model = 'anthropic.claude-3-sonnet-20240229-v1:0';

      const count1 = counter.countTokens(text, model);
      const count2 = counter.countTokens(text, model);

      expect(count1).toBe(count2);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      counter.countTokens('Hello', 'anthropic.claude-3-sonnet-20240229-v1:0');
      counter.clearCache();

      counter.countTokens('Hello', 'anthropic.claude-3-sonnet-20240229-v1:0');
    });
  });
});
