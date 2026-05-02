# @reaatech/otel-genai-semconv-observability

[![npm version](https://img.shields.io/npm/v/@reaatech/otel-genai-semconv-observability.svg)](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-observability)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/otel-genai-semconv/ci.yml?branch=main&label=CI)](https://github.com/reaatech/otel-genai-semconv/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Structured logging, OpenTelemetry SDK setup, metrics instrumentation, and health checks for GenAI workloads. Built on [Pino](https://github.com/pinojs/pino) (v10) and the [OpenTelemetry JS SDK](https://github.com/open-telemetry/opentelemetry-js), providing a zero-config path to production observability for LLM applications.

## Installation

```bash
npm install @reaatech/otel-genai-semconv-observability
# or
pnpm add @reaatech/otel-genai-semconv-observability
```

## Feature Overview

- **Structured JSON logging** — Pino-powered with automatic pretty-printing in development
- **OpenTelemetry SDK bootstrap** — one-call initialization with OTLP trace export
- **GenAI metrics** — pre-built counters and histograms for requests, tokens, cost, errors, and TTFT
- **Runtime health checks** — OTel SDK health, memory threshold monitoring, exporter connectivity
- **HTTP health endpoint** — pluggable handler for Kubernetes/Docker health probes
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import { initOTelSDK, createLogger, initMetrics } from "@reaatech/otel-genai-semconv-observability";

// Start the OTel SDK with OTLP export
const sdk = initOTelSDK({ serviceName: "my-llm-app" });
await sdk.start();

// Create a structured logger
const logger = createLogger({ level: "info" });
logger.info({ provider: "openai", model: "gpt-4" }, "LLM request started");

// Set up metrics
const meterProvider = initMetrics({ serviceName: "my-llm-app" });
```

## API Reference

### OpenTelemetry SDK Setup

#### `initOTelSDK(config?): NodeSDK`

Creates a configured `NodeSDK` instance with OTLP trace export. Does not start the SDK — call `sdk.start()` after creation.

```typescript
const sdk = initOTelSDK({
  serviceName: "my-service",
  serviceVersion: "1.0.0",
  otlpEndpoint: "http://localhost:4318/v1/traces",
  additionalResources: { "deployment.environment": "production" },
});
```

#### `OTelConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `serviceName` | `string` | `"otel-genai-semconv"` | Service name for resource attributes |
| `serviceVersion` | `string` | `"1.0.0"` | Service version |
| `otlpEndpoint` | `string` | `env.OTEL_EXPORTER_OTLP_ENDPOINT` or `localhost:4318` | OTLP HTTP trace endpoint |
| `additionalResources` | `Record<string, string>` | — | Additional OTel resource attributes |

#### `startOTelSDK(config?): Promise<NodeSDK>`

Creates and starts the SDK in one call. Returns the running SDK instance.

#### `shutdownOTelSDK(sdk: NodeSDK): Promise<void>`

Gracefully shuts down the SDK, flushing pending spans and metrics.

### Logging

#### `createLogger(config?): Logger`

Creates a configured Pino logger instance.

```typescript
const logger = createLogger({
  level: "debug",
  prettyPrint: true,
  serviceName: "my-llm-app",
});
```

#### `LoggerConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `level` | `string` | `env.LOG_LEVEL` or `"info"` | Minimum log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`) |
| `prettyPrint` | `boolean` | `NODE_ENV !== "production"` | Enable pino-pretty for human-readable output |
| `serviceName` | `string` | `"otel-genai-semconv"` | Service name in log context |

#### `logGenAIEvent(logger, level, message, context?)`

Log a GenAI event with structured context:

```typescript
logGenAIEvent(logger, "info", "LLM request completed", {
  provider: "openai",
  model: "gpt-4",
  inputTokens: 50,
  outputTokens: 100,
  costUsd: 0.0045,
  durationMs: 1234,
  traceId: span.spanContext().traceId,
});
```

#### `LogContext`

| Property | Type | Description |
|----------|------|-------------|
| `traceId` | `string` | OTel trace ID |
| `spanId` | `string` | OTel span ID |
| `provider` | `string` | LLM provider name |
| `model` | `string` | Model name |
| `inputTokens` | `number` | Input token count |
| `outputTokens` | `number` | Output token count |
| `costUsd` | `number` | Cost in USD |
| `durationMs` | `number` | Request duration in ms |
| `error` | `string` | Error message |

### Metrics

#### `initMetrics(config?): MeterProvider`

Creates a `MeterProvider` with periodic console export.

#### `createGenAIMeter(meterProvider): GenAIMeter`

Creates pre-configured metric instruments:

| Instrument | Type | Name | Description |
|-----------|------|------|-------------|
| `requestsTotal` | Counter | `genai.requests.total` | Total LLM requests |
| `requestDuration` | Histogram | `genai.request.duration_ms` | Request latency in ms |
| `tokensInput` | Counter | `genai.tokens.input` | Input tokens consumed |
| `tokensOutput` | Counter | `genai.tokens.output` | Output tokens generated |
| `costTotal` | Histogram | `genai.cost.total` | Cost per request in USD |
| `errorsTotal` | Counter | `genai.errors.total` | Total errors |
| `streamingTTFT` | Histogram | `genai.streaming.time_to_first_token_ms` | Time to first token in ms |

### Health Checks

#### `performHealthCheck(config?): Promise<HealthCheckResult>`

Runs a health check and returns a structured result:

```typescript
const result = await performHealthCheck({ memoryThresholdMB: 512 });
// { healthy: true, components: { otelSDK: { healthy: true }, memory: { healthy: true, ... } }, timestamp: "..." }
```

#### `HealthCheckConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `checkOTelSDK` | `boolean` | `true` | Verify OTel tracer is operational |
| `checkExporterConnectivity` | `boolean` | `false` | Verify exporter connectivity |
| `memoryThresholdMB` | `number` | `512` | Heap threshold for memory health |

#### `createHealthCheckHandler(config?)`

Returns an HTTP handler suitable for Express/Hono health endpoints. Returns 200 when healthy, 503 when unhealthy.

## Usage Patterns

### Structured Context Logging

```typescript
const logger = createLogger({ serviceName: "llm-gateway" });

logger.info({
  provider: "openai",
  model: "gpt-4",
  requestId: "req-abc123",
}, "Processing completion request");
```

### Error Logging

```typescript
try {
  await client.chat.completions.create(params);
} catch (err) {
  logger.error({ err, provider: "openai" }, "LLM request failed");
}
```

### Production vs Development

The logger automatically switches behavior:
- **Development** (`NODE_ENV !== "production"`): colorized, human-readable output via `pino-pretty`
- **Production** (`NODE_ENV === "production"`): raw JSON for log aggregators (Datadog, CloudWatch, ELK)

## Related Packages

- [`@reaatech/otel-genai-semconv-core`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types and constants
- [`@reaatech/otel-genai-semconv-instrumentation`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-instrumentation) — Instrumentation framework
- [`@reaatech/otel-genai-semconv-exporters`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-exporters) — Dashboard exporters

## License

[MIT](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
