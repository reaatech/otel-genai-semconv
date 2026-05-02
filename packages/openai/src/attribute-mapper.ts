import { GEN_AI_ATTRIBUTES } from '@reaatech/otel-genai-semconv-core';
import type { ChatCompletion, ChatCompletionCreateParams } from 'openai/resources/chat/completions';

export function mapOpenAIRequest(request: ChatCompletionCreateParams): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    [GEN_AI_ATTRIBUTES.REQUEST_MODEL]: request.model,
    [GEN_AI_ATTRIBUTES.PROVIDER_NAME]: 'openai',
  };

  if (request.temperature !== undefined) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE] = request.temperature;
  }

  if (request.top_p !== undefined) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_TOP_P] = request.top_p;
  }

  if (request.max_tokens !== undefined) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS] = request.max_tokens;
  }

  if (request.frequency_penalty !== undefined) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_FREQUENCY_PENALTY] = request.frequency_penalty;
  }

  if (request.presence_penalty !== undefined) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_PRESENCE_PENALTY] = request.presence_penalty;
  }

  if (request.n !== undefined) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_CANDIDATES_PER_PROMPT] = request.n;
  }

  if (request.seed !== undefined) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_SEED] = request.seed;
  }

  if (request.stream) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_STREAMING] = true;
  }

  if (request.stop && Array.isArray(request.stop)) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_STOP_SEQUENCES] = request.stop;
  }

  if (request.tools && request.tools.length > 0) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_TOOL_NAMES] = request.tools.map(
      (t) => t.function?.name || t.type,
    );
  }

  if (request.user) {
    attributes['enduser.id'] = request.user;
  }

  return attributes;
}

export function mapOpenAIResponse(response: ChatCompletion): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    [GEN_AI_ATTRIBUTES.RESPONSE_MODEL]: response.model,
    [GEN_AI_ATTRIBUTES.RESPONSE_ID]: response.id,
    [GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]: response.choices.map(
      (c) => c.finish_reason || 'unknown',
    ),
    [GEN_AI_ATTRIBUTES.PROVIDER_NAME]: 'openai',
  };

  if (response.usage) {
    attributes[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS] = response.usage.prompt_tokens;
    attributes[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS] = response.usage.completion_tokens;
  }

  if (response.created) {
    attributes['gen_ai.response.created'] = response.created;
  }

  if (response.service_tier) {
    attributes['gen_ai.response.service_tier'] = response.service_tier;
  }

  return attributes;
}

export function mapOpenAIError(
  error: Error & { status?: number; code?: string },
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    'error.message': error.message,
    'error.type': error.name,
  };

  if (error.status) {
    attributes['http.status_code'] = error.status;
  }

  if (error.code) {
    attributes['error.code'] = error.code;
  }

  return attributes;
}
