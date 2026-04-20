/**
 * Anthropic SDK instrumentation
 */

import { trace, Span, SpanStatusCode, type AttributeValue } from '@opentelemetry/api';
import type { Anthropic } from '@anthropic-ai/sdk';
import type { MessageCreateParams, Message } from '@anthropic-ai/sdk/resources/messages';
import type { MessageStreamEvent } from '@anthropic-ai/sdk/resources/messages';
import { Stream } from '@anthropic-ai/sdk/streaming';
import { GEN_AI_EVENTS } from '../../semconv/constants.js';
import { mapAnthropicRequest, mapAnthropicResponse } from './attribute-mapper.js';
import { CostCalculator } from '../../utils/cost-calculator.js';
import type { PricingInfo } from '../../types/domain.js';

const WRAPPED_SYMBOL = Symbol.for('otel.genai.anthropic.wrapped');
const ORIGINAL_CREATE_SYMBOL = Symbol.for('otel.genai.anthropic.original_create');

/**
 * Anthropic instrumentation configuration
 */
export interface AnthropicInstrumentationConfig {
  captureRequestHeaders?: boolean;
  captureResponseHeaders?: boolean;
  trackCosts?: boolean;
  pricing?: Record<string, PricingInfo>;
  onStart?: (span: Span, request: MessageCreateParams) => void;
  onEnd?: (span: Span, response: Message) => void;
}

/**
 * Anthropic instrumentation class
 */
export class AnthropicInstrumentation {
  private readonly tracer = trace.getTracer('otel-genai-semconv/anthropic');
  private readonly costCalculator: CostCalculator;

  constructor(private readonly config: AnthropicInstrumentationConfig = {}) {
    this.costCalculator = new CostCalculator({
      customPricing: this.withProviderPricing(config.pricing, 'anthropic'),
    });
  }

  /**
   * Instrument an Anthropic client
   */
  instrument(client: Anthropic): void {
    if (!client?.messages?.create) {
      throw new Error('Invalid Anthropic client: missing messages.create method');
    }

    if ((client.messages.create as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL]) {
      return;
    }

    const originalCreate = client.messages.create.bind(client.messages);

    client.messages.create = (async (
      body: MessageCreateParams,
      options?: { signal?: AbortSignal },
    ): Promise<Message | Stream<MessageStreamEvent>> => {
      const span = this.startSpan(body);

      try {
        const response = await originalCreate(body, options);

        if (body.stream) {
          return this.wrapStreamingResponse(span, response as Stream<MessageStreamEvent>, body);
        }

        this.captureResponse(span, response as Message);
        this.config.onEnd?.(span, response as Message);
        span.end();
        return response as Message;
      } catch (error) {
        this.captureError(span, error as Error);
        span.end();
        throw error;
      }
    }) as unknown as typeof client.messages.create;

    (client.messages.create as unknown as Record<symbol, unknown>)[ORIGINAL_CREATE_SYMBOL] =
      originalCreate;
    (client.messages.create as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL] = true;
  }

  /**
   * Remove instrumentation from an Anthropic client
   */
  uninstrument(client: Anthropic): void {
    const originalCreate = (client.messages.create as unknown as Record<symbol, unknown>)[
      ORIGINAL_CREATE_SYMBOL
    ] as typeof client.messages.create | undefined;
    if (originalCreate) {
      client.messages.create = originalCreate;
      delete (client.messages.create as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL];
      delete (client.messages.create as unknown as Record<symbol, unknown>)[ORIGINAL_CREATE_SYMBOL];
    }
  }

  /**
   * Start a span for the request
   */
  private startSpan(request: MessageCreateParams): Span {
    const attributes = mapAnthropicRequest(request) as Record<string, AttributeValue>;

    const span = this.tracer.startSpan('gen_ai.chat.completion', { attributes });

    this.config.onStart?.(span, request);

    if (request.system) {
      const systemContent =
        typeof request.system === 'string' ? request.system : JSON.stringify(request.system);
      span.addEvent(GEN_AI_EVENTS.SYSTEM_MESSAGE, { content: systemContent });
    }

    for (const message of request.messages) {
      const eventType =
        message.role === 'user' ? GEN_AI_EVENTS.USER_MESSAGE : GEN_AI_EVENTS.ASSISTANT_MESSAGE;

      const content =
        typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

      span.addEvent(eventType, { content });
    }

    return span;
  }

