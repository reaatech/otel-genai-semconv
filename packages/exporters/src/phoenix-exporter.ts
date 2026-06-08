import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';

const ExportResultCode = { SUCCESS: 0, FAILED: 1 } as const;

export interface PhoenixExporterConfig {
  endpoint?: string;
  datasetName?: string;
  includeEmbeddings?: boolean;
  maxSpans?: number;
}

interface PhoenixSpan {
  trace_id: string;
  span_id: string;
  parent_span_id: string | undefined;
  name: string;
  start_time: number;
  end_time: number;
  status: { code?: number; message?: string };
  attributes: Record<string, unknown>;
  events: Array<{ name: string; time?: [number, number]; attributes?: Record<string, unknown> }>;
}

export class PhoenixExporter implements SpanExporter {
  private readonly spans: ReadableSpan[] = [];
  private readonly maxSpans: number;

  constructor(config: PhoenixExporterConfig = {}) {
    this.maxSpans = config.maxSpans ?? 1000;
  }

  export(
    spans: ReadableSpan[],
    resultCallback: (result: { code: 0 | 1; error?: Error }) => void,
  ): void {
    try {
      for (const span of spans) {
        if (span.name.startsWith('gen_ai.')) {
          if (this.spans.length >= this.maxSpans) {
            this.spans.shift();
          }
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

  getPhoenixFormat(): PhoenixSpan[] {
    return this.spans.map((span) => ({
      trace_id: span.spanContext().traceId,
      span_id: span.spanContext().spanId,
      parent_span_id: span.parentSpanContext?.spanId,
      name: span.name,
      start_time: this.hrTimeToMs(span.startTime),
      end_time:
        this.hrTimeToMs(span.startTime) + (span.duration[0] * 1000 + span.duration[1] / 1000000),
      status: span.status,
      attributes: span.attributes,
      events: span.events.map((e) => ({
        name: e.name,
        time: e.time,
        attributes: e.attributes,
      })),
    }));
  }

  private hrTimeToMs(hrTime: [number, number]): number {
    return hrTime[0] * 1000 + hrTime[1] / 1000000;
  }

  async forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  async shutdown(): Promise<void> {
    this.spans.length = 0;
    return Promise.resolve();
  }
}

export function createPhoenixExporter(config?: PhoenixExporterConfig): PhoenixExporter {
  return new PhoenixExporter(config);
}
