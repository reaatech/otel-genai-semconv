/**
 * OpenTelemetry GenAI semantic convention constants
 * Based on: https://opentelemetry.io/docs/specs/semconv/gen-ai/
 */

/**
 * Attribute names for GenAI spans
 */
export const GEN_AI_ATTRIBUTES = {
  // Request attributes
  REQUEST_MODEL: 'gen_ai.request.model',
  REQUEST_TEMPERATURE: 'gen_ai.request.temperature',
  REQUEST_TOP_P: 'gen_ai.request.top_p',
  REQUEST_MAX_TOKENS: 'gen_ai.request.max_tokens',
  REQUEST_STREAMING: 'gen_ai.request.streaming',
  REQUEST_STOP_SEQUENCES: 'gen_ai.request.stop_sequences',
  REQUEST_FREQUENCY_PENALTY: 'gen_ai.request.frequency_penalty',
  REQUEST_PRESENCE_PENALTY: 'gen_ai.request.presence_penalty',
  REQUEST_SEED: 'gen_ai.request.seed',
  REQUEST_RESPONSE_FORMAT: 'gen_ai.request.response_format',
  REQUEST_TOOL_NAMES: 'gen_ai.request.tool_names',
  REQUEST_CANDIDATES_PER_PROMPT: 'gen_ai.request.candidates_per_prompt',
  REQUEST_TOP_K: 'gen_ai.request.top_k',

  // Response attributes
  RESPONSE_MODEL: 'gen_ai.response.model',
  RESPONSE_ID: 'gen_ai.response.id',
  RESPONSE_FINISH_REASONS: 'gen_ai.response.finish_reasons',

  // Usage attributes
  USAGE_INPUT_TOKENS: 'gen_ai.usage.input_tokens',
  USAGE_OUTPUT_TOKENS: 'gen_ai.usage.output_tokens',
  USAGE_CACHED_INPUT_TOKENS: 'gen_ai.usage.cached_input_tokens',
  USAGE_CACHE_READ_INPUT_TOKENS: 'gen_ai.usage.cache_read_input_tokens',
  USAGE_CACHE_CREATION_INPUT_TOKENS: 'gen_ai.usage.cache_creation_input_tokens',

  // Client attributes
  CLIENT_NAME: 'gen_ai.client.name',
  CLIENT_VERSION: 'gen_ai.client.version',

  // System attributes
  SYSTEM: 'gen_ai.system',
  OPERATION: 'gen_ai.operation.name',
  PROVIDER_NAME: 'gen_ai.provider.name',
  CONVERSATION_ID: 'gen_ai.conversation.id',
  OUTPUT_TYPE: 'gen_ai.output.type',
  REQUEST_CHOICE_COUNT: 'gen_ai.request.choice.count',

  // Error attributes
  ERROR_CODE: 'gen_ai.error.code',
  ERROR_MESSAGE: 'gen_ai.error.message',

  // Embedding attributes
  EMBEDDING_DIMENSIONS: 'gen_ai.embedding.dimensions',
} as const;

/**
 * Cost tracking attribute names
 */
export const COST_ATTRIBUTES = {
  TOTAL: 'llm.cost.total',
  INPUT: 'llm.cost.input',
  OUTPUT: 'llm.cost.output',
  CURRENCY: 'llm.cost.currency',
} as const;

/**
 * Streaming attribute names
 */
export const STREAMING_ATTRIBUTES = {
  TIME_TO_FIRST_TOKEN_MS: 'gen_ai.streaming.time_to_first_token_ms',
  TOTAL_DURATION_MS: 'gen_ai.streaming.total_duration_ms',
  CHUNK_COUNT: 'gen_ai.streaming.chunk_count',
} as const;

/**
 * Event names for GenAI spans
 */
export const GEN_AI_EVENTS = {
  /** A single choice/completion in a response */
  CHOICE: 'gen_ai.choice',
  /** System message content */
  SYSTEM_MESSAGE: 'gen_ai.system.message',
  /** User message content */
  USER_MESSAGE: 'gen_ai.user.message',
  /** Assistant message content */
  ASSISTANT_MESSAGE: 'gen_ai.assistant.message',
  /** Tool call event */
  TOOL_CALL: 'gen_ai.tool.call',
  /** Token usage summary */
  USAGE: 'gen_ai.usage',
} as const;

/**
 * Event attribute names
 */
