# otel-genai-semconv — Architecture

## System Overview

This is a **pnpm monorepo** with 9 independently installable packages under the `@reaatech` scope. The package dependency graph is layered: foundation packages (`core`) have no internal deps, utility packages (`utils`, `observability`) depend only on `core`, the instrumentation framework depends on utilities, provider packages depend on the framework, and exporters sit at the top.

```
packages/
├── core/               # @reaatech/otel-genai-semconv-core (types, constants, schemas, span builder)
├── instrumentation/    # @reaatech/otel-genai-semconv-instrumentation (tracer, hooks, streaming, retry, circuit breaker)
├── observability/      # @reaatech/otel-genai-semconv-observability (logging, OTel SDK, metrics, health checks)
├── utils/              # @reaatech/otel-genai-semconv-utils (token counting, cost calculation, PII redaction)
├── exporters/          # @reaatech/otel-genai-semconv-exporters (Phoenix, Langfuse, Cloud Trace)
├── openai/             # @reaatech/otel-genai-semconv-openai (OpenAI SDK instrumentation)
├── anthropic/          # @reaatech/otel-genai-semconv-anthropic (Anthropic SDK instrumentation)
├── vertexai/           # @reaatech/otel-genai-semconv-vertexai (Vertex AI SDK instrumentation)
└── bedrock/            # @reaatech/otel-genai-semconv-bedrock (Bedrock SDK instrumentation)
```

### Dependency Graph

```
core
├── utils (depends on core)
├── observability (depends on core)
│   └── exporters (depends on core, observability)
├── instrumentation (depends on core, utils, observability)
│   ├── openai (depends on core, instrumentation, utils; peer:openai)
│   ├── anthropic (depends on core, instrumentation, utils; peer:@anthropic-ai/sdk)
│   ├── vertexai (depends on core, instrumentation, utils; peer:@google-ai/generativelanguage)
│   └── bedrock (depends on core, instrumentation, utils; peer:@aws-sdk/client-bedrock-runtime)
```

### Tooling

- **pnpm** — workspace package manager (`pnpm-workspace.yaml`)
- **turbo** — monorepo task orchestration (`turbo.json`)
- **tsup** — dual ESM/CJS bundling per package
- **biome** — linting and formatting (`biome.json`)
- **changesets** — versioning and changelog generation (`.changeset/`)
- **vitest** — testing per package

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │  AI App     │    │  MCP Client │    │  Direct     │                  │
│  │  (Node.js)  │    │  (Claude)   │    │  Consumer   │                  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                  │
│         │                   │                   │                         │
│         └───────────────────┼───────────────────┘                         │
│                             │                                               │
└─────────────────────────────┼─────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Instrumentation Layer                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Provider Wrappers                              │   │
│  │  packages/{openai,anthropic,vertexai,bedrock}/                    │   │
│  │                                                                   │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │   │
│  │  │   OpenAI    │    │  Anthropic  │    │  Vertex AI  │           │   │
│  │  │ Instrument. │    │ Instrument. │    │ Instrument. │           │   │
│  │  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘           │   │
│  │         │                  │                  │                    │   │
│  │         └──────────────────┼──────────────────┘                    │   │
│  │                            ▼                                      │   │
│  │                   ┌─────────────┐                                 │   │
│  │                   │  Bedrock    │                                 │   │
│  │                   │ Instrument. │                                 │   │
│  │                   └─────────────┘                                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Semantic Convention Core                           │
│  packages/core/                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                   Span Attribute Mapper                           │   │
│  │                                                                   │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │   │
│  │  │  Provider   │───▶│   OTel      │───▶│    Span     │           │   │
│  │  │  Response   │    │ Semconv     │    │    Builder  │           │   │
│  │  │             │    │ Attributes  │    │             │           │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        LLM Provider APIs                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   OpenAI    │  │  Anthropic  │  │    Vertex   │  │   Bedrock   │    │
│  │    API      │  │     API     │  │     AI      │  │     API     │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Cross-Cutting Concerns                             │
│  packages/{utils,instrumentation}/                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  Token Counting  │  │   Cost Tracking  │  │    PII Redaction │       │
│  │  - tiktoken      │  │  - Per-provider  │  │  - Auto redact   │       │
│  │  - Provider API  │  │  - Custom pricing│  │  - Hash option   │       │
│  │  - Estimation    │  │  - Budget alerts │  │  - Compliance    │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Exporters                                       │
│  packages/exporters/                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   OTLP      │  │   Phoenix   │  │   Langfuse  │  │ Cloud Trace │    │
│  │  Exporter   │  │  Exporter   │  │  Exporter   │  │  Exporter   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Observability Backends                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Jaeger     │  │   Phoenix   │  │   Langfuse  │  │   Google    │    │
│  │             │  │             │  │             │  │   Cloud     │    │
│  │             │  │             │  │             │  │   Trace     │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Design Principles

