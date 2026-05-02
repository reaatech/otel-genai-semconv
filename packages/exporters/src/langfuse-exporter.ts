import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';

const ExportResultCode = { SUCCESS: 0, FAILED: 1 } as const;
const SpanStatusCode = { UNSET: 0, OK: 1, ERROR: 2 } as const;

export interface LangfuseExporterConfig {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
  projectId?: string;
}

export class LangfuseExporter implements SpanExporter {
  private readonly spans: ReadableSpan[] = [];

  constructor(_config: LangfuseExporterConfig = {}) {
    void _config;
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

  getLangfuseFormat(): unknown[] {
    return this.spans.map((span) => ({
      traceId: span.spanContext().traceId,
      observationId: span.spanContext().spanId,
      parentObservationId: span.parentSpanContext?.spanId,
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

  private extractInput(span: ReadableSpan): unknown {
    const userMessage = span.events.find((e) => e.name === 'gen_ai.user.message');
    if (userMessage) {
      return { content: (userMessage.attributes as Record<string, unknown>)?.content };
    }
    return null;
  }

  private extractOutput(span: ReadableSpan): unknown {
    const assistantMessage = span.events.find((e) => e.name === 'gen_ai.assistant.message');
    if (assistantMessage) {
      return { content: (assistantMessage.attributes as Record<string, unknown>)?.content };
    }
    return null;
  }

  async forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  private hrTimeToDate(hrTime: [number, number]): Date {
    return new Date(hrTime[0] * 1000 + hrTime[1] / 1000000);
  }

  private hrTimeToEndDate(startTime: [number, number], duration: [number, number]): Date {
    const startMs = startTime[0] * 1000 + startTime[1] / 1000000;
    const durationMs = duration[0] * 1000 + duration[1] / 1000000;
    return new Date(startMs + durationMs);
  }

  async shutdown(): Promise<void> {
    this.spans.length = 0;
    return Promise.resolve();
  }
}

export function createLangfuseExporter(config?: LangfuseExporterConfig): LangfuseExporter {
  return new LangfuseExporter(config);
}
