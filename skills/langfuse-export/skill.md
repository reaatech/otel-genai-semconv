# Langfuse Export Skill

## Overview

This skill provides export functionality for Langfuse, enabling comprehensive LLM trace and observation tracking.

## Usage

```typescript
import { LangfuseExporter } from 'otel-genai-semconv/langfuse';

const exporter = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
  projectId: process.env.LANGFUSE_PROJECT_ID,
});
```

## Features

- OTel span to Langfuse trace/observation conversion
- Session and trace management
- Score export for quality metrics
- Automatic input/output extraction

## Dashboard

Import the included dashboard definition:

```bash
cp dashboards/langfuse/llm-performance.yaml /path/to/langfuse/dashboards/
```

### Dashboard Panels

- Model performance comparison
- Cost tracking per project/team
- Usage trends and anomalies
- Quality metrics integration
- Latency percentiles (p50, p90, p95, p99)
