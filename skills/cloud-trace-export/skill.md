# Cloud Trace Export Skill

## Overview

This skill provides export functionality for GCP Cloud Trace, enabling LLM trace visualization in Google Cloud via the exporter in `@reaatech/otel-genai-semconv-exporters`.

## Usage

```typescript
import { CloudTraceExporter } from '@reaatech/otel-genai-semconv-exporters';

const exporter = new CloudTraceExporter({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  serviceName: 'my-llm-app',
  region: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
  maxSpans: 1000,
});
```

## Features

- OTel span to Cloud Trace format conversion
- Proper parent-child span relationships
- GenAI-specific attribute mapping (input/output tokens, model flattened to `gen_ai/*` keys)
- Span kind mapping: CLIENT, SERVER, INTERNAL, etc.
- Span status mapping: UNSET, OK, ERROR
- Circular buffer with configurable max span capacity
- Factory function: `createCloudTraceExporter(config?)`

## Cloud Trace Format

Span attributes are validated — only `string | number | boolean` values pass through. Three convenience attributes are flattened:
- `gen_ai/input_tokens` (from `gen_ai.usage.input_tokens`)
- `gen_ai/output_tokens` (from `gen_ai.usage.output_tokens`)
- `gen_ai/model` (from `gen_ai.request.model`)

## Dashboard Panels

- GenAI span latency percentiles (p50, p90, p95, p99)
- Token consumption metrics
- Cost attribution by service
- Error budgets and SLOs
- Provider health overview
