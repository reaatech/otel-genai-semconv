# RAG (Retrieval-Augmented Generation) Example

This example demonstrates how to trace a complete RAG pipeline with document retrieval, context injection, and answer generation using `otel-genai-semconv`.

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
   - Look for the `rag_pipeline` span containing the full RAG flow

## What This Example Does

- Simulates a document retrieval step (keyword-based search over a small document store)
- Injects retrieved documents as context into the LLM prompt
- Creates a top-level `rag_pipeline` span that wraps the entire flow
- The nested LLM call is automatically instrumented by `OpenAIInstrumentation`
- Captures:
  - Document retrieval metadata (number of documents, document keys)
  - Full LLM request/response with context-injected prompt
  - Token usage and cost for the answer generation
  - End-to-end latency of the RAG pipeline

## Tracing Structure

```
rag_pipeline (custom span)
└── gen_ai.chat.completion (auto-instrumented)
    ├── gen_ai.system.message (event)
    ├── gen_ai.user.message (event)
    └── gen_ai.assistant.message (event)
```

## Docker Compose

For a complete local setup with all services:

```bash
# From repo root
docker-compose up -d
```

This starts:
- OTel Collector (OTLP ingestion)
- Jaeger (trace visualization)
- Phoenix (LLM-specific observability)
