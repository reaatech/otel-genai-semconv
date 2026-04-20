# otel-genai-semconv

Reference implementation of the OpenTelemetry GenAI semantic conventions. Provides instrumented wrappers for OpenAI, Anthropic, Vertex AI, and AWS Bedrock that emit spec-compliant spans, plus deployable dashboards for Phoenix, Langfuse, and Cloud Trace.

## Features

- **OTel GenAI Spec Compliance** — All spans conform to OpenTelemetry GenAI semantic conventions
- **Multi-Provider Support** — OpenAI, Anthropic, Vertex AI, AWS Bedrock
- **Cost Tracking** — Real-time cost calculation per request
- **Token Counting** — Accurate token counting with provider-specific implementations
- **Streaming Support** — Full instrumentation for streaming with TTFT tracking and chunk accumulation
- **PII Redaction** — Automatic detection and redaction of sensitive data
- **Error Handling** — Comprehensive error classification and retry instrumentation
- **Circuit Breaker** — Per-provider circuit breaker for resilience
- **Dashboard Exporters** — Export to Phoenix, Langfuse, and Cloud Trace
- **Lifecycle Hooks** — `onStart` and `onEnd` hooks for custom span attributes
- **Safe Uninstrument** — `uninstrument()` method to restore original SDK methods

## What's New

- **OTel spec compliance updates** — Uses `gen_ai.provider.name` (e.g. `gcp.vertex_ai`, `aws.bedrock`) instead of the deprecated `gen_ai.system`
- **Double-instrumentation guard** — Calling `instrument()` twice on the same client is safely handled as a no-op
- **New semantic convention constants** — Added `gen_ai.conversation.id`, `gen_ai.output.type`, `gen_ai.request.choice.count`, `gen_ai.usage.cache_read.input_tokens`, `gen_ai.usage.cache_creation.input_tokens`

## Installation

```bash
npm install otel-genai-semconv @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

## Quick Start

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OpenAIInstrumentation } from 'otel-genai-semconv/openai';
import { AnthropicInstrumentation } from 'otel-genai-semconv/anthropic';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
});

sdk.start();

const openAIInstrumentation = new OpenAIInstrumentation({
  trackCosts: true,
  captureRequestHeaders: true,
});
const anthropicInstrumentation = new AnthropicInstrumentation({
  trackCosts: true,
});

const openai = new OpenAI();
const anthropic = new Anthropic();

openAIInstrumentation.instrument(openai);
anthropicInstrumentation.instrument(anthropic);

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## Supported Providers

| Provider | Models | Streaming | Token Counting | Cost Tracking |
|----------|--------|-----------|----------------|---------------|
| OpenAI | GPT-4, GPT-4 Turbo, GPT-3.5 | ✅ | ✅ (tiktoken) | ✅ |
| Anthropic | Claude Opus/Sonnet/Haiku | ✅ | ✅ (API) | ✅ |
| Vertex AI | Gemini Pro/Ultra | ✅ | ✅ (API) | ✅ |
| Bedrock | Claude, Llama, Mistral | ✅ | ✅ (varies) | ✅ |

## Semantic Convention Attributes

All instrumentations capture these OTel GenAI attributes:

| Attribute | Type | Description |
|-----------|------|-------------|
| `gen_ai.request.model` | string | Requested model name |
| `gen_ai.request.temperature` | double | Sampling temperature |
| `gen_ai.request.max_tokens` | int | Maximum tokens to generate |
| `gen_ai.response.model` | string | Actual model used |
| `gen_ai.response.finish_reasons` | string[] | Finish reasons |
| `gen_ai.usage.input_tokens` | int | Input tokens used |
| `gen_ai.usage.output_tokens` | int | Output tokens generated |
| `gen_ai.usage.cache_read.input_tokens` | int | Cache read input tokens |
| `gen_ai.usage.cache_creation.input_tokens` | int | Cache creation input tokens |
| `gen_ai.conversation.id` | string | Conversation identifier |
| `gen_ai.request.choice.count` | int | Number of choices requested |
| `gen_ai.output.type` | string | Output type (text, json) |
| `gen_ai.provider.name` | string | Provider name (e.g. `gcp.vertex_ai`, `aws.bedrock`) |
| `llm.cost.total` | double | Total cost in USD |

## Dashboard Integration

### Phoenix

```typescript
import { PhoenixExporter } from 'otel-genai-semconv/phoenix';

const exporter = new PhoenixExporter({
  endpoint: process.env.PHOENIX_ENDPOINT || 'http://localhost:6006',
  datasetName: 'llm-traces',
});
```

### Langfuse

```typescript
import { LangfuseExporter } from 'otel-genai-semconv/langfuse';

const exporter = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
});
```

### Cloud Trace

```typescript
import { CloudTraceExporter } from 'otel-genai-semconv/cloud-trace';

const exporter = new CloudTraceExporter({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  serviceName: 'my-llm-app',
});
```

## Configuration

### OpenAI Instrumentation

```typescript
const instrumentation = new OpenAIInstrumentation({
  captureRequestHeaders: true,
  captureResponseHeaders: true,
  trackCosts: true,
  pricing: {
    'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
  },
  onStart: (span, request) => {
    span.setAttribute('user.id', request.user?.id);
  },
  onEnd: (span, response) => {
    span.setAttribute('response.quality', computeQualityScore(response));
  },
});

// Uninstrument when done
instrumentation.uninstrument(openai);
```

All provider instrumentations support `onStart`/`onEnd` hooks and an `uninstrument(client)` method. The double-instrumentation guard ensures calling `instrument()` twice on the same client is a safe no-op.

### Error Handling

```typescript
import { ErrorHandler, LLMErrorType } from 'otel-genai-semconv/instrumentation';

const errorHandler = new ErrorHandler();
const errorType = errorHandler.classifyError(error);
// LLMErrorType.RATE_LIMIT, AUTHENTICATION, TIMEOUT, etc.
```

### Circuit Breaker

```typescript
import { CircuitBreaker } from 'otel-genai-semconv/instrumentation';

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeoutMs: 60000,
});

if (breaker.canExecute()) {
  // Make LLM call
  breaker.recordSuccess(span);
} else {
  // Circuit is open
}
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  AI Agent       │────▶│  otel-genai-     │────▶│  LLM Providers  │
│  (Node.js)      │     │  semconv         │     │                 │
└─────────────────┘     │  (Instrumentation)│    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  OTel Collector  │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │    Dashboards    │
                       │  Phoenix/Langfuse│
                       └──────────────────┘
```

## License

MIT
