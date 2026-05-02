# @reaatech/otel-genai-semconv-instrumentation

[![npm version](https://img.shields.io/npm/v/@reaatech/otel-genai-semconv-instrumentation.svg)](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-instrumentation)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/otel-genai-semconv/ci.yml?branch=main&label=CI)](https://github.com/reaatech/otel-genai-semconv/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Core instrumentation framework for LLM observability. Provides tracer management, lifecycle hooks, streaming response handling, error classification, exponential-backoff retry, per-provider circuit breaking, chunk aggregation, and span-level PII redaction. All provider-specific instrumentation packages (`otel-genai-semconv-openai`, etc.) are built on top of this framework.

## Installation

```bash
npm install @reaatech/otel-genai-semconv-instrumentation
# or
pnpm add @reaatech/otel-genai-semconv-instrumentation
```

## Feature Overview

- **Tracer management** — unified OTel tracer with context propagation, child spans, and auto-end helpers
- **Lifecycle hooks** — `onStart`, `onEnd`, `onError` hooks with priority ordering and ID-based unregistration
- **Streaming instrumentation** — automatic TTFT tracking, chunk counting, token accumulation, and stream wrapping
- **Chunk aggregation** — reconstruct complete responses from streaming chunks, including tool call merging
- **Streaming events** — configurable per-chunk or per-token event emission on spans
- **Error classification** — 12 error types (rate limit, auth, timeout, content filter, etc.) with retryability flags
- **Retry handler** — exponential backoff with jitter, configurable retryable error types, attempt metadata on spans
- **Circuit breaker** — per-provider circuit breaking with half-open recovery, configurable thresholds, span metadata
- **Span processor** — PII redaction and attribute filtering at span export time
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import {
  TracerManager,
  HookManager,
  ErrorHandler,
  RetryHandler,
  CircuitBreaker,
} from "@reaatech/otel-genai-semconv-instrumentation";

// Create a tracer
const tracer = new TracerManager();
const span = tracer.startSpan("gen_ai.chat.completion");

// Register lifecycle hooks
const hooks = new HookManager();
hooks.onStart((ctx) => {
  ctx.span.setAttribute("custom.user_id", "abc123");
});
hooks.onEnd((ctx) => {
  ctx.span.setAttribute("custom.quality_score", 0.95);
});

// Classify errors
const errorHandler = new ErrorHandler();
const errorType = errorHandler.classifyError(rateLimitError);
// → LLMErrorType.RATE_LIMIT

// Retry with backoff
const retry = new RetryHandler({ maxRetries: 3 });
await retry.executeWithRetry(async (attempt) => {
  return await callLLM();
});

// Circuit break per provider
const breaker = new CircuitBreaker({ failureThreshold: 5 });
if (breaker.canExecute()) {
  breaker.recordSuccess();
}
```

## API Reference

### `TracerManager` (class)

#### Constructor

```typescript
new TracerManager(options?: { tracerName?: string; tracerVersion?: string })
```

#### Methods

| Method | Description |
|--------|-------------|
| `getTracer()` | Get or create the OTel tracer |
| `startSpan(name, options?)` | Start a new span |
| `startChildSpan(parentSpan, name, options?)` | Start a span as a child of another span |
| `withSpan(span, fn)` | Execute a sync function within a span context |
| `withSpanAsync(span, fn)` | Execute an async function within a span context |
| `withAutoEndSpan(name, fn, options?)` | Create a span that auto-ends when the async function resolves |
| `withAutoEndSpanSync(name, fn, options?)` | Create a span that auto-ends when the sync function returns |
| `getCurrentSpan()` | Get the current span from active context |
| `getCurrentContext()` | Get the current OTel context |
| `setActiveSpan(span)` | Set a span as active in context |
| `inject(headers)` | Inject trace context into headers |
| `extract(headers)` | Extract trace context from headers |
| `reset()` | Reset the tracer (useful for testing) |

### `HookManager` (class)

#### Methods

| Method | Description |
|--------|-------------|
| `onStart(fn, options?)` | Register an onStart hook, returns hook ID |
| `onEnd(fn, options?)` | Register an onEnd hook, returns hook ID |
| `onError(fn, options?)` | Register an onError hook, returns hook ID |
| `unregister(id)` | Remove a hook by ID |
| `executeOnStart(context)` | Execute all onStart hooks |
| `executeOnEnd(context)` | Execute all onEnd hooks |
| `executeOnError(context)` | Execute all onError hooks |
| `clear()` | Remove all hooks |
| `getHookCount(type?)` | Count registered hooks |
| `listHooks(type?)` | List hook IDs |

#### Hook Contexts

| Context | Properties |
|---------|-----------|
| `RequestHookContext` | `span`, `provider`, `model`, `requestId?`, `traceId?`, `spanId?`, `request` |
| `ResponseHookContext` | `span`, `provider`, `model`, `requestId?`, `traceId?`, `spanId?`, `response` |
| `ErrorHookContext` | `span`, `provider`, `model`, `requestId?`, `error`, `errorType?` |

### `StreamingHandler` (class)

```typescript
const handler = new StreamingHandler(span, { onChunk: (chunk) => console.log(chunk) });
handler.processChunk(chunk, tokenDelta);
handler.complete({ outputTokens: 500, finishReason: "stop" });
handler.error(new Error("stream interrupted"));
handler.getMetrics(); // { timeToFirstTokenMs, totalDurationMs, chunkCount, outputTokens, startTime }
```

#### `instrumentStream(stream, span, options?)`

Wraps an `AsyncIterable` to automatically instrument streaming:

```typescript
import { instrumentStream } from "@reaatech/otel-genai-semconv-instrumentation";

const instrumented = instrumentStream(originalStream, span, {
  getTokenCount: (chunk) => chunk.usage?.completion_tokens,
});
for await (const chunk of instrumented) {
  // Each chunk is measured; TTFT, duration, and chunk count are captured automatically
}
```

### `ErrorHandler` (class)

#### Methods

| Method | Description |
|--------|-------------|
| `classifyError(error)` | Classify an error to `LLMErrorType` |
| `isRetryable(errorType)` | Check if an error type should be retried |
| `captureError(span, error, context?)` | Capture error on a span (status, exception, attributes) |
| `getUserMessage(errorType)` | Get a user-friendly error message |

#### `LLMErrorType` (enum)

| Value | Retryable | Description |
|-------|-----------|-------------|
| `RATE_LIMIT` | Yes | 429 / rate limit exceeded |
| `AUTHENTICATION` | No | 401 / invalid API key |
| `AUTHORIZATION` | No | 403 / permission denied |
| `INVALID_REQUEST` | No | 400 / bad request |
| `NOT_FOUND` | No | 404 / model not found |
| `VALIDATION` | No | Validation error |
| `SERVER` | Yes | 5xx / server error |
| `TIMEOUT` | Yes | Request timed out |
| `NETWORK` | Yes | Connection / fetch failure |
| `CONTENT_FILTER` | No | Content filtered / safety |
| `QUOTA_EXCEEDED` | No | Quota exhausted |
| `UNKNOWN` | No | Unclassified error |

### `RetryHandler` (class)

#### Constructor

```typescript
new RetryHandler({
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrorTypes: [LLMErrorType.RATE_LIMIT, LLMErrorType.TIMEOUT],
})
```

#### Methods

| Method | Description |
|--------|-------------|
| `canRetry()` | Check if more retries are available |
| `shouldRetry(errorType)` | Check if this error type should be retried |
| `calculateDelay()` | Calculate the delay for the next attempt |
| `recordAttempt(delayMs, error?, errorType?)` | Record a retry attempt |
| `recordOnSpan(span)` | Add retry metadata to a span (attempt count, events) |
| `executeWithRetry(fn, onError?)` | Execute a function with full retry logic |
| `getTotalDelay()` | Total delay across all retries |
| `getAttempts()` | All recorded retry attempts |
| `reset()` | Reset retry state |

### `CircuitBreaker` (class)

#### Constructor

```typescript
new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 3,
  recoveryTimeoutMs: 60000,
  failureErrorTypes: [LLMErrorType.RATE_LIMIT, LLMErrorType.TIMEOUT],
})
```

#### Circuit States

| State | Description |
|-------|-------------|
| `CLOSED` | Normal operation — requests flow through |
| `OPEN` | Failures exceeded threshold — requests are blocked |
| `HALF_OPEN` | Recovery timeout elapsed — testing if service recovered |

#### Methods

| Method | Description |
|--------|-------------|
| `getState()` | Current state (auto-transitions OPEN → HALF_OPEN) |
| `canExecute()` | Whether a request should be allowed |
| `recordSuccess(span?)` | Record a successful call |
| `recordFailure(errorType, span?)` | Record a failed call |
| `recordOnSpan(span)` | Add circuit breaker state to span attributes |
| `getStats()` | Current statistics (requests, failures, state) |
| `reset()` | Reset to CLOSED state |

### `CircuitBreakerRegistry` (class)

Manages per-provider circuit breakers:

```typescript
const registry = new CircuitBreakerRegistry();
const openaiBreaker = registry.get("openai");
const anthropicBreaker = registry.get("anthropic");
registry.getAllStats(); // Map<string, CircuitStats>
```

### `ChunkAggregator` (class)

Accumulates streaming chunks into a complete response:

```typescript
const aggregator = new ChunkAggregator();
aggregator.addText("Hello");
aggregator.addText(", world!");
aggregator.setFinishReason("stop");
aggregator.setModel("gpt-4");
aggregator.setTokenUsage(50, 10);
const response = aggregator.build();
// { content: "Hello, world!", finishReason: "stop", model: "gpt-4", ... }
```

### `SpanProcessor` (class)

Implements the OTel `SpanProcessor` interface with PII redaction:

```typescript
new SpanProcessor({
  piiRedactionEnabled: true,
  redactMessageContent: false,
  customAttributes: { "environment": "production" },
})
```

## Usage Patterns

### Retry with Custom Error Handler

```typescript
const retry = new RetryHandler({ maxRetries: 3 });
const errorHandler = new ErrorHandler();

