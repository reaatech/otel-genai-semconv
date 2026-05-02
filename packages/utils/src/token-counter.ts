import type { ProviderType } from '@reaatech/otel-genai-semconv-core';

export type TokenCountFn = (text: string) => number;

export interface ITokenCounter {
  countTokens(text: string): number;
  countMessageTokens(message: { role: string; content: string }): number;
  countConversationTokens(messages: Array<{ role: string; content: string }>): number;
}

export class EstimationTokenCounter implements ITokenCounter {
  private readonly charsPerToken: number;

  constructor(charsPerToken = 4) {
    this.charsPerToken = charsPerToken;
  }

  countTokens(text: string): number {
    if (!text) {
      return 0;
    }
    return Math.ceil(text.length / this.charsPerToken);
  }

  countMessageTokens(message: { role: string; content: string }): number {
    const roleTokens = this.countTokens(message.role);
    const contentTokens =
      typeof message.content === 'string' ? this.countTokens(message.content) : 0;
    return roleTokens + contentTokens + 3;
  }

  countConversationTokens(messages: Array<{ role: string; content: string }>): number {
    let total = 0;
    for (const message of messages) {
      total += this.countMessageTokens(message);
    }
    return total + 3;
  }
}

export class TokenCounter {
  private readonly fallbackCounter: EstimationTokenCounter;
  private customCounter?: ITokenCounter;
  private readonly cache: Map<string, number>;
  private readonly cacheTTL: number;
  private readonly maxCacheSize: number;
  private readonly cacheTimestamps: Map<string, number>;

  constructor(options?: {
    provider?: ProviderType;
    customCounter?: ITokenCounter;
    enableCache?: boolean;
    cacheTTL?: number;
    maxCacheSize?: number;
  }) {
    this.customCounter = options?.customCounter;
    this.fallbackCounter = new EstimationTokenCounter();

    const enableCache = options?.enableCache !== false;
    this.cacheTTL = options?.cacheTTL ?? 5 * 60 * 1000;
    this.maxCacheSize = options?.maxCacheSize ?? 10000;
    this.cache = enableCache ? new Map() : new Map();
    this.cacheTimestamps = enableCache ? new Map() : new Map();
  }

  countTokens(text: string): number {
    if (!text) {
      return 0;
    }

    const cached = this.getCached(text);
    if (cached !== undefined) {
      return cached;
    }

    let count: number;
    if (this.customCounter) {
      count = this.customCounter.countTokens(text);
    } else {
      count = this.fallbackCounter.countTokens(text);
    }

    this.setCached(text, count);

    return count;
  }

  countMessageTokens(message: { role: string; content: string }): number {
    if (this.customCounter) {
      return this.customCounter.countMessageTokens(message);
    }
    return this.fallbackCounter.countMessageTokens(message);
  }

  countConversationTokens(messages: Array<{ role: string; content: string }>): number {
    if (this.customCounter) {
      return this.customCounter.countConversationTokens(messages);
    }
    return this.fallbackCounter.countConversationTokens(messages);
  }

  static forProvider(
    provider: ProviderType,
    options?: {
      enableCache?: boolean;
      cacheTTL?: number;
    },
  ): TokenCounter {
    return new TokenCounter({
      provider,
      ...options,
    });
  }

  setCustomCounter(counter: ITokenCounter): void {
    this.customCounter = counter;
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  private getCached(key: string): number | undefined {
    const timestamp = this.cacheTimestamps.get(key);
    if (timestamp === undefined) {
      return undefined;
    }

    if (Date.now() - timestamp > this.cacheTTL) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      return undefined;
    }

    return this.cache.get(key);
  }

  private setCached(key: string, value: number): void {
    if (this.cache.size >= this.maxCacheSize) {
      let oldestKey: string | null = null;
      let oldestTime = Number.POSITIVE_INFINITY;
      for (const [k, timestamp] of this.cacheTimestamps) {
        if (timestamp < oldestTime) {
          oldestTime = timestamp;
          oldestKey = k;
        }
      }
      if (oldestKey !== null) {
        this.cache.delete(oldestKey);
        this.cacheTimestamps.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

let defaultTokenCounter: TokenCounter | null = null;

export function getDefaultTokenCounter(): TokenCounter {
  defaultTokenCounter ??= new TokenCounter();
  return defaultTokenCounter;
}
