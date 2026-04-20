# Cloud Trace Export Skill

## Overview

This skill provides export functionality for GCP Cloud Trace, enabling LLM trace visualization in Google Cloud.

## Usage

```typescript
import { CloudTraceExporter } from 'otel-genai-semconv/cloud-trace';

const exporter = new CloudTraceExporter({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  serviceName: 'my-llm-app',
  region: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
});
```

## Features

- OTel span to Cloud Trace format conversion
- Proper parent-child span relationships
- GenAI-specific attribute mapping
- Integration with Cloud Monitoring

## Dashboard

Import the included dashboard definition:

```bash
cp dashboards/cloud-trace/genai-metrics.json /path/to/cloud-monitoring/dashboards/
```

### Dashboard Panels

- GenAI span latency percentiles (p50, p90, p95, p99)
- Token consumption metrics
- Cost attribution by service
- Error budgets and SLOs
- Provider health overview
