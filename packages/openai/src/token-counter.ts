import { type Tiktoken, type TiktokenModel, encoding_for_model, get_encoding } from 'tiktoken';

export class OpenAITokenCounter {
  private readonly cache: Map<string, number>;
  private readonly encodingCache: Map<string, Tiktoken>;

  constructor() {
    this.cache = new Map();
    this.encodingCache = new Map();
  }

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

  countMessagesTokens(messages: Array<{ role: string; content: string }>, model: string): number {
    let totalTokens = 0;

    for (const message of messages) {
      totalTokens += this.countTokens(message.role, model);
      totalTokens += this.countTokens(message.content, model);
    }

    totalTokens += 3;

    return totalTokens;
  }

  private getEncoding(model: string): Tiktoken {
    const cached = this.encodingCache.get(model);
    if (cached) {
      return cached;
    }

    let encoding: Tiktoken;

    try {
      encoding = encoding_for_model(model as TiktokenModel);
    } catch {
      try {
        if (model.startsWith('gpt-4') || model.startsWith('o1')) {
          encoding = get_encoding('o200k_base');
        } else if (model.startsWith('gpt-3.5')) {
          encoding = get_encoding('cl100k_base');
        } else {
          encoding = get_encoding('cl100k_base');
        }
      } catch {
        encoding = get_encoding('cl100k_base');
      }
    }

    this.encodingCache.set(model, encoding);
    return encoding;
  }

  clearCache(): void {
    this.cache.clear();
  }

  free(): void {
    this.cache.clear();
    for (const encoding of this.encodingCache.values()) {
      encoding.free();
    }
    this.encodingCache.clear();
  }
}
