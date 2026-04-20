/**
 * Retry handling for LLM instrumentation
 */

import { Span } from '@opentelemetry/api';
import { LLMErrorType } from './error-handler.js';

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Whether to use jitter (default: true) */
  jitter?: boolean;
  /** Error types that should be retried */
  retryableErrorTypes?: LLMErrorType[];
}

/**
 * Retry attempt metadata
 */
export interface RetryAttempt {
  /** Attempt number (0 = first attempt) */
  attempt: number;
  /** Delay before this attempt in milliseconds */
  delayMs: number;
  /** Timestamp of the attempt */
  timestamp: number;
  /** Error that triggered the retry */
  error?: Error;
  /** Error type */
  errorType?: LLMErrorType;
}

/**
 * Handler for retry logic with instrumentation
 */
export class RetryHandler {
  private readonly config: Required<RetryConfig>;
  private readonly attempts: RetryAttempt[] = [];

  constructor(config: RetryConfig = {}) {
    this.config = {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrorTypes: [
        LLMErrorType.RATE_LIMIT,
        LLMErrorType.TIMEOUT,
        LLMErrorType.NETWORK,
        LLMErrorType.SERVER,
      ],
      ...config,
    };
  }

  /**
   * Check if an error type should be retried
   */
  shouldRetry(errorType: LLMErrorType): boolean {
    return this.config.retryableErrorTypes.includes(errorType);
  }

  /**
   * Check if more retries are available
   */
  canRetry(): boolean {
    return this.attempts.length <= this.config.maxRetries;
  }

  /**
   * Get the current retry number
   */
  getCurrentAttempt(): number {
    return this.attempts.length;
  }

  /**
   * Calculate delay for the next retry
   */
  calculateDelay(): number {
    const attemptCount = this.attempts.length;
    const exponentialDelay = Math.min(
      this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attemptCount),
      this.config.maxDelayMs,
    );

    if (this.config.jitter) {
      // Add random jitter (0-25% of delay)
      const jitterAmount = exponentialDelay * 0.25 * Math.random();
      return Math.floor(exponentialDelay + jitterAmount);
    }

    return Math.floor(exponentialDelay);
  }

  /**
   * Record a retry attempt
   */
  recordAttempt(delayMs: number, error?: Error, errorType?: LLMErrorType): RetryAttempt {
    const attempt: RetryAttempt = {
      attempt: this.attempts.length,
      delayMs,
      timestamp: Date.now(),
      error,
      errorType,
    };

    this.attempts.push(attempt);
    return attempt;
  }

  /**
   * Record retry metadata on a span
   */
  recordOnSpan(span: Span): void {
    if (this.attempts.length === 0) {
      return;
    }

    span.setAttribute('gen_ai.retry.attempts', this.attempts.length);
    span.setAttribute('gen_ai.retry.total_delay_ms', this.getTotalDelay());

    // Add events for each retry
    for (const attempt of this.attempts) {
      span.addEvent('gen_ai.retry.attempt', {
        attempt: attempt.attempt,
        delay_ms: attempt.delayMs,
        error_type: attempt.errorType,
        error_message: attempt.error?.message,
      });
    }
  }

  /**
   * Get total delay from all retries
   */
  getTotalDelay(): number {
    return this.attempts.reduce((sum, a) => sum + a.delayMs, 0);
  }

  /**
   * Get all retry attempts
   */
  getAttempts(): ReadonlyArray<RetryAttempt> {
    return [...this.attempts];
  }

  /**
   * Reset retry state
   */
  reset(): void {
    this.attempts.length = 0;
  }

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    fn: (attempt: number) => Promise<T>,
    onError?: (error: Error, attempt: number) => Promise<boolean>,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateDelay();
          this.recordAttempt(delay, lastError);
          await this.sleep(delay);
        }

        return await fn(attempt);
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry
        if (onError) {
          const shouldContinue = await onError(error as Error, attempt);
          if (!shouldContinue) {
            throw error;
          }
        }

        // Check if more retries available
        if (!this.canRetry()) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep for a duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a new retry handler
 */
export function createRetryHandler(config?: RetryConfig): RetryHandler {
  return new RetryHandler(config);
}
