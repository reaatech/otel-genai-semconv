import type { Span } from '@opentelemetry/api';
import { LLMErrorType } from './error-handler.js';

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryableErrorTypes?: LLMErrorType[];
}

export interface RetryAttempt {
  attempt: number;
  delayMs: number;
  timestamp: number;
  error?: Error;
  errorType?: LLMErrorType;
}

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

  shouldRetry(errorType: LLMErrorType): boolean {
    return this.config.retryableErrorTypes.includes(errorType);
  }

  canRetry(): boolean {
    return this.attempts.length <= this.config.maxRetries;
  }

  getCurrentAttempt(): number {
    return this.attempts.length;
  }

  calculateDelay(): number {
    const attemptCount = this.attempts.length;
    const exponentialDelay = Math.min(
      this.config.initialDelayMs * this.config.backoffMultiplier ** attemptCount,
      this.config.maxDelayMs,
    );

    if (this.config.jitter) {
      const jitterAmount = exponentialDelay * 0.25 * Math.random();
      return Math.floor(exponentialDelay + jitterAmount);
    }

    return Math.floor(exponentialDelay);
  }

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

  recordOnSpan(span: Span): void {
    if (this.attempts.length === 0) {
      return;
    }

    span.setAttribute('gen_ai.retry.attempts', this.attempts.length);
    span.setAttribute('gen_ai.retry.total_delay_ms', this.getTotalDelay());

    for (const attempt of this.attempts) {
      span.addEvent('gen_ai.retry.attempt', {
        attempt: attempt.attempt,
        delay_ms: attempt.delayMs,
        error_type: attempt.errorType,
        error_message: attempt.error?.message,
      });
    }
  }

  getTotalDelay(): number {
    return this.attempts.reduce((sum, a) => sum + a.delayMs, 0);
  }

  getAttempts(): ReadonlyArray<RetryAttempt> {
    return [...this.attempts];
  }

  reset(): void {
    this.attempts.length = 0;
  }

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

        if (onError) {
          const shouldContinue = await onError(error as Error, attempt);
          if (!shouldContinue) {
            throw error;
          }
        }

        if (!this.canRetry()) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createRetryHandler(config?: RetryConfig): RetryHandler {
  return new RetryHandler(config);
}