  /**
   * Wrap a streaming response to capture metrics
   */
  private wrapStreamingResponse(
    span: Span,
    stream: Stream<MessageStreamEvent>,
    _body: MessageCreateParams,
  ): Stream<MessageStreamEvent> {
    const startTime = Date.now();
    let timeToFirstTokenMs: number | undefined;
    let chunkCount = 0;
    const accumulatedEvents: MessageStreamEvent[] = [];
    let finalMessage: Message | undefined;

    const finalizeSpan = (): void => {
      const totalDurationMs = Date.now() - startTime;

      span.setAttribute('gen_ai.streaming.time_to_first_token_ms', timeToFirstTokenMs ?? 0);
      span.setAttribute('gen_ai.streaming.total_duration_ms', totalDurationMs);
      span.setAttribute('gen_ai.streaming.chunk_count', chunkCount);

      if (accumulatedEvents.length > 0) {
        if (finalMessage) {
          const attributes = mapAnthropicResponse(finalMessage);
          const typedAttributes = attributes as Record<string, AttributeValue>;
          for (const [key, value] of Object.entries(typedAttributes)) {
            if (value !== undefined && value !== null) {
              span.setAttribute(key, value);
            }
          }
        }

        let inputTokens = 0;
        let outputTokens = 0;
        for (const event of accumulatedEvents) {
          if (event.type === 'message_start' && event.message.usage) {
            inputTokens = event.message.usage.input_tokens;
          }
          if (event.type === 'message_delta' && event.usage) {
            outputTokens = event.usage.output_tokens;
          }
        }
        if (inputTokens > 0) {
          span.setAttribute('gen_ai.usage.input_tokens', inputTokens);
        }
        if (outputTokens > 0) {
          span.setAttribute('gen_ai.usage.output_tokens', outputTokens);
        }
        if (this.config.trackCosts !== false && finalMessage?.model && inputTokens > 0) {
          this.captureCost(span, finalMessage.model, inputTokens, outputTokens);
        }
      }

      span.end();
    };

    const captureError = (error: Error): void => {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      span.setAttribute('error.type', this.mapErrorType(error));
    };

    async function* wrappedStream(): AsyncGenerator<MessageStreamEvent> {
      try {
        for await (const chunk of stream) {
          if (timeToFirstTokenMs === undefined) {
            timeToFirstTokenMs = Date.now() - startTime;
          }
          chunkCount++;
          accumulatedEvents.push(chunk);
          if (chunk.type === 'message_start') {
            finalMessage = chunk.message;
          } else if (chunk.type === 'message_delta' && finalMessage) {
            const delta = 'delta' in chunk ? chunk.delta : undefined;
            finalMessage = {
              ...finalMessage,
              stop_reason: delta?.stop_reason ?? finalMessage.stop_reason,
              stop_sequence: delta?.stop_sequence ?? finalMessage.stop_sequence,
              usage: chunk.usage
                ? {
                    ...finalMessage.usage,
                    output_tokens: chunk.usage.output_tokens,
                  }
                : finalMessage.usage,
            };
          }
          yield chunk;
        }
        finalizeSpan();
      } catch (error) {
        captureError(error instanceof Error ? error : new Error(String(error)));
        span.end();
        throw error;
      }
    }

    return new Stream(() => wrappedStream(), stream.controller);
  }

  /**
   * Capture response data
   */
  private captureResponse(span: Span, response: Message): void {
    const attributes = mapAnthropicResponse(response);

    const typedAttributes = attributes as Record<string, AttributeValue>;
    for (const [key, value] of Object.entries(typedAttributes)) {
      if (value !== undefined && value !== null) {
        span.setAttribute(key, value);
      }
    }

    if (this.config.trackCosts !== false && response.usage) {
      this.captureCost(
        span,
        response.model,
        response.usage.input_tokens,
        response.usage.output_tokens,
      );
    }

    for (const content of response.content) {
      if (content.type === 'text') {
        span.addEvent(GEN_AI_EVENTS.ASSISTANT_MESSAGE, { content: content.text });
      } else if ('type' in content && content.type === 'tool_use') {
        const toolContent = content as unknown as { name: string; input: unknown };
        span.addEvent('gen_ai.tool_call', {
          tool_name: toolContent.name,
          tool_input: JSON.stringify(toolContent.input),
        });
      }
    }

    if (response.usage) {
      span.setAttribute('gen_ai.usage.input_tokens', response.usage.input_tokens);
      span.setAttribute('gen_ai.usage.output_tokens', response.usage.output_tokens);
    }
  }

  /**
   * Capture error data
   */
  private captureError(span: Span, error: Error): void {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });

    span.recordException(error);

    const errorType = this.mapErrorType(error);
    span.setAttribute('error.type', errorType);
  }

  /**
   * Map error to error type
   */
  private mapErrorType(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('rate limit') || message.includes('429')) {
      return 'rate_limit_error';
    }
    if (message.includes('authentication') || message.includes('401')) {
      return 'authentication_error';
    }
    if (message.includes('invalid') || message.includes('400')) {
      return 'invalid_request_error';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not_found_error';
    }
    if (message.includes('server') || message.includes('500')) {
      return 'server_error';
    }

    return 'unknown_error';
  }

  private captureCost(span: Span, model: string, inputTokens: number, outputTokens: number): void {
    const cost = this.costCalculator.calculate({
      provider: 'anthropic',
      model,
      inputTokens,
      outputTokens,
    });
    span.setAttribute('llm.cost.total', cost.total);
    span.setAttribute('llm.cost.input', cost.input);
    span.setAttribute('llm.cost.output', cost.output);
    span.setAttribute('llm.cost.currency', cost.currency);
  }

  private withProviderPricing(
    pricing: Record<string, PricingInfo> | undefined,
    provider: PricingInfo['provider'],
  ): Record<string, PricingInfo> | undefined {
    if (!pricing) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(pricing).map(([model, info]) => [model, { ...info, provider }]),
    );
  }
}
