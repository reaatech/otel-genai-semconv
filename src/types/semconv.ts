/**
 * GenAI semantic convention types
 */

/**
 * Client-level GenAI attributes
 */
export interface GenAIClientAttributes {
  /** The name of the GenAI client library being used */
  'gen_ai.client.name'?: string;
  /** The version of the GenAI client library */
  'gen_ai.client.version'?: string;
}

/**
 * Request-level GenAI attributes
 */
export interface GenAIRequestAttributes {
  /** The requested model name */
  'gen_ai.request.model'?: string;
  /** Sampling temperature */
  'gen_ai.request.temperature'?: number;
  /** Top-p sampling parameter */
  'gen_ai.request.top_p'?: number;
  /** Maximum tokens to generate */
  'gen_ai.request.max_tokens'?: number;
  /** Whether streaming is enabled */
  'gen_ai.request.streaming'?: boolean;
  /** Stop sequences */
  'gen_ai.request.stop_sequences'?: string[];
  /** Frequency penalty */
  'gen_ai.request.frequency_penalty'?: number;
  /** Presence penalty */
  'gen_ai.request.presence_penalty'?: number;
  /** Seed for reproducibility */
  'gen_ai.request.seed'?: number;
  /** Response format */
  'gen_ai.request.response_format'?: string;
}

/**
 * Response-level GenAI attributes
 */
export interface GenAIResponseAttributes {
  /** The actual model used for the response */
  'gen_ai.response.model'?: string;
  /** Unique response identifier */
  'gen_ai.response.id'?: string;
  /** Finish reasons for each choice */
  'gen_ai.response.finish_reasons'?: string[];
}

/**
 * Usage attributes
 */
export interface GenAIUsageAttributes {
  /** Number of input tokens */
  'gen_ai.usage.input_tokens'?: number;
  /** Number of output tokens */
  'gen_ai.usage.output_tokens'?: number;
  /** Number of cached input tokens */
  'gen_ai.usage.cached_input_tokens'?: number;
}

/**
 * Error attributes for GenAI operations
 */
export interface GenAIErrorAttributes {
  /** The type of error that occurred */
  'error.type'?: string;
  /** The error message */
  'error.message'?: string;
  /** The HTTP status code (if applicable) */
  'http.status_code'?: number;
  /** The provider-specific error code */
  'gen_ai.error.code'?: string;
  /** The provider-specific error message */
  'gen_ai.error.message'?: string;
}

/**
 * Cost tracking attributes
 */
export interface GenAICostAttributes {
  /** Total cost in USD */
  'llm.cost.total'?: number;
  /** Input token cost in USD */
  'llm.cost.input'?: number;
  /** Output token cost in USD */
  'llm.cost.output'?: number;
  /** Currency code */
  'llm.cost.currency'?: string;
}

/**
 * Streaming-specific attributes
 */
export interface GenAIStreamingAttributes {
  /** Time to first token in milliseconds */
  'gen_ai.streaming.time_to_first_token_ms'?: number;
  /** Total streaming duration in milliseconds */
  'gen_ai.streaming.total_duration_ms'?: number;
  /** Number of chunks received */
  'gen_ai.streaming.chunk_count'?: number;
}

/**
 * Choice event attributes
 */
export interface GenAIChoiceAttributes {
  /** Index of the choice */
  index: number;
  /** Finish reason for this choice */
  finish_reason: string | null;
  /** The message content */
  message: {
    role: string;
    content: string;
    tool_calls?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
}

/**
 * Message event attributes
 */
export interface GenAIMessageEventAttributes {
  /** The content of the message */
  content: string;
  /** The role of the message sender */
  role?: string;
}

/**
 * Tool call event attributes
 */
export interface GenAIToolCallAttributes {
  /** The name of the tool being called */
  'tool.name'?: string;
  /** The input to the tool */
  'tool.input'?: string;
  /** The output from the tool */
  'tool.output'?: string;
  /** The type of tool */
  'tool.type'?: string;
}

/**
 * Embedding-specific attributes
 */
export interface GenAIEmbeddingAttributes {
  /** The embedding model used */
  'gen_ai.request.model'?: string;
  /** The number of dimensions in the embedding */
  'gen_ai.embedding.dimensions'?: number;
  /** The input text that was embedded */
  'gen_ai.embedding.input'?: string;
}

/**
 * Combined GenAI attributes for spans
 */
export interface GenAISpanAttributesFull
  extends
    GenAIClientAttributes,
    GenAIRequestAttributes,
    GenAIResponseAttributes,
    GenAIUsageAttributes,
    GenAIErrorAttributes,
    GenAICostAttributes,
    GenAIStreamingAttributes {}
