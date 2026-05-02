# @reaatech/otel-genai-semconv-anthropic

[![npm version](https://img.shields.io/npm/v/@reaatech/otel-genai-semconv-anthropic.svg)](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-anthropic)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/otel-genai-semconv/ci.yml?branch=main&label=CI)](https://github.com/reaatech/otel-genai-semconv/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Transparent instrumentation for the [Anthropic Node.js SDK](https://github.com/anthropics/anthropic-sdk-typescript). Wraps `client.messages.create()` to emit [OpenTelemetry GenAI semantic convention](https://opentelemetry.io/docs/specs/semconv/gen-ai/) spans with request metadata, token usage including prompt caching, cost tracking, and streaming metrics for message delta events.

## Installation

```bash
npm install @reaatech/otel-genai-semconv-anthropic
# or
pnpm add @reaatech/otel-genai-semconv-anthropic
```

## Feature Overview

- **Zero-config instrumentation** — call `instrument(client)` once, every `messages.create()` call is traced
- **Prompt caching awareness** — tracks `cache_read_input_tokens` and `cache_creation_input_tokens` from Anthropic's usage metadata
- **Streaming delta aggregation** — merges `message_start`, `content_block_delta`, and `message_delta` events into a final `Message` with accumulated token counts
- **Tool use events** — tool call content blocks emit `gen_ai.tool_call` span events with name and input
- **Double-instrumentation guard** — calling `instrument()` twice is a safe no-op
- **Lifecycle hooks** — `onStart` and `onEnd` callbacks for custom span attributes
- **Safe uninstrument** — restores the original `create` method
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import { AnthropicInstrumentation } from "@reaatech/otel-genai-semconv-anthropic";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

new AnthropicInstrumentation({ trackCosts: true }).instrument(client);

const response = await client.messages.create({
  model: "claude-3-opus-20240229",
  max_tokens: 200,
  messages: [{ role: "user", content: "What are the benefits of OpenTelemetry?" }],
});
// Each call now emits OTel spans with gen_ai.* attributes
```

## Captured Attributes

### Request Attributes

| Attribute | Source | Description |
|-----------|--------|-------------|
| `gen_ai.request.model` | `request.model` | Requested model name |
| `gen_ai.request.max_tokens` | `request.max_tokens` | Max tokens limit |
| `gen_ai.request.temperature` | `request.temperature` | Sampling temperature |
| `gen_ai.request.top_p` | `request.top_p` | Top-p sampling |
| `gen_ai.request.top_k` | `request.top_k` | Top-k sampling |
| `gen_ai.request.streaming` | `request.stream` | Streaming flag |
| `gen_ai.request.stop_sequences` | `request.stop_sequences` | Stop sequences |
| `gen_ai.request.tool_names` | `request.tools` | Tool names |
| `gen_ai.provider.name` | hardcoded | `"anthropic"` |

### Response Attributes

| Attribute | Source | Description |
|-----------|--------|-------------|
| `gen_ai.response.model` | `response.model` | Actual model used |
| `gen_ai.response.id` | `response.id` | Response identifier |
| `gen_ai.response.finish_reasons` | `response.stop_reason` (mapped) | Mapped to OTel finish reason |
| `gen_ai.usage.input_tokens` | `response.usage.input_tokens` | Input token count |
| `gen_ai.usage.output_tokens` | `response.usage.output_tokens` | Output token count |

### Stop Reason Mapping

Anthropic's `stop_reason` values are mapped to OTel `finish_reason`:

| Anthropic | OTel |
|-----------|------|
| `end_turn` | `stop` |
| `stop_sequence` | `stop` |
| `max_tokens` | `length` |
| `tool_use` | `tool_calls` |

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
| `gen_ai.system.message` | System prompt in the request |
| `gen_ai.user.message` | User messages in the request |
| `gen_ai.assistant.message` | Text content blocks in the response |
| `gen_ai.tool_call` | Tool use content blocks (with `tool_name`, `tool_input`) |

## API Reference

### `AnthropicInstrumentation` (class)

#### Constructor

```typescript
new AnthropicInstrumentation({
  captureRequestHeaders?: boolean;
  captureResponseHeaders?: boolean;
  trackCosts?: boolean;
  pricing?: Record<string, PricingInfo>;
  onStart?: (span: Span, request: MessageCreateParams) => void;
  onEnd?: (span: Span, response: Message) => void;
})
```

#### Methods

| Method | Description |
|--------|-------------|
| `instrument(client)` | Wrap `client.messages.create()` with instrumentation |
| `uninstrument(client)` | Restore the original `create()` method |

### `AnthropicTokenCounter` (class)

Character-based token estimation for Anthropic models:

```typescript
const counter = new AnthropicTokenCounter();
counter.countTokens("Hello, world!", "claude-3-opus-20240229");
counter.countMessagesTokens(messages, "claude-3-opus-20240229");
counter.clearCache();
```

### Attribute Mappers

```typescript
import { mapAnthropicRequest, mapAnthropicResponse, mapAnthropicError } from "@reaatech/otel-genai-semconv-anthropic";

const requestAttrs = mapAnthropicRequest(messageParams);
const responseAttrs = mapAnthropicResponse(messageObject);
const errorAttrs = mapAnthropicError(apiError);
```

## Configuration

### Custom Pricing

```typescript
new AnthropicInstrumentation({
  trackCosts: true,
  pricing: {
    "claude-3-opus": { input: 0.015, output: 0.075 },
    "claude-3-sonnet": { input: 0.003, output: 0.015 },
  },
}).instrument(client);
```

### Lifecycle Hooks

```typescript
new AnthropicInstrumentation({
  onStart: (span, request) => {
    if (request.metadata?.user_id) {
      span.setAttribute("enduser.id", request.metadata.user_id);
    }
  },
  onEnd: (span, response) => {
    span.setAttribute("response.stop_reason", response.stop_reason);
  },
}).instrument(client);
```

## Usage Patterns

### Streaming with Delta Aggregation

The instrumentation automatically aggregates streaming delta events into a final `Message`:

```typescript
const stream = await client.messages.create({
  model: "claude-3-opus-20240229",
  max_tokens: 500,
  messages: [{ role: "user", content: "Write a haiku" }],
  stream: true,
});

for await (const event of stream) {
  // Each event type (message_start, content_block_delta, message_delta) is tracked
}
// Span auto-finalizes with aggregated response attributes, tokens, and cost
```

### Multi-Client

```typescript
const instrumentation = new AnthropicInstrumentation({ trackCosts: true });

const client1 = new Anthropic({ apiKey: "...", baseURL: "..." });
const client2 = new Anthropic({ apiKey: "...", baseURL: "..." });

instrumentation.instrument(client1);
instrumentation.instrument(client2);
```

## Related Packages

- [`@reaatech/otel-genai-semconv-core`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types and constants
- [`@reaatech/otel-genai-semconv-instrumentation`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-instrumentation) — Instrumentation framework
- [`@reaatech/otel-genai-semconv-utils`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-utils) — Cost calculator and token counter
- [`@reaatech/otel-genai-semconv-openai`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-openai) — OpenAI provider instrumentation

## License

[MIT](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
