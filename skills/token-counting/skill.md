# Token Counting Skill

## Overview

This skill provides accurate token counting for LLM providers using `@reaatech/otel-genai-semconv-utils` and provider-specific counters.

## Usage

```typescript
import { TokenCounter } from '@reaatech/otel-genai-semconv-utils';

const counter = new TokenCounter({ provider: 'openai' });
const tokens = counter.countTokens('Hello, world!');
console.log(`Token count: ${tokens}`);
```

## Provider-Specific Implementations

### OpenAI

Uses tiktoken library with model-specific encodings, provided by `@reaatech/otel-genai-semconv-openai`:

```typescript
import { OpenAITokenCounter } from '@reaatech/otel-genai-semconv-openai';

const counter = new OpenAITokenCounter();
const tokens = counter.countTokens('Hello, world!', 'gpt-4');
```

Encoding selection:
- `o200k_base` for GPT-4 and newer models
- `cl100k_base` for GPT-3.5

### Anthropic

```typescript
import { AnthropicTokenCounter } from '@reaatech/otel-genai-semconv-anthropic';

const counter = new AnthropicTokenCounter();
const tokens = counter.countTokens('Hello, world!', 'claude-3-opus');
```

### Vertex AI

```typescript
import { VertexAITokenCounter } from '@reaatech/otel-genai-semconv-vertexai';

const counter = new VertexAITokenCounter();
const tokens = counter.countTokens('Hello, world!', 'gemini-pro');
```

### Bedrock

```typescript
import { BedrockTokenCounter } from '@reaatech/otel-genai-semconv-bedrock';

const counter = new BedrockTokenCounter();
const tokens = counter.countTokens('Hello, world!', 'anthropic.claude-3-sonnet');
```

## Caching

Token counts are cached for performance with configurable TTL:

```typescript
const counter = new TokenCounter({
  provider: 'openai',
  enableCache: true,
  cacheTTL: 60000, // 1 minute
  maxCacheSize: 1000,
});
```

## Related Packages

- [@reaatech/otel-genai-semconv-core](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types (TokenUsage, ProviderType)
