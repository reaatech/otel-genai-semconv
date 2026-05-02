# @reaatech/otel-genai-semconv-openai

[![npm version](https://img.shields.io/npm/v/@reaatech/otel-genai-semconv-openai.svg)](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-openai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/otel-genai-semconv/ci.yml?branch=main&label=CI)](https://github.com/reaatech/otel-genai-semconv/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Transparent instrumentation for the [OpenAI Node.js SDK](https://github.com/openai/openai-node). Wraps `client.chat.completions.create()` to emit [OpenTelemetry GenAI semantic convention](https://opentelemetry.io/docs/specs/semconv/gen-ai/) spans with request metadata, token usage, cost tracking, and streaming metrics — no code changes required beyond calling `instrument()`.

## Installation

```bash
npm install @reaatech/otel-genai-semconv-openai
# or
pnpm add @reaatech/otel-genai-semconv-openai
```

## Feature Overview

- **Zero-config instrument/instrument** — call `instrument(client)` once, every `create()` call is traced
- **Non-streaming + streaming** — both response types are fully instrumented with different attribute sets
- **Accurate token counting** — tiktoken-based encoding with per-model encoding selection and fallback
- **Cost tracking** — calculates `llm.cost.*` attributes using built-in or custom pricing tables
- **Double-instrumentation guard** — calling `instrument()` twice is a safe no-op
- **Lifecycle hooks** — `onStart` and `onEnd` callbacks for custom span attributes
- **Safe uninstrument** — restores the original `create` method
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import { OpenAIInstrumentation } from "@reaatech/otel-genai-semconv-openai";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

new OpenAIInstrumentation({ trackCosts: true }).instrument(client);

const response = await client.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "What is OpenTelemetry?" }],
  temperature: 0.7,
  max_tokens: 500,
});
// Each call now emits OTel spans with gen_ai.* attributes
```

## Captured Attributes

### Request Attributes

| Attribute | Source | Description |
|-----------|--------|-------------|
| `gen_ai.request.model` | `request.model` | Requested model name |
| `gen_ai.request.temperature` | `request.temperature` | Sampling temperature |
| `gen_ai.request.top_p` | `request.top_p` | Top-p sampling |
| `gen_ai.request.max_tokens` | `request.max_tokens` | Max tokens limit |
| `gen_ai.request.streaming` | `request.stream` | Streaming flag |
| `gen_ai.request.frequency_penalty` | `request.frequency_penalty` | Frequency penalty |
| `gen_ai.request.presence_penalty` | `request.presence_penalty` | Presence penalty |
| `gen_ai.request.stop_sequences` | `request.stop` | Stop sequences (if array) |
| `gen_ai.request.tool_names` | `request.tools` | Tool/function names |
| `gen_ai.request.seed` | `request.seed` | Reproducibility seed |
| `gen_ai.request.candidates_per_prompt` | `request.n` | Number of choices |
| `gen_ai.provider.name` | hardcoded | `"openai"` |

### Response Attributes

| Attribute | Source | Description |
|-----------|--------|-------------|
| `gen_ai.response.model` | `response.model` | Actual model used |
| `gen_ai.response.id` | `response.id` | Response identifier |
| `gen_ai.response.finish_reasons` | `response.choices[].finish_reason` | Per-choice finish reasons |
| `gen_ai.usage.input_tokens` | `response.usage.prompt_tokens` | Input token count |
| `gen_ai.usage.output_tokens` | `response.usage.completion_tokens` | Output token count |

### Streaming Attributes

| Attribute | Description |
|-----------|-------------|
| `gen_ai.streaming.time_to_first_token_ms` | Latency to first chunk |
| `gen_ai.streaming.total_duration_ms` | Total streaming duration |
| `gen_ai.streaming.chunk_count` | Number of chunks received |

### Cost Attributes (when `trackCosts: true`)

| Attribute | Description |
|-----------|-------------|
| `llm.cost.total` | Total cost in USD |
| `llm.cost.input` | Input token cost |
| `llm.cost.output` | Output token cost |
| `llm.cost.currency` | Currency code (always `"USD"`) |

### Span Events

| Event | When |
|-------|------|
| `gen_ai.system.message` | System messages in the request |
| `gen_ai.user.message` | User messages in the request |
| `gen_ai.assistant.message` | Assistant messages in the request or response |
| `gen_ai.choice` | Each choice in the response (with index, finish_reason, message) |

## API Reference

### `OpenAIInstrumentation` (class)

#### Constructor

```typescript
new OpenAIInstrumentation({
  captureRequestHeaders?: boolean;
  captureResponseHeaders?: boolean;
  trackCosts?: boolean;
  pricing?: Record<string, PricingInfo>;
  onStart?: (span: Span, request: ChatCompletionCreateParams) => void;
  onEnd?: (span: Span, response: ChatCompletion) => void;
})
```

#### Methods

| Method | Description |
|--------|-------------|
| `instrument(client)` | Wrap `client.chat.completions.create()` with instrumentation |
| `uninstrument(client)` | Restore the original `create()` method |

### `OpenAITokenCounter` (class)

Accurate token counting using tiktoken with per-model encoding selection:

```typescript
const counter = new OpenAITokenCounter();
counter.countTokens("Hello, world!", "gpt-4");           // count for a specific model
counter.countMessagesTokens(messages, "gpt-4");           // count for a conversation
counter.clearCache();                                     // clear token cache
counter.free();                                           // free tiktoken encodings (call when done)
```

#### Encoding Selection

| Model Family | Encoding |
|-------------|----------|
| `gpt-4*`, `o1*` | `o200k_base` |
| `gpt-3.5*` | `cl100k_base` |
| Other | `cl100k_base` (fallback) |

### Attribute Mappers

Standalone functions for mapping provider data without the full instrumentation class:

```typescript
import { mapOpenAIRequest, mapOpenAIResponse, mapOpenAIError } from "@reaatech/otel-genai-semconv-openai";

