# Dashboard Export

## Capability
Export telemetry data to Phoenix, Langfuse, and Cloud Trace with pre-built dashboards.

## Usage Examples

### Example 1: Phoenix Export
```typescript
import { PhoenixExporter } from 'otel-genai-semconv/phoenix';

const exporter = new PhoenixExporter({
  endpoint: process.env.PHOENIX_ENDPOINT || 'http://localhost:6006',
  datasetName: 'llm-traces',
});

await exporter.export({
  traces: spanData,
  embeddings: embeddingVectors, // Optional
  metadata: { model: 'v2', date: new Date().toISOString() },
});
```

### Example 2: Langfuse Export
```typescript
import { LangfuseExporter } from 'otel-genai-semconv/langfuse';

const exporter = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
});

await exporter.export({
  traces: spanData,
  traceName: 'llm-evaluation',
  sessionId: `eval-${Date.now()}`,
});
```

### Example 3: Cloud Trace Export
```typescript
import { CloudTraceExporter } from 'otel-genai-semconv/cloud-trace';

const exporter = new CloudTraceExporter({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  serviceName: 'my-llm-app',
});

await exporter.export({
  traces: spanData,
  attributes: { environment: 'production' },
});
```

## Dashboard Panels

### Phoenix Dashboard
- LLM call latency heatmaps
- Token usage breakdown by model
- Cost per request tracking
- Error rate by provider
- Trace waterfall visualization
- Time-to-first-token metrics

### Langfuse Dashboard
- Model performance comparison
- Cost tracking per project/team
- Usage trends and anomalies
- Quality metrics integration
- Latency percentiles

### Cloud Trace Dashboard
- GenAI span latency percentiles (p50, p90, p95, p99)
- Token consumption metrics
- Cost attribution by service
- Error budgets and SLOs
- Provider health overview

## Error Handling
- **Network error**: Retry with exponential backoff
- **Authentication error**: Log error, skip export, continue
- **Rate limit**: Queue for later, respect retry-after header
- **Invalid data**: Log warning, skip invalid traces

## Security Considerations
- API keys stored in environment variables
- TLS for all exports
- PII redaction before export
- Audit logging for all export operations

## Performance
- Async export (non-blocking)
- Batch processing for efficiency
- Configurable batch size and interval
- Memory-efficient streaming for large datasets
