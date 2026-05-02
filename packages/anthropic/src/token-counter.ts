export class AnthropicTokenCounter {
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

    totalTokens += 3;

    return totalTokens;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
