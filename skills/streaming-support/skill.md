# Streaming Support Skill

## Overview

This skill provides comprehensive streaming response handling for LLM providers, built on the instrumentation framework in `@reaatech/otel-genai-semconv-instrumentation`.

## Usage

```typescript
import { instrumentStream, ChunkAggregator } from '@reaatech/otel-genai-semconv-instrumentation';

const stream = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true,
});

// Instrument the stream — TTFT, chunk count, and output tokens are captured automatically
const instrumentedStream = instrumentStream(stream, span, {
  getTokenCount: (chunk) => chunk.usage?.completion_tokens || 0,
});

for await (const chunk of instrumentedStream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
// Span is auto-finalized when the stream ends
```

## Features

- Time-to-first-token (TTFT) tracking
- Chunk count accumulation
- Streaming metrics collection
- Error handling during streaming
- Chunk aggregation into complete responses
- Streaming event emission (per-chunk or per-token)
- Memory-efficient processing

## Streaming-Specific Attributes

- `gen_ai.streaming.time_to_first_token_ms` — Latency to first chunk
- `gen_ai.streaming.total_duration_ms` — Total streaming time
- `gen_ai.streaming.chunk_count` — Number of chunks received

## Events

- `gen_ai.streaming.chunk` — Emitted per chunk (configurable)
- `gen_ai.streaming.complete` — Emitted when stream ends

## Chunk Aggregation

```typescript
import { ChunkAggregator } from '@reaatech/otel-genai-semconv-instrumentation';

const aggregator = new ChunkAggregator();
aggregator.addText('Hello');
aggregator.addToolCallChunk({ id: 'tc1', name: 'calculator', arguments: '{"expr":' });
aggregator.addToolCallChunk({ id: 'tc1', arguments: '"2+2"}' });
aggregator.setFinishReason('tool_calls');
aggregator.setModel('gpt-4');
const result = aggregator.build();
// { content: "Hello", toolCalls: [...], finishReason: "tool_calls", ... }
```

## Related Packages

- [@reaatech/otel-genai-semconv-instrumentation](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-instrumentation) — StreamingHandler, instrumentStream, ChunkAggregator, StreamingEventsManager
