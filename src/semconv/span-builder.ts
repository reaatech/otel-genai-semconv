/**
 * Span builder for creating OTel-compliant spans
 */

import { trace, Span, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import type { Attributes, TimeInput } from '@opentelemetry/api';
import type { LLMRequest, LLMResponse, TokenUsage, CostData } from '../types/domain.js';
import { AttributeMapper } from './attribute-mapper.js';
import {
  GEN_AI_EVENTS,
  EVENT_ATTRIBUTES,
  SPAN_NAMES,
  OPERATIONS,
  ERROR_TYPES,
} from './constants.js';
import type { ProviderType } from '../types/domain.js';

/**
 * Options for building a span
 */
export interface SpanBuilderOptions {
  /** The provider type */
  provider: ProviderType;
  /** The operation type (default: chat) */
  operation?: string;
  /** Parent span context */
  parentSpan?: Span;
  /** Custom attributes to add */
  customAttributes?: Record<string, string | number | boolean>;
  /** Whether to add message events */
  addMessageEvents?: boolean;
  /** Whether to add choice events */
  addChoiceEvents?: boolean;
}

/**
 * Event data for adding to spans
 */
export interface SpanEvent {
  name: string;
  attributes?: Attributes;
  timestamp?: TimeInput;
}

/**
 * Builder class for creating OTel-compliant GenAI spans
 */
export class SpanBuilder {
  private readonly options: SpanBuilderOptions;
  private readonly mapper: AttributeMapper;
  private span: Span | null = null;

  constructor(options: SpanBuilderOptions) {
    this.options = {
      operation: OPERATIONS.CHAT_COMPLETION,
      addMessageEvents: true,
      addChoiceEvents: true,
      ...options,
    };
    this.mapper = new AttributeMapper(options.provider);
  }

  /**
   * Start a new span with request attributes
   */
  startSpan(request: LLMRequest, spanName?: string): Span {
    const fallbackName =
      SPAN_NAMES[this.options.operation as keyof typeof SPAN_NAMES] ?? 'gen_ai.request';
    const name =
      spanName ?? (request.model ? `${this.options.operation} ${request.model}` : fallbackName);

    const requestAttributes = this.mapper.mapRequestAttributes(request);

    const allAttributes: Attributes = {
      ...(requestAttributes as Attributes),
      ...this.options.customAttributes,
    };

    this.span = trace.getTracer('otel-genai-semconv').startSpan(name, {
      kind: SpanKind.CLIENT,
      attributes: allAttributes,
    });

    // Add message events if configured
    if (this.options.addMessageEvents && request.messages) {
      this.addMessageEvents(request.messages);
    }

    return this.span;
  }

  /**
   * Add response attributes and events to the span
   */
  addResponse(response: LLMResponse): void {
    if (!this.span) {
      throw new Error('Span not started. Call startSpan() first.');
    }

    // Add response attributes
    const responseAttributes = this.mapper.mapResponseAttributes(response);
    this.span.setAttributes(responseAttributes as Attributes);

    // Add usage attributes
    const usageAttributes = this.mapper.mapUsageAttributes(response.usage);
    this.span.setAttributes(usageAttributes as Attributes);

    // Add usage event
    this.addUsageEvent(response.usage);

    // Add choice events if configured
    if (this.options.addChoiceEvents && response.choices) {
      this.addChoiceEvents(response.choices);
    }

    // Add assistant message event
    if (this.options.addMessageEvents && response.choices && response.choices.length > 0) {
      const assistantMessage = response.choices[0]?.message;
      if (assistantMessage) {
        this.addAssistantMessageEvent(assistantMessage.content as string);
      }
    }
  }

  /**
   * Add cost attributes to the span
   */
  addCostAttributes(costData: CostData): void {
    if (!this.span) {
      throw new Error('Span not started. Call startSpan() first.');
    }

    const costAttributes = this.mapper.mapCostAttributes(costData);
    this.span.setAttributes(costAttributes as Attributes);
  }

  /**
   * Add streaming attributes to the span
   */
  addStreamingAttributes(data: {
    timeToFirstTokenMs?: number;
    totalDurationMs?: number;
    chunkCount?: number;
  }): void {
    if (!this.span) {
      throw new Error('Span not started. Call startSpan() first.');
    }

    const streamingAttributes = this.mapper.mapStreamingAttributes(data);
    this.span.setAttributes(streamingAttributes as Attributes);
  }

  /**
   * Record an error on the span
   */
  recordError(error: Error, errorType?: string): void {
    if (!this.span) {
      throw new Error('Span not started. Call startSpan() first.');
    }

    const type = errorType ?? this.mapErrorType(error);

    this.span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });

    this.span.recordException(error);

    // Add error attributes
    this.span.setAttributes({
      'error.type': type,
      'error.message': error.message,
    });
  }

  /**
   * Set the span status to OK
   */
  setOk(): void {
    if (!this.span) {
      throw new Error('Span not started. Call startSpan() first.');
    }

    this.span.setStatus({ code: SpanStatusCode.OK });
  }

  /**
   * End the span
   */
  endSpan(): void {
    if (!this.span) {
      return;
    }

    this.span.end();
    this.span = null;
  }

  /**
   * Get the current span
   */
  getSpan(): Span | null {
    return this.span;
  }

  /**
   * Add message events for each message in the conversation
   */
  private addMessageEvents(messages: LLMRequest['messages']): void {
    if (!this.span || !messages) {
      return;
    }

    for (const message of messages) {
      const content =
        typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

      let eventName: string;
      switch (message.role) {
        case 'system':
          eventName = GEN_AI_EVENTS.SYSTEM_MESSAGE;
          break;
        case 'user':
          eventName = GEN_AI_EVENTS.USER_MESSAGE;
          break;
        case 'assistant':
          eventName = GEN_AI_EVENTS.ASSISTANT_MESSAGE;
          break;
        default:
          continue;
      }

      this.span.addEvent(eventName, {
        [EVENT_ATTRIBUTES.ROLE]: message.role,
        [EVENT_ATTRIBUTES.CONTENT]: content,
      });
    }
  }

  /**
   * Add assistant message event
   */
  private addAssistantMessageEvent(content: string): void {
    if (!this.span) {
      return;
    }

    this.span.addEvent(GEN_AI_EVENTS.ASSISTANT_MESSAGE, {
      [EVENT_ATTRIBUTES.ROLE]: 'assistant',
      [EVENT_ATTRIBUTES.CONTENT]: content,
    });
  }

  /**
   * Add choice events for each choice in the response
   */
  private addChoiceEvents(choices: LLMResponse['choices']): void {
    if (!this.span) {
      return;
    }

    for (const choice of choices) {
      const content =
        typeof choice.message.content === 'string'
          ? choice.message.content
          : JSON.stringify(choice.message.content);

      this.span.addEvent(GEN_AI_EVENTS.CHOICE, {
        [EVENT_ATTRIBUTES.INDEX]: choice.index,
        [EVENT_ATTRIBUTES.FINISH_REASON]: choice.finishReason ?? undefined,
        [EVENT_ATTRIBUTES.CONTENT]: content,
        [EVENT_ATTRIBUTES.ROLE]: choice.message.role,
      });
    }
  }

  /**
   * Add usage event
   */
  private addUsageEvent(usage: TokenUsage): void {
    if (!this.span) {
      return;
    }

    this.span.addEvent(GEN_AI_EVENTS.USAGE, {
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      ...(usage.cachedInputTokens !== undefined && {
        cached_input_tokens: usage.cachedInputTokens,
      }),
      ...(usage.totalTokens !== undefined && { total_tokens: usage.totalTokens }),
    });
  }

  /**
   * Map an error to a standard error type
   */
  private mapErrorType(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ERROR_TYPES.RATE_LIMIT;
    }
    if (
      message.includes('authentication') ||
      message.includes('unauthorized') ||
      message.includes('api key')
    ) {
      return ERROR_TYPES.AUTHENTICATION;
    }
    if (
      message.includes('invalid') ||
      message.includes('bad request') ||
      message.includes('validation')
    ) {
      return ERROR_TYPES.INVALID_REQUEST;
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return ERROR_TYPES.TIMEOUT;
    }
    if (message.includes('context length') || message.includes('max context')) {
      return ERROR_TYPES.CONTEXT_LENGTH;
    }
    if (message.includes('not found') || message.includes('does not exist')) {
      return ERROR_TYPES.MODEL_NOT_FOUND;
    }
    if (message.includes('quota') || message.includes('limit exceeded')) {
      return ERROR_TYPES.QUOTA_EXCEEDED;
    }
    if (message.includes('server error') || message.includes('internal')) {
      return ERROR_TYPES.SERVER_ERROR;
    }

    return ERROR_TYPES.UNKNOWN;
  }
}

/**
 * Factory function to create a span builder
 */
export function createSpanBuilder(options: SpanBuilderOptions): SpanBuilder {
  return new SpanBuilder(options);
}
