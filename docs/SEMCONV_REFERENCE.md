# Semantic Convention Reference

Complete reference for OpenTelemetry GenAI semantic conventions implemented in this library.

## Standard Attributes

All instrumentations capture these OTel GenAI semantic convention attributes:

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `gen_ai.request.model` | string | Requested model name | `"gpt-4-turbo"` |
| `gen_ai.request.temperature` | double | Sampling temperature | `0.7` |
| `gen_ai.request.top_p` | double | Top-p sampling parameter | `0.9` |
| `gen_ai.request.max_tokens` | int | Maximum tokens to generate | `1024` |
| `gen_ai.request.streaming` | boolean | Whether streaming mode | `true` |
| `gen_ai.response.model` | string | Actual model used | `"gpt-4-turbo-2024-04-09"` |
| `gen_ai.response.id` | string | Response identifier | `"chatcmpl-123"` |
| `gen_ai.response.finish_reasons` | string[] | Finish reasons | `["stop"]` |
| `gen_ai.usage.input_tokens` | int | Input tokens used | `50` |
| `gen_ai.usage.output_tokens` | int | Output tokens generated | `100` |
| `llm.cost.total` | double | Total cost in USD | `0.0045` |
| `llm.cost.input` | double | Input token cost | `0.0015` |
| `llm.cost.output` | double | Output token cost | `0.003` |

## Events

Instrumentations emit these events on spans:

| Event | Attributes | Description |
|-------|------------|-------------|
| `gen_ai.choice` | `index`, `finish_reason`, `message` | Individual choice/response |
| `gen_ai.system.message` | `content` | System message content |
| `gen_ai.user.message` | `content` | User message content |
| `gen_ai.assistant.message` | `content` | Assistant response content |
| `gen_ai.usage` | `input_tokens`, `output_tokens` | Token usage summary |

## Provider-Specific Mappings

### OpenAI

| OpenAI Field | OTel Attribute |
|--------------|----------------|
| `model` | `gen_ai.request.model` |
| `temperature` | `gen_ai.request.temperature` |
| `max_tokens` | `gen_ai.request.max_tokens` |
| `top_p` | `gen_ai.request.top_p` |
| `usage.prompt_tokens` | `gen_ai.usage.input_tokens` |
| `usage.completion_tokens` | `gen_ai.usage.output_tokens` |
| `choices[].finish_reason` | `gen_ai.response.finish_reasons` |

### Anthropic

| Anthropic Field | OTel Attribute |
|-----------------|----------------|
| `model` | `gen_ai.request.model` |
| `max_tokens` | `gen_ai.request.max_tokens` |
| `temperature` | `gen_ai.request.temperature` |
| `top_p` | `gen_ai.request.top_p` |
| `usage.input_tokens` | `gen_ai.usage.input_tokens` |
| `usage.output_tokens` | `gen_ai.usage.output_tokens` |
| `stop_reason` | `gen_ai.response.finish_reasons` |

### Vertex AI

| Vertex AI Field | OTel Attribute |
|-----------------|----------------|
| `model` | `gen_ai.request.model` |
| `temperature` | `gen_ai.request.temperature` |
| `max_output_tokens` | `gen_ai.request.max_tokens` |
| `top_p` | `gen_ai.request.top_p` |
| `usage_metadata.prompt_token_count` | `gen_ai.usage.input_tokens` |
| `usage_metadata.candidates_token_count` | `gen_ai.usage.output_tokens` |
| `candidates[].finish_reason` | `gen_ai.response.finish_reasons` |

### Bedrock

| Bedrock Field | OTel Attribute |
|---------------|----------------|
| `modelId` | `gen_ai.request.model` |
| `inputTokenCount` | `gen_ai.usage.input_tokens` |
| `outputTokenCount` | `gen_ai.usage.output_tokens` |
| `completionReason` | `gen_ai.response.finish_reasons` |

## Custom Attributes

Add custom attributes via hooks:

```typescript
const instrumentation = new OpenAIInstrumentation({
  onStart: (span, request) => {
    span.setAttribute('user.id', request.user?.id);
    span.setAttribute('feature.flag', request.context?.feature);
  },
  onEnd: (span, response) => {
    span.setAttribute('response.quality', calculateQuality(response));
  },
});
```

## References

- [OpenTelemetry GenAI Spec](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [AGENTS.md](../AGENTS.md) — Agent development guide
- [ARCHITECTURE.md](../ARCHITECTURE.md) — System design
