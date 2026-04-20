/**
 * Zod schemas for validating GenAI types
 */

import * as z from 'zod';

/**
 * Token usage schema
 */
export const TokenUsageSchema = z.object({
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0).optional(),
  cachedInputTokens: z.number().int().min(0).optional(),
});

/**
 * Model info schema
 */
export const ModelInfoSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'vertexai', 'bedrock']),
  model: z.string().min(1),
  version: z.string().min(1).optional(),
  family: z.string().min(1).optional(),
});

/**
 * Cost data schema
 */
export const CostDataSchema = z.object({
  total: z.number().min(0),
  input: z.number().min(0),
  output: z.number().min(0),
  currency: z.string().length(3),
  tier: z.string().min(1).optional(),
});

/**
 * Pricing info schema
 */
export const PricingInfoSchema = z.object({
  input: z.number().min(0),
  output: z.number().min(0),
  currency: z.string().length(3).optional(),
  effectiveDate: z.string().optional(),
});

/**
 * Content block schema
 */
export const ContentBlockSchema = z.object({
  type: z.enum(['text', 'image', 'audio', 'video']),
  text: z.string().optional(),
  imageUrl: z.string().optional(),
  mimeType: z.string().optional(),
});

/**
 * Message schema
 */
export const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool', 'function']),
  content: z.union([z.string(), z.array(ContentBlockSchema)]),
  name: z.string().min(1).optional(),
  toolCallId: z.string().min(1).optional(),
  toolCalls: z
    .array(
      z.object({
        id: z.string(),
        type: z.literal('function'),
        function: z.object({
          name: z.string(),
          arguments: z.string(),
        }),
      }),
    )
    .optional(),
});

/**
 * Tool schema
 */
export const ToolSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.unknown()),
  }),
});

/**
 * Tool choice schema
 */
export const ToolChoiceSchema = z.object({
  type: z.enum(['function', 'auto', 'any']),
  function: z.object({ name: z.string() }).optional(),
});

/**
 * Response format schema
 */
export const ResponseFormatSchema = z.object({
  type: z.enum(['text', 'json_object', 'json_schema']),
  jsonSchema: z.record(z.unknown()).optional(),
});

/**
 * LLM request schema
 */
export const LLMRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(MessageSchema).optional(),
  system: z.union([z.string(), z.array(MessageSchema)]).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).optional(),
  topP: z.number().min(0).max(1).optional(),
  streaming: z.boolean().optional(),
  tools: z.array(ToolSchema).optional(),
  toolChoice: z.union([z.string(), ToolChoiceSchema]).optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  responseFormat: ResponseFormatSchema.optional(),
  seed: z.number().int().optional(),
  user: z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Choice schema
 */
export const ChoiceSchema = z.object({
  index: z.number().int().min(0),
  message: MessageSchema,
  finishReason: z.string().nullable(),
  logprobs: z.unknown().optional(),
});

/**
 * LLM response schema
 */
export const LLMResponseSchema = z.object({
  id: z.string().min(1),
  model: z.string().min(1),
  choices: z.array(ChoiceSchema),
  usage: TokenUsageSchema,
  finishReasons: z.array(z.string()),
  createdAt: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Span context schema
 */
export const SpanContextSchema = z.object({
  traceId: z.string().min(1),
  spanId: z.string().min(1),
  parentSpanId: z.string().min(1).optional(),
  traceFlags: z.number().int().min(0).max(255),
  traceState: z.string().optional(),
});

/**
 * Instrumentation config schema
 */
export const InstrumentationConfigSchema = z.object({
  captureRequestHeaders: z.boolean().optional(),
  captureResponseHeaders: z.boolean().optional(),
  trackCosts: z.boolean().optional(),
  pricing: z.record(PricingInfoSchema).optional(),
  piiRedactionEnabled: z.boolean().optional(),
  redactMessageContent: z.boolean().optional(),
  customAttributes: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  onStart: z.function().optional(),
  onEnd: z.function().optional(),
  onError: z.function().optional(),
});

/**
 * GenAI span attributes schema
 */
export const GenAISpanAttributesSchema = z.object({
  'gen_ai.request.model': z.string().min(1).optional(),
  'gen_ai.request.temperature': z.number().min(0).optional(),
  'gen_ai.request.top_p': z.number().min(0).max(1).optional(),
  'gen_ai.request.max_tokens': z.number().int().min(1).optional(),
  'gen_ai.request.streaming': z.boolean().optional(),
  'gen_ai.response.model': z.string().min(1).optional(),
  'gen_ai.response.id': z.string().min(1).optional(),
  'gen_ai.response.finish_reasons': z.array(z.string()).optional(),
  'gen_ai.usage.input_tokens': z.number().int().min(0).optional(),
  'gen_ai.usage.output_tokens': z.number().int().min(0).optional(),
  'llm.cost.total': z.number().min(0).optional(),
  'llm.cost.input': z.number().min(0).optional(),
  'llm.cost.output': z.number().min(0).optional(),
  'llm.cost.currency': z.string().length(3).optional(),
  'error.type': z.string().min(1).optional(),
  'error.message': z.string().min(1).optional(),
});

/**
 * Streaming event schema
 */
export const StreamingEventSchema = z.object({
  type: z.enum(['chunk', 'complete', 'error']),
  data: z.string().optional(),
  tokenCount: z.number().int().min(0).optional(),
  timeToFirstTokenMs: z.number().min(0).optional(),
  totalDurationMs: z.number().min(0).optional(),
  error: z.instanceof(Error).optional(),
});
