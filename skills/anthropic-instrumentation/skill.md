# Anthropic Instrumentation Skill

## Overview

This skill provides instrumentation for Anthropic SDK calls, capturing OTel GenAI semantic convention compliant spans.

## Usage

```typescript
import { AnthropicInstrumentation } from '@reaatech/otel-genai-semconv-anthropic';

const instrumentation = new AnthropicInstrumentation({
  trackCosts: true,
  captureRequestHeaders: true,
  captureResponseHeaders: true,
});

instrumentation.instrument(anthropicClient);
```

## Captured Attributes

- `gen_ai.request.model` — Model name (e.g., "claude-opus-20240229")
- `gen_ai.request.max_tokens` — Max tokens limit
- `gen_ai.response.model` — Actual model used
- `gen_ai.response.finish_reasons` — Stop reason (e.g., "end_turn")
- `gen_ai.usage.input_tokens` — Input tokens
- `gen_ai.usage.output_tokens` — Output tokens
- `llm.cost.total` — Total cost in USD

## Events

- `gen_ai.system.message` — System prompt content
- `gen_ai.user.message` — User message content
- `gen_ai.assistant.message` — Assistant response
- `gen_ai.choice` — Individual choice data

## Token Counting

Uses estimation-based token counting with caching for performance:

```typescript
import { AnthropicTokenCounter } from '@reaatech/otel-genai-semconv-anthropic';

const counter = new AnthropicTokenCounter();
const tokens = counter.countTokens('Hello, world!', 'claude-3-opus-20240229');
```

## Streaming Support

The instrumentation automatically handles Anthropic's streaming API via `stream: true`:

```typescript
const stream = await anthropic.messages.create({
  model: 'claude-3-opus-20240229',
  max_tokens: 500,
  messages: [{ role: 'user', content: 'Write a haiku' }],
  stream: true,
});

for await (const event of stream) {
  // Instrumentation tracks TTFT, chunk count, and aggregates deltas
}
```

## Related Packages

- [@reaatech/otel-genai-semconv-core](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types and constants
- [@reaatech/otel-genai-semconv-instrumentation](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-instrumentation) — Instrumentation framework
- [@reaatech/otel-genai-semconv-utils](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-utils) — Cost calculator
