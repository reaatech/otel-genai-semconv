/**
 * Vertex AI SDK instrumentation
 */

import { trace, Span, SpanStatusCode, type AttributeValue } from '@opentelemetry/api';
import { GEN_AI_EVENTS } from '../../semconv/constants.js';
import {
  mapVertexAIRequest,
  mapVertexAIResponse,
  type GenerateContentRequest,
  type GenerateContentResponse,
} from './attribute-mapper.js';
import { CostCalculator } from '../../utils/cost-calculator.js';
import type { PricingInfo } from '../../types/domain.js';

type GenerativeModel = {
  generateContent: (req: unknown) => Promise<GenerateContentResponse>;
  model?: string;
};

const WRAPPED_SYMBOL = Symbol.for('otel.genai.vertexai.wrapped');
const ORIGINAL_GENERATE_SYMBOL = Symbol.for('otel.genai.vertexai.original_generate');

/**
 * Vertex AI instrumentation configuration
 */
export interface VertexAIInstrumentationConfig {
  captureRequestHeaders?: boolean;
  captureResponseHeaders?: boolean;
  trackCosts?: boolean;
  pricing?: Record<string, PricingInfo>;
  projectId?: string;
  location?: string;
  onStart?: (span: Span, request: GenerateContentRequest) => void;
  onEnd?: (span: Span, response: GenerateContentResponse) => void;
}

export class VertexAIInstrumentation {
  private readonly tracer = trace.getTracer('otel-genai-semconv/vertexai');
  private readonly config: VertexAIInstrumentationConfig;
  private readonly costCalculator: CostCalculator;

  constructor(config: VertexAIInstrumentationConfig = {}) {
    this.config = {
      captureRequestHeaders: false,
      captureResponseHeaders: false,
      trackCosts: true,
      ...config,
    };
    this.costCalculator = new CostCalculator({
      customPricing: this.withProviderPricing(config.pricing, 'vertexai'),
    });
  }

  instrument(model: GenerativeModel): void {
    if (!model?.generateContent) {
      throw new Error('Invalid Vertex AI model: missing generateContent method');
    }

    if ((model.generateContent as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL]) {
      return;
    }

    const originalGenerateContent = model.generateContent.bind(model);

    model.generateContent = async (req: unknown): Promise<GenerateContentResponse> => {
      const request = req as GenerateContentRequest | string;
      const normalizedRequest =
        typeof request === 'string'
          ? { contents: [{ role: 'user', parts: [{ text: request }] }] }
          : request;

      const span = this.startSpan(normalizedRequest, model.model ?? 'unknown');

      try {
        const response = await originalGenerateContent(normalizedRequest);
        this.captureResponse(span, response);
        this.config.onEnd?.(span, response);
        span.end();
        return response;
      } catch (error) {
        this.captureError(span, error as Error);
        span.end();
        throw error;
      }
    };

    (model.generateContent as unknown as Record<symbol, unknown>)[ORIGINAL_GENERATE_SYMBOL] =
      originalGenerateContent;
    (model.generateContent as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL] = true;
  }

  uninstrument(model: GenerativeModel): void {
    const original = (model.generateContent as unknown as Record<symbol, unknown>)[
      ORIGINAL_GENERATE_SYMBOL
    ] as typeof model.generateContent | undefined;
    if (original) {
      model.generateContent = original;
      delete (model.generateContent as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL];
      delete (model.generateContent as unknown as Record<symbol, unknown>)[
        ORIGINAL_GENERATE_SYMBOL
      ];
    }
  }

  /**
   * Start a span for the request
   */
  private startSpan(request: GenerateContentRequest, model: string): Span {
    const attributes = mapVertexAIRequest(request, model) as Record<string, AttributeValue>;

    if (this.config.projectId) {
      attributes['gcp.project_id'] = this.config.projectId;
    }
    if (this.config.location) {
      attributes['gcp.location'] = this.config.location;
    }

    const span = this.tracer.startSpan('gen_ai.chat.completion', { attributes });

    this.config.onStart?.(span, request);

    // Add message events
    for (const content of request.contents) {
      const eventType =
        content.role === 'user' ? GEN_AI_EVENTS.USER_MESSAGE : GEN_AI_EVENTS.ASSISTANT_MESSAGE;

      const textParts = content.parts
        .filter(
          (p: unknown): p is { text: string } =>
            typeof p === 'object' &&
            p !== null &&
            'text' in p &&
            typeof (p as { text: string }).text === 'string',
        )
        .map((p) => p.text)
        .join('');

      span.addEvent(eventType, { content: textParts });
    }

    // Add system instruction if present
    if (request.systemInstruction) {
      const textParts = request.systemInstruction.parts
        .filter(
          (p: unknown): p is { text: string } =>
            typeof p === 'object' &&
            p !== null &&
            'text' in p &&
            typeof (p as { text: string }).text === 'string',
        )
        .map((p) => p.text)
        .join('');
      span.addEvent(GEN_AI_EVENTS.SYSTEM_MESSAGE, { content: textParts });
    }

    return span;
  }

  /**
   * Capture response data
   */
  private captureResponse(span: Span, response: GenerateContentResponse): void {
    const attributes = mapVertexAIResponse(response);

    const typedAttributes = attributes as Record<string, AttributeValue>;
    for (const [key, value] of Object.entries(typedAttributes)) {
      if (value !== undefined && value !== null) {
        span.setAttribute(key, value);
      }
    }

    // Add candidate events
    if (response.candidates) {
      for (let i = 0; i < response.candidates.length; i++) {
        const candidate = response.candidates[i];
        if (!candidate) {
          continue;
        }
        const textParts =
          candidate.content?.parts
            ?.filter(
              (p: unknown): p is { text: string } =>
                typeof p === 'object' &&
                p !== null &&
                'text' in p &&
                typeof (p as { text: string }).text === 'string',
            )
            ?.map((p) => p.text)
            .join('') ?? '';

        span.addEvent(GEN_AI_EVENTS.CHOICE, {
          index: i,
          finish_reason: candidate.finishReason ?? 'unknown',
          message: textParts,
        });
      }
    }

    // Token usage
    if (response.usageMetadata) {
      const inputTokens = response.usageMetadata.promptTokenCount ?? 0;
      const outputTokens = response.usageMetadata.candidatesTokenCount ?? 0;
      span.setAttribute('gen_ai.usage.input_tokens', inputTokens);
      span.setAttribute(
        'gen_ai.usage.output_tokens',
        outputTokens,
      );
      if (this.config.trackCosts !== false) {
        this.captureCost(
          span,
          response.modelVersion ?? 'unknown',
          inputTokens,
          outputTokens,
        );
      }
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

    // Map error type
    const errorType = this.mapErrorType(error);
    span.setAttribute('error.type', errorType);
  }

  /**
   * Map error to error type
   */
  private mapErrorType(error: Error & { code?: number; details?: string }): string {
    const message = error.message.toLowerCase();
    const details = (error.details ?? '').toLowerCase();

    if (message.includes('deadline') || details.includes('deadline_exceeded') || error.code === 4) {
      return 'timeout_error';
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return 'rate_limit_error';
    }
    if (message.includes('permission') || message.includes('403')) {
      return 'permission_denied_error';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not_found_error';
    }
    if (message.includes('invalid') || message.includes('400')) {
      return 'invalid_request_error';
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
      provider: 'vertexai',
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
