# @reaatech/otel-genai-semconv-exporters

[![npm version](https://img.shields.io/npm/v/@reaatech/otel-genai-semconv-exporters.svg)](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-exporters)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/otel-genai-semconv/ci.yml?branch=main&label=CI)](https://github.com/reaatech/otel-genai-semconv/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Custom OpenTelemetry span exporters that convert GenAI spans into the native format of three observability platforms: [Arize Phoenix](https://phoenix.arize.com), [Langfuse](https://langfuse.com), and [Google Cloud Trace](https://cloud.google.com/trace). Each exporter implements the OTel `SpanExporter` interface and provides a `get*Format()` method for direct format conversion.

## Installation

```bash
npm install @reaatech/otel-genai-semconv-exporters
# or
pnpm add @reaatech/otel-genai-semconv-exporters
```

## Feature Overview

- **Phoenix exporter** — converts OTel spans to Phoenix dataset format with trace/span/parent IDs, timestamps, attributes, and events
- **Langfuse exporter** — converts spans to Langfuse trace/observation format with auto-extracted input/output from message events
- **Cloud Trace exporter** — converts spans to GCP Cloud Trace format with project-scoped trace IDs, display names, and span kind/status mapping
- **Circular buffer** — configurable max span capacity with oldest-eviction for Phoenix and Cloud Trace exporters
- **Span filtering** — all exporters filter to `gen_ai.*` spans only
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import {
  PhoenixExporter,
  LangfuseExporter,
  CloudTraceExporter,
} from "@reaatech/otel-genai-semconv-exporters";

const phoenix = new PhoenixExporter({
  datasetName: "llm-traces",
  maxSpans: 1000,
});

const langfuse = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

const cloudTrace = new CloudTraceExporter({
  projectId: "my-gcp-project",
  serviceName: "llm-gateway",
});
```

## API Reference

### `PhoenixExporter` (class)

Implements `SpanExporter`. Buffers `gen_ai.*` spans and provides Phoenix-compatible format conversion.

#### Constructor

```typescript
new PhoenixExporter({ endpoint?, datasetName?, includeEmbeddings?, maxSpans? })
```

#### `PhoenixExporterConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `endpoint` | `string` | — | Phoenix endpoint URL |
| `datasetName` | `string` | — | Dataset name for traces |
| `includeEmbeddings` | `boolean` | — | Include embedding data |
| `maxSpans` | `number` | `1000` | Max spans to buffer before oldest eviction |

#### Methods

| Method | Description |
|--------|-------------|
| `export(spans, resultCallback)` | Buffer GenAI spans, invoke callback |
| `getPhoenixFormat()` | Returns spans in Phoenix format |
| `forceFlush()` | No-op (spans are in-memory) |
| `shutdown()` | Clear all buffered spans |

#### Phoenix Format

Each span is converted to:

```typescript
{
  trace_id: string,
  span_id: string,
  parent_span_id?: string,
  name: string,
  start_time: number,   // milliseconds
  end_time: number,      // milliseconds
  status: { code, message? },
  attributes: Record<string, unknown>,
  events: Array<{ name, time, attributes }>,
}
```

### `LangfuseExporter` (class)

Implements `SpanExporter`. Buffers `gen_ai.*` spans and provides Langfuse trace/observation format conversion.

#### Constructor

```typescript
new LangfuseExporter({ publicKey?, secretKey?, baseUrl?, projectId? })
```

#### `LangfuseExporterConfig`

| Property | Type | Description |
|----------|------|-------------|
| `publicKey` | `string` | Langfuse public key |
| `secretKey` | `string` | Langfuse secret key |
| `baseUrl` | `string` | Langfuse base URL |
| `projectId` | `string` | Project identifier |

#### Methods

| Method | Description |
|--------|-------------|
| `export(spans, resultCallback)` | Buffer GenAI spans, invoke callback |
| `getLangfuseFormat()` | Returns spans in Langfuse format |
| `forceFlush()` | No-op |
| `shutdown()` | Clear all buffered spans |

#### Langfuse Format

Each span is converted to:

```typescript
{
  traceId: string,
  observationId: string,       // span ID
  parentObservationId?: string, // parent span ID
  name: string,
  startTime: string,           // ISO 8601
  endTime: string,             // ISO 8601
  level: "DEFAULT" | "ERROR",
  input: { content: string } | null,   // auto-extracted from gen_ai.user.message event
  output: { content: string } | null,  // auto-extracted from gen_ai.assistant.message event
  metadata: { attributes, events },
}
```

### `CloudTraceExporter` (class)

Implements `SpanExporter`. Buffers `gen_ai.*` spans and provides GCP Cloud Trace format conversion.

#### Constructor

```typescript
new CloudTraceExporter({ projectId?, serviceName?, region?, maxSpans? })
```

#### `CloudTraceExporterConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `projectId` | `string` | `""` | GCP project ID |
| `serviceName` | `string` | `"otel-genai-semconv"` | Service name for attribution |
| `region` | `string` | `"us-central1"` | GCP region |
| `maxSpans` | `number` | `1000` | Max spans to buffer before oldest eviction |

#### Methods

| Method | Description |
|--------|-------------|
| `export(spans, resultCallback)` | Buffer GenAI spans, invoke callback |
| `getCloudTraceFormat()` | Returns spans in Cloud Trace format |
| `forceFlush()` | No-op |
| `shutdown()` | Clear all buffered spans |

#### Cloud Trace Format

Span attributes are validated (only `string | number | boolean` values). Three convenience attributes are flattened: `gen_ai/input_tokens`, `gen_ai/output_tokens`, `gen_ai/model`.

## Usage Patterns

### Registration as OTel Span Processor

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PhoenixExporter } from "@reaatech/otel-genai-semconv-exporters";

const sdk = new NodeSDK({
  spanProcessors: [new PhoenixExporter({ datasetName: "llm-traces" })],
});
```

### Direct Format Conversion

Each exporter provides a format conversion method for use outside the OTel pipeline:

```typescript
const exporter = new LangfuseExporter();
exporter.export(spans, () => {});
const langfuseTraces = exporter.getLangfuseFormat();
// Submit to Langfuse API directly
```

### Factory Functions

```typescript
import {
  createPhoenixExporter,
  createLangfuseExporter,
  createCloudTraceExporter,
} from "@reaatech/otel-genai-semconv-exporters";

const phoenix = createPhoenixExporter({ datasetName: "my-traces" });
const langfuse = createLangfuseExporter({ publicKey: "pk_...", secretKey: "sk_..." });
const cloudTrace = createCloudTraceExporter({ projectId: "my-project" });
```

## Related Packages

- [`@reaatech/otel-genai-semconv-core`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types and constants
- [`@reaatech/otel-genai-semconv-observability`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-observability) — OTel SDK setup and metrics

## License

[MIT](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
