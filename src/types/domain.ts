/**
 * Core domain types for otel-genai-semconv
 */

import type { SpanAttributes } from '@opentelemetry/api';

/**
 * Provider types supported by the instrumentation
 */
export type ProviderType = 'openai' | 'anthropic' | 'vertexai' | 'bedrock';

/**
 * Token usage information
 */
export interface TokenUsage {
  /** Number of input/prompt tokens */
  inputTokens: number;
  /** Number of output/completion tokens */
  outputTokens: number;
  /** Total tokens (input + output) */
  totalTokens?: number;
  /** Cached tokens (if applicable) */
  cachedInputTokens?: number;
  /** Cache read input tokens (Anthropic prompt caching) */
  cacheReadInputTokens?: number;
  /** Cache creation input tokens (Anthropic prompt caching) */
  cacheCreationInputTokens?: number;
}

/**
 * Model information
 */
export interface ModelInfo {
  /** Provider name */
  provider: ProviderType;
  /** Model name/ID */
  model: string;
  /** Model version (if available) */
  version?: string;
  /** Model family (e.g., 'gpt-4', 'claude') */
  family?: string;
}

/**
 * Cost calculation result
 */
export interface CostData {
  /** Total cost in USD */
  total: number;
  /** Input token cost in USD */
  input: number;
  /** Output token cost in USD */
  output: number;
  /** Currency code (default: USD) */
  currency: string;
  /** Pricing tier used */
  tier?: string;
}

/**
 * Pricing information for a model
 */
export interface PricingInfo {
  /** Cost per 1K input tokens in USD */
  input: number;
  /** Cost per 1K output tokens in USD */
  output: number;
  /** Currency code */
  currency?: string;
  /** Effective date for this pricing */
  effectiveDate?: string;
  /** Provider this pricing applies to (for custom pricing) */
  provider?: string;
}

/**
 * Normalized LLM request structure
 */
export interface LLMRequest {
  /** Model identifier */
  model: string;
  /** Messages in the conversation */
  messages?: Message[];
  /** System prompt */
  system?: string | Message[];
  /** Sampling temperature */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Top-p sampling parameter */
  topP?: number;
  /** Whether streaming is enabled */
  streaming?: boolean;
  /** Tools/functions available for calling */
  tools?: Tool[];
  /** Tool choice strategy */
  toolChoice?: string | ToolChoice;
  /** Stop sequences */
  stop?: string | string[];
  /** Frequency penalty */
  frequencyPenalty?: number;
  /** Presence penalty */
  presencePenalty?: number;
  /** Response format specification */
  responseFormat?: ResponseFormat;
  /** Seed for reproducibility */
  seed?: number;
  /** User identifier for tracking */
  user?: string;
  /** Additional provider-specific parameters */
  metadata?: Record<string, unknown>;
}

/**
 * Message in a conversation
 */
export interface Message {
  /** Role of the message sender */
  role: 'system' | 'user' | 'assistant' | 'tool' | 'function';
  /** Content of the message */
  content: string | ContentBlock[];
  /** Name of the tool/function (for tool messages) */
  name?: string;
  /** Tool call ID */
  toolCallId?: string;
  /** Tool calls made by the assistant */
  toolCalls?: ToolCall[];
}

/**
 * Content block for multimodal messages
 */
export interface ContentBlock {
  /** Type of content */
  type: 'text' | 'image' | 'audio' | 'video';
  /** Text content */
  text?: string;
  /** Image URL or base64 */
  imageUrl?: string;
  /** MIME type */
  mimeType?: string;
}

/**
 * Tool definition for function calling
 */
export interface Tool {
  /** Tool type */
  type: 'function';
  /** Function definition */
  function: {
    /** Function name */
    name: string;
    /** Function description */
    description?: string;
    /** JSON Schema for parameters */
    parameters: Record<string, unknown>;
  };
}

/**
 * Tool choice strategy
 */
export interface ToolChoice {
  /** Type of tool choice */
  type: 'function' | 'auto' | 'any';
  /** Specific function to call */
  function?: { name: string };
}

