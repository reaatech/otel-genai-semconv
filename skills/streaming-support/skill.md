# Streaming Support Skill

## Overview

This skill provides comprehensive streaming response handling for LLM providers.

## Usage

```typescript
import { StreamingHandler, ChunkAggregator } from 'otel-genai-semconv/instrumentation';

// Wrap a streaming response
const stream = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true,
});

// Instrument the stream
const instrumentedStream = instrumentStream(stream, span, {
  onChunk: (chunk) => process.stdout.write(chunk.choices[0]?.delta?.content || ''),
  getTokenCount: (chunk) => chunk.usage?.completion_tokens || 0,
});
```

## Features

- Time-to-first-token tracking
- Chunk aggregation
- Streaming metrics collection
- Error handling during streaming
- Memory-efficient processing

## Streaming-Specific Attributes

- `gen_ai.streaming.time_to_first_token_ms` — Latency to first chunk
- `gen_ai.streaming.total_duration_ms` — Total streaming time
- `gen_ai.streaming.chunk_count` — Number of chunks received

## Events

- `gen_ai.streaming.chunk` — Emitted per chunk (optional)
- `gen_ai.streaming.complete` — Emitted when stream ends
