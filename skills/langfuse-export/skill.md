# Langfuse Export Skill

## Overview

This skill provides export functionality for Langfuse, enabling comprehensive LLM trace and observation tracking via the exporter in `@reaatech/otel-genai-semconv-exporters`.

## Usage

```typescript
import { LangfuseExporter } from '@reaatech/otel-genai-semconv-exporters';

const exporter = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
});
```

## Features

- OTel span to Langfuse trace/observation conversion
- Automatic input extraction from `gen_ai.user.message` events
- Automatic output extraction from `gen_ai.assistant.message` events
- Error level mapping: spans with ERROR status → `level: "ERROR"`
- Factory function: `createLangfuseExporter(config?)`

## Langfuse Format

Each span is converted to:
```
{
  traceId: string,
  observationId: string,       // span ID
  parentObservationId?: string, // parent span ID (if any)
  name: string,
  startTime: string,           // ISO 8601
  endTime: string,             // ISO 8601
  level: "DEFAULT" | "ERROR",
  input: { content: string } | null,
  output: { content: string } | null,
  metadata: { attributes, events },
}
```

## Dashboard Panels

- Model performance comparison
- Cost tracking per project/team
- Usage trends and anomalies
- Quality metrics integration
- Latency percentiles (p50, p90, p95, p99)

## Related Packages

- [@reaatech/otel-genai-semconv-core](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types
