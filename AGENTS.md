---
agent_id: "otel-genai-semconv"
display_name: "OTel GenAI SemConv"
version: "0.1.0"
description: "OpenTelemetry semantic conventions for GenAI observability"
type: "mcp"
confidence_threshold: 0.9
---

# otel-genai-semconv — Agent Development Guide

## What this is

This document defines how to use `otel-genai-semconv` to instrument AI agents with
OpenTelemetry GenAI semantic conventions. It covers provider wrapper usage, span
attribute mapping, cost tracking, dashboard integration, and best practices for
production observability.

**Target audience:** Engineers building AI agents who need production-grade observability,
OTel spec compliance, and consistent telemetry across multiple LLM providers.

---

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  AI Agent       │────▶│  otel-genai-     │────▶│  LLM Providers  │
│  (Node.js)      │     │  semconv         │     │  (OpenAI,       │
└─────────────────┘     │  (Instrumentation)│    │   Anthropic,    │
                                │             │   Vertex,       │
                                ▼             │   Bedrock)      │
                       ┌──────────────────┐   └─────────────────┘
                       │  OTel Collector  │             │
                       │  (Spans + Events)│             │
                       └──────────────────┘             │
                                │                       │
                                ▼                       ▼
                       ┌──────────────────┐   ┌─────────────────┐
                       │    Dashboards    │   │   Observability │
                       │  Phoenix/Langfuse│   │   Backends      │
                       │  /Cloud Trace    │   │                 │
                       └──────────────────┘   └─────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **Provider Wrappers** | `src/providers/` | Instrumented SDK wrappers for each LLM provider |
| **Semantic Convention Mapper** | `src/semconv/` | Map provider responses to OTel GenAI semconv |
| **Token Counter** | `src/utils/token-counter.ts` | Accurate token counting per provider |
| **Cost Calculator** | `src/utils/cost-calculator.ts` | Cost tracking based on token usage |
| **Dashboard Exporters** | `src/exporters/` | Export to Phoenix, Langfuse, Cloud Trace |
| **Span Builder** | `src/semconv/span-builder.ts` | Build OTel-compliant spans |

---

## Quick Start

### Installation

```bash
npm install otel-genai-semconv @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

### Basic Instrumentation

```typescript
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OpenAIInstrumentation } from 'otel-genai-semconv/openai';
import { AnthropicInstrumentation } from 'otel-genai-semconv/anthropic';

// Initialize SDK
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    new OpenAIInstrumentation({
      captureRequestHeaders: true,
      captureResponseHeaders: true,
      trackCosts: true,
    }),
    new AnthropicInstrumentation({
      captureRequestHeaders: true,
      captureResponseHeaders: true,
      trackCosts: true,
    }),
  ],
});

sdk.start();

// Now use OpenAI or Anthropic SDKs normally - they're automatically instrumented
import OpenAI from 'openai';

const client = new OpenAI();
const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

---

## Provider-Specific Guides

### OpenAI

```typescript
import { OpenAIInstrumentation } from 'otel-genai-semconv/openai';

const instrumentation = new OpenAIInstrumentation({
  // Capture request/response headers (default: false)
  captureRequestHeaders: true,
  captureResponseHeaders: true,
  
  // Track costs based on token usage (default: true)
  trackCosts: true,
  
  // Custom pricing (overrides default pricing)
  pricing: {
    'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
  },
  
  // Hook for custom span attributes
  onStart: (span, request) => {
    span.setAttribute('user.id', request.user?.id);
  },
  
  // Hook for post-processing
  onEnd: (context) => {
    const { span, response } = context;
    span.setAttribute('response.quality', calculateQuality(response));
  },
});
```

**Captured Attributes:**
- `gen_ai.request.model` — model name
- `gen_ai.request.temperature` — sampling temperature
- `gen_ai.request.max_tokens` — max tokens limit
- `gen_ai.response.model` — actual model used
- `gen_ai.response.finish_reasons` — finish reasons
- `gen_ai.usage.input_tokens` — prompt tokens
- `gen_ai.usage.output_tokens` — completion tokens
- `llm.cost.total` — total cost in USD

### Anthropic

```typescript
import { AnthropicInstrumentation } from 'otel-genai-semconv/anthropic';

const instrumentation = new AnthropicInstrumentation({
  captureRequestHeaders: true,
  captureResponseHeaders: true,
  trackCosts: true,
  
  // Hook for custom attributes
  onStart: (span, request) => {
    span.setAttribute('anthropic.beta', request.beta?.length > 0);
  },
});
```

**Captured Attributes:**
- `gen_ai.request.model` — model name
- `gen_ai.request.max_tokens` — max tokens
- `gen_ai.response.model` — actual model
- `gen_ai.response.finish_reasons` — stop reason
- `gen_ai.usage.input_tokens` — input tokens
- `gen_ai.usage.output_tokens` — output tokens
- `llm.cost.total` — total cost

### Vertex AI

