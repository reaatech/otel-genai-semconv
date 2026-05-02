# @reaatech/otel-genai-semconv-bedrock

[![npm version](https://img.shields.io/npm/v/@reaatech/otel-genai-semconv-bedrock.svg)](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-bedrock)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/otel-genai-semconv/ci.yml?branch=main&label=CI)](https://github.com/reaatech/otel-genai-semconv/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Transparent instrumentation for the [AWS Bedrock Runtime SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/bedrock-runtime/). Wraps `client.send()` to intercept `InvokeModelCommand` calls and emit [OpenTelemetry GenAI semantic convention](https://opentelemetry.io/docs/specs/semconv/gen-ai/) spans with model-family-aware attribute mapping across Anthropic Claude, Amazon Titan, Cohere Command, and AI21 Jurassic models.

## Installation

```bash
npm install @reaatech/otel-genai-semconv-bedrock
# or
pnpm add @reaatech/otel-genai-semconv-bedrock
```

## Feature Overview

- **Zero-config instrumentation** — call `instrument(client)` once, every `InvokeModelCommand` is traced
- **Multi-family attribute mapping** — parses request/response bodies for Anthropic, Amazon Titan, Cohere, and AI21 formats
- **Model family filtering** — track only specific model families via `trackModelFamilies` config
- **AWS region metadata** — attaches `aws.region` to spans when configured
- **Binary response decoding** — automatically decodes `Uint8Array` response bodies to JSON
- **Double-instrumentation guard** — calling `instrument()` twice is a safe no-op
- **Lifecycle hooks** — `onStart` and `onEnd` callbacks for custom span attributes
- **Safe uninstrument** — restores the original `send()` method
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import { BedrockInstrumentation } from "@reaatech/otel-genai-semconv-bedrock";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: "us-east-1" });

new BedrockInstrumentation({
  trackCosts: true,
  region: "us-east-1",
  trackModelFamilies: ["anthropic", "amazon", "cohere", "ai21"],
}).instrument(client);

const response = await client.send(new InvokeModelCommand({
  modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
  body: JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 200,
    messages: [{ role: "user", content: "What is OpenTelemetry?" }],
  }),
}));
// Each InvokeModelCommand now emits OTel spans with gen_ai.* attributes
```

## Supported Model Families

| Family | Models | Request Attributes | Response Attributes | Token Count |
|--------|--------|-------------------|--------------------|-------------|
| `anthropic` | Claude 3 Opus/Sonnet/Haiku | max_tokens, temperature, top_p, top_k, stop_sequences | model, stop_reason, input/output tokens | ✅ |
| `amazon` | Titan Text | maxTokenCount, temperature, topP | inputTextTokenCount, completionReason | ✅ |
| `cohere` | Command | max_tokens, temperature, p, stop_sequences | finish_reason | Partial |
| `ai21` | Jurassic | maxTokens, temperature, topP | completions tokens, finishReason | ✅ |

## Captured Attributes

### Request Attributes

| Attribute | Anthropic | Amazon | Cohere | AI21 |
|-----------|-----------|--------|--------|------|
| `gen_ai.request.model` | ✅ | ✅ | ✅ | ✅ |
| `gen_ai.request.temperature` | ✅ | ✅ | ✅ | ✅ |
| `gen_ai.request.top_p` | ✅ | ✅ | ✅ (p) | ✅ |
| `gen_ai.request.top_k` | ✅ | — | — | — |
| `gen_ai.request.max_tokens` | ✅ | ✅ (maxTokenCount) | ✅ | ✅ |
| `gen_ai.request.stop_sequences` | ✅ | — | ✅ | — |
| `gen_ai.provider.name` | `"aws.bedrock"` | `"aws.bedrock"` | `"aws.bedrock"` | `"aws.bedrock"` |

### Response Attributes

| Attribute | Anthropic | Amazon | Cohere | AI21 |
|-----------|-----------|--------|--------|------|
| `gen_ai.response.model` | ✅ | — | — | — |
| `gen_ai.response.finish_reasons` | stop_reason mapped | completionReason | finish_reason | finishReason |
| `gen_ai.usage.input_tokens` | ✅ | ✅ (inputTextTokenCount) | — | — |
| `gen_ai.usage.output_tokens` | ✅ | ✅ (results[0].tokenCount) | — | ✅ (tokens.length) |

### Additional Attributes

| Attribute | Description |
|-----------|-------------|
| `gen_ai.provider.family` | Model family name (e.g., `"anthropic"`, `"amazon"`) |
| `aws.region` | AWS region (when configured) |

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
| `gen_ai.choice` | Response processing (with finish_reason from mapped response) |

## API Reference

### `BedrockInstrumentation` (class)

#### Constructor

```typescript
new BedrockInstrumentation({
  captureRequestHeaders?: boolean;
  captureResponseHeaders?: boolean;
  trackCosts?: boolean;
  pricing?: Record<string, PricingInfo>;
  region?: string;
  trackModelFamilies?: string[];
  onStart?: (span: Span, request: { modelId: string; body: string }) => void;
  onEnd?: (span: Span, response: unknown) => void;
})
```

#### Methods

| Method | Description |
|--------|-------------|
| `instrument(client)` | Wrap `client.send()` to intercept `InvokeModelCommand` |
| `uninstrument(client)` | Restore the original `send()` method |

### `BedrockTokenCounter` (class)

Family-aware token estimation:

```typescript
const counter = new BedrockTokenCounter();
counter.countTokens("Hello, world!", "anthropic.claude-3-sonnet");
// ~4 chars/token for anthropic/amazon, ~4.5 for cohere, word-based for ai21
counter.clearCache();
```

### Attribute Mappers

```typescript
import { mapBedrockRequest, mapBedrockResponse, mapBedrockError } from "@reaatech/otel-genai-semconv-bedrock";

