# Phoenix Export Skill

## Overview

This skill provides export functionality for Arize Phoenix, enabling LLM trace visualization and analysis.

## Usage

```typescript
import { PhoenixExporter } from 'otel-genai-semconv/phoenix';

const exporter = new PhoenixExporter({
  endpoint: process.env.PHOENIX_ENDPOINT || 'http://localhost:6006',
  datasetName: 'llm-traces',
  includeEmbeddings: false,
});
```

## Features

- Automatic span filtering for GenAI traces
- Phoenix-compatible trace format conversion
- Support for embedding export (for RAG tracing)
- Batch export for efficiency

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
