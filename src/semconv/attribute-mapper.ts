/**
 * Attribute mapper for converting provider-specific responses to OTel semconv
 */

import type { LLMRequest, LLMResponse, TokenUsage } from '../types/domain.js';
import {
  GEN_AI_ATTRIBUTES,
  COST_ATTRIBUTES,
  FINISH_REASONS,
  STREAMING_ATTRIBUTES,
} from './constants.js';
import type { ProviderType } from '../types/domain.js';

/**
 * Provider-specific response formats
 */
export interface ProviderResponse {
  provider: ProviderType;
  rawData: unknown;
}

/**
 * Mapped attributes for OTel spans
 */
export interface MappedAttributes {
  requestAttributes: Record<string, unknown>;
  responseAttributes: Record<string, unknown>;
  usageAttributes: Record<string, unknown>;
  costAttributes?: Record<string, unknown>;
  streamingAttributes?: Record<string, unknown>;
}

/**
 * Attribute mapper class for converting provider responses to OTel semconv
 */
export class AttributeMapper {
  private readonly provider: ProviderType;

  constructor(provider: ProviderType) {
    this.provider = provider;
  }

  /**
   * Map a provider's request to OTel semconv attributes
   */
  mapRequestAttributes(request: LLMRequest): Record<string, unknown> {
    const attributes: Record<string, unknown> = {
      [GEN_AI_ATTRIBUTES.REQUEST_MODEL]: request.model,
    };

    if (request.temperature !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE] = request.temperature;
    }

