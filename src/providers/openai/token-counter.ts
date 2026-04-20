/**
 * Token counting for OpenAI models using tiktoken
 */

import { encoding_for_model, get_encoding, type Tiktoken, type TiktokenModel } from 'tiktoken';

/**
 * Token counter for OpenAI models
 */
export class OpenAITokenCounter {
  private readonly cache: Map<string, number>;
  private readonly encodingCache: Map<string, Tiktoken>;

  constructor() {
    this.cache = new Map();
    this.encodingCache = new Map();
  }

  /**
   * Count tokens for a given text and model
   */
  countTokens(text: string, model: string): number {
    const cacheKey = `${model}:${text}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const encoding = this.getEncoding(model);
    const count = encoding.encode(text).length;

    this.cache.set(cacheKey, count);
    return count;
  }

  /**
   * Count tokens for messages array
   */
  countMessagesTokens(messages: Array<{ role: string; content: string }>, model: string): number {
    let totalTokens = 0;

    for (const message of messages) {
      totalTokens += this.countTokens(message.role, model);
      totalTokens += this.countTokens(message.content, model);
    }

    // Add overhead for message structure
    totalTokens += 3; // every reply is primed with <|start|>assistant<|message|>

    return totalTokens;
  }

  /**
   * Get or create encoding for a model
   */
  private getEncoding(model: string): Tiktoken {
    const cached = this.encodingCache.get(model);
    if (cached) {
      return cached;
    }

    let encoding: Tiktoken;

    try {
      // Try to get encoding for specific model
      encoding = encoding_for_model(model as TiktokenModel);
    } catch {
      // Fallback to default encoding
      try {
        if (model.startsWith('gpt-4') || model.startsWith('o1')) {
          encoding = get_encoding('o200k_base');
        } else if (model.startsWith('gpt-3.5')) {
          encoding = get_encoding('cl100k_base');
        } else {
          encoding = get_encoding('cl100k_base');
        }
      } catch {
        // Final fallback
        encoding = get_encoding('cl100k_base');
      }
    }

    this.encodingCache.set(model, encoding);
    return encoding;
  }

  /**
   * Clear the token cache
   */
  clearCache(): void {
    this.cache.clear();
    // Don't clear encoding cache as encodings are expensive to create
  }

  /**
   * Free all encodings (call when done using the counter)
   */
  free(): void {
    this.cache.clear();
    for (const encoding of this.encodingCache.values()) {
      encoding.free();
    }
    this.encodingCache.clear();
  }
}