### 1. Spec Compliance First
- All spans conform to OTel GenAI semantic conventions
- Regular validation against evolving spec
- Backward compatibility maintained
- Forward compatibility through versioning

### 2. Provider Agnostic
- Consistent telemetry across all providers
- Unified interface for instrumentation
- Provider-specific optimizations encapsulated
- Easy to add new providers

### 3. Zero Overhead
- Minimal performance impact (<5ms per request)
- Async instrumentation where possible
- Efficient token counting with caching
- Batch processing for exports

### 4. Privacy by Design
- Automatic PII redaction
- No sensitive data in spans
- Configurable data retention
- Compliance-ready (GDPR, CCPA, HIPAA)

### 5. Production Ready
- Battle-tested error handling
- Graceful degradation on failures
- Comprehensive observability
- Deployable dashboards included

---

## Component Deep Dive

### Provider Wrappers

Each provider wrapper instruments the SDK and captures telemetry:

```typescript
interface ProviderInstrumentation {
  instrument(client: ProviderClient): void;
  uninstrument(client: ProviderClient): void;
  captureRequest(span: Span, request: Request): void;
  captureResponse(span: Span, response: Response): void;
  captureError(span: Span, error: Error): void;
  handleStreaming(span: Span, stream: Stream): void;
}
```

**Instrumentation Flow:**
1. Wrap provider's client methods
2. On method call → create span with request attributes
3. On response → add response attributes and events
4. On error → add error attributes and set status
5. On stream end → finalize span with accumulated data

**Key Features:**
- **Double-instrumentation guard** — Symbol-based detection prevents duplicate spans when multiple instrumentations target the same client
- **`uninstrument()` method** — Removes all wrappers for clean shutdown or re-instrumentation
- **`onStart`/`onEnd` hooks** — Custom callbacks for adding business context to spans
- **Streaming support** — Proper span lifecycle management for streaming responses (span ends after stream completes)

### Semantic Convention Mapper