```typescript
import { VertexAIInstrumentation } from 'otel-genai-semconv/vertexai';

const instrumentation = new VertexAIInstrumentation({
  captureRequestHeaders: true,
  captureResponseHeaders: true,
  trackCosts: true,
  
  // Project ID for cost attribution
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  
  // Location for proper endpoint routing
  location: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
});
```

**Captured Attributes:**
- `gen_ai.request.model` — model name
- `gen_ai.request.temperature` — temperature
- `gen_ai.response.model` — actual model
- `gen_ai.response.finish_reasons` — finish reason
- `gen_ai.usage.input_tokens` — prompt token count
- `gen_ai.usage.output_tokens` — candidate token count
- `gcp.project_id` — GCP project for cost attribution

### Bedrock

```typescript
import { BedrockInstrumentation } from 'otel-genai-semconv/bedrock';

const instrumentation = new BedrockInstrumentation({
  captureRequestHeaders: true,
  captureResponseHeaders: true,
  trackCosts: true,
  
  // AWS region for proper endpoint
  region: process.env.AWS_REGION || 'us-east-1',
  
  // Track specific model families
  trackModelFamilies: ['anthropic', 'amazon', 'cohere', 'ai21'],
});
```

**Captured Attributes:**
- `gen_ai.request.model` — model ID
- `gen_ai.response.model` — actual model
- `gen_ai.response.finish_reasons` — completion reason
- `gen_ai.usage.input_tokens` — input token count
- `gen_ai.usage.output_tokens` — output token count
- `aws.region` — AWS region
- `aws.account_id` — AWS account (if available)

---

## Semantic Convention Reference

### Standard Attributes

All instrumentations capture these OTel GenAI semantic convention attributes:

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `gen_ai.request.model` | string | Requested model | "gpt-4-turbo" |
| `gen_ai.request.temperature` | double | Sampling temperature | 0.7 |
| `gen_ai.request.top_p` | double | Top-p sampling | 0.9 |
| `gen_ai.request.max_tokens` | int | Max tokens to generate | 1024 |
| `gen_ai.request.streaming` | boolean | Whether streaming | true |
| `gen_ai.response.model` | string | Actual model used | "gpt-4-turbo-2024-04-09" |
| `gen_ai.response.id` | string | Response ID | "chatcmpl-123" |
| `gen_ai.response.finish_reasons` | string[] | Finish reasons | ["stop"] |
| `gen_ai.usage.input_tokens` | int | Input tokens | 50 |
| `gen_ai.usage.output_tokens` | int | Output tokens | 100 |
| `llm.cost.total` | double | Total cost USD | 0.0045 |
| `llm.cost.input` | double | Input cost USD | 0.0015 |
| `llm.cost.output` | double | Output cost USD | 0.003 |

### Events

Instrumentations emit these events:

| Event | Attributes | Description |
|-------|------------|-------------|
| `gen_ai.choice` | `index`, `finish_reason`, `message` | Individual choice |
| `gen_ai.system.message` | `content` | System message content |
| `gen_ai.user.message` | `content` | User message content |
| `gen_ai.assistant.message` | `content` | Assistant response |

### Custom Attributes

Add custom attributes via hooks:

```typescript
const instrumentation = new OpenAIInstrumentation({
  onStart: (span, request) => {
    // Add custom attributes at span start
    span.setAttribute('user.tier', getUserTier(request.user));
    span.setAttribute('feature.flag', getFeatureFlag(request.context));
  },
  onEnd: (context) => {
    const { span, response } = context;
    span.setAttribute('response.latency.ms', response._request_id);
    span.setAttribute('quality.score', calculateQualityScore(response));
  },
});
```

---

## Streaming Support

All providers support streaming responses. The instrumentation automatically
handles streaming and captures appropriate metrics:

```typescript
// Streaming example
const stream = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}

// Instrumentation captures:
// - Time to first token
// - Total streaming duration
// - Token count (accumulated across chunks)
// - Cost (calculated from total tokens)
```

**Streaming-Specific Attributes:**
- `gen_ai.streaming.time_to_first_token_ms` — latency to first chunk
- `gen_ai.streaming.total_duration_ms` — total streaming time
- `gen_ai.streaming.chunk_count` — number of chunks received

---

## Cost Tracking

Cost tracking is enabled by default and uses provider-specific pricing:

```typescript
import { CostCalculator } from 'otel-genai-semconv/utils';

const calculator = new CostCalculator({
  // Override default pricing
  customPricing: {
    'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
    'claude-opus': { input: 0.015, output: 0.075 },
  },
});

const cost = calculator.calculate({
  provider: 'openai',
  model: 'gpt-4',
  inputTokens: 1000,
  outputTokens: 500,
});

console.log(`Cost: $${cost.total.toFixed(6)}`);
```

**Cost Attributes in Spans:**
- `llm.cost.total` — total cost in USD
- `llm.cost.input` — input token cost
- `llm.cost.output` — output token cost
- `llm.cost.currency` — currency code (default: USD)

---

## Dashboard Integration

### Phoenix Dashboard

Import the Phoenix dashboard:

