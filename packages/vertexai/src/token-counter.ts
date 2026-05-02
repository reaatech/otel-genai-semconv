export class VertexAITokenCounter {
  private readonly cache: Map<string, number>;

  constructor() {
    this.cache = new Map();
  }

  countTokens(text: string, model: string): number {
    const cacheKey = `${model}:${text}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const estimatedTokens = Math.ceil(text.length / 4);

    this.cache.set(cacheKey, estimatedTokens);
    return estimatedTokens;
  }

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

  clearCache(): void {
    this.cache.clear();
  }
}
