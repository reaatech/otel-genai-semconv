/**
 * Cost calculator for LLM API usage
 */

import type { ProviderType, PricingInfo, CostData } from '../types/domain.js';
import type { TokenUsage } from '../types/domain.js';

/**
 * Default pricing data (per 1K tokens, in USD)
 * These are placeholder values - in production, these should be updated regularly
 */
const DEFAULT_PRICING: Record<string, Record<string, PricingInfo>> = {
  openai: {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  },
  anthropic: {
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  },
  vertexai: {
    'gemini-pro': { input: 0.00025, output: 0.0005 },
    'gemini-1.5-pro': { input: 0.0025, output: 0.005 },
    'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  },
  bedrock: {
    'anthropic.claude-3-opus': { input: 0.015, output: 0.075 },
    'anthropic.claude-3-sonnet': { input: 0.003, output: 0.015 },
    'anthropic.claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'amazon.titan-text': { input: 0.0003, output: 0.0004 },
  },
};

/**
 * Cost calculation parameters
 */
export interface CostCalculationParams {
  /** Provider type */
  provider: ProviderType;
  /** Model name */
  model: string;
  /** Input token count */
  inputTokens: number;
  /** Output token count */
  outputTokens: number;
  /** Currency code (default: USD) */
  currency?: string;
}

/**
 * Cost calculator for LLM API usage
 */
export class CostCalculator {
  private readonly pricingData: Record<string, Record<string, PricingInfo>>;
  private readonly customPricing: Record<string, Record<string, PricingInfo>>;
  private readonly cache: Map<string, CostData>;

  constructor(options?: {
    customPricing?: Record<string, PricingInfo>;
    pricingData?: Record<string, Record<string, PricingInfo>>;
  }) {
    this.pricingData = options?.pricingData ?? DEFAULT_PRICING;
    this.customPricing = options?.customPricing
      ? this.groupCustomPricingByProvider(options.customPricing)
      : {};
    this.cache = new Map();
  }

  /**
   * Calculate cost for a given token usage
   */
  calculate(params: CostCalculationParams): CostData {
    const cacheKey = `${params.provider}:${params.model}:${params.inputTokens}:${params.outputTokens}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const pricing = this.getPricing(params.provider, params.model);
    const currency = params.currency ?? 'USD';

    // Calculate costs (pricing is per 1K tokens)
    const inputCost = (params.inputTokens / 1000) * pricing.input;
    const outputCost = (params.outputTokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;

    const result: CostData = {
      total: Math.round(totalCost * 1000000) / 1000000, // Round to 6 decimal places
      input: Math.round(inputCost * 1000000) / 1000000,
      output: Math.round(outputCost * 1000000) / 1000000,
      currency,
    };

    // Cache result
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * Calculate cost from token usage object
   */
  calculateFromUsage(params: {
    provider: ProviderType;
    model: string;
    usage: TokenUsage;
    currency?: string;
  }): CostData {
    return this.calculate({
      provider: params.provider,
      model: params.model,
      inputTokens: params.usage.inputTokens,
      outputTokens: params.usage.outputTokens,
      currency: params.currency,
    });
  }

  /**
   * Group custom pricing by provider for proper scoping
   */
  private groupCustomPricingByProvider(
    flatPricing: Record<string, PricingInfo>,
  ): Record<string, Record<string, PricingInfo>> {
    const grouped: Record<string, Record<string, PricingInfo>> = {};
    for (const [model, pricing] of Object.entries(flatPricing)) {
      const provider = pricing.provider ?? 'unknown';
      if (!grouped[provider]) {
        grouped[provider] = {};
      }
      grouped[provider][model] = pricing;
    }
    return grouped;
  }

  /**
   * Get pricing for a specific model
   */
  getPricing(provider: ProviderType, model: string): PricingInfo {
    // Check custom pricing for this provider first
    const providerCustom = this.customPricing[provider];
    if (providerCustom?.[model]) {
      return providerCustom[model];
    }

    // Check provider-specific pricing
    const providerPricing = this.pricingData[provider];
    if (providerPricing) {
      if (providerPricing[model]) {
        return providerPricing[model];
      }

      // Try partial match (e.g., 'gpt-4' matches 'gpt-4-turbo')
      for (const [key, pricing] of Object.entries(providerPricing)) {
        if (model.startsWith(key) || model.includes(key)) {
          return pricing;
        }
      }
    }

    // Fallback to default pricing
    return { input: 0.002, output: 0.002 }; // $0.002 per 1K tokens
  }

  /**
   * Set custom pricing for a model
   */
  setCustomPricing(model: string, pricing: PricingInfo): void {
    const provider = pricing.provider ?? 'unknown';
    if (!this.customPricing[provider]) {
      this.customPricing[provider] = {};
    }
    this.customPricing[provider][model] = pricing;
    this.cache.clear();
  }

  /**
   * Set custom pricing for multiple models
   */
  setCustomPricingBatch(pricing: Record<string, PricingInfo>): void {
    for (const [model, info] of Object.entries(pricing)) {
      const provider = info.provider ?? 'unknown';
      if (!this.customPricing[provider]) {
        this.customPricing[provider] = {};
      }
      this.customPricing[provider][model] = info;
    }
    this.cache.clear();
  }

  /**
   * Get all available pricing data
   */
  getAllPricing(): Record<string, Record<string, PricingInfo>> & {
    custom?: Record<string, Record<string, PricingInfo>>;
  } {
    const result: Record<string, Record<string, PricingInfo>> & {
      custom?: Record<string, Record<string, PricingInfo>>;
    } = {
      ...this.pricingData,
    };
    if (Object.keys(this.customPricing).length > 0) {
      result.custom = this.customPricing;
    }
    return result;
  }

  /**
   * Clear the cost cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Singleton instance
let defaultCostCalculator: CostCalculator | null = null;

/**
 * Get the default cost calculator instance
 */
export function getDefaultCostCalculator(): CostCalculator {
  if (!defaultCostCalculator) {
    defaultCostCalculator = new CostCalculator();
  }
  return defaultCostCalculator;
}