    if (request.topP !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_TOP_P] = request.topP;
    }

    if (request.maxTokens !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS] = request.maxTokens;
    }

    if (request.streaming !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_STREAMING] = request.streaming;
    }

    if (request.stop && Array.isArray(request.stop)) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_STOP_SEQUENCES] = request.stop;
    } else if (typeof request.stop === 'string') {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_STOP_SEQUENCES] = [request.stop];
    }

    if (request.frequencyPenalty !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_FREQUENCY_PENALTY] = request.frequencyPenalty;
    }

    if (request.presencePenalty !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_PRESENCE_PENALTY] = request.presencePenalty;
    }

    if (request.seed !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_SEED] = request.seed;
    }

    if (request.responseFormat !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_RESPONSE_FORMAT] = request.responseFormat.type;
    }

    attributes[GEN_AI_ATTRIBUTES.PROVIDER_NAME] = this.getProviderSystem();

    return attributes;
  }

  /**
   * Map a provider's response to OTel semconv attributes
   */
  mapResponseAttributes(response: LLMResponse): Record<string, unknown> {
    const attributes: Record<string, unknown> = {
      [GEN_AI_ATTRIBUTES.RESPONSE_MODEL]: response.model,
      [GEN_AI_ATTRIBUTES.RESPONSE_ID]: response.id,
      [GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]: response.finishReasons.filter(
        (r) => r !== null && r !== undefined,
      ),
      [GEN_AI_ATTRIBUTES.PROVIDER_NAME]: this.getProviderSystem(),
    };

    return attributes;
  }

  /**
   * Map token usage to OTel semconv attributes
   */
  mapUsageAttributes(usage: TokenUsage): Record<string, unknown> {
    const attributes: Record<string, unknown> = {
      [GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS]: usage.inputTokens,
      [GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS]: usage.outputTokens,
    };

    if (usage.cachedInputTokens !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.USAGE_CACHED_INPUT_TOKENS] = usage.cachedInputTokens;
    }

    if ('cacheReadInputTokens' in usage && usage.cacheReadInputTokens !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.USAGE_CACHE_READ_INPUT_TOKENS] = usage.cacheReadInputTokens;
    }

    if ('cacheCreationInputTokens' in usage && usage.cacheCreationInputTokens !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.USAGE_CACHE_CREATION_INPUT_TOKENS] =
        usage.cacheCreationInputTokens;
    }

    return attributes;
  }

  /**
   * Map cost data to OTel cost attributes
   */
  mapCostAttributes(costData: {
    total: number;
    input: number;
    output: number;
    currency: string;
  }): Record<string, unknown> {
    return {
      [COST_ATTRIBUTES.TOTAL]: costData.total,
      [COST_ATTRIBUTES.INPUT]: costData.input,
      [COST_ATTRIBUTES.OUTPUT]: costData.output,
      [COST_ATTRIBUTES.CURRENCY]: costData.currency,
    };
  }

  /**
   * Map streaming metrics to OTel streaming attributes
   */
  mapStreamingAttributes(data: {
    timeToFirstTokenMs?: number;
    totalDurationMs?: number;
    chunkCount?: number;
  }): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};

    if (data.timeToFirstTokenMs !== undefined) {
      attributes[STREAMING_ATTRIBUTES.TIME_TO_FIRST_TOKEN_MS] = data.timeToFirstTokenMs;
    }

    if (data.totalDurationMs !== undefined) {
      attributes[STREAMING_ATTRIBUTES.TOTAL_DURATION_MS] = data.totalDurationMs;
    }

    if (data.chunkCount !== undefined) {
      attributes[STREAMING_ATTRIBUTES.CHUNK_COUNT] = data.chunkCount;
    }

    return attributes;
  }

  /**
   * Map a provider-specific finish reason to OTel standard
   */
  mapFinishReason(reason: string | null): string {
    if (!reason) {
      return FINISH_REASONS.OTHER;
    }

    const normalizedReason = reason.toLowerCase();

    // OpenAI finish reasons
    if (normalizedReason === 'stop') {
      return FINISH_REASONS.STOP;
    }
    if (normalizedReason === 'length') {
      return FINISH_REASONS.MAX_TOKENS;
    }
    if (normalizedReason === 'content_filter') {
      return FINISH_REASONS.CONTENT_FILTER;
    }
    if (normalizedReason === 'function_call') {
      return FINISH_REASONS.TOOL_CALLS;
    }
    if (normalizedReason === 'tool_calls') {
      return FINISH_REASONS.TOOL_CALLS;
    }

    // Anthropic finish reasons
    if (normalizedReason === 'end_turn') {
      return FINISH_REASONS.STOP;
    }
    if (normalizedReason === 'stop_sequence') {
      return FINISH_REASONS.STOP;
    }
    if (normalizedReason === 'max_tokens') {
      return FINISH_REASONS.MAX_TOKENS;
    }

    // Vertex AI / Gemini finish reasons
    if (normalizedReason === 'safety') {
      return FINISH_REASONS.CONTENT_FILTER;
    }
    if (normalizedReason === 'recitation') {
      return FINISH_REASONS.CONTENT_FILTER;
    }
    if (normalizedReason === 'other') {
      return FINISH_REASONS.OTHER;
    }

    // Bedrock finish reasons
    if (normalizedReason === 'end_turn') {
      return FINISH_REASONS.STOP;
    }
    if (normalizedReason === 'tool_use') {
      return FINISH_REASONS.TOOL_CALLS;
    }
    if (normalizedReason === 'finish') {
      return FINISH_REASONS.STOP;
    }

    // Default
    return FINISH_REASONS.OTHER;
  }

  /**
   * Map all attributes from request and response
   */
  mapAll(request: LLMRequest, response: LLMResponse): MappedAttributes {
    return {
      requestAttributes: this.mapRequestAttributes(request),
      responseAttributes: this.mapResponseAttributes(response),
      usageAttributes: this.mapUsageAttributes(response.usage),
    };
  }

  /**
   * Extract token usage from a provider-specific response
   * This is a generic implementation - providers may override
   */
  extractTokenUsage(_rawResponse: unknown): TokenUsage | null {
    // This should be implemented by provider-specific mappers
    // For now, return null to indicate this needs provider-specific handling
    return null;
  }

  /**
   * Extract finish reasons from a provider-specific response
   */
  extractFinishReasons(_rawResponse: unknown): string[] {
    // This should be implemented by provider-specific mappers
    return [];
  }

  /**
   * Get the provider system identifier for OTel
   */
  getProviderSystem(): string {
    const systems: Record<ProviderType, string> = {
      openai: 'openai',
      anthropic: 'anthropic',
      vertexai: 'gcp.vertex_ai',
      bedrock: 'aws.bedrock',
    };

    return systems[this.provider] || 'unknown';
  }
}

/**
 * Factory function to create an attribute mapper for a specific provider
 */
export function createAttributeMapper(provider: ProviderType): AttributeMapper {
  return new AttributeMapper(provider);
}
