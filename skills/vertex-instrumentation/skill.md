# Vertex AI Instrumentation Skill

## Overview

This skill provides OpenTelemetry instrumentation for Google Vertex AI's Generative AI SDK, capturing spec-compliant spans for all LLM interactions.

## What It Does

- Instruments `@google-ai/generativelanguage` SDK calls
- Captures request/response attributes per OTel GenAI semconv
- Tracks token usage via Vertex AI's usage metadata
- Calculates costs based on Vertex AI pricing
- Maps Vertex AI-specific fields to standard OTel attributes
- Provides lifecycle hooks for custom span attributes

## Usage

```typescript
import { VertexAIInstrumentation } from '@reaatech/otel-genai-semconv-vertexai';

const instrumentation = new VertexAIInstrumentation({
  captureRequestHeaders: true,
  captureResponseHeaders: true,
  trackCosts: true,
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
});

instrumentation.instrument(model);

const response = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
});
```

## Captured Attributes

| Attribute | Source |
|-----------|--------|
| `gen_ai.request.model` | Model name from request |
| `gen_ai.request.temperature` | Generation config temperature |
| `gen_ai.request.max_tokens` | Generation config maxOutputTokens |
| `gen_ai.request.top_p` | Generation config topP |
| `gen_ai.request.top_k` | Generation config topK |
| `gen_ai.response.model` | Model version from response |
| `gen_ai.usage.input_tokens` | usageMetadata.promptTokenCount |
| `gen_ai.usage.output_tokens` | usageMetadata.candidatesTokenCount |
| `gen_ai.response.finish_reasons` | candidates[].finishReason (mapped) |
| `gcp.project_id` | GCP project for cost attribution |
| `gcp.location` | GCP region |

## Events

- `gen_ai.user.message` — User message content
- `gen_ai.assistant.message` — Assistant response content
- `gen_ai.choice` — Individual candidate responses
- `gen_ai.system.message` — System instruction content

## Finish Reason Mapping

| Vertex AI | OTel |
|-----------|------|
| `STOP` | `stop` |
| `MAX_TOKENS` | `length` |
| `SAFETY` | `content_filter` |
| `RECITATION` | `content_filter` |
| `OTHER` | `unknown` |

## Cost Tracking

Costs are calculated using built-in pricing tables:

- Gemini Pro: $0.00025/1K input tokens, $0.0005/1K output tokens
- Gemini 1.5 Pro: $0.0025/1K input, $0.005/1K output
- Gemini 1.5 Flash: $0.000075/1K input, $0.0003/1K output

## Best Practices

1. **Set Project ID**: Always provide `projectId` for proper cost attribution
2. **Use Regional Endpoints**: Set `location` to match your deployment region
3. **Enable Cost Tracking**: Set `trackCosts: true` for budget monitoring
4. **Monitor Quotas**: Vertex AI has strict quotas; watch for deadline exceeded errors

## References

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [OTel GenAI Spec](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [@reaatech/otel-genai-semconv-core](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types and constants
