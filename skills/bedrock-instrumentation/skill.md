# Bedrock Instrumentation Skill

## Overview

This skill provides OpenTelemetry instrumentation for AWS Bedrock's runtime SDK, capturing spec-compliant spans for all LLM interactions across multiple model providers.

## What It Does

- Instruments `@aws-sdk/client-bedrock-runtime` SDK calls
- Captures request/response attributes per OTel GenAI semconv
- Tracks token usage for different model families
- Calculates costs based on AWS Bedrock pricing
- Handles binary response body decoding
- Supports multiple model providers (Anthropic, Amazon, Cohere, AI21)

## Usage

```typescript
import { BedrockInstrumentation } from '@reaatech/otel-genai-semconv-bedrock';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });

const instrumentation = new BedrockInstrumentation({
  captureRequestHeaders: true,
  captureResponseHeaders: true,
  trackCosts: true,
  region: process.env.AWS_REGION || 'us-east-1',
  trackModelFamilies: ['anthropic', 'amazon', 'cohere', 'ai21'],
});

instrumentation.instrument(client);

const response = await client.send(new InvokeModelCommand({
  modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
  body: JSON.stringify({ max_tokens: 200, messages: [{ role: 'user', content: 'Hello' }] }),
}));
```

## Captured Attributes

| Attribute | Source |
|-----------|--------|
| `gen_ai.request.model` | modelId from request |
| `gen_ai.response.model` | Model ID from response (Anthropic only) |
| `gen_ai.usage.input_tokens` | Family-specific extraction |
| `gen_ai.usage.output_tokens` | Family-specific extraction |
| `gen_ai.response.finish_reasons` | Family-specific stop reason mapping |
| `gen_ai.provider.family` | Model family name (anthropic/amazon/cohere/ai21) |
| `aws.region` | AWS region (when configured) |

## Supported Model Families

| Provider | Models | Token Counting |
|----------|--------|----------------|
| Anthropic | Claude 3 Opus/Sonnet/Haiku | Response usage objects |
| Amazon | Titan Text | inputTextTokenCount |
| Cohere | Command, Command Light | Estimation |
| AI21 | Jurassic-2 | tokens array length |

## Events

- `gen_ai.choice` — Individual completion choices with finish_reason

## Stop Reason Mapping

| Anthropic | OTel |
|-----------|------|
| `end_turn` | `stop` |
| `stop_sequence` | `stop` |
| `max_tokens` | `length` |
| `tool_use` | `tool_calls` |

## Cost Tracking

Costs are calculated using built-in pricing tables:

- Claude 3 Sonnet: $0.003/1K input, $0.015/1K output
- Claude 3 Haiku: $0.00025/1K input, $0.00125/1K output
- Titan Text: $0.0003/1K input, $0.0004/1K output

## Best Practices

1. **Set Region**: Always provide `region` for proper span metadata
2. **Track Model Families**: Use `trackModelFamilies` to filter which models are instrumented
3. **Enable Cost Tracking**: Set `trackCosts: true` for budget monitoring
4. **Handle Throttling**: Bedrock has per-model rate limits; implement retry logic
5. **Use IAM Roles**: Ensure proper IAM permissions for Bedrock access

## AWS-Specific Considerations

- **Cross-Region**: Bedrock models are region-specific
- **Provisioned Throughput**: For high-volume use
- **PrivateLink**: Use VPC endpoints for private connectivity

## References

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [OTel GenAI Spec](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [@reaatech/otel-genai-semconv-core](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types and constants
