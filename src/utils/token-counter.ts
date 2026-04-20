/**
 * Unified token counter for LLM providers
 */

import type { ProviderType } from '../types/domain.js';

/**
 * Token counting function type
 */
export type TokenCountFn = (text: string) => number;

/**
 * Token counter interface
 */
export interface ITokenCounter {
  /**
   * Count tokens in a text string
   */
  countTokens(text: string): number;

  /**
   * Count tokens for a message
   */
  countMessageTokens(message: { role: string; content: string }): number;

  /**
   * Count tokens for a conversation
   */
  countConversationTokens(messages: Array<{ role: string; content: string }>): number;
}

/**
 * Simple estimation-based token counter (fallback)
 * Uses a rough estimate of ~4 characters per token for English text
 */
export class EstimationTokenCounter implements ITokenCounter {
  private readonly charsPerToken: number;

  constructor(charsPerToken: number = 4) {
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
    return roleTokens + contentTokens + 3; // Extra tokens for formatting
  }

  countConversationTokens(messages: Array<{ role: string; content: string }>): number {
    let total = 0;
    for (const message of messages) {
      total += this.countMessageTokens(message);
    }
    return total + 3; // Extra tokens for message separators
  }
}

/**
 * Token counter that delegates to provider-specific counters
 */
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

    // Cache settings
    const enableCache = options?.enableCache !== false;
    this.cacheTTL = options?.cacheTTL ?? 5 * 60 * 1000; // 5 minutes default
    this.maxCacheSize = options?.maxCacheSize ?? 10000;
    this.cache = enableCache ? new Map() : new Map();
    this.cacheTimestamps = enableCache ? new Map() : new Map();
  }

  /**
   * Count tokens in a text string
   */
  countTokens(text: string): number {
    if (!text) {
      return 0;
    }

    // Check cache
    const cached = this.getCached(text);
    if (cached !== undefined) {
      return cached;
    }

    // Try custom counter first, then fallback to estimation
    let count: number;
    if (this.customCounter) {
      count = this.customCounter.countTokens(text);
    } else {
      count = this.fallbackCounter.countTokens(text);
    }

    // Cache result
    this.setCached(text, count);

    return count;
  }

  /**
   * Count tokens for a message
   */
  countMessageTokens(message: { role: string; content: string }): number {
    if (this.customCounter) {
      return this.customCounter.countMessageTokens(message);
    }
    return this.fallbackCounter.countMessageTokens(message);
  }

  /**
   * Count tokens for a conversation
   */
  countConversationTokens(messages: Array<{ role: string; content: string }>): number {
    if (this.customCounter) {
      return this.customCounter.countConversationTokens(messages);
    }
    return this.fallbackCounter.countConversationTokens(messages);
  }

  /**
   * Create a token counter for a specific provider
   */
  static forProvider(
    provider: ProviderType,
    options?: {
      enableCache?: boolean;
      cacheTTL?: number;
    },
  ): TokenCounter {
    // In a full implementation, this would create provider-specific counters
    // For now, we use the estimation counter as a fallback
    return new TokenCounter({
      provider,
      ...options,
    });
  }

  /**
   * Set a custom token counter
   */
  setCustomCounter(counter: ITokenCounter): void {
    this.customCounter = counter;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Get cached value if available and not expired
   */
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

  /**
   * Cache a value
   */
  private setCached(key: string, value: number): void {
    if (this.cache.size >= this.maxCacheSize) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
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

  /**
   * Get the current cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Singleton instance
let defaultTokenCounter: TokenCounter | null = null;

/**
 * Get the default token counter instance
 */
export function getDefaultTokenCounter(): TokenCounter {
  if (!defaultTokenCounter) {
    defaultTokenCounter = new TokenCounter();
  }
  return defaultTokenCounter;
}
