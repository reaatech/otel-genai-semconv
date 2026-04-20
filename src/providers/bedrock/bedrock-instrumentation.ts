/**
 * AWS Bedrock SDK instrumentation
 */

import { trace, Span, SpanStatusCode, type AttributeValue } from '@opentelemetry/api';
import type { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { TextDecoder } from 'util';
import { GEN_AI_EVENTS } from '../../semconv/constants.js';
import { mapBedrockRequest, mapBedrockResponse } from './attribute-mapper.js';
import { CostCalculator } from '../../utils/cost-calculator.js';
import type { PricingInfo } from '../../types/domain.js';

const WRAPPED_SYMBOL = Symbol.for('otel.genai.bedrock.wrapped');
const ORIGINAL_SEND_SYMBOL = Symbol.for('otel.genai.bedrock.original_send');

/**
 * Bedrock instrumentation configuration
 */
export interface BedrockInstrumentationConfig {
  /** Capture request headers */
  captureRequestHeaders?: boolean;
  /** Capture response headers */
  captureResponseHeaders?: boolean;
  /** Track costs based on token usage */
  trackCosts?: boolean;
  /** Custom pricing overrides */
  pricing?: Record<string, PricingInfo>;
  /** AWS Region */
  region?: string;
  /** Track specific model families */
  trackModelFamilies?: string[];
  /** Hook called when a span starts */
  onStart?: (span: Span, request: { modelId: string; body: string }) => void;
  /** Hook called when a span ends */
  onEnd?: (span: Span, response: unknown) => void;
}

/**
 * Bedrock instrumentation class
 */
export class BedrockInstrumentation {
  private readonly tracer = trace.getTracer('otel-genai-semconv/bedrock');
  private readonly config: BedrockInstrumentationConfig;
  private readonly costCalculator: CostCalculator;

  constructor(config: BedrockInstrumentationConfig = {}) {
    this.config = {
      captureRequestHeaders: false,
      captureResponseHeaders: false,
      trackCosts: true,
      trackModelFamilies: ['anthropic', 'amazon', 'cohere', 'ai21'],
      ...config,
    };
    this.costCalculator = new CostCalculator({
      customPricing: this.withProviderPricing(config.pricing, 'bedrock'),
    });
  }

  /**
   * Instrument a Bedrock Runtime client
   */
  instrument(client: BedrockRuntimeClient): void {
    if (!client?.send) {
      throw new Error('Invalid Bedrock client: missing send method');
    }

    if ((client as unknown as Record<symbol, boolean>)[WRAPPED_SYMBOL]) {
      return;
    }

    const originalSend = client.send.bind(client);
    (client as unknown as Record<symbol, unknown>)[ORIGINAL_SEND_SYMBOL] = originalSend;
    (client as unknown as Record<symbol, boolean>)[WRAPPED_SYMBOL] = true;

    client.send = async <T>(command: unknown): Promise<T> => {
      if (
        (command as { constructor?: { name: string } }).constructor?.name !== 'InvokeModelCommand'
      ) {
        return originalSend(command as Parameters<typeof originalSend>[0]) as Promise<T>;
      }

      const cmd = command as { input: { modelId: string; body: string } };
      const modelId = cmd.input?.modelId;

      if (!modelId || !this.isTrackedModel(modelId)) {
        return originalSend(command as Parameters<typeof originalSend>[0]) as Promise<T>;
      }

      const span = this.startSpan(cmd.input, modelId);
      this.config.onStart?.(span, cmd.input);

      try {
        const response = await originalSend(command as Parameters<typeof originalSend>[0]);

        const responseObj = response as {
          body?: Uint8Array | string;
          output?: { body?: Uint8Array | string };
        };
        this.captureResponse(span, responseObj, modelId);

        this.config.onEnd?.(span, response);

        span.end();
        return response as T;
      } catch (error) {
        this.captureError(span, error as Error);
        span.end();
        throw error;
      }
    };
  }

  /**
   * Remove instrumentation from a Bedrock Runtime client
   */
  uninstrument(client: BedrockRuntimeClient): void {
    const originalSend = (client as unknown as Record<symbol, unknown>)[ORIGINAL_SEND_SYMBOL] as
      | typeof client.send
      | undefined;
    if (originalSend) {
      client.send = originalSend;
      delete (client as unknown as Record<symbol, unknown>)[ORIGINAL_SEND_SYMBOL];
      delete (client as unknown as Record<symbol, unknown>)[WRAPPED_SYMBOL];
    }
  }

  /**
   * Check if model family should be tracked
   */
  private isTrackedModel(modelId: string | undefined): boolean {
    if (!modelId) {
      return false;
    }

    const dotIndex = modelId.indexOf('.');
    const modelFamily = dotIndex >= 0 ? modelId.substring(0, dotIndex) : modelId;
    return this.config.trackModelFamilies?.includes(modelFamily) ?? false;
  }

  /**
   * Start a span for the request
   */
  private startSpan(input: { modelId: string; body: string }, modelId: string): Span {
    const attributes = mapBedrockRequest(input, modelId) as Record<string, AttributeValue>;

    if (this.config.region) {
      attributes['aws.region'] = this.config.region;
    }

    const span = this.tracer.startSpan('gen_ai.chat.completion', { attributes });

    // Add model family info
    const modelFamily = modelId.split('.')[0]!;
    span.setAttribute('gen_ai.provider.family', modelFamily);

    return span;
  }

  /**
   * Capture response data
   */
  private captureResponse(
    span: Span,
    response: { body?: Uint8Array | string; output?: { body?: Uint8Array | string } },
    modelId: string,
  ): void {
    const rawBody = response.body ?? response.output?.body;
    if (!rawBody) {
      return;
    }

    const bodyStr = typeof rawBody === 'string' ? rawBody : new TextDecoder().decode(rawBody);

    const attributes = mapBedrockResponse(bodyStr, modelId);

    const typedAttributes = attributes as Record<string, AttributeValue>;
    for (const [key, value] of Object.entries(typedAttributes)) {
      if (value !== undefined && value !== null) {
        span.setAttribute(key, value);
      }
    }

    if (this.config.trackCosts !== false) {
      const inputTokens = typedAttributes['gen_ai.usage.input_tokens'];
      const outputTokens = typedAttributes['gen_ai.usage.output_tokens'];
      if (typeof inputTokens === 'number' || typeof outputTokens === 'number') {
        this.captureCost(span, modelId, Number(inputTokens ?? 0), Number(outputTokens ?? 0));
      }
    }

    // Add choice event
    const finishReasons = typedAttributes['gen_ai.response.finish_reasons'] as string[] | undefined;
    span.addEvent(GEN_AI_EVENTS.CHOICE, {
      finish_reason: finishReasons?.[0] ?? 'unknown',
    });
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
  private mapErrorType(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('throttl') || message.includes('429')) {
      return 'rate_limit_error';
    }
    if (message.includes('access') || message.includes('403')) {
      return 'access_denied_error';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not_found_error';
    }
    if (message.includes('validation') || message.includes('400')) {
      return 'validation_error';
    }
    if (message.includes('server') || message.includes('500')) {
      return 'server_error';
    }

    return 'unknown_error';
  }

  private captureCost(span: Span, model: string, inputTokens: number, outputTokens: number): void {
    const cost = this.costCalculator.calculate({
      provider: 'bedrock',
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
