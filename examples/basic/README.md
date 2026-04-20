# Basic Instrumentation Example

This example demonstrates how to instrument OpenAI SDK calls with `otel-genai-semconv`.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables:
   ```bash
   export OPENAI_API_KEY=your-api-key
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
- Makes a chat completion request to GPT-4
- Automatically captures:
  - Request attributes (model, temperature, max_tokens)
  - Response attributes (model, finish_reasons, token usage)
  - Cost calculation
  - Events (system message, user message, assistant message)