/**
 * Response format specification
 */
export interface ResponseFormat {
  /** Format type */
  type: 'text' | 'json_object' | 'json_schema';
  /** JSON Schema (for json_schema type) */
  jsonSchema?: Record<string, unknown>;
}

/**
 * Tool call made by the assistant
 */
export interface ToolCall {
  /** Unique ID for this tool call */
  id: string;
  /** Tool type */
  type: 'function';
  /** Function call details */
  function: {
    /** Function name */
    name: string;
    /** Function arguments (JSON string) */
    arguments: string;
  };
}

/**
 * Normalized LLM response structure
 */
export interface LLMResponse {
  /** Unique response identifier */
  id: string;
  /** Model that generated the response */
  model: string;
  /** Choices/ completions returned */
  choices: Choice[];
  /** Token usage information */
  usage: TokenUsage;
  /** Finish reasons for all choices */
  finishReasons: string[];
  /** Response creation timestamp */
  createdAt?: number;
  /** Provider-specific response data */
  metadata?: Record<string, unknown>;
}

/**
 * A single choice/completion in a response
 */
export interface Choice {
  /** Index of this choice */
  index: number;
  /** Message content */
  message: Message;
  /** Reason for finishing */
  finishReason: string | null;
  /** Log probabilities (if available) */
  logprobs?: unknown;
}

/**
 * Span context for LLM calls
 */
export interface SpanContext {
  /** Trace ID */
  traceId: string;
  /** Span ID */
  spanId: string;
  /** Parent span ID (if any) */
  parentSpanId?: string;
  /** Trace flags */
  traceFlags: number;
  /** Trace state */
  traceState?: string;
}

/**
 * Instrumentation configuration
 */
export interface InstrumentationConfig {
  /** Whether to capture request headers */
  captureRequestHeaders?: boolean;
  /** Whether to capture response headers */
  captureResponseHeaders?: boolean;
  /** Whether to track costs */
  trackCosts?: boolean;
  /** Custom pricing overrides */
  pricing?: Record<string, PricingInfo>;
  /** Whether to enable PII redaction */
  piiRedactionEnabled?: boolean;
  /** Whether to redact message content */
  redactMessageContent?: boolean;
  /** Custom attributes to add to all spans */
  customAttributes?: Record<string, string | number | boolean>;
  /** Hook called before request */
  onStart?: (span: unknown, request: LLMRequest) => void;
  /** Hook called after response */
  onEnd?: (span: unknown, response: LLMResponse) => void;
  /** Hook called on error */
  onError?: (span: unknown, error: Error) => void;
}

/**
 * GenAI span attributes conforming to OTel semantic conventions
 */
export interface GenAISpanAttributes extends SpanAttributes {
  // Request attributes
  'gen_ai.request.model'?: string;
  'gen_ai.request.temperature'?: number;
  'gen_ai.request.top_p'?: number;
  'gen_ai.request.max_tokens'?: number;
  'gen_ai.request.streaming'?: boolean;

  // Response attributes
  'gen_ai.response.model'?: string;
  'gen_ai.response.id'?: string;
  'gen_ai.response.finish_reasons'?: string[];

  // Usage attributes
  'gen_ai.usage.input_tokens'?: number;
  'gen_ai.usage.output_tokens'?: number;

  // Cost attributes
  'llm.cost.total'?: number;
  'llm.cost.input'?: number;
  'llm.cost.output'?: number;
  'llm.cost.currency'?: string;

  // Error attributes
  'error.type'?: string;
  'error.message'?: string;
}

/**
 * Streaming event data
 */
export interface StreamingEvent {
  /** Event type */
  type: 'chunk' | 'complete' | 'error';
  /** Chunk data (for chunk events) */
  data?: string;
  /** Token count in this chunk */
  tokenCount?: number;
  /** Time to first token (ms) */
  timeToFirstTokenMs?: number;
  /** Total duration (ms) */
  totalDurationMs?: number;
  /** Error (for error events) */
  error?: Error;
}
