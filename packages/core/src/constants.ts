// OpenTelemetry GenAI semantic convention constants
// Based on: https://opentelemetry.io/docs/specs/semconv/gen-ai/

// Attribute names for GenAI spans
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
  // Output attributes
  OUTPUT_TYPE: 'gen_ai.output.type',
  // Request metadata
  REQUEST_CHOICE_COUNT: 'gen_ai.request.choice.count',
  // Error attributes
  ERROR_CODE: 'gen_ai.error.code',
  ERROR_MESSAGE: 'gen_ai.error.message',
  // Embedding attributes
  EMBEDDING_DIMENSIONS: 'gen_ai.embedding.dimensions',
} as const;

export const COST_ATTRIBUTES = {
  TOTAL: 'llm.cost.total',
  INPUT: 'llm.cost.input',
  OUTPUT: 'llm.cost.output',
  CURRENCY: 'llm.cost.currency',
} as const;

export const STREAMING_ATTRIBUTES = {
  TIME_TO_FIRST_TOKEN_MS: 'gen_ai.streaming.time_to_first_token_ms',
  TOTAL_DURATION_MS: 'gen_ai.streaming.total_duration_ms',
  CHUNK_COUNT: 'gen_ai.streaming.chunk_count',
} as const;

export const GEN_AI_EVENTS = {
  CHOICE: 'gen_ai.choice',
  SYSTEM_MESSAGE: 'gen_ai.system.message',
  USER_MESSAGE: 'gen_ai.user.message',
  ASSISTANT_MESSAGE: 'gen_ai.assistant.message',
  TOOL_CALL: 'gen_ai.tool.call',
  USAGE: 'gen_ai.usage',
} as const;

export const EVENT_ATTRIBUTES = {
  INDEX: 'index',
  FINISH_REASON: 'finish_reason',
  CONTENT: 'content',
  ROLE: 'role',
  TOOL_NAME: 'tool.name',
  TOOL_INPUT: 'tool.input',
  TOOL_OUTPUT: 'tool.output',
  TOOL_TYPE: 'tool.type',
} as const;

export const FINISH_REASONS = {
  STOP: 'stop',
  MAX_TOKENS: 'max_tokens',
  CONTENT_FILTER: 'content_filter',
  ERROR: 'error',
  TOOL_CALLS: 'tool_calls',
  LENGTH: 'length',
  OTHER: 'other',
} as const;

export const ERROR_TYPES = {
  RATE_LIMIT: 'rate_limit',
  AUTHENTICATION: 'authentication',
  INVALID_REQUEST: 'invalid_request',
  SERVER_ERROR: 'server_error',
  TIMEOUT: 'timeout',
  CONTEXT_LENGTH: 'context_length',
  MODEL_NOT_FOUND: 'model_not_found',
  QUOTA_EXCEEDED: 'quota_exceeded',
  UNKNOWN: 'unknown',
} as const;

export const OPERATIONS = {
  CHAT_COMPLETION: 'chat',
  TEXT_COMPLETION: 'text_completion',
  EMBEDDING: 'embeddings',
  IMAGE_GENERATION: 'image_generation',
} as const;

export const SPAN_NAMES = {
  [OPERATIONS.CHAT_COMPLETION]: 'gen_ai.chat.completion',
  [OPERATIONS.TEXT_COMPLETION]: 'gen_ai.text.completion',
  [OPERATIONS.EMBEDDING]: 'gen_ai.embedding',
  [OPERATIONS.IMAGE_GENERATION]: 'gen_ai.image.generation',
} as const;

export const PROVIDER_SYSTEMS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  VERTEX_AI: 'gcp.vertex_ai',
  BEDROCK: 'aws.bedrock',
  OLLAMA: 'ollama',
  COHERE: 'cohere',
  MISTRAL: 'mistral_ai',
} as const;

export const METRIC_NAMES = {
  REQUESTS_TOTAL: 'genai.requests.total',
  REQUEST_DURATION_MS: 'genai.request.duration_ms',
  TOKENS_INPUT: 'genai.tokens.input',
  TOKENS_OUTPUT: 'genai.tokens.output',
  COST_TOTAL: 'genai.cost.total',
  ERRORS_TOTAL: 'genai.errors.total',
  STREAMING_TTFT_MS: 'genai.streaming.time_to_first_token_ms',
} as const;

export const METRIC_ATTRIBUTES = {
  PROVIDER: 'provider',
  MODEL: 'model',
  STATUS: 'status',
  ERROR_TYPE: 'error_type',
} as const;

export const STATUS_VALUES = {
  OK: 'ok',
  ERROR: 'error',
} as const;

export const GEN_AI_SEMCONV = {
  ...GEN_AI_ATTRIBUTES,
  ...COST_ATTRIBUTES,
  ...STREAMING_ATTRIBUTES,
} as const;
