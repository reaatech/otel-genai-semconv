export class BedrockTokenCounter {
  private readonly cache: Map<string, number>;

  constructor() {
    this.cache = new Map();
  }

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
        estimatedTokens = Math.ceil(text.length / 4);
        break;

      case 'amazon':
        estimatedTokens = Math.ceil(text.length / 4);
        break;

      case 'cohere':
        estimatedTokens = Math.ceil(text.length / 4.5);
        break;

      case 'ai21':
        estimatedTokens = text.split(/\s+/).length;
        break;

      default:
        estimatedTokens = Math.ceil(text.length / 4);
    }

    this.cache.set(cacheKey, estimatedTokens);
    return estimatedTokens;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
