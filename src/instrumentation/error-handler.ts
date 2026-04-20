/**
 * Error handling for LLM instrumentation
 */

import { Span, SpanStatusCode } from '@opentelemetry/api';

/**
 * LLM error types
 */
export enum LLMErrorType {
  RATE_LIMIT = 'rate_limit_error',
  AUTHENTICATION = 'authentication_error',
  AUTHORIZATION = 'authorization_error',
  INVALID_REQUEST = 'invalid_request_error',
  NOT_FOUND = 'not_found_error',
  VALIDATION = 'validation_error',
  SERVER = 'server_error',
  TIMEOUT = 'timeout_error',
  NETWORK = 'network_error',
  CONTENT_FILTER = 'content_filter_error',
  QUOTA_EXCEEDED = 'quota_exceeded_error',
  UNKNOWN = 'unknown_error',
}

/**
 * Error context for hooks
 */
export interface ErrorContext {
  /** Error type classification */
  errorType: LLMErrorType;
  /** HTTP status code if available */
  httpStatus?: number;
  /** Whether the error is retryable */
  retryable: boolean;
  /** Provider-specific error code */
  providerCode?: string;
  /** Partial response if available */
  partialResponse?: unknown;
}

/**
 * Handler for LLM errors
 */
export class ErrorHandler {
  /**
   * Classify an error to an LLM error type
   */
  classifyError(error: Error & { status?: number; code?: string }): LLMErrorType {
    const message = error.message.toLowerCase();
    const status = error.status;

    // Rate limiting
    if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      return LLMErrorType.RATE_LIMIT;
    }

    // Authentication
    if (status === 401 || message.includes('authentication') || message.includes('unauthorized')) {
      return LLMErrorType.AUTHENTICATION;
    }

    // Authorization
    if (status === 403 || message.includes('permission') || message.includes('forbidden')) {
      return LLMErrorType.AUTHORIZATION;
    }

    // Not found
    if (status === 404 || message.includes('not found')) {
      return LLMErrorType.NOT_FOUND;
    }

    // Validation
    if (status === 400 || message.includes('invalid') || message.includes('validation')) {
      return LLMErrorType.INVALID_REQUEST;
    }

    // Content filter
    if (
      message.includes('content filter') ||
      message.includes('safety') ||
      message.includes('moderation')
    ) {
      return LLMErrorType.CONTENT_FILTER;
    }

    // Timeout
    if (message.includes('timeout') || message.includes('timed out')) {
      return LLMErrorType.TIMEOUT;
    }

    // Network
    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('fetch')
    ) {
      return LLMErrorType.NETWORK;
    }

    // Server error
    if ((status ?? 0) >= 500 || message.includes('server')) {
      return LLMErrorType.SERVER;
    }

    return LLMErrorType.UNKNOWN;
  }

  /**
   * Determine if an error is retryable
   */
  isRetryable(errorType: LLMErrorType): boolean {
    switch (errorType) {
      case LLMErrorType.RATE_LIMIT:
      case LLMErrorType.TIMEOUT:
      case LLMErrorType.NETWORK:
      case LLMErrorType.SERVER:
        return true;
      default:
        return false;
    }
  }

  /**
   * Capture error on a span
   */
  captureError(span: Span, error: Error, context?: Partial<ErrorContext>): ErrorContext {
    const errorType = this.classifyError(error as Error & { status?: number });
    const errorContext: ErrorContext = {
      errorType,
      httpStatus: (error as { status?: number }).status,
      retryable: this.isRetryable(errorType),
      providerCode: (error as { code?: string }).code,
      ...context,
    };

    // Set span status
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });

    // Record exception
    span.recordException(error);

    // Set error attributes
    span.setAttribute('error.type', errorType);
    span.setAttribute('error.message', error.message);

    if (errorContext.httpStatus) {
      span.setAttribute('http.status_code', errorContext.httpStatus);
    }

    if (errorContext.providerCode) {
      span.setAttribute('gen_ai.error.code', errorContext.providerCode);
    }

    // Set retryable flag
    span.setAttribute('gen_ai.error.retryable', errorContext.retryable);

    return errorContext;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(errorType: LLMErrorType): string {
    switch (errorType) {
      case LLMErrorType.RATE_LIMIT:
        return 'Request rate limit exceeded. Please try again later.';
      case LLMErrorType.AUTHENTICATION:
        return 'Authentication failed. Please check your API key.';
      case LLMErrorType.AUTHORIZATION:
        return 'Access denied. Please check your permissions.';
      case LLMErrorType.NOT_FOUND:
        return 'Model not found. Please check the model name.';
      case LLMErrorType.INVALID_REQUEST:
        return 'Invalid request. Please check your input.';
      case LLMErrorType.TIMEOUT:
        return 'Request timed out. Please try again.';
      case LLMErrorType.NETWORK:
        return 'Network error. Please check your connection.';
      case LLMErrorType.SERVER:
        return 'Server error. Please try again later.';
      case LLMErrorType.CONTENT_FILTER:
        return 'Content was filtered. Please modify your input.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}

/**
 * Create a new error handler
 */
export function createErrorHandler(): ErrorHandler {
  return new ErrorHandler();
}
