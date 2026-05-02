# @reaatech/otel-genai-semconv-vertexai

[![npm version](https://img.shields.io/npm/v/@reaatech/otel-genai-semconv-vertexai.svg)](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-vertexai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/otel-genai-semconv/ci.yml?branch=main&label=CI)](https://github.com/reaatech/otel-genai-semconv/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Transparent instrumentation for the [Google Generative Language (Vertex AI) SDK](https://github.com/google/generative-ai-js). Wraps `model.generateContent()` to emit [OpenTelemetry GenAI semantic convention](https://opentelemetry.io/docs/specs/semconv/gen-ai/) spans with GCP project/location metadata, generation config attributes, candidate events, and cost tracking for Gemini models.

## Installation

```bash
npm install @reaatech/otel-genai-semconv-vertexai
# or
pnpm add @reaatech/otel-genai-semconv-vertexai
```

## Feature Overview

- **Zero-config instrumentation** — call `instrument(model)` once, every `generateContent()` call is traced
- **GCP metadata** — automatically attaches `gcp.project_id` and `gcp.location` when configured
- **Generation config mapping** — temperature, topP, topK, maxOutputTokens, stopSequences, and more mapped to OTel attributes
- **Candidate events** — each response candidate emits a `gen_ai.choice` event with text content and finish reason
- **System instruction tracking** — system instructions are captured as `gen_ai.system.message` events
- **Double-instrumentation guard** — calling `instrument()` twice is a safe no-op
- **Lifecycle hooks** — `onStart` and `onEnd` callbacks for custom span attributes
- **Safe uninstrument** — restores the original `generateContent()` method
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import { VertexAIInstrumentation } from "@reaatech/otel-genai-semconv-vertexai";

const instrumentation = new VertexAIInstrumentation({
  trackCosts: true,
  projectId: "my-gcp-project",
  location: "us-central1",
});

instrumentation.instrument(model);

const response = await model.generateContent({
  contents: [{ role: "user", parts: [{ text: "What is OpenTelemetry?" }] }],
});
// Each call now emits OTel spans with gen_ai.* attributes
```

## Captured Attributes

### Request Attributes

| Attribute | Source | Description |
|-----------|--------|-------------|
| `gen_ai.request.model` | Model name | Model identifier |
| `gen_ai.request.temperature` | `generationConfig.temperature` | Sampling temperature |
| `gen_ai.request.top_p` | `generationConfig.topP` | Top-p sampling |
| `gen_ai.request.top_k` | `generationConfig.topK` | Top-k sampling |
| `gen_ai.request.max_tokens` | `generationConfig.maxOutputTokens` | Max output tokens |
| `gen_ai.request.stop_sequences` | `generationConfig.stopSequences` | Stop sequences |
| `gen_ai.request.candidates_per_prompt` | `generationConfig.candidateCount` | Number of candidates |
| `gen_ai.request.presence_penalty` | `generationConfig.presencePenalty` | Presence penalty |
| `gen_ai.request.frequency_penalty` | `generationConfig.frequencyPenalty` | Frequency penalty |
| `gen_ai.request.tool_names` | `request.tools[].functionDeclarations[].name` | Tool names |
| `gen_ai.provider.name` | hardcoded | `"gcp.vertex_ai"` |

### GCP Metadata (when configured)

| Attribute | Source | Description |
|-----------|--------|-------------|
| `gcp.project_id` | `config.projectId` | GCP project identifier |
| `gcp.location` | `config.location` | GCP region |

### Response Attributes

| Attribute | Source | Description |
|-----------|--------|-------------|
| `gen_ai.response.model` | `response.modelVersion` | Model version used |
| `gen_ai.response.finish_reasons` | `candidates[].finishReason` (mapped) | Mapped to OTel finish reasons |
| `gen_ai.usage.input_tokens` | `usageMetadata.promptTokenCount` | Input token count |
| `gen_ai.usage.output_tokens` | `usageMetadata.candidatesTokenCount` | Output token count |

### Finish Reason Mapping

Vertex AI's `finishReason` values are mapped to OTel:

| Vertex AI | OTel |
|-----------|------|
| `STOP` | `stop` |
| `MAX_TOKENS` | `length` |
| `SAFETY` | `content_filter` |
| `RECITATION` | `content_filter` |
| `OTHER` | `unknown` |

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
| `gen_ai.system.message` | System instruction in the request |
| `gen_ai.user.message` | User content parts in the request |
| `gen_ai.assistant.message` | Assistant content parts |
| `gen_ai.choice` | Each candidate (with index, finish_reason, text content) |

## API Reference

### `VertexAIInstrumentation` (class)

#### Constructor

```typescript
new VertexAIInstrumentation({
  captureRequestHeaders?: boolean;
  captureResponseHeaders?: boolean;
  trackCosts?: boolean;
  pricing?: Record<string, PricingInfo>;
  projectId?: string;
  location?: string;
  onStart?: (span: Span, request: GenerateContentRequest) => void;
  onEnd?: (span: Span, response: GenerateContentResponse) => void;
})
```

#### Methods

| Method | Description |
|--------|-------------|
| `instrument(model)` | Wrap `model.generateContent()` with instrumentation |
| `uninstrument(model)` | Restore the original `generateContent()` method |

### `VertexAITokenCounter` (class)

Character-based token estimation for Vertex AI models:

```typescript
const counter = new VertexAITokenCounter();
counter.countTokens("Hello, world!", "gemini-pro");
counter.countContentsTokens(contents, "gemini-pro");
counter.clearCache();
```

### Attribute Mappers

```typescript
import { mapVertexAIRequest, mapVertexAIResponse, mapVertexAIError } from "@reaatech/otel-genai-semconv-vertexai";

const requestAttrs = mapVertexAIRequest(request, "gemini-pro");
const responseAttrs = mapVertexAIResponse(response);
const errorAttrs = mapVertexAIError(apiError);
```

## Configuration

### GCP Project and Location

```typescript
new VertexAIInstrumentation({
  projectId: "my-gcp-project",
  location: "us-central1",
}).instrument(model);
```

### Lifecycle Hooks

```typescript
new VertexAIInstrumentation({
  onStart: (span, request) => {
    span.setAttribute("vertexai.candidate_count", request.generationConfig?.candidateCount ?? 1);
  },
  onEnd: (span, response) => {
    span.setAttribute("vertexai.model_version", response.modelVersion);
  },
}).instrument(model);
```

## Usage Patterns

### String Input (Auto-Normalized)

```typescript
// The instrumentation automatically normalizes string input:
const response = await model.generateContent("What is OpenTelemetry?");
// Internally converted to { contents: [{ role: "user", parts: [{ text: "..." }] }] }
```

### Multi-Turn Conversation

```typescript
const response = await model.generateContent({
  contents: [
    { role: "user", parts: [{ text: "What is OpenTelemetry?" }] },
    { role: "assistant", parts: [{ text: "OpenTelemetry is..." }] },
    { role: "user", parts: [{ text: "Tell me more about tracing." }] },
  ],
});
// Each message emits the appropriate gen_ai.*.message event
```

## Related Packages

- [`@reaatech/otel-genai-semconv-core`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types and constants
- [`@reaatech/otel-genai-semconv-instrumentation`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-instrumentation) — Instrumentation framework
- [`@reaatech/otel-genai-semconv-utils`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-utils) — Cost calculator and token counter

## License

[MIT](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