Maps provider-specific response formats to OTel GenAI semconv:

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Attribute Mapping Pipeline                         │
│                                                                      │
│  Provider Response → Normalize → Map to Semconv → Validate → Span   │
│                                                                      │
│  Example (OpenAI):                                                   │
│  {                                   Mapped to:                     │
│    model: "gpt-4"          →         gen_ai.response.model          │
│    usage.prompt_tokens   →         gen_ai.usage.input_tokens        │
│    usage.completion_tokens →       gen_ai.usage.output_tokens       │
│    choices[0].finish_reason →      gen_ai.response.finish_reasons   │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

**Mapping Rules:**
- Direct mapping for standard attributes
- Provider-specific mapping for custom fields
- Fallback to generic attributes when unavailable
- Validation against semconv schema

### Token Counter

Accurate token counting per provider:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Token Counting Strategy                          │
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │  Provider   │    │   tiktoken  │    │  Fallback   │              │
│  │  API Count  │───▶│  (OpenAI)   │───▶│  Estimation │              │
│  │  (if        │    │             │    │  (simple    │              │
│  │ available)  │    │             │    │  heuristic) │              │
│  └─────────────┘    └─────────────┘    └─────────────┘              │
│         │                  │                  │                       │
│         └──────────────────┼──────────────────┘                       │
│                            ▼                                         │
│                   ┌─────────────┐                                    │
│                   │   Cache     │                                    │
│                   │  (LRU, TTL) │                                    │
│                   └─────────────┘                                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Token Counting Methods:**
1. **Provider API** — Use provider's token counting API (most accurate)
2. **tiktoken** — Use tiktoken library for OpenAI models
3. **Estimation** — Use character/word ratio for fallback

### Cost Calculator

Real-time cost calculation based on token usage:

```typescript
interface CostCalculator {
  calculate(params: CostParams): CostResult;
}

interface CostParams {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

interface CostResult {
  total: number;
  input: number;
  output: number;
  currency: string;
}
```

**Pricing Data:**
- Versioned pricing tables
- Per-provider pricing (input/output differentiation)
- Custom pricing override support
- Regular updates as providers change pricing

### Span Builder

Constructs OTel-compliant spans with all required attributes:

```typescript
class SpanBuilder {
  createSpan(name: string, context: SpanContext): Span {
    const span = tracer.startSpan(name, {
      attributes: {
        ...this.getCommonAttributes(),
        ...this.getRequestAttributes(context.request),
      },
    });

    this.addMessageEvents(span, context.messages);
    this.addChoiceEvents(span, context.choices);
    this.addTokenUsageEvent(span, context.usage);
    this.setStatus(span, context.response, context.error);

    return span;
  }
}
```

**Span Structure:**
```
gen_ai.chat.completion [span]
├── Attributes
│   ├── gen_ai.request.model
│   ├── gen_ai.request.temperature
│   ├── gen_ai.response.model
│   ├── gen_ai.response.finish_reasons
│   ├── gen_ai.usage.input_tokens
│   ├── gen_ai.usage.output_tokens
│   └── llm.cost.total
├── Events
│   ├── gen_ai.system.message
│   ├── gen_ai.user.message
│   ├── gen_ai.assistant.message
│   ├── gen_ai.choice (per choice)
│   └── gen_ai.usage
└── Status
    ├── OK or ERROR
    └── Error details (if error)
```

---

## Complete Instrumentation Flow

```
1. Application calls LLM provider SDK
        │
2. Provider wrapper intercepts call
        │
3. Create OTel span with request attributes:
   - Model name
   - Request parameters (temperature, max_tokens, etc.)
   - Custom attributes from hooks
        │
4. Execute actual provider API call
        │
5. On response:
   - Map response to OTel semconv attributes
   - Count tokens (provider API → tiktoken → estimation)
   - Calculate cost
   - Add response attributes to span
   - Emit events (choices, messages, usage)
        │
6. On error:
   - Map error to OTel error attributes
   - Set span status to ERROR
   - Add error event
        │
7. On streaming:
   - Track time-to-first-token (TTFT)
   - Accumulate chunks via ChunkAggregator
   - Update token count per chunk
   - Finalize span on stream end (not before)
        │
8. Export span to configured backend:
   - OTLP exporter (to collector)
   - Phoenix exporter (direct)
   - Langfuse exporter (direct)
   - Cloud Trace exporter (direct)
        │
9. Backend processes and stores span
        │
10. Dashboards visualize telemetry data
```

---

## Security Model

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 1: Data Collection                                             │
│ - Automatic PII redaction                                           │
│ - No API keys in spans                                              │
│ - Sensitive data hashing option                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 2: Data Transmission                                           │
│ - TLS for all exports                                               │
│ - API key authentication for exporters                              │
│ - Rate limiting on exports                                          │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 3: Data Storage                                                │
│ - Configurable retention policies                                   │
│ - Anonymization after retention period                              │
│ - Secure storage backends                                           │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 4: Access Control                                              │
│ - RBAC for dashboard access                                         │
│ - Audit logging for data access                                     │
│ - Data encryption at rest                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### PII Redaction

Automatic PII detection and redaction using safe regex patterns:

```typescript
class PIIRedactor {
  redact(text: string): string {
    text = text.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[REDACTED_EMAIL]');
    text = text.replace(/\+?[\d\s-()]{10,}/g, '[REDACTED_PHONE]');
    text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');
    text = text.replace(/\b\d{13,19}\b/g, '[REDACTED_CC]');
    return text;
  }
}
```

**Redaction Options:**
- Redact message content (optional)
- Hash instead of redact (for debugging)
- Custom patterns for domain-specific PII
- Compliance modes (GDPR, HIPAA, CCPA)

---

## Deployment Architecture

### Self-Hosted with OTel Collector

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Application    │────▶│  OTel Collector  │────▶│    Jaeger      │
│  (instrumented) │     │  (receives spans)│     │   (storage)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Prometheus     │
                       │   (metrics)      │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │    Grafana       │
                       │  (dashboards)    │
                       └──────────────────┘
```

### Docker Compose (included)

The repo includes a `docker/docker-compose.yml` with:
- **otel-collector** — OTLP gRPC and HTTP endpoints
- **jaeger** — Trace storage and UI
- **phoenix** — LLM observability dashboard
- **example-app** — Instrumented example application

---

## Failure Modes

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Provider API error | Non-2xx response | Capture error in span, set status to ERROR |
| Token counting failure | Exception in counter | Fallback to estimation, log warning |
| Cost calculation error | Invalid pricing data | Use default pricing, log error |
| Export failure | Network error | Retry with backoff, buffer locally |
| PII redaction failure | Regex error | Log error, continue without redaction |
| Span creation failure | OTel SDK error | Log error, continue without tracing |
| Memory pressure | High memory usage | Reduce batch size, increase export frequency |
| Streaming error | Error during `next()` | Call `handler.error()`, finalize span with error status |

---

## Performance Considerations

### Latency Impact

| Operation | Added Latency |
|-----------|---------------|
| Span creation | <1ms |
| Attribute mapping | <1ms |
| Token counting (cached) | <1ms |
| Token counting (uncached) | <5ms |
| Cost calculation | <1ms |
| Export (async) | 0ms (non-blocking) |

**Total overhead per request: <5ms**

### Memory Usage

- Span buffering with configurable batch size
- LRU cache for token counts (max 10000 entries)
- Streaming chunk aggregation with limits
- Automatic cleanup of completed spans

### CPU Usage

- Async processing where possible
- Efficient regex patterns for PII redaction
- Cached pricing data
- Batched exports to reduce I/O

---

## References

- **AGENTS.md** — Agent development guide
- **DEV_PLAN.md** — Development checklist
- **README.md** — Quick start and overview
- **CONTRIBUTING.md** — Contribution workflow and release process
- **docs/SEMCONV_REFERENCE.md** — Complete semantic convention reference
- **OpenTelemetry GenAI Spec** — https://opentelemetry.io/docs/specs/semconv/gen-ai/
