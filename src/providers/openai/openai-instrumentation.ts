/**
 * OpenAI SDK instrumentation
 */

import { trace, Span, SpanStatusCode, type AttributeValue } from '@opentelemetry/api';
import type { OpenAI } from 'openai';
import type { ChatCompletionCreateParams, ChatCompletion } from 'openai/resources/chat/completions';
import type { ChatCompletionChunk } from 'openai/resources/chat/completions';
import { Stream as OpenAIStream } from 'openai/streaming';
import { GEN_AI_EVENTS } from '../../semconv/constants.js';
import { mapOpenAIRequest, mapOpenAIResponse } from './attribute-mapper.js';
import { CostCalculator } from '../../utils/cost-calculator.js';
import type { PricingInfo } from '../../types/domain.js';

const WRAPPED_SYMBOL = Symbol.for('otel.genai.openai.wrapped');
const ORIGINAL_CREATE_SYMBOL = Symbol.for('otel.genai.openai.original_create');

export interface OpenAIInstrumentationConfig {
  captureRequestHeaders?: boolean;
  captureResponseHeaders?: boolean;
  trackCosts?: boolean;
  pricing?: Record<string, PricingInfo>;
  onStart?: (span: Span, request: ChatCompletionCreateParams) => void;
  onEnd?: (span: Span, response: ChatCompletion) => void;
}

export class OpenAIInstrumentation {
  private readonly tracer = trace.getTracer('otel-genai-semconv/openai');
  private readonly costCalculator: CostCalculator;

  constructor(private readonly config: OpenAIInstrumentationConfig = {}) {
    this.costCalculator = new CostCalculator({
      customPricing: this.withProviderPricing(config.pricing, 'openai'),
    });
  }

  instrument(client: OpenAI): void {
    if (!client?.chat?.completions?.create) {
      throw new Error('Invalid OpenAI client: missing chat.completions.create method');
    }

    if ((client.chat.completions.create as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL]) {
      return;
    }

    const originalCreate = client.chat.completions.create.bind(client.chat.completions);

    client.chat.completions.create = (async (
      body: ChatCompletionCreateParams,
      options?: { signal?: AbortSignal },
    ): Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>> => {
      const span = this.startSpan(body);

      try {
        const response = await originalCreate(body, options);

        if (body.stream) {
          return this.wrapStreamingResponse(
            span,
            response as OpenAIStream<ChatCompletionChunk>,
            body,
          );
        }

        this.captureResponse(span, response as ChatCompletion);
        this.config.onEnd?.(span, response as ChatCompletion);
        span.end();
        return response as ChatCompletion;
      } catch (error) {
        this.captureError(span, error as Error);
        span.end();
        throw error;
      }
    }) as unknown as typeof client.chat.completions.create;

    (client.chat.completions.create as unknown as Record<symbol, unknown>)[ORIGINAL_CREATE_SYMBOL] =
      originalCreate;
    (client.chat.completions.create as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL] = true;
  }

  uninstrument(client: OpenAI): void {
    const originalCreate = (client.chat.completions.create as unknown as Record<symbol, unknown>)[
      ORIGINAL_CREATE_SYMBOL
    ] as typeof client.chat.completions.create | undefined;
    if (originalCreate) {
      client.chat.completions.create = originalCreate;
      delete (client.chat.completions.create as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL];
      delete (client.chat.completions.create as unknown as Record<symbol, unknown>)[
        ORIGINAL_CREATE_SYMBOL
      ];
    }
  }

  private startSpan(request: ChatCompletionCreateParams): Span {
    const attributes = mapOpenAIRequest(request) as Record<string, AttributeValue>;
    const span = this.tracer.startSpan('gen_ai.chat.completion', { attributes });

    this.config.onStart?.(span, request);

    for (const message of request.messages) {
      const eventType =
        message.role === 'system'
          ? GEN_AI_EVENTS.SYSTEM_MESSAGE
          : message.role === 'user'
            ? GEN_AI_EVENTS.USER_MESSAGE
            : GEN_AI_EVENTS.ASSISTANT_MESSAGE;

      span.addEvent(eventType, {
        content:
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      });
    }

    return span;
  }

  private wrapStreamingResponse(
    span: Span,
    stream: OpenAIStream<ChatCompletionChunk>,
    _body: ChatCompletionCreateParams,
  ): OpenAIStream<ChatCompletionChunk> {
    const startTime = Date.now();
    let timeToFirstTokenMs: number | undefined;
    let chunkCount = 0;
    let responseId: string | undefined;
    let responseModel: string | undefined;
    const finishReasons = new Set<string>();
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;

    const finalizeSpan = (): void => {
      const totalDurationMs = Date.now() - startTime;

      span.setAttribute('gen_ai.streaming.time_to_first_token_ms', timeToFirstTokenMs ?? 0);
      span.setAttribute('gen_ai.streaming.total_duration_ms', totalDurationMs);
      span.setAttribute('gen_ai.streaming.chunk_count', chunkCount);

      if (responseId) {
        span.setAttribute('gen_ai.response.id', responseId);
      }
      if (responseModel) {
        span.setAttribute('gen_ai.response.model', responseModel);
      }
      if (finishReasons.size > 0) {
        span.setAttribute('gen_ai.response.finish_reasons', Array.from(finishReasons));
      }
      if (promptTokens !== undefined) {
        span.setAttribute('gen_ai.usage.input_tokens', promptTokens);
      }
      if (completionTokens !== undefined) {
        span.setAttribute('gen_ai.usage.output_tokens', completionTokens);
      }
      if (this.config.trackCosts !== false && responseModel && promptTokens !== undefined) {
        this.captureCost(span, responseModel, promptTokens, completionTokens ?? 0);
      }

      span.end();
    };

    const captureError = (error: Error): void => {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      span.setAttribute('error.type', this.mapErrorType(error));
    };

    async function* wrappedStream(): AsyncGenerator<ChatCompletionChunk> {
      try {
        for await (const chunk of stream) {
          if (timeToFirstTokenMs === undefined) {
            timeToFirstTokenMs = Date.now() - startTime;
          }
          chunkCount++;
          responseId ??= chunk.id;
          responseModel ??= chunk.model;
          for (const choice of chunk.choices) {
            if (choice.finish_reason) {
              finishReasons.add(choice.finish_reason);
            }
          }
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens;
            completionTokens = chunk.usage.completion_tokens;
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

    return new OpenAIStream(() => wrappedStream(), stream.controller);
  }

  private captureResponse(span: Span, response: ChatCompletion): void {
    const attributes = mapOpenAIResponse(response);

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
        response.usage.prompt_tokens,
        response.usage.completion_tokens,
      );
    }

    for (let i = 0; i < response.choices.length; i++) {
      const choice = response.choices[i];
      if (choice) {
        span.addEvent(GEN_AI_EVENTS.CHOICE, {
          index: i,
          finish_reason: choice.finish_reason || 'unknown',
          message: JSON.stringify(choice.message),
        });
      }
    }
  }

  private captureError(span: Span, error: Error): void {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });

    span.recordException(error);

    const errorType = this.mapErrorType(error);
    span.setAttribute('error.type', errorType);
  }

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

  private captureCost(
    span: Span,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): void {
    const cost = this.costCalculator.calculate({
      provider: 'openai',
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