const requestAttrs = mapOpenAIRequest(chatCompletionParams);
const responseAttrs = mapOpenAIResponse(chatCompletionObject);
const errorAttrs = mapOpenAIError(apiError);
```

## Configuration

### Custom Pricing

```typescript
new OpenAIInstrumentation({
  trackCosts: true,
  pricing: {
    "gpt-4": { input: 0.03, output: 0.06 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  },
}).instrument(client);
```

### Lifecycle Hooks

```typescript
new OpenAIInstrumentation({
  onStart: (span, request) => {
    span.setAttribute("user.id", request.user);
    span.setAttribute("feature.flag", getFeatureFlag());
  },
  onEnd: (span, response) => {
    span.setAttribute("response.quality_score", calculateQuality(response));
    span.setAttribute("response.latency_ms", Date.now() - startTime);
  },
}).instrument(client);
```

### Error Type Mapping

The instrumentation classifies errors into the following types:

| Condition | Error Type |
|-----------|-----------|
| `rate limit` / 429 | `rate_limit_error` |
| `authentication` / 401 | `authentication_error` |
| `invalid` / 400 | `invalid_request_error` |
| `not found` / 404 | `not_found_error` |
| `server` / 500 | `server_error` |
| Other | `unknown_error` |

## Usage Patterns

### Streaming

```typescript
const stream = await client.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Tell me a story" }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}
// Span auto-finalizes with TTFT, duration, and chunk count when the stream ends
```

### Multi-Client

```typescript
const instrumentation = new OpenAIInstrumentation({ trackCosts: true });

const client1 = new OpenAI({ apiKey: "...", baseURL: "..." });
const client2 = new OpenAI({ apiKey: "...", baseURL: "..." });

instrumentation.instrument(client1);
instrumentation.instrument(client2);
```

### Cleanup

```typescript
instrumentation.uninstrument(client);
// client.chat.completions.create is now the original, unwrapped method
```

## Related Packages

- [`@reaatech/otel-genai-semconv-core`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types and constants
- [`@reaatech/otel-genai-semconv-instrumentation`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-instrumentation) — Instrumentation framework
- [`@reaatech/otel-genai-semconv-utils`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-utils) — Cost calculator and token counter
- [`@reaatech/otel-genai-semconv-anthropic`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-anthropic) — Anthropic provider instrumentation

## License

[MIT](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
