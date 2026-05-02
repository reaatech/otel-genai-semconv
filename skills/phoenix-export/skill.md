# Phoenix Export Skill

## Overview

This skill provides export functionality for Arize Phoenix, enabling LLM trace visualization and analysis via the exporter in `@reaatech/otel-genai-semconv-exporters`.

## Usage

```typescript
import { PhoenixExporter } from '@reaatech/otel-genai-semconv-exporters';

const exporter = new PhoenixExporter({
  endpoint: process.env.PHOENIX_ENDPOINT || 'http://localhost:6006',
  datasetName: 'llm-traces',
  includeEmbeddings: false,
  maxSpans: 1000,
});
```

## Features

- Automatic span filtering for GenAI traces (`gen_ai.*` spans only)
- Phoenix-compatible trace format conversion (trace_id, span_id, parent_span_id, timestamps)
- Support for embedding export
- Circular buffer with configurable max span capacity
- Factory function: `createPhoenixExporter(config?)`

## Phoenix Format

Each span is converted to:
```
{
  trace_id: string,
  span_id: string,
  parent_span_id?: string,
  name: string,
  start_time: number,   // milliseconds from HrTime
  end_time: number,      // start_time + duration
  status: { code, message? },
  attributes: Record<string, unknown>,
  events: Array<{ name, time, attributes }>,
}
```

## Dashboard

Import the included dashboard definition:

```bash
cp dashboards/phoenix/llm-observability.json /path/to/phoenix/dashboards/
```

### Dashboard Panels

- LLM call latency heatmaps
- Token usage breakdown by model
- Cost per request tracking
- Error rate by provider
- Trace waterfall visualization
- Time-to-first-token metrics

## Related Packages

- [@reaatech/otel-genai-semconv-core](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types