```bash
# Copy dashboard definition
cp dashboards/phoenix/llm-observability.json /path/to/phoenix/dashboards/

# Or use the exporter
import { PhoenixExporter } from 'otel-genai-semconv/phoenix';

const exporter = new PhoenixExporter({
  endpoint: process.env.PHOENIX_ENDPOINT || 'http://localhost:6006',
  datasetName: 'llm-traces',
});
```

**Dashboard Panels:**
- LLM call latency heatmaps
- Token usage breakdown by model
- Cost per request tracking
- Error rate by provider
- Trace waterfall visualization
- Time-to-first-token metrics

### Langfuse Dashboard

Import the Langfuse dashboard:

```bash
# Copy dashboard definition
cp dashboards/langfuse/llm-performance.yaml /path/to/langfuse/dashboards/

# Or use the exporter
import { LangfuseExporter } from 'otel-genai-semconv/langfuse';

const exporter = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
});
```

**Dashboard Panels:**
- Model performance comparison
- Cost tracking per project/team
- Usage trends and anomalies
- Quality metrics integration
- Latency percentiles

### Cloud Trace Dashboard

Import the Cloud Trace dashboard:

```bash
# Copy dashboard definition
cp dashboards/cloud-trace/genai-metrics.json /path/to/cloud-monitoring/dashboards/

# Or use the exporter
import { CloudTraceExporter } from 'otel-genai-semconv/cloud-trace';

const exporter = new CloudTraceExporter({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  serviceName: 'my-llm-app',
});
```

**Dashboard Panels:**
- GenAI span latency percentiles (p50, p90, p95, p99)
- Token consumption metrics
- Cost attribution by service
- Error budgets and SLOs
- Provider health overview

---

## Security Considerations

### PII Handling

The instrumentation automatically redacts PII from spans:

```typescript
import { PIIRedactor } from 'otel-genai-semconv/utils';

const redactor = new PIIRedactor({
  // Patterns to redact
  patterns: [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{16}\b/, // Credit card
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
  ],
  
  // Redact message content (default: false)
  redactMessageContent: true,
  
  // Hash instead of redact (for debugging)
  hashInsteadOfRedact: false,
});
```

### API Key Management

- Never include API keys in span attributes
- Use environment variables for credentials
- Rotate keys regularly
- Use separate keys per environment

---

## Observability

The instrumentation includes streaming support with time-to-first-token (TTFT) tracking, a double-instrumentation guard to prevent duplicate spans, an `uninstrument()` method for cleanup, and customizable `onStart`/`onEnd` hooks for adding business context to spans.

### Structured Logging

All instrumentation events are logged with context:

```json
{
  "timestamp": "2026-04-15T23:00:00Z",
  "service": "my-llm-app",
  "trace_id": "abc123",
  "span_id": "def456",
  "level": "info",
  "message": "LLM request completed",
  "provider": "openai",
  "model": "gpt-4",
  "input_tokens": 50,
  "output_tokens": 100,
  "cost_usd": 0.0045,
  "duration_ms": 1234
}
```

### OpenTelemetry Metrics

The instrumentation exports these metrics:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `genai.requests.total` | Counter | `provider`, `model`, `status` | Total requests |
| `genai.request.duration_ms` | Histogram | `provider`, `model` | Request latency |
| `genai.tokens.input` | Counter | `provider`, `model` | Input tokens |
| `genai.tokens.output` | Counter | `provider`, `model` | Output tokens |
| `genai.cost.total` | Histogram | `provider`, `model` | Cost per request |
| `genai.errors.total` | Counter | `provider`, `error_type` | Error count |

### Tracing

Each LLM call creates a trace with spans:

| Span | Attributes |
|------|------------|
| `gen_ai.chat.completion` | model, temperature, max_tokens, etc. |
| `gen_ai.embedding` (if applicable) | model, dimensions |
| `gen_ai.tool_call` (if applicable) | tool_name, tool_input |

---

## Checklist: Production Readiness

Before deploying an instrumented agent to production:

- [ ] All LLM providers instrumented with appropriate wrappers
- [ ] OTel collector configured and reachable
- [ ] Dashboard definitions imported to Phoenix/Langfuse/Cloud Trace
- [ ] Cost tracking enabled and verified against provider billing
- [ ] PII redaction configured and tested
- [ ] API keys stored in environment variables (not in code)
- [ ] Error handling tested (rate limits, timeouts, etc.)
- [ ] Streaming responses properly instrumented
- [ ] Custom attributes added for business context
- [ ] Metrics exported and visible in dashboards
- [ ] Traces visible in tracing backend
- [ ] Alert thresholds configured for errors and latency
- [ ] Data retention policies configured
- [ ] Documentation updated with instrumentation details

---

## References

- **ARCHITECTURE.md** — System design deep dive
- **DEV_PLAN.md** — Development checklist
- **README.md** — Quick start and overview
- **docs/SEMCONV_REFERENCE.md** — Complete semantic convention reference
- **docs/DASHBOARD_SETUP.md** — Dashboard setup guide
- **OpenTelemetry GenAI Spec** — https://opentelemetry.io/docs/specs/semconv/gen-ai/
- **agent-mesh/AGENTS.md** — Multi-agent orchestration patterns