try {
  const result = await retry.executeWithRetry(
    async (attempt) => await openai.chat.completions.create(params),
    async (error, attempt) => {
      const type = errorHandler.classifyError(error);
      return errorHandler.isRetryable(type) && attempt < 3;
    }
  );
} catch (err) {
  errorHandler.captureError(span, err as Error);
}
```

### Circuit Breaking with Span Metadata

```typescript
const breaker = createCircuitBreaker({ failureThreshold: 3, recoveryTimeoutMs: 30000 });

if (!breaker.canExecute()) {
  throw new Error("Circuit is open — try again later");
}

try {
  const result = await makeLLMCall();
  breaker.recordSuccess(span);
} catch (error) {
  const type = errorHandler.classifyError(error);
  breaker.recordFailure(type, span);
  throw error;
}
```

### Streaming with Automatic TTFT

```typescript
const span = tracer.startSpan("gen_ai.chat.completion");
const instrumented = instrumentStream(stream, span, {
  getTokenCount: (chunk) => {
    // extract token count from provider-specific chunk format
    return chunk.usage?.completion_tokens;
  },
});

for await (const chunk of instrumented) {
  // TTFT, chunk count, and output tokens are captured automatically
}
// On stream end, the span is auto-finalized with gen_ai.streaming.* attributes
```

## Related Packages

- [`@reaatech/otel-genai-semconv-core`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types and constants
- [`@reaatech/otel-genai-semconv-observability`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-observability) — Logging and metrics
- [`@reaatech/otel-genai-semconv-utils`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-utils) — Token counting and cost calculation
- [`@reaatech/otel-genai-semconv-openai`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-openai) — OpenAI provider instrumentation

## License

[MIT](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
