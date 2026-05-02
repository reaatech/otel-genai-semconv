import { describe, expect, it } from 'vitest';
import { ErrorHandler, LLMErrorType } from '../src/index.js';

describe('ErrorHandler', () => {
  it('should classify rate limit errors', () => {
    const handler = new ErrorHandler();
    const type = handler.classifyError(new Error('Rate limit exceeded'));
    expect(type).toBe(LLMErrorType.RATE_LIMIT);
  });

  it('should classify auth errors', () => {
    const handler = new ErrorHandler();
    const error = Object.assign(new Error('Authentication failed'), { status: 401 });
    const type = handler.classifyError(error);
    expect(type).toBe(LLMErrorType.AUTHENTICATION);
  });

  it('should identify retryable errors', () => {
    const handler = new ErrorHandler();
    expect(handler.isRetryable(LLMErrorType.RATE_LIMIT)).toBe(true);
    expect(handler.isRetryable(LLMErrorType.TIMEOUT)).toBe(true);
    expect(handler.isRetryable(LLMErrorType.AUTHENTICATION)).toBe(false);
  });
});
