# @reaatech/otel-genai-semconv-core

[![npm version](https://img.shields.io/npm/v/@reaatech/otel-genai-semconv-core.svg)](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/otel-genai-semconv/ci.yml?branch=main&label=CI)](https://github.com/reaatech/otel-genai-semconv/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Canonical TypeScript types, constants, schemas, and span-builder utilities for the [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/). This package is the single source of truth for all OTel GenAI attribute names, event types, error classifications, and domain models used throughout the `@reaatech/otel-genai-semconv-*` ecosystem.

## Installation

```bash
npm install @reaatech/otel-genai-semconv-core
# or
pnpm add @reaatech/otel-genai-semconv-core
```

## Feature Overview

- **50+ semantic convention constants** — every `gen_ai.*` attribute, event, and metric name defined in one place
- **Complete domain model** — `LLMRequest`, `LLMResponse`, `TokenUsage`, `CostData`, and 20+ supporting interfaces
- **Zod validation schemas** — runtime validation for requests, responses, messages, tools, and streaming events
- **Span builder** — construct OTel-compliant spans with automatic attribute mapping, message events, and choice events
- **Attribute mapper** — provider-agnostic mapping from normalized types to OTel semconv attributes
- **Zero runtime dependencies beyond `zod` and `@opentelemetry/api`** — lightweight and tree-shakeable
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import { SpanBuilder, GEN_AI_ATTRIBUTES, type LLMRequest } from "@reaatech/otel-genai-semconv-core";

const builder = new SpanBuilder({ provider: "openai" });

const request: LLMRequest = {
  model: "gpt-4",
  temperature: 0.7,
  maxTokens: 500,
  messages: [{ role: "user", content: "What is OpenTelemetry?" }],
};

const span = builder.startSpan(request);
// span now has gen_ai.request.model, gen_ai.request.temperature, etc.
```

## Exports

### Semantic Convention Constants

Every OTel GenAI attribute name defined as a `const` object with dot-delimited string values:

| Export | Description |
|--------|-------------|
| `GEN_AI_ATTRIBUTES` | All request/response/usage attribute names (`gen_ai.request.model`, etc.) |
| `COST_ATTRIBUTES` | Cost tracking attribute names (`llm.cost.total`, etc.) |
| `STREAMING_ATTRIBUTES` | Streaming metric attribute names (`gen_ai.streaming.time_to_first_token_ms`, etc.) |
| `GEN_AI_EVENTS` | Event names (`gen_ai.choice`, `gen_ai.user.message`, etc.) |
| `EVENT_ATTRIBUTES` | Event attribute keys (`index`, `finish_reason`, `content`, `role`) |

### Classification Constants

| Export | Description |
|--------|-------------|
| `FINISH_REASONS` | Standardized finish reasons: `stop`, `max_tokens`, `content_filter`, `tool_calls`, `length`, `error` |
| `ERROR_TYPES` | Error type classifications: `rate_limit`, `authentication`, `timeout`, `server_error`, etc. |
| `OPERATIONS` | Operation names: `chat`, `text_completion`, `embeddings`, `image_generation` |
| `SPAN_NAMES` | Span names per operation: `gen_ai.chat.completion`, `gen_ai.embedding`, etc. |
| `PROVIDER_SYSTEMS` | Provider system identifiers: `openai`, `anthropic`, `gcp.vertex_ai`, `aws.bedrock` |

### Metric Constants

| Export | Description |
|--------|-------------|
| `METRIC_NAMES` | Metric names: `genai.requests.total`, `genai.request.duration_ms`, etc. |
| `METRIC_ATTRIBUTES` | Metric label keys: `provider`, `model`, `status`, `error_type` |
| `STATUS_VALUES` | Status values: `ok`, `error` |

### Domain Types

All types are exported with matching Zod schemas for runtime validation:

| Type | Schema | Description |
|------|--------|-------------|
| `LLMRequest` | `LLMRequestSchema` | Normalized request: model, messages, temperature, maxTokens, tools |
| `LLMResponse` | `LLMResponseSchema` | Normalized response: id, model, choices, usage, finishReasons |
| `Message` | `MessageSchema` | Conversation message: role, content, toolCalls |
| `TokenUsage` | `TokenUsageSchema` | Token counts: inputTokens, outputTokens, cachedInputTokens |
| `CostData` | `CostDataSchema` | Cost breakdown: total, input, output, currency |
| `Tool` | `ToolSchema` | Function definition for tool calling |
| `InstrumentationConfig` | `InstrumentationConfigSchema` | Configuration: captureHeaders, trackCosts, pricing, hooks |
| `StreamingEvent` | `StreamingEventSchema` | Streaming event: chunk, complete, error |

Additional types: `ProviderType`, `ModelInfo`, `PricingInfo`, `ContentBlock`, `ToolChoice`, `ToolCall`, `ResponseFormat`, `Choice`, `SpanContext`, `GenAISpanAttributes`.

### Attribute Mapper

```typescript
import { AttributeMapper, createAttributeMapper } from "@reaatech/otel-genai-semconv-core";

const mapper = createAttributeMapper("openai");

// Map a normalized request to OTel attributes
const requestAttrs = mapper.mapRequestAttributes(request);
// → { "gen_ai.request.model": "gpt-4", "gen_ai.request.temperature": 0.7, ... }

// Map a normalized response
const responseAttrs = mapper.mapResponseAttributes(response);
// → { "gen_ai.response.model": "gpt-4-0613", "gen_ai.response.finish_reasons": ["stop"] }

// Map finish reasons across providers
const reason = mapper.mapFinishReason("end_turn");       // → "stop" (Anthropic → OTel)
const reason2 = mapper.mapFinishReason("safety");         // → "content_filter" (Vertex → OTel)
```

### Span Builder

```typescript
import { SpanBuilder } from "@reaatech/otel-genai-semconv-core";

const builder = new SpanBuilder({
  provider: "openai",
  addMessageEvents: true,
  addChoiceEvents: true,
});

const span = builder.startSpan(request, "gpt-4 chat");

// After receiving a response:
builder.addResponse(response);          // sets response + usage attributes, adds choice events
builder.addCostAttributes(costData);    // sets llm.cost.* attributes
builder.addStreamingAttributes({        // sets gen_ai.streaming.* attributes
  timeToFirstTokenMs: 245,
  totalDurationMs: 1200,
  chunkCount: 42,
});

// On error:
builder.recordError(new Error("rate limit"));  // sets status + error attributes + exception
// On success:
builder.setOk();
builder.endSpan();
```

## Usage Patterns

### Zod Validation at the Boundary

```typescript
import { LLMRequestSchema, LLMResponseSchema } from "@reaatech/otel-genai-semconv-core";

function handleRequest(raw: unknown): LLMRequest {
  return LLMRequestSchema.parse(raw); // throws ZodError on invalid input
}
```

### Custom Span Names

```typescript
const span = builder.startSpan(request, "my-custom-operation");
// Overrides the default span name derived from the model
```

## Related Packages

- [`@reaatech/otel-genai-semconv-instrumentation`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-instrumentation) — Core instrumentation framework (tracer, hooks, streaming, circuit breaker)
- [`@reaatech/otel-genai-semconv-utils`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-utils) — Token counting, cost calculation, and PII redaction
- [`@reaatech/otel-genai-semconv-openai`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-openai) — OpenAI provider instrumentation

## License

[MIT](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