export const EVENT_ATTRIBUTES = {
  /** Index of the choice */
  INDEX: 'index',
  /** Finish reason for a choice */
  FINISH_REASON: 'finish_reason',
  /** Message content */
  CONTENT: 'content',
  /** Message role */
  ROLE: 'role',
  /** Tool name */
  TOOL_NAME: 'tool.name',
  /** Tool input */
  TOOL_INPUT: 'tool.input',
  /** Tool output */
  TOOL_OUTPUT: 'tool.output',
  /** Tool type */
  TOOL_TYPE: 'tool.type',
} as const;

/**
 * Standard finish reasons mapped to OTel values
 */
export const FINISH_REASONS = {
  /** Normal completion */
  STOP: 'stop',
  /** Maximum tokens reached */
  MAX_TOKENS: 'max_tokens',
  /** Content filter triggered */
  CONTENT_FILTER: 'content_filter',
  /** API returned an error */
  ERROR: 'error',
  /** Function/tool call */
  TOOL_CALLS: 'tool_calls',
  /** Length limit reached */
  LENGTH: 'length',
  /** Unknown or uncategorized reason */
  OTHER: 'other',
} as const;

/**
 * Error types for GenAI operations
 */
export const ERROR_TYPES = {
  /** Rate limit exceeded */
  RATE_LIMIT: 'rate_limit',
  /** Authentication failed */
  AUTHENTICATION: 'authentication',
  /** Invalid request parameters */
  INVALID_REQUEST: 'invalid_request',
  /** Server error */
  SERVER_ERROR: 'server_error',
  /** Timeout */
  TIMEOUT: 'timeout',
  /** Context length exceeded */
  CONTEXT_LENGTH: 'context_length',
  /** Model not found */
  MODEL_NOT_FOUND: 'model_not_found',
  /** Quota exceeded */
  QUOTA_EXCEEDED: 'quota_exceeded',
  /** Unknown error */
  UNKNOWN: 'unknown',
} as const;

/**
 * GenAI operation names
 */
export const OPERATIONS = {
  /** Chat completion operation */
  CHAT_COMPLETION: 'chat',
  /** Text completion operation */
  TEXT_COMPLETION: 'text_completion',
  /** Embedding generation */
  EMBEDDING: 'embeddings',
  /** Image generation */
  IMAGE_GENERATION: 'image_generation',
} as const;

/**
 * Span names for GenAI operations
 */
export const SPAN_NAMES = {
  [OPERATIONS.CHAT_COMPLETION]: 'gen_ai.chat.completion',
  [OPERATIONS.TEXT_COMPLETION]: 'gen_ai.text.completion',
  [OPERATIONS.EMBEDDING]: 'gen_ai.embedding',
  [OPERATIONS.IMAGE_GENERATION]: 'gen_ai.image.generation',
} as const;

/**
 * Provider-specific system identifiers
 */
export const PROVIDER_SYSTEMS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  VERTEX_AI: 'gcp.vertex_ai',
  BEDROCK: 'aws.bedrock',
  OLLAMA: 'ollama',
  COHERE: 'cohere',
  MISTRAL: 'mistral_ai',
} as const;

/**
 * Metric names for GenAI operations
 */
export const METRIC_NAMES = {
  /** Total number of requests */
  REQUESTS_TOTAL: 'genai.requests.total',
  /** Request duration in milliseconds */
  REQUEST_DURATION_MS: 'genai.request.duration_ms',
  /** Total input tokens */
  TOKENS_INPUT: 'genai.tokens.input',
  /** Total output tokens */
  TOKENS_OUTPUT: 'genai.tokens.output',
  /** Total cost */
  COST_TOTAL: 'genai.cost.total',
  /** Total errors */
  ERRORS_TOTAL: 'genai.errors.total',
  /** Time to first token for streaming */
  STREAMING_TTFT_MS: 'genai.streaming.time_to_first_token_ms',
} as const;

/**
 * Metric attribute names
 */
export const METRIC_ATTRIBUTES = {
  /** Provider name */
  PROVIDER: 'provider',
  /** Model name */
  MODEL: 'model',
  /** Request status */
  STATUS: 'status',
  /** Error type */
  ERROR_TYPE: 'error_type',
} as const;

/**
 * Status values for metrics
 */
export const STATUS_VALUES = {
  /** Successful request */
  OK: 'ok',
  /** Failed request */
  ERROR: 'error',
} as const;

/**
 * Combined GenAI semantic convention constants
 * Re-exports all attribute constants for convenience
 */
export const GEN_AI_SEMCONV = {
  ...GEN_AI_ATTRIBUTES,
  ...COST_ATTRIBUTES,
  ...STREAMING_ATTRIBUTES,
} as const;
