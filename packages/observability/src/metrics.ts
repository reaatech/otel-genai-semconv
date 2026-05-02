import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ConsoleMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

export const GENAI_METRICS = {
  REQUESTS_TOTAL: 'genai.requests.total',
  REQUEST_DURATION_MS: 'genai.request.duration_ms',
  TOKENS_INPUT: 'genai.tokens.input',
  TOKENS_OUTPUT: 'genai.tokens.output',
  COST_TOTAL: 'genai.cost.total',
  ERRORS_TOTAL: 'genai.errors.total',
  STREAMING_TTFT_MS: 'genai.streaming.time_to_first_token_ms',
} as const;

export interface MetricsConfig {
  serviceName?: string;
  otlpEndpoint?: string;
  exportIntervalMs?: number;
}

export function initMetrics(config: MetricsConfig = {}): MeterProvider {
  const { serviceName = 'otel-genai-semconv', exportIntervalMs = 60000 } = config;

  const resource = resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
  });

  const exporter = new ConsoleMetricExporter();

  const reader = new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: exportIntervalMs,
  });

  const meterProvider = new MeterProvider({
    resource,
    readers: [reader],
  });

  return meterProvider;
}

export interface GenAIMeter {
  requestsTotal: ReturnType<ReturnType<MeterProvider['getMeter']>['createCounter']>;
  requestDuration: ReturnType<ReturnType<MeterProvider['getMeter']>['createHistogram']>;
  tokensInput: ReturnType<ReturnType<MeterProvider['getMeter']>['createCounter']>;
  tokensOutput: ReturnType<ReturnType<MeterProvider['getMeter']>['createCounter']>;
  costTotal: ReturnType<ReturnType<MeterProvider['getMeter']>['createHistogram']>;
  errorsTotal: ReturnType<ReturnType<MeterProvider['getMeter']>['createCounter']>;
  streamingTTFT: ReturnType<ReturnType<MeterProvider['getMeter']>['createHistogram']>;
}

export function createGenAIMeter(meterProvider: MeterProvider): GenAIMeter {
  const meter = meterProvider.getMeter('otel-genai-semconv', '1.0.0');

  return {
    requestsTotal: meter.createCounter(GENAI_METRICS.REQUESTS_TOTAL, {
      description: 'Total number of LLM requests',
      unit: '{requests}',
    }),
    requestDuration: meter.createHistogram(GENAI_METRICS.REQUEST_DURATION_MS, {
      description: 'Duration of LLM requests in milliseconds',
      unit: 'ms',
    }),
    tokensInput: meter.createCounter(GENAI_METRICS.TOKENS_INPUT, {
      description: 'Number of input tokens',
      unit: '{tokens}',
    }),
    tokensOutput: meter.createCounter(GENAI_METRICS.TOKENS_OUTPUT, {
      description: 'Number of output tokens',
      unit: '{tokens}',
    }),
    costTotal: meter.createHistogram(GENAI_METRICS.COST_TOTAL, {
      description: 'Total cost of LLM request in USD',
      unit: 'USD',
    }),
    errorsTotal: meter.createCounter(GENAI_METRICS.ERRORS_TOTAL, {
      description: 'Total number of LLM errors',
      unit: '{errors}',
    }),
    streamingTTFT: meter.createHistogram(GENAI_METRICS.STREAMING_TTFT_MS, {
      description: 'Time to first token in milliseconds for streaming responses',
      unit: 'ms',
    }),
  };
}
