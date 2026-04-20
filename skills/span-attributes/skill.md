# Span Attributes Skill

## Overview

This skill provides utilities for working with OTel GenAI span attributes.

## Standard Attributes

All instrumentations capture these OTel GenAI semantic convention attributes:

| Attribute | Type | Description |
|-----------|------|-------------|
| `gen_ai.request.model` | string | Requested model name |
| `gen_ai.request.temperature` | double | Sampling temperature |
| `gen_ai.request.top_p` | double | Top-p sampling parameter |
| `gen_ai.request.max_tokens` | int | Maximum tokens to generate |
| `gen_ai.request.streaming` | boolean | Whether streaming |
| `gen_ai.response.model` | string | Actual model used |
| `gen_ai.response.id` | string | Response identifier |
| `gen_ai.response.finish_reasons` | string[] | Finish reasons |
| `gen_ai.usage.input_tokens` | int | Input tokens used |
| `gen_ai.usage.output_tokens` | int | Output tokens generated |
| `llm.cost.total` | double | Total cost in USD |
| `llm.cost.input` | double | Input token cost |
| `llm.cost.output` | double | Output token cost |

## Events

| Event | Attributes | Description |
|-------|------------|-------------|
| `gen_ai.choice` | `index`, `finish_reason`, `message` | Individual choice |
| `gen_ai.system.message` | `content` | System message |
| `gen_ai.user.message` | `content` | User message |
| `gen_ai.assistant.message` | `content` | Assistant response |

## Usage

```typescript
import { GEN_AI_SEMCONV, GEN_AI_EVENTS } from 'otel-genai-semconv/semconv';

// Access attribute names
console.log(GEN_AI_SEMCONV.REQUEST_MODEL); // "gen_ai.request.model"

// Access event names
console.log(GEN_AI_EVENTS.CHOICE); // "gen_ai.choice"
