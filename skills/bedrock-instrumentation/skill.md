# Bedrock Instrumentation Skill

## Overview

This skill provides OpenTelemetry instrumentation for AWS Bedrock's runtime SDK, capturing spec-compliant spans for all LLM interactions across multiple model providers.

## What It Does

- Instruments `@aws-sdk/client-bedrock-runtime` SDK calls
- Captures request/response attributes per OTel GenAI semconv
- Tracks token usage for different model families
- Calculates costs based on AWS Bedrock pricing
- Handles streaming responses with proper span lifecycle
- Supports multiple model providers (Anthropic, Cohere, AI21, Amazon, etc.)

## Usage

```typescript
import { BedrockInstrumentation } from 'otel-genai-semconv/bedrock';

const instrumentation = new BedrockInstrumentation({
  captureRequestHeaders: true,
  captureResponseHeaders: true,
  trackCosts: true,
  region: process.env.AWS_REGION || 'us-east-1',
  trackModelFamilies: ['anthropic', 'amazon', 'cohere', 'ai21', 'meta'],
});
```

## Captured Attributes

| Attribute | Source |
|-----------|--------|
| `gen_ai.request.model` | modelId from request |
| `gen_ai.response.model` | Model ID from response |
| `gen_ai.usage.input_tokens` | inputTokenCount |
| `gen_ai.usage.output_tokens` | outputTokenCount |
| `gen_ai.response.finish_reasons` | completionReason |
| `aws.region` | AWS region |
| `aws.account_id` | AWS account (if available) |

## Events

- `gen_ai.user.message` — User message content
- `gen_ai.assistant.message` — Assistant response content
- `gen_ai.choice` — Individual completion choices
- `gen_ai.usage` — Token usage summary

## Supported Model Families

| Provider | Models | Token Counting |
|----------|--------|----------------|
| Anthropic | Claude 3, Claude 2 | Accurate (provider API) |
| Amazon | Titan Text, Titan Embeddings | Estimation |
| Cohere | Command, Command Light | Estimation |
| AI21 | Jurassic-2 | Estimation |
| Meta | Llama 2, Llama 3 | Estimation |

## Streaming Support

The instrumentation handles Bedrock's streaming API:

```typescript
const response = await bedrock.invokeModelWithResponseStream({
  modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 100,
  }),
});

// Instrumentation tracks:
// - Time to first token
// - Total streaming duration
// - Accumulated token count
```

## Cost Tracking

Costs are calculated based on AWS Bedrock's published pricing:

- Claude 3 Sonnet: $0.003/1K input, $0.015/1K output
- Claude 3 Haiku: $0.00025/1K input, $0.00125/1K output
- Titan Text: $0.0003/1K input, $0.0004/1K output

## Error Handling

The instrumentation captures Bedrock-specific errors:

- `ValidationException` — Invalid request parameters
- `AccessDeniedException` — IAM permission issues
- `ResourceNotFoundException` — Model not found
- `ThrottlingException` — Rate limits
- `ModelTimeoutException` — Request timeout

## Best Practices

1. **Set Region**: Always provide `region` for proper endpoint routing
2. **Track Model Families**: Specify which model families to instrument
3. **Enable Cost Tracking**: Set `trackCosts: true` for budget monitoring
4. **Handle Throttling**: Bedrock has per-model rate limits; implement retry logic
5. **Use IAM Roles**: Ensure proper IAM permissions for Bedrock access

## AWS-Specific Considerations

- **Cross-Region**: Bedrock models are region-specific; ensure model availability
- **Provisioned Throughput**: For high-volume use, consider provisioned throughput
- **PrivateLink**: Use VPC endpoints for private connectivity
- **CloudWatch**: Bedrock metrics are also available in CloudWatch

## References

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [OTel GenAI Spec](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
