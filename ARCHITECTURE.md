# otel-genai-semconv — Architecture

## System Overview

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
  // Wrap the provider's client
  instrument(client: ProviderClient): void;
  
  // Remove instrumentation (cleanup)
  uninstrument(client: ProviderClient): void;
  
  // Capture request attributes
  captureRequest(span: Span, request: Request): void;
  
  // Capture response attributes
  captureResponse(span: Span, response: Response): void;
  
  // Handle errors
  captureError(span: Span, error: Error): void;
  
  // Handle streaming
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
  total: number;      // Total cost in USD
  input: number;      // Input token cost
  output: number;     // Output token cost
  currency: string;   // Currency code (default: USD)
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
    
    // Add events
    this.addMessageEvents(span, context.messages);
    this.addChoiceEvents(span, context.choices);
    
    // Add token usage
    this.addTokenUsageEvent(span, context.usage);
    
    // Set status
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

## Data Flow

### Complete Instrumentation Flow

```
1. Application calls LLM provider SDK
        │
2. Instrumentation wrapper intercepts call
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

Automatic PII detection and redaction using safe regex patterns (no stateful `.test()` with `g` flag):

```typescript
class PIIRedactor {
  redact(text: string): string {
    // Email addresses
    text = text.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[REDACTED_EMAIL]');
    
    // Phone numbers
    text = text.replace(/\+?[\d\s-()]{10,}/g, '[REDACTED_PHONE]');
    
    // SSN
    text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');
    
    // Credit cards
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

### GCP Cloud Run

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Cloud Run Service                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 otel-genai-semconv Container                 │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐                │    │
│  │  │  Instru-  │  │  OTel     │  │ Secrets   │                │    │
│  │  │ mentation │  │ Sidecar  │  │ Mounted   │                │    │
│  │  └───────────┘  └───────────┘  └───────────┘                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Config:                                                             │
│  - Min instances: 0 (scale to zero)                                 │
│  - Max instances: 10 (configurable)                                 │
│  - Memory: 512MB, CPU: 1 vCPU                                       │
│  - Timeout: 60s (configurable)                                      │
│                                                                      │
│  Secrets: Secret Manager → mounted as env vars                       │
│  Observability: OTel → Cloud Monitoring / Jaeger                     │
└─────────────────────────────────────────────────────────────────────┘
```

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

---

## Observability

### Tracing

Every LLM call generates a trace with detailed spans:

| Span Name | Attributes | Events |
|-----------|------------|--------|
| `gen_ai.chat.completion` | model, temperature, max_tokens, etc. | system.message, user.message, assistant.message, choice, usage |
| `gen_ai.embedding` | model, dimensions, input | embedding |
| `gen_ai.tool_call` | tool_name, tool_input, tool_output | tool_call, tool_result |

### Metrics

The instrumentation exports these OTel metrics:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `genai.requests.total` | Counter | `provider`, `model`, `status` | Total LLM requests |
| `genai.request.duration_ms` | Histogram | `provider`, `model` | Request latency |
| `genai.tokens.input` | Counter | `provider`, `model` | Input tokens used |
| `genai.tokens.output` | Counter | `provider`, `model` | Output tokens generated |
| `genai.cost.total` | Histogram | `provider`, `model` | Cost per request |
| `genai.errors.total` | Counter | `provider`, `error_type` | Error count by type |
| `genai.streaming.time_to_first_token_ms` | Histogram | `provider`, `model` | Streaming latency |

### Logging

All instrumentation events are logged with structured context:

```json
{
  "timestamp": "2026-04-15T23:00:00Z",
  "service": "my-llm-app",
  "trace_id": "abc123",
  "span_id": "def456",
  "level": "info",
  "message": "LLM request completed",
  "provider": "openai",
  "model": "gpt-4",
  "input_tokens": 50,
  "output_tokens": 100,
  "cost_usd": 0.0045,
  "duration_ms": 1234,
  "status": "OK"
}
```

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
| Streaming error | Error during `next()` | Properly call `handler.error()`, finalize span with error status |

---

## Performance Considerations

### Latency Impact

The instrumentation adds minimal latency:

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

Memory-efficient design:

- Span buffering with configurable batch size
- LRU cache for token counts (max 10000 entries)
- Streaming chunk aggregation with limits
- Automatic cleanup of completed spans

### CPU Usage

Minimal CPU impact:

- Async processing where possible
- Efficient regex patterns for PII redaction
- Cached pricing data
- Batched exports to reduce I/O

---

## References

- **AGENTS.md** — Agent development guide
- **DEV_PLAN.md** — Development checklist
- **README.md** — Quick start and overview
- **docs/SEMCONV_REFERENCE.md** — Complete semantic convention reference
- **OpenTelemetry GenAI Spec** — https://opentelemetry.io/docs/specs/semconv/gen-ai/
- **MCP Specification** — https://modelcontextprotocol.io/
