import type { SpanAttributes } from '@opentelemetry/api';

export type ProviderType = 'openai' | 'anthropic' | 'vertexai' | 'bedrock';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
  cachedInputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

export interface ModelInfo {
  provider: ProviderType;
  model: string;
  version?: string;
  family?: string;
}

export interface CostData {
  total: number;
  input: number;
  output: number;
  currency: string;
  tier?: string;
}

export interface PricingInfo {
  input: number;
  output: number;
  currency?: string;
  effectiveDate?: string;
  provider?: string;
}

export interface LLMRequest {
  model: string;
  messages?: Message[];
  system?: string | Message[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  streaming?: boolean;
  tools?: Tool[];
  toolChoice?: string | ToolChoice;
  stop?: string | string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
  responseFormat?: ResponseFormat;
  seed?: number;
  user?: string;
  metadata?: Record<string, unknown>;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'function';
  content: string | ContentBlock[];
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ContentBlock {
  type: 'text' | 'image' | 'audio' | 'video';
  text?: string;
  imageUrl?: string;
  mimeType?: string;
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolChoice {
  type: 'function' | 'auto' | 'any';
  function?: { name: string };
}

export interface ResponseFormat {
  type: 'text' | 'json_object' | 'json_schema';
  jsonSchema?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  id: string;
  model: string;
  choices: Choice[];
  usage: TokenUsage;
  finishReasons: string[];
  createdAt?: number;
  metadata?: Record<string, unknown>;
}

export interface Choice {
  index: number;
  message: Message;
  finishReason: string | null;
  logprobs?: unknown;
}

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceFlags: number;
  traceState?: string;
}

export interface InstrumentationConfig {
  captureRequestHeaders?: boolean;
  captureResponseHeaders?: boolean;
  trackCosts?: boolean;
  pricing?: Record<string, PricingInfo>;
  piiRedactionEnabled?: boolean;
  redactMessageContent?: boolean;
  customAttributes?: Record<string, string | number | boolean>;
  onStart?: (span: unknown, request: LLMRequest) => void;
  onEnd?: (span: unknown, response: LLMResponse) => void;
  onError?: (span: unknown, error: Error) => void;
}

export interface GenAISpanAttributes extends SpanAttributes {
  'gen_ai.request.model'?: string;
  'gen_ai.request.temperature'?: number;
  'gen_ai.request.top_p'?: number;
  'gen_ai.request.max_tokens'?: number;
  'gen_ai.request.streaming'?: boolean;
  'gen_ai.response.model'?: string;
  'gen_ai.response.id'?: string;
  'gen_ai.response.finish_reasons'?: string[];
  'gen_ai.usage.input_tokens'?: number;
  'gen_ai.usage.output_tokens'?: number;
  'llm.cost.total'?: number;
  'llm.cost.input'?: number;
  'llm.cost.output'?: number;
  'llm.cost.currency'?: string;
  'error.type'?: string;
  'error.message'?: string;
}

export interface StreamingEvent {
  type: 'chunk' | 'complete' | 'error';
  data?: string;
  tokenCount?: number;
  timeToFirstTokenMs?: number;
  totalDurationMs?: number;
  error?: Error;
}
