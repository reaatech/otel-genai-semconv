export interface GenAIClientAttributes {
  'gen_ai.client.name'?: string;
  'gen_ai.client.version'?: string;
}

export interface GenAIRequestAttributes {
  'gen_ai.request.model'?: string;
  'gen_ai.request.temperature'?: number;
  'gen_ai.request.top_p'?: number;
  'gen_ai.request.max_tokens'?: number;
  'gen_ai.request.streaming'?: boolean;
  'gen_ai.request.stop_sequences'?: string[];
  'gen_ai.request.frequency_penalty'?: number;
  'gen_ai.request.presence_penalty'?: number;
  'gen_ai.request.seed'?: number;
  'gen_ai.request.response_format'?: string;
}

export interface GenAIResponseAttributes {
  'gen_ai.response.model'?: string;
  'gen_ai.response.id'?: string;
  'gen_ai.response.finish_reasons'?: string[];
}

export interface GenAIUsageAttributes {
  'gen_ai.usage.input_tokens'?: number;
  'gen_ai.usage.output_tokens'?: number;
  'gen_ai.usage.cached_input_tokens'?: number;
}

export interface GenAIErrorAttributes {
  'error.type'?: string;
  'error.message'?: string;
  'http.status_code'?: number;
  'gen_ai.error.code'?: string;
  'gen_ai.error.message'?: string;
}

export interface GenAICostAttributes {
  'llm.cost.total'?: number;
  'llm.cost.input'?: number;
  'llm.cost.output'?: number;
  'llm.cost.currency'?: string;
}

export interface GenAIStreamingAttributes {
  'gen_ai.streaming.time_to_first_token_ms'?: number;
  'gen_ai.streaming.total_duration_ms'?: number;
  'gen_ai.streaming.chunk_count'?: number;
}

export interface GenAIChoiceAttributes {
  index: number;
  finish_reason: string | null;
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

export interface GenAIMessageEventAttributes {
  content: string;
  role?: string;
}

export interface GenAIToolCallAttributes {
  'tool.name'?: string;
  'tool.input'?: string;
  'tool.output'?: string;
  'tool.type'?: string;
}

export interface GenAIEmbeddingAttributes {
  'gen_ai.request.model'?: string;
  'gen_ai.embedding.dimensions'?: number;
  'gen_ai.embedding.input'?: string;
}

export interface GenAISpanAttributesFull
  extends GenAIClientAttributes,
    GenAIRequestAttributes,
    GenAIResponseAttributes,
    GenAIUsageAttributes,
    GenAIErrorAttributes,
    GenAICostAttributes,
    GenAIStreamingAttributes {}
