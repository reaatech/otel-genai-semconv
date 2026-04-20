/**
 * Token counting for Anthropic models
 */

/**
 * Token counter for Anthropic models
 * Uses Anthropic's token counting API when available, with fallback estimation
 */
export class AnthropicTokenCounter {
  private readonly cache: Map<string, number>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Count tokens for a given text and model
   * Note: This uses estimation as Anthropic doesn't provide a public token counting library
   * For accurate counting, use Anthropic's countTokens API
   */
  countTokens(text: string, model: string): number {
    const cacheKey = `${model}:${text}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Anthropic uses a similar tokenization to GPT-3.5
    // Rough estimation: ~4 characters per token for English text
    const estimatedTokens = Math.ceil(text.length / 4);

    this.cache.set(cacheKey, estimatedTokens);
    return estimatedTokens;
  }

  /**
   * Count tokens for messages array
   */
  countMessagesTokens(
    messages: Array<{ role: string; content: string | unknown }>,
    model: string,
  ): number {
    let totalTokens = 0;

    for (const message of messages) {
      totalTokens += this.countTokens(message.role, model);
      const content =
        typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
      totalTokens += this.countTokens(content, model);
    }

    // Add overhead for message structure
    totalTokens += 3;

    return totalTokens;
  }

  /**
   * Clear the token cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
