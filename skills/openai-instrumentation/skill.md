# OpenAI Instrumentation Skill

## Overview

This skill provides instrumentation for OpenAI SDK calls, capturing OTel GenAI semantic convention compliant spans.

## Usage

```typescript
import { OpenAIInstrumentation } from '@reaatech/otel-genai-semconv-openai';

const instrumentation = new OpenAIInstrumentation({
  trackCosts: true,
  captureRequestHeaders: true,
  captureResponseHeaders: true,
});

instrumentation.instrument(openaiClient);
```

## Captured Attributes

- `gen_ai.request.model` — Model name (e.g., "gpt-4")
- `gen_ai.request.temperature` — Sampling temperature
- `gen_ai.request.max_tokens` — Max tokens limit
- `gen_ai.response.model` — Actual model used
- `gen_ai.response.finish_reasons` — Finish reasons
- `gen_ai.usage.input_tokens` — Prompt tokens
- `gen_ai.usage.output_tokens` — Completion tokens
- `llm.cost.total` — Total cost in USD

## Events

- `gen_ai.system.message` — System message content
- `gen_ai.user.message` — User message content
- `gen_ai.assistant.message` — Assistant response
- `gen_ai.choice` — Individual choice data

## Token Counting

Uses tiktoken library for accurate token counting with caching for performance.

The `OpenAITokenCounter` is exported directly from `@reaatech/otel-genai-semconv-openai`:

```typescript
import { OpenAITokenCounter } from '@reaatech/otel-genai-semconv-openai';

const counter = new OpenAITokenCounter();
const tokens = counter.countTokens('Hello, world!', 'gpt-4');
```

## Related Packages

- [@reaatech/otel-genai-semconv-core](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types and constants
- [@reaatech/otel-genai-semconv-instrumentation](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-instrumentation) — Instrumentation framework
- [@reaatech/otel-genai-semconv-utils](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-utils) — Cost calculator and PII redaction
