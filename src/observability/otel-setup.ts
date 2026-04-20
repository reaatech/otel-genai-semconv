/**
 * OpenTelemetry SDK setup for GenAI instrumentation
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

/**
 * OTel SDK configuration
 */
export interface OTelConfig {
  /** Service name */
  serviceName?: string;
  /** Service version */
  serviceVersion?: string;
  /** OTLP endpoint */
  otlpEndpoint?: string;
  /** Additional resources */
  additionalResources?: Record<string, string>;
}

/**
 * Initialize OpenTelemetry SDK for GenAI instrumentation
 */
export function initOTelSDK(config: OTelConfig = {}): NodeSDK {
  const {
    serviceName = 'otel-genai-semconv',
    serviceVersion = '1.0.0',
    otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
    additionalResources = {},
  } = config;

  const resource = new Resource({
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

/**
 * Start the OTel SDK
 */
export async function startOTelSDK(config?: OTelConfig): Promise<NodeSDK> {
  const sdk = initOTelSDK(config);
  await sdk.start();
  return sdk;
}

/**
 * Shutdown the OTel SDK gracefully
 */
export async function shutdownOTelSDK(sdk: NodeSDK): Promise<void> {
  await sdk.shutdown();
}
