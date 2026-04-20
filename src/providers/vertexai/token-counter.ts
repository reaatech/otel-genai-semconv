/**
 * Token counting for Vertex AI models
 */

/**
 * Token counter for Vertex AI models
 * Uses estimation based on character count
 */
export class VertexAITokenCounter {
  private readonly cache: Map<string, number>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Count tokens for a given text and model
   * Uses estimation: ~4 characters per token for English text
   */
  countTokens(text: string, model: string): number {
    const cacheKey = `${model}:${text}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Estimation: ~4 characters per token for English text
    const estimatedTokens = Math.ceil(text.length / 4);

    this.cache.set(cacheKey, estimatedTokens);
    return estimatedTokens;
  }

  /**
   * Count tokens for contents array
   */
  countContentsTokens(
    contents: Array<{ role: string; parts: Array<{ text: string }> }>,
    model: string,
  ): number {
    let totalTokens = 0;

    for (const content of contents) {
      totalTokens += this.countTokens(content.role, model);
      for (const part of content.parts) {
        if (part.text) {
          totalTokens += this.countTokens(part.text, model);
        }
      }
    }

    return totalTokens;
  }

  /**
   * Clear the token cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
