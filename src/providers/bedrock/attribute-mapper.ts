/**
 * AWS Bedrock to OTel GenAI semantic convention attribute mapping
 */

import { GEN_AI_ATTRIBUTES } from '../../semconv/constants.js';

/**
 * Map Bedrock request to OTel GenAI request attributes
 */
export function mapBedrockRequest(
  input: { modelId: string; body: string },
  modelId: string,
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    [GEN_AI_ATTRIBUTES.REQUEST_MODEL]: modelId,
    [GEN_AI_ATTRIBUTES.PROVIDER_NAME]: 'aws.bedrock',
  };

  // Parse body to extract request parameters
  try {
    const body = JSON.parse(input.body);

    // Model-specific attribute extraction
    const modelFamily = modelId.split('.')[0];

    switch (modelFamily) {
      case 'anthropic':
        // Anthropic Claude format
        if (body.max_tokens) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS] = body.max_tokens;
        }
        if (body.temperature !== undefined) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE] = body.temperature;
        }
        if (body.top_p !== undefined) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_TOP_P] = body.top_p;
        }
        if (body.top_k !== undefined) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_TOP_K] = body.top_k;
        }
        if (body.stop_sequences) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_STOP_SEQUENCES] = body.stop_sequences;
        }
        break;

      case 'amazon':
        // Amazon Titan format
        if (body.maxTokenCount !== undefined) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS] = body.maxTokenCount;
        }
        if (body.temperature !== undefined) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE] = body.temperature;
        }
        if (body.topP !== undefined) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_TOP_P] = body.topP;
        }
        break;

      case 'cohere':
        // Cohere Command format
        if (body.max_tokens !== undefined) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS] = body.max_tokens;
        }
        if (body.temperature !== undefined) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE] = body.temperature;
        }
        if (body.p !== undefined) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_TOP_P] = body.p;
        }
        if (body.stop_sequences) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_STOP_SEQUENCES] = body.stop_sequences;
        }
        break;

      case 'ai21':
        // AI21 Jurassic format
        if (body.maxTokens !== undefined) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS] = body.maxTokens;
        }
        if (body.temperature !== undefined) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE] = body.temperature;
        }
        if (body.topP !== undefined) {
          attributes[GEN_AI_ATTRIBUTES.REQUEST_TOP_P] = body.topP;
        }
        break;
    }
  } catch {
    // If body parsing fails, continue with basic attributes
  }

  return attributes;
}

/**
 * Map Bedrock response to OTel GenAI response attributes
 */
export function mapBedrockResponse(responseBody: string, modelId: string): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    [GEN_AI_ATTRIBUTES.PROVIDER_NAME]: 'aws.bedrock',
  };

  try {
    const response = JSON.parse(responseBody);
    const modelFamily = modelId.split('.')[0];

    switch (modelFamily) {
      case 'anthropic':
        // Anthropic Claude format
        if (response.model) {
          attributes[GEN_AI_ATTRIBUTES.RESPONSE_MODEL] = response.model;
        }
        if (response.stop_reason) {
          attributes[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS] = [
            mapAnthropicStopReason(response.stop_reason),
          ];
        }
        if (response.usage) {
          attributes[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS] = response.usage.input_tokens ?? 0;
          attributes[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS] = response.usage.output_tokens ?? 0;
        }
        break;

      case 'amazon':
        // Amazon Titan format
        if (response.inputTextTokenCount) {
          attributes[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS] = response.inputTextTokenCount;
        }
        if (response.results?.[0]?.tokenCount) {
          attributes[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS] = response.results[0].tokenCount;
        }
        if (response.completionReason) {
          attributes[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS] = [response.completionReason];
        }
        break;

      case 'cohere':
        // Cohere Command format
        if (response.generations?.[0]?.text) {
          // Cohere doesn't provide token counts in response
        }
        if (response.finish_reason) {
          attributes[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS] = [response.finish_reason];
        }
        break;

      case 'ai21':
        // AI21 Jurassic format
        if (response.completions?.[0]?.data?.tokens) {
          attributes[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS] =
            response.completions[0].data.tokens.length;
        }
        if (response.completions?.[0]?.finishReason) {
          attributes[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS] = [
            response.completions[0].finishReason.reason,
          ];
        }
        break;
    }
  } catch {
    // If response parsing fails, continue with basic attributes
  }

  return attributes;
}

/**
 * Map Anthropic stop_reason to OTel finish_reason
 */
function mapAnthropicStopReason(reason: string): string {
  switch (reason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool_calls';
    default:
      return reason || 'unknown';
  }
}

/**
 * Map Bedrock error to OTel error attributes
 */
export function mapBedrockError(
  error: Error & { $metadata?: { httpStatusCode?: number } },
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    'error.message': error.message,
    'error.type': error.name,
  };

  if (error.$metadata?.httpStatusCode) {
    attributes['http.status_code'] = error.$metadata.httpStatusCode;
  }

  return attributes;
}
