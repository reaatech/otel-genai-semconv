import type { Message, MessageCreateParams } from '@anthropic-ai/sdk/resources/messages';
import { GEN_AI_ATTRIBUTES } from '@reaatech/otel-genai-semconv-core';

export function mapAnthropicRequest(request: MessageCreateParams): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    [GEN_AI_ATTRIBUTES.REQUEST_MODEL]: request.model,
    [GEN_AI_ATTRIBUTES.PROVIDER_NAME]: 'anthropic',
  };

  if (request.max_tokens !== undefined) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS] = request.max_tokens;
  }

  if (request.temperature !== undefined) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE] = request.temperature;
  }

  if (request.top_p !== undefined) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_TOP_P] = request.top_p;
  }

  if (request.top_k !== undefined) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_TOP_K] = request.top_k;
  }

  if (request.stop_sequences && request.stop_sequences.length > 0) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_STOP_SEQUENCES] = request.stop_sequences;
  }

  if (request.stream) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_STREAMING] = true;
  }

  if ('tools' in request && Array.isArray(request.tools) && request.tools.length > 0) {
    attributes[GEN_AI_ATTRIBUTES.REQUEST_TOOL_NAMES] = request.tools.map(
      (t: { name: string }) => t.name,
    );
  }

  if (request.metadata?.user_id) {
    attributes['enduser.id'] = request.metadata.user_id;
  }

  return attributes;
}

export function mapAnthropicResponse(response: Message): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    [GEN_AI_ATTRIBUTES.RESPONSE_MODEL]: response.model,
    [GEN_AI_ATTRIBUTES.RESPONSE_ID]: response.id,
    [GEN_AI_ATTRIBUTES.PROVIDER_NAME]: 'anthropic',
  };

  if (response.stop_reason) {
    const finishReason = mapStopReason(response.stop_reason);
    if (finishReason) {
      attributes[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS] = [finishReason];
    }
  }

  if (response.usage) {
    attributes[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS] = response.usage.input_tokens;
    attributes[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS] = response.usage.output_tokens;
  }

  return attributes;
}

function mapStopReason(stopReason: string | null): string {
  switch (stopReason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool_calls';
    default:
      return stopReason ?? 'unknown';
  }
}

export function mapAnthropicError(error: Error & { status?: number }): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    'error.message': error.message,
    'error.type': error.name,
  };

  if (error.status) {
    attributes['http.status_code'] = error.status;
  }

  return attributes;
}
