import { type Span, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import type { Attributes, TimeInput } from '@opentelemetry/api';
import { AttributeMapper } from './attribute-mapper.js';
import {
  ERROR_TYPES,
  EVENT_ATTRIBUTES,
  GEN_AI_EVENTS,
  OPERATIONS,
  SPAN_NAMES,
} from './constants.js';
import type { CostData, LLMRequest, LLMResponse, TokenUsage } from './domain.js';
import type { ProviderType } from './domain.js';

export interface SpanBuilderOptions {
  provider: ProviderType;
  operation?: string;
  parentSpan?: Span;
  customAttributes?: Record<string, string | number | boolean>;
  addMessageEvents?: boolean;
  addChoiceEvents?: boolean;
}

export interface SpanEvent {
  name: string;
  attributes?: Attributes;
  timestamp?: TimeInput;
}

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

    if (this.options.addMessageEvents && request.messages) {
      this.addMessageEvents(request.messages);
    }

    return this.span;
  }

  addResponse(response: LLMResponse): void {
    if (!this.span) {
      throw new Error('Span not started. Call startSpan() first.');
    }

    const responseAttributes = this.mapper.mapResponseAttributes(response);
    this.span.setAttributes(responseAttributes as Attributes);

    const usageAttributes = this.mapper.mapUsageAttributes(response.usage);
    this.span.setAttributes(usageAttributes as Attributes);

    this.addUsageEvent(response.usage);

    if (this.options.addChoiceEvents && response.choices) {
      this.addChoiceEvents(response.choices);
    }

    if (this.options.addMessageEvents && response.choices && response.choices.length > 0) {
      const assistantMessage = response.choices[0]?.message;
      if (assistantMessage) {
        this.addAssistantMessageEvent(assistantMessage.content as string);
      }
    }
  }

  addCostAttributes(costData: CostData): void {
    if (!this.span) {
      throw new Error('Span not started. Call startSpan() first.');
    }

    const costAttributes = this.mapper.mapCostAttributes(costData);
    this.span.setAttributes(costAttributes as Attributes);
  }

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

    this.span.setAttributes({
      'error.type': type,
      'error.message': error.message,
    });
  }

  setOk(): void {
    if (!this.span) {
      throw new Error('Span not started. Call startSpan() first.');
    }

    this.span.setStatus({ code: SpanStatusCode.OK });
  }

  endSpan(): void {
    if (!this.span) {
      return;
    }

    this.span.end();
    this.span = null;
  }

  getSpan(): Span | null {
    return this.span;
  }

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

  private addAssistantMessageEvent(content: string): void {
    if (!this.span) {
      return;
    }

    this.span.addEvent(GEN_AI_EVENTS.ASSISTANT_MESSAGE, {
      [EVENT_ATTRIBUTES.ROLE]: 'assistant',
      [EVENT_ATTRIBUTES.CONTENT]: content,
    });
  }

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

export function createSpanBuilder(options: SpanBuilderOptions): SpanBuilder {
  return new SpanBuilder(options);
}
