/**
 * Token counting for AWS Bedrock models
 */

/**
 * Token counter for Bedrock models
 * Different model families use different tokenization
 */
export class BedrockTokenCounter {
  private readonly cache: Map<string, number>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Count tokens for a given text and model
   * Uses estimation based on model family
   */
  countTokens(text: string, modelId: string): number {
    const cacheKey = `${modelId}:${text}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const modelFamily = modelId.split('.')[0];
    let estimatedTokens: number;

    switch (modelFamily) {
      case 'anthropic':
        // Anthropic uses similar tokenization to GPT-3.5
        estimatedTokens = Math.ceil(text.length / 4);
        break;

      case 'amazon':
        // Amazon Titan uses similar tokenization
        estimatedTokens = Math.ceil(text.length / 4);
        break;

      case 'cohere':
        // Cohere uses slightly different tokenization
        estimatedTokens = Math.ceil(text.length / 4.5);
        break;

      case 'ai21':
        // AI21 Jurassic uses word-based tokenization
        estimatedTokens = text.split(/\s+/).length;
        break;

      default:
        // Generic estimation
        estimatedTokens = Math.ceil(text.length / 4);
    }

    this.cache.set(cacheKey, estimatedTokens);
    return estimatedTokens;
  }

  /**
   * Clear the token cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
