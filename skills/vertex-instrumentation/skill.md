# Vertex AI Instrumentation Skill

## Overview

This skill provides OpenTelemetry instrumentation for Google Vertex AI's Generative AI SDK, capturing spec-compliant spans for all LLM interactions.

## What It Does

- Instruments `@google-cloud/vertexai` SDK calls
- Captures request/response attributes per OTel GenAI semconv
- Tracks token usage via Vertex AI's token counting API
- Calculates costs based on Vertex AI pricing
- Handles streaming responses with proper span lifecycle
- Maps Vertex AI-specific fields to standard OTel attributes

## Usage

```typescript
import { VertexAIInstrumentation } from 'otel-genai-semconv/vertexai';

const instrumentation = new VertexAIInstrumentation({
  captureRequestHeaders: true,
  captureResponseHeaders: true,
  trackCosts: true,
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
});
```

## Captured Attributes

| Attribute | Source |
|-----------|--------|
| `gen_ai.request.model` | Model name from request |
| `gen_ai.request.temperature` | Generation config temperature |
| `gen_ai.request.max_tokens` | Generation config maxOutputTokens |
| `gen_ai.request.top_p` | Generation config topP |
| `gen_ai.response.model` | Model name from response |
| `gen_ai.usage.input_tokens` | usageMetadata.promptTokenCount |
| `gen_ai.usage.output_tokens` | usageMetadata.candidatesTokenCount |
| `gen_ai.response.finish_reasons` | candidates[].finishReason |
| `gcp.project_id` | GCP project for cost attribution |

## Events

- `gen_ai.user.message` — User message content
- `gen_ai.assistant.message` — Assistant response content
- `gen_ai.choice` — Individual candidate responses
- `gen_ai.usage` — Token usage summary

## Streaming Support

The instrumentation automatically handles streaming responses:

```typescript
const stream = await model.generateContentStream({
  contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
});

for await (const chunk of stream) {
  // Instrumentation tracks:
  // - Time to first token
  // - Total streaming duration
  // - Accumulated token count
}
```

## Cost Tracking

Costs are calculated based on Vertex AI's published pricing:

- Gemini Pro: $0.00025/1K input tokens, $0.0005/1K output tokens
- Gemini Ultra: Custom pricing (contact Google)

## Error Handling

The instrumentation captures Vertex AI-specific errors:

- `INVALID_ARGUMENT` — Bad request parameters
- `PERMISSION_DENIED` — Authentication/authorization issues
- `NOT_FOUND` — Model not found
- `RESOURCE_EXHAUSTED` — Rate limits or quotas
- `INTERNAL` — Server errors

## Best Practices

1. **Set Project ID**: Always provide `projectId` for proper cost attribution
2. **Use Regional Endpoints**: Set `location` to match your deployment region
3. **Enable Cost Tracking**: Set `trackCosts: true` for budget monitoring
4. **Monitor Quotas**: Vertex AI has strict quotas; watch for `RESOURCE_EXHAUSTED`

## References

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [OTel GenAI Spec](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
