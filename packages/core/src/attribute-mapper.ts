import {
  COST_ATTRIBUTES,
  FINISH_REASONS,
  GEN_AI_ATTRIBUTES,
  STREAMING_ATTRIBUTES,
} from './constants.js';
import type { LLMRequest, LLMResponse, TokenUsage } from './domain.js';
import type { ProviderType } from './domain.js';

export interface ProviderResponse {
  provider: ProviderType;
  rawData: unknown;
}

export interface MappedAttributes {
  requestAttributes: Record<string, unknown>;
  responseAttributes: Record<string, unknown>;
  usageAttributes: Record<string, unknown>;
  costAttributes?: Record<string, unknown>;
  streamingAttributes?: Record<string, unknown>;
}

export class AttributeMapper {
  private readonly provider: ProviderType;

  constructor(provider: ProviderType) {
    this.provider = provider;
  }

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

  mapFinishReason(reason: string | null): string {
    if (!reason) {
      return FINISH_REASONS.OTHER;
    }

    const normalizedReason = reason.toLowerCase();

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

    if (normalizedReason === 'end_turn') {
      return FINISH_REASONS.STOP;
    }
    if (normalizedReason === 'stop_sequence') {
      return FINISH_REASONS.STOP;
    }
    if (normalizedReason === 'max_tokens') {
      return FINISH_REASONS.MAX_TOKENS;
    }

    if (normalizedReason === 'safety') {
      return FINISH_REASONS.CONTENT_FILTER;
    }
    if (normalizedReason === 'recitation') {
      return FINISH_REASONS.CONTENT_FILTER;
    }
    if (normalizedReason === 'other') {
      return FINISH_REASONS.OTHER;
    }

    if (normalizedReason === 'tool_use') {
      return FINISH_REASONS.TOOL_CALLS;
    }
    if (normalizedReason === 'finish') {
      return FINISH_REASONS.STOP;
    }

    return FINISH_REASONS.OTHER;
  }

  mapAll(request: LLMRequest, response: LLMResponse): MappedAttributes {
    return {
      requestAttributes: this.mapRequestAttributes(request),
      responseAttributes: this.mapResponseAttributes(response),
      usageAttributes: this.mapUsageAttributes(response.usage),
    };
  }

  extractTokenUsage(_rawResponse: unknown): TokenUsage | null {
    return null;
  }

  extractFinishReasons(_rawResponse: unknown): string[] {
    return [];
  }

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

export function createAttributeMapper(provider: ProviderType): AttributeMapper {
  return new AttributeMapper(provider);
}
