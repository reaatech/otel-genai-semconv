# Multi-Provider Instrumentation Example

This example demonstrates how to instrument multiple LLM providers with consistent telemetry using `otel-genai-semconv`.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables:
   ```bash
   export OPENAI_API_KEY=your-openai-api-key
   export ANTHROPIC_API_KEY=your-anthropic-api-key
   export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
   ```

3. Start the OTel collector and Jaeger (from repo root):
   ```bash
   docker-compose up -d otel-collector jaeger
   ```

4. Run the example:
   ```bash
   npm start
   ```

5. View traces in Jaeger:
   - Open http://localhost:16686
   - Look for traces from service `otel-genai-semconv-example`

## What This Example Does

- Initializes OTel SDK with both OpenAI and Anthropic instrumentations
- Makes parallel requests to GPT-4 and Claude
- Demonstrates consistent telemetry across providers:
  - Same attribute names (`gen_ai.request.model`, `gen_ai.usage.input_tokens`, etc.)
  - Same event structure
  - Same cost tracking format
- Allows easy comparison of provider performance and costs

## Key Concepts

### Consistent Telemetry

Both providers emit the same semantic convention attributes, making it easy to:
- Compare latency across providers
- Track costs uniformly
- Build provider-agnostic dashboards
- Switch providers without changing observability code

### Cost Comparison

The instrumentation automatically calculates costs for each provider:
- OpenAI: Based on model pricing (GPT-4, GPT-4 Turbo, etc.)
- Anthropic: Based on model pricing (Claude Opus, Sonnet, Haiku)

### Provider-Specific Configuration

Each instrumentation can be configured independently:

```typescript
new OpenAIInstrumentation({
  trackCosts: true,
  captureRequestHeaders: true,
  // OpenAI-specific options
});

new AnthropicInstrumentation({
  trackCosts: true,
  captureRequestHeaders: true,
  // Anthropic-specific options
});
