import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OpenAITokenCounter } from '../../../../src/providers/openai/token-counter.js';

vi.mock('tiktoken', () => ({
  encoding_for_model: vi.fn((model: string) => {
    if (model === 'gpt-4' || model === 'gpt-4-turbo' || model === 'gpt-3.5-turbo') {
      return {
        encode: (text: string) => new Array(Math.ceil(text.length / 4)),
        free: vi.fn(),
      };
    }
    throw new Error('Unknown model');
  }),
  get_encoding: vi.fn(() => ({
    encode: (text: string) => new Array(Math.ceil(text.length / 4)),
    free: vi.fn(),
  })),
}));

describe('OpenAITokenCounter', () => {
  let counter: OpenAITokenCounter;

  beforeEach(() => {
    counter = new OpenAITokenCounter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    counter.free();
  });

  describe('countTokens', () => {
    it('should count tokens for a given text and model', () => {
      const count = counter.countTokens('Hello, world!', 'gpt-4');
      expect(count).toBeGreaterThan(0);
    });

    it('should cache token counts', async () => {
      const { encoding_for_model } = await import('tiktoken');
      vi.clearAllMocks();

      counter.countTokens('Hello world', 'gpt-4');
      counter.countTokens('Hello world', 'gpt-4');

      expect(encoding_for_model).toHaveBeenCalledTimes(1);
    });

    it('should return cached value on second call', () => {
      const count1 = counter.countTokens('Hello world', 'gpt-4');
      const count2 = counter.countTokens('Hello world', 'gpt-4');
      expect(count1).toBe(count2);
    });

    it('should handle empty string', () => {
      const count = counter.countTokens('', 'gpt-4');
      expect(count).toBe(0);
    });
  });

  describe('countMessagesTokens', () => {
    it('should count tokens for all messages', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      const count = counter.countMessagesTokens(messages, 'gpt-4');

      expect(count).toBeGreaterThan(0);
    });

    it('should add 3 overhead tokens for message structure', async () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const count = counter.countMessagesTokens(messages, 'gpt-4');

      const { encoding_for_model } = await import('tiktoken');
      expect(encoding_for_model).toHaveBeenCalled();

      expect(count).toBeGreaterThan(0);
    });

    it('should handle empty messages array', () => {
      const count = counter.countMessagesTokens([], 'gpt-4');
      expect(count).toBe(3);
    });
  });

  describe('getEncoding', () => {
    it('should use encoding_for_model for known models', async () => {
      const { encoding_for_model } = await import('tiktoken');

      counter.countTokens('test', 'gpt-4');

      expect(encoding_for_model).toHaveBeenCalledWith('gpt-4');
    });

    it('should fall back to o200k_base for gpt-4 models on error', async () => {
      const { encoding_for_model, get_encoding } = await import('tiktoken');
      (encoding_for_model as any).mockImplementationOnce(() => {
        throw new Error('Unknown model');
      });

      counter.countTokens('test', 'gpt-4-unknown');

      expect(get_encoding).toHaveBeenCalledWith('o200k_base');
    });

    it('should fall back to cl100k_base for gpt-3.5 models on error', async () => {
      const { encoding_for_model, get_encoding } = await import('tiktoken');
      (encoding_for_model as any).mockImplementationOnce(() => {
        throw new Error('Unknown model');
      });

      counter.countTokens('test', 'gpt-3.5-turbo');

      expect(get_encoding).toHaveBeenCalledWith('cl100k_base');
    });

    it('should fall back to o200k_base for o1 models on error', async () => {
      const { encoding_for_model, get_encoding } = await import('tiktoken');
      (encoding_for_model as any).mockImplementationOnce(() => {
        throw new Error('Unknown model');
      });

      counter.countTokens('test', 'o1-preview');

      expect(get_encoding).toHaveBeenCalledWith('o200k_base');
    });

    it('should fall back to cl100k_base for unknown models', async () => {
      const { encoding_for_model, get_encoding } = await import('tiktoken');
      (encoding_for_model as any).mockImplementationOnce(() => {
        throw new Error('Unknown model');
      });

      counter.countTokens('test', 'some-unknown-model');

      expect(get_encoding).toHaveBeenCalledWith('cl100k_base');
    });

    it('should cache encodings', async () => {
      const { encoding_for_model } = await import('tiktoken');
      vi.clearAllMocks();

      counter.countTokens('test1', 'gpt-4');
      counter.countTokens('test2', 'gpt-4');

      expect(encoding_for_model).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearCache', () => {
    it('should clear the token cache but keep encodings', async () => {
      const { encoding_for_model } = await import('tiktoken');

      counter.countTokens('Hello', 'gpt-4');
      counter.clearCache();
      counter.countTokens('Hello', 'gpt-4');

      expect(encoding_for_model).toHaveBeenCalledTimes(1);
    });
  });

  describe('free', () => {
    it('should free all encodings', async () => {
      const { encoding_for_model } = await import('tiktoken');

      counter.countTokens('test', 'gpt-4');
      counter.free();

      const mockEncoding = (encoding_for_model as any).mock.results[0].value;
      expect(mockEncoding.free).toHaveBeenCalled();
    });

    it('should clear both caches', () => {
      counter.countTokens('test', 'gpt-4');
      counter.free();

      const count = counter.countTokens('test', 'gpt-4');
      expect(count).toBeGreaterThan(0);
    });
  });
});
