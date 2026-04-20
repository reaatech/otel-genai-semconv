/**
 * Langfuse exporter for LLM traces
 */

import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

const ExportResultCode = { SUCCESS: 0, FAILED: 1 } as const;
const SpanStatusCode = { UNSET: 0, OK: 1, ERROR: 2 } as const;

/**
 * Langfuse exporter configuration
 */
export interface LangfuseExporterConfig {
  /** Langfuse public key */
  publicKey?: string;
  /** Langfuse secret key */
  secretKey?: string;
  /** Langfuse base URL */
  baseUrl?: string;
  /** Project ID */
  projectId?: string;
}

/**
 * Exporter for Langfuse
 * Converts OTel spans to Langfuse trace/observation format
 */
export class LangfuseExporter implements SpanExporter {
  private readonly spans: ReadableSpan[] = [];

  constructor(_config: LangfuseExporterConfig = {}) {
    // Config not used
  }

  export(
    spans: ReadableSpan[],
    resultCallback: (result: { code: 0 | 1; error?: Error }) => void,
  ): void {
    try {
      for (const span of spans) {
        if (span.name.startsWith('gen_ai.')) {
          this.spans.push(span);
        }
      }

      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (error) {
      resultCallback({
        code: ExportResultCode.FAILED,
        error: error as Error,
      });
    }
  }

  /**
   * Get spans in Langfuse format
   */
  getLangfuseFormat(): unknown[] {
    return this.spans.map((span) => ({
      traceId: span.spanContext().traceId,
      observationId: span.spanContext().spanId,
      parentObservationId: span.parentSpanId,
      name: span.name,
      startTime: this.hrTimeToDate(span.startTime).toISOString(),
      endTime: this.hrTimeToEndDate(span.startTime, span.duration).toISOString(),
      level: span.status.code === SpanStatusCode.ERROR ? 'ERROR' : 'DEFAULT',
      input: this.extractInput(span),
      output: this.extractOutput(span),
      metadata: {
        attributes: span.attributes,
        events: span.events,
      },
    }));
  }

  /**
   * Extract input from span
   */
  private extractInput(span: ReadableSpan): unknown {
    const userMessage = span.events.find((e) => e.name === 'gen_ai.user.message');
    if (userMessage) {
      return { content: (userMessage.attributes as Record<string, unknown>)?.content };
    }
    return null;
  }

  /**
   * Extract output from span
   */
  private extractOutput(span: ReadableSpan): unknown {
    const assistantMessage = span.events.find((e) => e.name === 'gen_ai.assistant.message');
    if (assistantMessage) {
      return { content: (assistantMessage.attributes as Record<string, unknown>)?.content };
    }
    return null;
  }

  /**
   * Force flush pending spans
   */
  async forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Convert HrTime [seconds, nanoseconds] to Date
   */
  private hrTimeToDate(hrTime: [number, number]): Date {
    return new Date(hrTime[0] * 1000 + hrTime[1] / 1000000);
  }

  /**
   * Convert start HrTime + duration HrTime to end Date
   */
  private hrTimeToEndDate(startTime: [number, number], duration: [number, number]): Date {
    const startMs = startTime[0] * 1000 + startTime[1] / 1000000;
    const durationMs = duration[0] * 1000 + duration[1] / 1000000;
    return new Date(startMs + durationMs);
  }

  /**
   * Shutdown the exporter
   */
  async shutdown(): Promise<void> {
    this.spans.length = 0;
    return Promise.resolve();
  }
}

/**
 * Create a new Langfuse exporter
 */
export function createLangfuseExporter(config?: LangfuseExporterConfig): LangfuseExporter {
  return new LangfuseExporter(config);
}
