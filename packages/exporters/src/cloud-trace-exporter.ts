import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';

const ExportResultCode = { SUCCESS: 0, FAILED: 1 } as const;

export interface CloudTraceExporterConfig {
  projectId?: string;
  serviceName?: string;
  region?: string;
  maxSpans?: number;
}

export class CloudTraceExporter implements SpanExporter {
  private readonly config: Required<CloudTraceExporterConfig>;
  private readonly spans: ReadableSpan[] = [];
  private readonly maxSpans: number;

  constructor(config: CloudTraceExporterConfig = {}) {
    this.maxSpans = config.maxSpans ?? 1000;
    this.config = {
      ...config,
      projectId: config.projectId ?? '',
      serviceName: config.serviceName ?? 'otel-genai-semconv',
      region: config.region ?? 'us-central1',
      maxSpans: this.maxSpans,
    };
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

  getCloudTraceFormat(): unknown[] {
    return this.spans.map((span) => ({
      projectId: this.config.projectId,
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      parentSpanId: span.parentSpanContext?.spanId ?? '',
      name: span.name,
      startTime: this.hrTimeToDate(span.startTime).toISOString(),
      endTime: this.hrTimeToEndDate(span.startTime, span.duration).toISOString(),
      attributes: this.formatAttributes(span),
      displayName: {
        value: span.name,
        truncatedByteCount: 0,
      },
      spanKind: this.mapSpanKind(span.kind),
      spanStatus: this.mapSpanStatus(span.status),
    }));
  }

  private hrTimeToDate(hrTime: [number, number]): Date {
    return new Date(hrTime[0] * 1000 + hrTime[1] / 1000000);
  }

  private hrTimeToEndDate(startTime: [number, number], duration: [number, number]): Date {
    const startMs = startTime[0] * 1000 + startTime[1] / 1000000;
    const durationMs = duration[0] * 1000 + duration[1] / 1000000;
    return new Date(startMs + durationMs);
  }

  private formatAttributes(span: ReadableSpan): Record<string, string | number | boolean> {
    const attributes: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(span.attributes)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        attributes[key] = value;
      } else {
        attributes[key] = JSON.stringify(value);
      }
    }

    if (span.attributes['gen_ai.usage.input_tokens']) {
      attributes['gen_ai/input_tokens'] = Number(span.attributes['gen_ai.usage.input_tokens']);
    }
    if (span.attributes['gen_ai.usage.output_tokens']) {
      attributes['gen_ai/output_tokens'] = Number(span.attributes['gen_ai.usage.output_tokens']);
    }
    if (span.attributes['gen_ai.request.model']) {
      attributes['gen_ai/model'] = String(span.attributes['gen_ai.request.model']);
    }

    return attributes;
  }

  private mapSpanKind(kind: number): string {
    switch (kind) {
      case 1:
        return 'UNSPECIFIED';
      case 2:
        return 'INTERNAL';
      case 3:
        return 'SERVER';
      case 4:
        return 'CLIENT';
      case 5:
        return 'PRODUCER';
      case 6:
        return 'CONSUMER';
      default:
        return 'UNSPECIFIED';
    }
  }

  private mapSpanStatus(status: { code?: number; message?: string }): {
    code: string;
    message?: string;
  } {
    switch (status.code) {
      case 0:
        return { code: 'UNSET' };
      case 1:
        return { code: 'OK' };
      case 2:
        return { code: 'ERROR', message: status.message };
      default:
        return { code: 'UNSET' };
    }
  }

  async forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  async shutdown(): Promise<void> {
    this.spans.length = 0;
    return Promise.resolve();
  }
}

export function createCloudTraceExporter(config?: CloudTraceExporterConfig): CloudTraceExporter {
  return new CloudTraceExporter(config);
}
