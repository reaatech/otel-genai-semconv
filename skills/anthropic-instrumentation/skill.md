# Anthropic Instrumentation Skill

## Overview

This skill provides instrumentation for Anthropic SDK calls, capturing OTel GenAI semantic convention compliant spans.

## Usage

```typescript
import { AnthropicInstrumentation } from 'otel-genai-semconv/anthropic';

const instrumentation = new AnthropicInstrumentation({
  trackCosts: true,
  captureRequestHeaders: true,
  captureResponseHeaders: true,
});
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

Uses Anthropic's token counting API with fallback estimation when unavailable.
