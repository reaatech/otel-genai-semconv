/**
 * Unit tests for ErrorHandler
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ErrorHandler,
  createErrorHandler,
  LLMErrorType,
} from '../../../src/instrumentation/error-handler.js';

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = new ErrorHandler();
  });

  describe('classifyError', () => {
    it('should classify rate limit errors', () => {
      const error = new Error('Rate limit exceeded') as Error & { status?: number };
      error.status = 429;
      expect(handler.classifyError(error)).toBe(LLMErrorType.RATE_LIMIT);
    });

    it('should classify authentication errors', () => {
      const error = new Error('Authentication failed') as Error & { status?: number };
      error.status = 401;
      expect(handler.classifyError(error)).toBe(LLMErrorType.AUTHENTICATION);
    });

    it('should classify authorization errors', () => {
      const error = new Error('Permission denied') as Error & { status?: number };
      error.status = 403;
      expect(handler.classifyError(error)).toBe(LLMErrorType.AUTHORIZATION);
    });

    it('should classify not found errors', () => {
      const error = new Error('Model not found') as Error & { status?: number };
      error.status = 404;
      expect(handler.classifyError(error)).toBe(LLMErrorType.NOT_FOUND);
    });

    it('should classify invalid request errors', () => {
      const error = new Error('Invalid request parameters') as Error & { status?: number };
      error.status = 400;
      expect(handler.classifyError(error)).toBe(LLMErrorType.INVALID_REQUEST);
    });

    it('should classify content filter errors', () => {
      const error = new Error('Content filter triggered');
      expect(handler.classifyError(error)).toBe(LLMErrorType.CONTENT_FILTER);
    });

    it('should classify timeout errors', () => {
      const error = new Error('Request timed out');
      expect(handler.classifyError(error)).toBe(LLMErrorType.TIMEOUT);
    });

    it('should classify network errors', () => {
      const error = new Error('Network connection failed');
      expect(handler.classifyError(error)).toBe(LLMErrorType.NETWORK);
    });

    it('should classify server errors', () => {
      const error = new Error('Internal server error') as Error & { status?: number };
      error.status = 500;
      expect(handler.classifyError(error)).toBe(LLMErrorType.SERVER);
    });

    it('should classify unknown errors', () => {
      const error = new Error('Something went wrong');
      expect(handler.classifyError(error)).toBe(LLMErrorType.UNKNOWN);
    });
  });

  describe('isRetryable', () => {
    it('should return true for rate limit errors', () => {
      expect(handler.isRetryable(LLMErrorType.RATE_LIMIT)).toBe(true);
    });

    it('should return true for timeout errors', () => {
      expect(handler.isRetryable(LLMErrorType.TIMEOUT)).toBe(true);
    });

    it('should return true for network errors', () => {
      expect(handler.isRetryable(LLMErrorType.NETWORK)).toBe(true);
    });

    it('should return true for server errors', () => {
      expect(handler.isRetryable(LLMErrorType.SERVER)).toBe(true);
    });

    it('should return false for authentication errors', () => {
      expect(handler.isRetryable(LLMErrorType.AUTHENTICATION)).toBe(false);
    });

    it('should return false for invalid request errors', () => {
      expect(handler.isRetryable(LLMErrorType.INVALID_REQUEST)).toBe(false);
    });

    it('should return false for content filter errors', () => {
      expect(handler.isRetryable(LLMErrorType.CONTENT_FILTER)).toBe(false);
    });
  });

  describe('getUserMessage', () => {
    it('should return user-friendly message for each error type', () => {
      expect(handler.getUserMessage(LLMErrorType.RATE_LIMIT)).toContain('rate limit');
      expect(handler.getUserMessage(LLMErrorType.AUTHENTICATION)).toContain('Authentication');
      expect(handler.getUserMessage(LLMErrorType.AUTHORIZATION)).toContain('Access denied');
      expect(handler.getUserMessage(LLMErrorType.NOT_FOUND)).toContain('Model not found');
      expect(handler.getUserMessage(LLMErrorType.INVALID_REQUEST)).toContain('Invalid request');
      expect(handler.getUserMessage(LLMErrorType.TIMEOUT)).toContain('timed out');
      expect(handler.getUserMessage(LLMErrorType.NETWORK)).toContain('Network');
      expect(handler.getUserMessage(LLMErrorType.SERVER)).toContain('Server');
      expect(handler.getUserMessage(LLMErrorType.CONTENT_FILTER)).toContain('filtered');
      expect(handler.getUserMessage(LLMErrorType.UNKNOWN)).toContain('error');
    });
  });

  describe('factory function', () => {
    it('should create error handler via factory', () => {
      const h = createErrorHandler();
      expect(h).toBeInstanceOf(ErrorHandler);
    });
  });
});
