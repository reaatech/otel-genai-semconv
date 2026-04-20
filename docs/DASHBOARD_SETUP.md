# Dashboard Setup Guide

This guide covers setting up dashboards for LLM observability using Phoenix, Langfuse, and Cloud Trace.

## Phoenix Dashboard

### Setup

1. Start Phoenix:
   ```bash
   docker run -p 6006:6006 arizephoenix/phoenix
   ```

2. Import the dashboard:
   ```bash
   # Copy dashboard definition
   cp dashboards/phoenix/llm-observability.json /path/to/phoenix/dashboards/
   ```

3. Or use the exporter:
   ```typescript
   import { PhoenixExporter } from 'otel-genai-semconv/phoenix';

   const exporter = new PhoenixExporter({
     endpoint: process.env.PHOENIX_ENDPOINT || 'http://localhost:6006',
     datasetName: 'llm-traces',
   });
   ```

### Dashboard Panels

- **LLM Call Latency Heatmap** — Visualize latency distribution over time
- **Token Usage Breakdown** — Input vs output tokens by model
- **Cost Per Request** — Track costs across providers
- **Error Rate by Provider** — Monitor reliability
- **Trace Waterfall** — Understand request flow
- **Time-to-First-Token** — Streaming performance metrics

## Langfuse Dashboard

### Setup

1. Deploy Langfuse (cloud or self-hosted)

2. Import the dashboard:
   ```bash
   cp dashboards/langfuse/llm-performance.yaml /path/to/langfuse/dashboards/
   ```

3. Or use the exporter:
   ```typescript
   import { LangfuseExporter } from 'otel-genai-semconv/langfuse';

   const exporter = new LangfuseExporter({
     publicKey: process.env.LANGFUSE_PUBLIC_KEY,
     secretKey: process.env.LANGFUSE_SECRET_KEY,
     baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
   });
   ```

### Dashboard Panels

- **Model Performance Comparison** — Compare latency and quality across models
- **Cost Tracking** — Track costs per project/team
- **Usage Trends** — Identify anomalies in usage patterns
- **Quality Metrics** — Integrate with quality scoring
- **Latency Percentiles** — p50, p90, p95, p99 metrics

## Cloud Trace Dashboard

### Setup

1. Enable Cloud Trace API in your GCP project

2. Import the dashboard:
   ```bash
   cp dashboards/cloud-trace/genai-metrics.json /path/to/cloud-monitoring/dashboards/
   ```

3. Or use the exporter:
   ```typescript
   import { CloudTraceExporter } from 'otel-genai-semconv/cloud-trace';

   const exporter = new CloudTraceExporter({
     projectId: process.env.GOOGLE_CLOUD_PROJECT,
     serviceName: 'my-llm-app',
   });
   ```

### Dashboard Panels

- **GenAI Span Latency Percentiles** — p50, p90, p95, p99
- **Token Consumption Metrics** — Track token usage over time
- **Cost Attribution** — Costs by service/team
- **Error Budgets** — SLO tracking
- **Provider Health** — Overview of all providers

## Custom Dashboards

You can create custom dashboards using the exported metrics:

### Grafana

```yaml
# Example Grafana dashboard
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

### Key Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `genai.requests.total` | Total requests | Sudden drop |
| `genai.request.duration_ms` | Request latency | p95 > 5s |
| `genai.tokens.input` | Input tokens | Budget exceeded |
| `genai.tokens.output` | Output tokens | Unexpected spike |
| `genai.cost.total` | Cost per request | Budget exceeded |
| `genai.errors.total` | Error count | Error rate > 1% |

## References

- [Phoenix Documentation](https://docs.arize.com/phoenix)
- [Langfuse Documentation](https://langfuse.com/docs)
- [Cloud Trace Documentation](https://cloud.google.com/trace)
- [AGENTS.md](../AGENTS.md) — Agent development guide
