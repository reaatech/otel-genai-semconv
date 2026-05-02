import { GEN_AI_ATTRIBUTES } from '@reaatech/otel-genai-semconv-core';

export type GenerateContentRequest = {
  contents: Array<{ role: string; parts: Array<{ text: string } | unknown> }>;
  systemInstruction?: { parts: Array<{ text: string } | unknown> };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
    candidateCount?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
  };
  tools?: Array<{ functionDeclarations?: Array<{ name: string }> }>;
};

export type GenerateContentResponse = {
  candidates?: Array<{
    content?: { parts: Array<{ text: string } | unknown> };
    finishReason?: string | null;
  }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  modelVersion?: string;
};

export function mapVertexAIRequest(
  request: GenerateContentRequest,
  model: string,
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    [GEN_AI_ATTRIBUTES.REQUEST_MODEL]: model,
    [GEN_AI_ATTRIBUTES.PROVIDER_NAME]: 'gcp.vertex_ai',
  };

  if (request.generationConfig) {
    const config = request.generationConfig;

    if (config.temperature !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE] = config.temperature;
    }

    if (config.topP !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_TOP_P] = config.topP;
    }

    if (config.topK !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_TOP_K] = config.topK;
    }

    if (config.maxOutputTokens !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS] = config.maxOutputTokens;
    }

    if (config.stopSequences && config.stopSequences.length > 0) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_STOP_SEQUENCES] = config.stopSequences;
    }

    if (config.candidateCount !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_CANDIDATES_PER_PROMPT] = config.candidateCount;
    }

    if (config.presencePenalty !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_PRESENCE_PENALTY] = config.presencePenalty;
    }

    if (config.frequencyPenalty !== undefined) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_FREQUENCY_PENALTY] = config.frequencyPenalty;
    }
  }

  if (request.tools && request.tools.length > 0) {
    const toolNames = request.tools
      .flatMap(
        (t: { functionDeclarations?: Array<{ name: string }> }) => t.functionDeclarations ?? [],
      )
      .map((f: { name: string }) => f.name);
    if (toolNames.length > 0) {
      attributes[GEN_AI_ATTRIBUTES.REQUEST_TOOL_NAMES] = toolNames;
    }
  }

  return attributes;
}

export function mapVertexAIResponse(response: GenerateContentResponse): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    [GEN_AI_ATTRIBUTES.PROVIDER_NAME]: 'gcp.vertex_ai',
  };

  if (response.modelVersion) {
    attributes[GEN_AI_ATTRIBUTES.RESPONSE_MODEL] = response.modelVersion;
  }

  if (response.candidates && response.candidates.length > 0) {
    const finishReasons = response.candidates
      .map((c: { finishReason?: string | null }) => mapFinishReason(c.finishReason))
      .filter(Boolean);
    if (finishReasons.length > 0) {
      attributes[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS] = finishReasons;
    }
  }

  return attributes;
}

function mapFinishReason(reason: string | null | undefined): string | null {
  if (!reason) {
    return null;
  }

  switch (reason) {
    case 'STOP':
      return 'stop';
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
      return 'content_filter';
    case 'RECITATION':
      return 'content_filter';
    default:
      return 'unknown';
  }
}

export function mapVertexAIError(error: Error & { code?: number }): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    'error.message': error.message,
    'error.type': error.name,
  };

  if (error.code) {
    attributes['http.status_code'] = error.code;
  }

  return attributes;
}