const requestAttrs = mapBedrockRequest({ modelId, body }, modelId);
const responseAttrs = mapBedrockResponse(bodyString, modelId);
const errorAttrs = mapBedrockError(apiError);
```

## Configuration

### Model Family Filtering

```typescript
new BedrockInstrumentation({
  trackModelFamilies: ["anthropic", "amazon"],  // only instrument these families
}).instrument(client);
```

### AWS Region

```typescript
new BedrockInstrumentation({
  region: "us-east-1",  // attached as aws.region span attribute
}).instrument(client);
```

### Lifecycle Hooks

```typescript
new BedrockInstrumentation({
  onStart: (span, request) => {
    const body = JSON.parse(request.body);
    span.setAttribute("bedrock.model_family", request.modelId.split(".")[0]);
  },
  onEnd: (span, response) => {
    span.setAttribute("bedrock.request_id", response.$metadata?.requestId);
  },
}).instrument(client);
```

## Usage Patterns

### Non-InvokeModel Commands

The instrumentation only intercepts `InvokeModelCommand`. All other Bedrock commands pass through to the original `send()` method unchanged.

### Binary Response Handling

Response bodies from Bedrock are `Uint8Array`. The instrumentation automatically decodes them to strings before JSON parsing and attribute mapping.

```typescript
// No special handling needed — the instrumentation decodes binary responses
const response = await client.send(new InvokeModelCommand({ modelId: "...", body: "..." }));
// { body: <Uint8Array>, output: { body: <Uint8Array> } } → auto-decoded to JSON
```

### Full Bedrock Invoke Pipeline

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { BedrockInstrumentation } from "@reaatech/otel-genai-semconv-bedrock";

const client = new BedrockRuntimeClient({ region: "us-west-2" });

const instrumentation = new BedrockInstrumentation({
  trackCosts: true,
  region: "us-west-2",
  trackModelFamilies: ["anthropic", "amazon", "cohere", "ai21"],
});

instrumentation.instrument(client);

// All InvokeModelCommand calls are now traced
const claudeResp = await client.send(new InvokeModelCommand({
  modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
  body: JSON.stringify({ anthropic_version: "bedrock-2023-05-31", max_tokens: 200, messages: [...] }),
}));

const titanResp = await client.send(new InvokeModelCommand({
  modelId: "amazon.titan-text-express-v1",
  body: JSON.stringify({ inputText: "...", textGenerationConfig: { maxTokenCount: 200 } }),
}));

// Uninstrument when done
instrumentation.uninstrument(client);
```

## Related Packages

- [`@reaatech/otel-genai-semconv-core`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types and constants
- [`@reaatech/otel-genai-semconv-instrumentation`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-instrumentation) — Instrumentation framework
- [`@reaatech/otel-genai-semconv-utils`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-utils) — Cost calculator and token counter
- [`@reaatech/otel-genai-semconv-anthropic`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-anthropic) — Direct Anthropic SDK instrumentation

## License

[MIT](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
