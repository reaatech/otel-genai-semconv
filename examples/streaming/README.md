# Streaming Instrumentation Example

This example demonstrates how to instrument streaming LLM calls with `otel-genai-semconv`.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables:
   ```bash
   export OPENAI_API_KEY=your-openai-api-key
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

- Initializes OTel SDK with OpenAI instrumentation
- Makes a streaming chat completion request to GPT-4
- Automatically captures streaming-specific metrics:
  - **Time to First Token (TTFT)** — Latency from request to first chunk
  - **Total Streaming Duration** — Time from first to last chunk
  - **Chunk Count** — Number of streaming chunks received
  - **Accumulated Token Count** — Total tokens across all chunks
  - **Cost** — Calculated from total tokens

## Streaming-Specific Attributes

The instrumentation captures these additional attributes for streaming responses:

| Attribute | Type | Description |
|-----------|------|-------------|
| `gen_ai.streaming.time_to_first_token_ms` | int | Milliseconds to first chunk |
| `gen_ai.streaming.total_duration_ms` | int | Total streaming time |
| `gen_ai.streaming.chunk_count` | int | Number of chunks received |

## Benefits of Streaming Instrumentation

### Performance Monitoring

Track time-to-first-token to identify latency issues:
- High TTFT may indicate model overload or network issues
- Compare TTFT across models and providers

### Cost Accuracy

Token counting across streaming chunks ensures accurate cost tracking:
- Accumulate tokens as chunks arrive
- Calculate final cost when stream completes

### Error Handling

Proper span lifecycle even when streaming fails:
- Capture partial responses on error
- Track error type and timing

## Best Practices

1. **Monitor TTFT**: Set alerts for high time-to-first-token
2. **Track Chunk Count**: Unusual chunk counts may indicate issues
3. **Handle Stream Errors**: Implement proper error handling for stream interruptions
4. **Buffer Management**: Be aware of memory usage with large streaming responses
