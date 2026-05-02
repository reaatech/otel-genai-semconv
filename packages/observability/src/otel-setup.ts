import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

export interface OTelConfig {
  serviceName?: string;
  serviceVersion?: string;
  otlpEndpoint?: string;
  additionalResources?: Record<string, string>;
}

export function initOTelSDK(config: OTelConfig = {}): NodeSDK {
  const {
    serviceName = 'otel-genai-semconv',
    serviceVersion = '1.0.0',
    otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
    additionalResources = {},
  } = config;

  const resource = resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    ...additionalResources,
  });

  const traceExporter = new OTLPTraceExporter({
    url: otlpEndpoint,
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
  });

  return sdk;
}

export async function startOTelSDK(config?: OTelConfig): Promise<NodeSDK> {
  const sdk = initOTelSDK(config);
  await sdk.start();
  return sdk;
}

export async function shutdownOTelSDK(sdk: NodeSDK): Promise<void> {
  await sdk.shutdown();
}
