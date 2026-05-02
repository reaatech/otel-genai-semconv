# @reaatech/otel-genai-semconv-utils

[![npm version](https://img.shields.io/npm/v/@reaatech/otel-genai-semconv-utils.svg)](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-utils)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/otel-genai-semconv/ci.yml?branch=main&label=CI)](https://github.com/reaatech/otel-genai-semconv/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Token counting, cost calculation, and PII redaction utilities for LLM observability. Provides accurate token estimation via tiktoken for OpenAI models, character-based estimation for other providers, per-request cost computation with baked-in pricing tables, and automatic detection and redaction of sensitive data (emails, SSNs, credit cards, IP addresses, phone numbers).

## Installation

```bash
npm install @reaatech/otel-genai-semconv-utils
# or
pnpm add @reaatech/otel-genai-semconv-utils
```

## Feature Overview

- **Provider-aware token counting** — tiktoken integration for OpenAI, estimation fallbacks for Anthropic, Vertex AI, and Bedrock
- **Built-in pricing tables** — pre-configured pricing for GPT-4, GPT-4o, Claude 3, Gemini, and Bedrock model families
- **Custom pricing overrides** — inject per-model pricing at construction time or via setter methods
- **PII redaction** — five default patterns (email, SSN, credit card, phone, IP) with add/remove/exclude API
- **Object deep redaction** — recursively redact PII from nested objects and arrays
- **LRU caching** — token counts and cost calculations are cached with configurable TTL and size limits
- **Singleton accessors** — `getDefaultTokenCounter()`, `getDefaultCostCalculator()`, `getDefaultPIIRedactor()` for zero-config use

## Quick Start

```typescript
import { CostCalculator, TokenCounter, PIIRedactor } from "@reaatech/otel-genai-semconv-utils";

const calculator = new CostCalculator();
const cost = calculator.calculate({
  provider: "openai",
  model: "gpt-4",
  inputTokens: 1000,
  outputTokens: 500,
});
// { total: 0.045, input: 0.03, output: 0.015, currency: "USD" }

const counter = new TokenCounter();
const tokens = counter.countTokens("Hello, world!");
// ~4 (estimated at 4 chars/token)

const redactor = new PIIRedactor();
const safe = redactor.redact("Contact user@example.com or 555-1234");
// "Contact [REDACTED_EMAIL] or [REDACTED_PHONE]"
```

## API Reference

### `CostCalculator` (class)

#### Constructor

```typescript
new CostCalculator(options?: { customPricing?: Record<string, PricingInfo> })
```

#### Methods

| Method | Description |
|--------|-------------|
| `calculate(params)` | Compute cost from provider, model, input/output token counts |
| `calculateFromUsage(params)` | Compute cost from a `TokenUsage` object |
| `getPricing(provider, model)` | Look up pricing for a specific model (checks custom first, then defaults) |
| `setCustomPricing(model, pricing)` | Override pricing for a single model |
| `setCustomPricingBatch(pricing)` | Override pricing for multiple models |
| `getAllPricing()` | Returns all pricing data (including custom overrides) |
| `clearCache()` | Invalidate the cost calculation cache |
| `getCacheSize()` | Number of cached cost calculations |

#### `CostCalculationParams`

| Property | Type | Description |
|----------|------|-------------|
| `provider` | `ProviderType` | Provider: `openai`, `anthropic`, `vertexai`, `bedrock` |
| `model` | `string` | Model name/ID |
| `inputTokens` | `number` | Input/prompt token count |
| `outputTokens` | `number` | Output/completion token count |
| `currency` | `string` | Currency code (default: `"USD"`) |

### `TokenCounter` (class)

#### Constructor

```typescript
new TokenCounter(options?: {
  provider?: ProviderType;
  customCounter?: ITokenCounter;
  enableCache?: boolean;
  cacheTTL?: number;
  maxCacheSize?: number;
})
```

#### Methods

| Method | Description |
|--------|-------------|
| `countTokens(text)` | Count tokens in a text string |
| `countMessageTokens(message)` | Count tokens for a single message (role + content) |
| `countConversationTokens(messages)` | Count tokens for an entire conversation |
| `setCustomCounter(counter)` | Replace the token counting implementation |
| `clearCache()` | Invalidate the token count cache |
| `getCacheSize()` | Number of cached token counts |

#### `ITokenCounter` (interface)

Implement this to create a custom token counter:

```typescript
interface ITokenCounter {
  countTokens(text: string): number;
  countMessageTokens(message: { role: string; content: string }): number;
  countConversationTokens(messages: Array<{ role: string; content: string }>): number;
}
```

### `EstimationTokenCounter` (class)

A character-based token estimator using ~4 characters per token (English text). Used as the fallback when no provider-specific counter is configured.

### `PIIRedactor` (class)

#### Constructor

```typescript
new PIIRedactor(options?: PIIRedactionOptions)
```

#### `PIIRedactionOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable redaction |
| `redactMessageContent` | `boolean` | `false` | Whether to redact message content |
| `hashInsteadOfRedact` | `boolean` | `false` | Hash values instead of replacing with `[REDACTED_*]` |
| `customPatterns` | `PIIPattern[]` | — | Additional regex patterns to detect |
| `excludePatterns` | `string[]` | — | Pattern descriptions to skip |

#### Methods

| Method | Description |
|--------|-------------|
| `redact(text)` | Redact PII from a string |
| `redactObject(obj)` | Deep redact PII from an object |
| `containsPII(text)` | Check if text contains any PII |
| `detectPIITypes(text)` | List which PII types were detected |
| `addPattern(pattern)` | Add a custom detection pattern |
| `removePattern(description)` | Remove a pattern by description |
| `excludePattern(description)` | Exclude a pattern (skip during redaction) |
| `includePattern(description)` | Re-include a previously excluded pattern |

#### Default PII Patterns

| Pattern | Replacement | Description |
|---------|-------------|-------------|
| Email addresses | `[REDACTED_EMAIL]` | `user@example.com` |
| SSN | `[REDACTED_SSN]` | `123-45-6789` |
| Credit cards | `[REDACTED_CC]` | 13–19 digit numbers |
| Phone numbers | `[REDACTED_PHONE]` | 10+ digit sequences |
| IP addresses | `[REDACTED_IP]` | IPv4 addresses |

## Usage Patterns

### Custom Pricing Overrides

```typescript
const calculator = new CostCalculator({
  customPricing: {
    "gpt-4": { input: 0.03, output: 0.06 },
    "my-custom-model": { input: 0.001, output: 0.002, provider: "openai" },
  },
});
```

### Provider-Specific Token Counters

```typescript
import { OpenAITokenCounter } from "@reaatech/otel-genai-semconv-openai";
import { TokenCounter } from "@reaatech/otel-genai-semconv-utils";

const counter = new TokenCounter({
  customCounter: new OpenAITokenCounter(),
});
const tokens = counter.countTokens("Hello, world!");
```

### Selective PII Redaction

```typescript
const redactor = new PIIRedactor({ excludePatterns: ["Email addresses"] });
redactor.redact("user@example.com called 555-1234");
// "user@example.com called [REDACTED_PHONE]"
```

## Related Packages

- [`@reaatech/otel-genai-semconv-core`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types and constants
- [`@reaatech/otel-genai-semconv-openai`](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-openai) — OpenAI provider instrumentation (with tiktoken counter)

## License

[MIT](https://github.com/reaatech/otel-genai-semconv/blob/main/LICENSE)
