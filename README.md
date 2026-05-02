# otel-genai-semconv

[![CI](https://github.com/reaatech/otel-genai-semconv/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/otel-genai-semconv/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)

> Reference implementation of the [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/), providing instrumented wrappers for OpenAI, Anthropic, Vertex AI, and AWS Bedrock that emit spec-compliant spans, plus deployable dashboards for Phoenix, Langfuse, and Cloud Trace.

This monorepo provides the core types, instrumentation framework, provider-specific wrappers, and supporting infrastructure for building observable LLM applications.

## Features

- **OTel GenAI spec compliance** — All spans follow the OpenTelemetry GenAI semantic conventions (`gen_ai.*` attributes, events, and metrics)
- **Multi-provider support** — Instrumented wrappers for OpenAI, Anthropic, Vertex AI, and AWS Bedrock
- **Streaming instrumentation** — Full streaming support with TTFT tracking, chunk counting, and delta aggregation
- **Cost tracking** — Built-in pricing tables for GPT-4, Claude 3, Gemini, and Bedrock models with custom pricing overrides
- **Token counting** — tiktoken integration for OpenAI, estimation fallbacks for all other providers
- **PII redaction** — Automatic detection and redaction of emails, SSNs, credit cards, IPs, and phone numbers
- **Error handling** — 12 error type classifications with retryability flags and user-friendly messages
- **Circuit breaker** — Per-provider circuit breaking with half-open recovery and configurable thresholds
- **Retry with backoff** — Exponential backoff with jitter, configurable retryable error types, and span metadata
- **Lifecycle hooks** — `onStart`/`onEnd`/`onError` hooks with priority ordering for custom span attributes
- **Dashboard exporters** — Native format conversion for Phoenix, Langfuse, and Google Cloud Trace
- **Health checks** — Runtime health endpoints with OTel SDK and memory threshold monitoring

## Installation

### Using the packages

Packages are published under the `@reaatech` scope and can be installed individually:

```bash
# Core types, constants, and span builder
pnpm add @reaatech/otel-genai-semconv-core

# Instrumentation framework (tracer, hooks, streaming, circuit breaker, retry)
pnpm add @reaatech/otel-genai-semconv-instrumentation

# OpenAI provider instrumentation
pnpm add @reaatech/otel-genai-semconv-openai

# Anthropic provider instrumentation
pnpm add @reaatech/otel-genai-semconv-anthropic

# Vertex AI provider instrumentation
pnpm add @reaatech/otel-genai-semconv-vertexai

# AWS Bedrock provider instrumentation
pnpm add @reaatech/otel-genai-semconv-bedrock

# Token counting, cost calculation, and PII redaction utilities
pnpm add @reaatech/otel-genai-semconv-utils

# Structured logging, OTel SDK setup, and health checks
pnpm add @reaatech/otel-genai-semconv-observability

# Dashboard exporters (Phoenix, Langfuse, Cloud Trace)
pnpm add @reaatech/otel-genai-semconv-exporters
```

### Contributing

```bash
# Clone the repository
git clone https://github.com/reaatech/otel-genai-semconv.git
cd otel-genai-semconv

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run linting
pnpm lint

# Run type checking
pnpm typecheck
```

## Quick Start

Instrument an OpenAI client in 3 lines:

```typescript
import { OpenAIInstrumentation } from "@reaatech/otel-genai-semconv-openai";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
new OpenAIInstrumentation({ trackCosts: true }).instrument(client);

// Every chat.completions.create() call now emits OTel spans
const response = await client.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "What is OpenTelemetry?" }],
});
```

Multi-provider with streaming:

```typescript
import { OpenAIInstrumentation } from "@reaatech/otel-genai-semconv-openai";
import { AnthropicInstrumentation } from "@reaatech/otel-genai-semconv-anthropic";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const openai = new OpenAI();
const anthropic = new Anthropic();

new OpenAIInstrumentation({ trackCosts: true }).instrument(openai);
new AnthropicInstrumentation({ trackCosts: true }).instrument(anthropic);

// Streaming is automatically instrumented with TTFT and chunk count
const stream = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Tell me a story" }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}
```

See the [`examples/`](./examples/) directory for complete working samples, including multi-provider comparison, streaming, and RAG pipelines.

## Packages

| Package | Description |
| ------- | ----------- |
| [`@reaatech/otel-genai-semconv-core`](./packages/core) | Canonical types, constants, schemas, and span builder |
| [`@reaatech/otel-genai-semconv-instrumentation`](./packages/instrumentation) | Core instrumentation framework (tracer, hooks, streaming, retry, circuit breaker) |
| [`@reaatech/otel-genai-semconv-openai`](./packages/openai) | OpenAI SDK instrumentation |
| [`@reaatech/otel-genai-semconv-anthropic`](./packages/anthropic) | Anthropic SDK instrumentation |
| [`@reaatech/otel-genai-semconv-vertexai`](./packages/vertexai) | Vertex AI SDK instrumentation |
| [`@reaatech/otel-genai-semconv-bedrock`](./packages/bedrock) | AWS Bedrock SDK instrumentation |
| [`@reaatech/otel-genai-semconv-utils`](./packages/utils) | Token counting, cost calculation, and PII redaction |
| [`@reaatech/otel-genai-semconv-observability`](./packages/observability) | Logging, OTel SDK setup, metrics, and health checks |
| [`@reaatech/otel-genai-semconv-exporters`](./packages/exporters) | Dashboard exporters for Phoenix, Langfuse, and Cloud Trace |

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System design, package relationships, and data flows
- [`AGENTS.md`](./AGENTS.md) — Coding conventions and development guidelines
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Contribution workflow and release process
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Contribution workflow and release process
- [`docs/`](./docs/) — In-depth reference material for semantic conventions, dashboard setup, and configuration

## License

[MIT](LICENSE)
