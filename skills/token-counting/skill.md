# Token Counting Skill

## Overview

This skill provides accurate token counting for LLM providers.

## Usage

```typescript
import { TokenCounter } from 'otel-genai-semconv/utils';

const counter = new TokenCounter({
  provider: 'openai',
  model: 'gpt-4',
});

const tokens = await counter.count('Hello, world!');
console.log(`Token count: ${tokens}`);
```

## Provider-Specific Implementations

### OpenAI

Uses tiktoken library with model-specific encodings:
- `o200k_base` for GPT-4 and newer models
- `cl100k_base` for GPT-3.5

### Anthropic

Uses Anthropic's token counting API with fallback estimation.

### Vertex AI

Uses Vertex AI's countTokens API with offline fallback.

### Bedrock

Model-specific counting based on underlying model provider.

## Caching

Token counts are cached for performance with configurable TTL.

```typescript
const counter = new TokenCounter({
  provider: 'openai',
  cache: {
    enabled: true,
    ttlMs: 60000, // 1 minute
    maxSize: 1000,
  },
});
