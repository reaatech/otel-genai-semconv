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

This is a **pnpm monorepo** with 9 packages under the `@reaatech` scope. Each package
is independently installable and has well-defined dependencies.

```
packages/
├── core/               # @reaatech/otel-genai-semconv-core
├── instrumentation/    # @reaatech/otel-genai-semconv-instrumentation
├── observability/      # @reaatech/otel-genai-semconv-observability
├── utils/              # @reaatech/otel-genai-semconv-utils
├── exporters/          # @reaatech/otel-genai-semconv-exporters
├── openai/             # @reaatech/otel-genai-semconv-openai
├── anthropic/          # @reaatech/otel-genai-semconv-anthropic
├── vertexai/           # @reaatech/otel-genai-semconv-vertexai
└── bedrock/            # @reaatech/otel-genai-semconv-bedrock
```

### Dependency Graph

```
core
├── utils (depends on core)
├── observability (depends on core)
│   └── exporters (depends on core, observability)
├── instrumentation (depends on core, utils, observability)
│   ├── openai (depends on core, instrumentation, utils; peer:openai)
│   ├── anthropic (depends on core, instrumentation, utils; peer:@anthropic-ai/sdk)
│   ├── vertexai (depends on core, instrumentation, utils; peer:@google-ai/generativelanguage)
│   └── bedrock (depends on core, instrumentation, utils; peer:@aws-sdk/client-bedrock-runtime)
```

### Key Components

| Component | Package | Purpose |
|-----------|---------|---------|
| **Provider Wrappers** | `packages/{openai,anthropic,vertexai,bedrock}/` | Instrumented SDK wrappers for each LLM provider |
| **Semantic Convention Core** | `packages/core/` | Types, constants, schemas, span builder, attribute mapper |
| **Instrumentation Framework** | `packages/instrumentation/` | Tracer, hooks, streaming, error handling, retry, circuit breaker |
| **Token Counter** | `packages/utils/` | Token counting with provider-specific implementations |
| **Cost Calculator** | `packages/utils/` | Cost tracking based on token usage |
| **Dashboard Exporters** | `packages/exporters/` | Export to Phoenix, Langfuse, Cloud Trace |
| **Observability** | `packages/observability/` | Logging, OTel SDK setup, metrics, health checks |

### Tooling

- **pnpm** — workspace package manager
- **turbo** — monorepo task orchestration
- **tsup** — dual ESM/CJS bundling per package
- **biome** — linting and formatting
- **changesets** — versioning and changelog generation
- **vitest** — testing per package

---

## Quick Start

### Installation

Packages are published under the `@reaatech` scope and installed individually:

```bash
npm install @reaatech/otel-genai-semconv-openai
npm install @reaatech/otel-genai-semconv-core
# or
pnpm add @reaatech/otel-genai-semconv-openai @reaatech/otel-genai-semconv-core
```

### Basic Instrumentation

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OpenAIInstrumentation } from '@reaatech/otel-genai-semconv-openai';
import OpenAI from 'openai';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
});

sdk.start();

const client = new OpenAI();
new OpenAIInstrumentation({ trackCosts: true }).instrument(client);

const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

---

## Provider-Specific Guides

### OpenAI

```typescript
import { OpenAIInstrumentation } from '@reaatech/otel-genai-semconv-openai';

const instrumentation = new OpenAIInstrumentation({
  captureRequestHeaders: true,
  captureResponseHeaders: true,
  trackCosts: true,
  pricing: {
    'gpt-4': { input: 0.03, output: 0.06 },
  },
  onStart: (span, request) => {
    span.setAttribute('user.id', request.user?.id);
  },
  onEnd: (span, response) => {
    span.setAttribute('response.quality', calculateQuality(response));
  },
});

instrumentation.instrument(client);
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
import { AnthropicInstrumentation } from '@reaatech/otel-genai-semconv-anthropic';

const instrumentation = new AnthropicInstrumentation({
  captureRequestHeaders: true,
  captureResponseHeaders: true,
  trackCosts: true,
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
import { VertexAIInstrumentation } from '@reaatech/otel-genai-semconv-vertexai';

const instrumentation = new VertexAIInstrumentation({
  captureRequestHeaders: true,
  captureResponseHeaders: true,
  trackCosts: true,
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
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
import { BedrockInstrumentation } from '@reaatech/otel-genai-semconv-bedrock';

const instrumentation = new BedrockInstrumentation({
  captureRequestHeaders: true,
  captureResponseHeaders: true,
  trackCosts: true,
  region: process.env.AWS_REGION || 'us-east-1',
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

---

## Semantic Convention Reference

### Standard Attributes

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
    span.setAttribute('user.tier', getUserTier(request.user));
    span.setAttribute('feature.flag', getFeatureFlag(request.context));
  },
  onEnd: (span, response) => {
    span.setAttribute('quality.score', calculateQualityScore(response));
  },
});
```

---

## Streaming Support

All providers support streaming responses. The instrumentation automatically
handles streaming and captures appropriate metrics:

```typescript
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
import { CostCalculator } from '@reaatech/otel-genai-semconv-utils';

const calculator = new CostCalculator({
  customPricing: {
    'gpt-4': { input: 0.03, output: 0.06 },
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

```typescript
import { PhoenixExporter } from '@reaatech/otel-genai-semconv-exporters';

const exporter = new PhoenixExporter({
  endpoint: process.env.PHOENIX_ENDPOINT || 'http://localhost:6006',
  datasetName: 'llm-traces',
});
```

### Langfuse Dashboard

```typescript
import { LangfuseExporter } from '@reaatech/otel-genai-semconv-exporters';

const exporter = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
});
```

### Cloud Trace Dashboard

```typescript
import { CloudTraceExporter } from '@reaatech/otel-genai-semconv-exporters';

const exporter = new CloudTraceExporter({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  serviceName: 'my-llm-app',
});
```

---

## Security Considerations

### PII Handling

The instrumentation automatically redacts PII from spans:

```typescript
import { PIIRedactor } from '@reaatech/otel-genai-semconv-utils';

const redactor = new PIIRedactor({
  customPatterns: [
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED_SSN]' },
  ],
  redactMessageContent: false,
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

## Development

### Building

```bash
pnpm install
pnpm build        # turbo run build (all packages + examples)
pnpm typecheck    # cross-package type checking
pnpm lint         # biome check
pnpm test         # per-package vitest
```

### Adding a Changeset

```bash
pnpm changeset    # interactive: pick packages, bump type, summary
```

### Internal Dependencies

Internal packages use `workspace:*` protocol:

```json
{
  "dependencies": {
    "@reaatech/otel-genai-semconv-core": "workspace:*",
    "@reaatech/otel-genai-semconv-utils": "workspace:*"
  }
}
```

---

## References

- **ARCHITECTURE.md** — System design deep dive
- **DEV_PLAN.md** — Development checklist
- **README.md** — Quick start and overview
- **CONTRIBUTING.md** — Contribution workflow and release process
- **docs/SEMCONV_REFERENCE.md** — Complete semantic convention reference
- **docs/DASHBOARD_SETUP.md** — Dashboard setup guide
- **OpenTelemetry GenAI Spec** — https://opentelemetry.io/docs/specs/semconv/gen-ai/
