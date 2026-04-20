/**
 * Mock OpenAI response fixtures for testing
 */

export const mockOpenAIChatCompletion = {
  id: 'chatcmpl-123456',
  object: 'chat.completion',
  created: 1234567890,
  model: 'gpt-4',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'Hello! How can I help you today?',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30,
  },
};

export const mockOpenAIStreamingChunk = {
  id: 'chatcmpl-123456',
  object: 'chat.completion.chunk',
  created: 1234567890,
  model: 'gpt-4',
  choices: [
    {
      index: 0,
      delta: {
        content: 'Hello',
      },
      finish_reason: null,
    },
  ],
};

export const mockOpenAIErrorResponse = {
  error: {
    message: 'Rate limit exceeded',
    type: 'tokens',
    param: null,
    code: 'rate_limit_exceeded',
  },
};

export const mockOpenAIFunctionCall = {
  ...mockOpenAIChatCompletion,
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: null,
        function_call: {
          name: 'get_weather',
          arguments: '{"location": "San Francisco"}',
        },
      },
      finish_reason: 'function_call',
    },
  ],
};
