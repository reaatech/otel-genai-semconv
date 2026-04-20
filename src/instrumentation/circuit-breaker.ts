/**
 * Circuit breaker for LLM provider calls
 */

import { Span } from '@opentelemetry/api';
import { LLMErrorType } from './error-handler.js';

/**
 * Circuit breaker state
 */
export enum CircuitState {
  /** Circuit is closed, requests flow normally */
  CLOSED = 'closed',
  /** Circuit is open, requests are blocked */
  OPEN = 'open',
  /** Circuit is half-open, testing if service recovered */
  HALF_OPEN = 'half_open',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold to open circuit (default: 5) */
  failureThreshold?: number;
  /** Success threshold to close circuit from half-open (default: 3) */
  successThreshold?: number;
  /** Time in milliseconds before attempting recovery (default: 60000) */
  recoveryTimeoutMs?: number;
  /** Error types that count as failures (default: all retryable) */
  failureErrorTypes?: LLMErrorType[];
  /** Whether to track per-provider stats */
  trackPerProvider?: boolean;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitStats {
  /** Current state */
  state: CircuitState;
  /** Total requests */
  totalRequests: number;
  /** Total failures */
  totalFailures: number;
  /** Total successes */
  totalSuccesses: number;
  /** Consecutive failures */
  consecutiveFailures: number;
  /** Consecutive successes */
  consecutiveSuccesses: number;
  /** Last failure timestamp */
  lastFailureAt?: number;
  /** Last success timestamp */
  lastSuccessAt?: number;
  /** When circuit opened */
  openedAt?: number;
}

/**
 * Circuit breaker for LLM provider calls
 */
export class CircuitBreaker {
  private readonly config: Required<CircuitBreakerConfig>;
  private state: CircuitState = CircuitState.CLOSED;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private lastFailureAt?: number;
  private lastSuccessAt?: number;
  private openedAt?: number;
  private halfOpenSuccesses = 0;

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 3,
      recoveryTimeoutMs: 60000,
      failureErrorTypes: [
        LLMErrorType.RATE_LIMIT,
        LLMErrorType.TIMEOUT,
        LLMErrorType.NETWORK,
        LLMErrorType.SERVER,
      ],
      trackPerProvider: true,
      ...config,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    // Check if we should transition from open to half-open
    if (this.state === CircuitState.OPEN && this.shouldAttemptRecovery()) {
      this.state = CircuitState.HALF_OPEN;
      this.halfOpenSuccesses = 0;
    }
    return this.state;
  }

  /**
   * Check if a request should be allowed
   */
  canExecute(): boolean {
    const state = this.getState();
    return state !== CircuitState.OPEN;
  }

  /**
   * Record a successful call
   */
  recordSuccess(span?: Span): void {
    this.totalRequests++;
    this.totalSuccesses++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessAt = Date.now();

    // If in half-open state, check if we should close
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.successThreshold) {
        this.closeCircuit();
      }
    }

    // Record on span if provided
    if (span) {
      this.recordOnSpan(span);
    }
  }

  /**
   * Record a failed call
   */
  recordFailure(errorType: LLMErrorType, span?: Span): void {
    this.totalRequests++;

    if (!this.config.failureErrorTypes.includes(errorType)) {
      return;
    }

    this.totalFailures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureAt = Date.now();

    // If in half-open state, reopen circuit
    if (this.state === CircuitState.HALF_OPEN) {
      this.openCircuit();
    }
    // Check if we should open circuit
    else if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.openCircuit();
    }

    // Record on span if provided
    if (span) {
      this.recordOnSpan(span);
    }
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    this.state = CircuitState.OPEN;
    this.openedAt = Date.now();
    this.halfOpenSuccesses = 0;
  }

  /**
   * Close the circuit
   */
  private closeCircuit(): void {
    this.state = CircuitState.CLOSED;
    this.openedAt = undefined;
    this.consecutiveFailures = 0;
    this.halfOpenSuccesses = 0;
  }

  /**
   * Check if recovery should be attempted
   */
  private shouldAttemptRecovery(): boolean {
    if (!this.openedAt) {
      return true;
    }
    return Date.now() - this.openedAt >= this.config.recoveryTimeoutMs;
  }

  /**
   * Record circuit breaker state on span
   */
  recordOnSpan(span: Span): void {
    span.setAttribute('gen_ai.circuit.state', this.state);
    span.setAttribute('gen_ai.circuit.total_requests', this.totalRequests);
    span.setAttribute('gen_ai.circuit.total_failures', this.totalFailures);
    span.setAttribute('gen_ai.circuit.total_successes', this.totalSuccesses);
    span.setAttribute('gen_ai.circuit.consecutive_failures', this.consecutiveFailures);
    span.setAttribute('gen_ai.circuit.failure_threshold', this.config.failureThreshold);
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitStats {
    return {
      state: this.getState(),
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      openedAt: this.openedAt,
    };
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureAt = undefined;
    this.lastSuccessAt = undefined;
    this.openedAt = undefined;
    this.halfOpenSuccesses = 0;
  }
}

/**
 * Circuit breaker registry for per-provider tracking
 */
export class CircuitBreakerRegistry {
  private readonly breakers: Map<string, CircuitBreaker> = new Map();
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = config;
  }

  /**
   * Get or create a circuit breaker for a provider
   */
  get(provider: string): CircuitBreaker {
    if (!this.breakers.has(provider)) {
      this.breakers.set(provider, new CircuitBreaker(this.config));
    }
    return this.breakers.get(provider)!;
  }

  /**
   * Get all circuit breakers
   */
  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get stats for all providers
   */
  getAllStats(): Map<string, CircuitStats> {
    const stats = new Map<string, CircuitStats>();
    for (const [provider, breaker] of this.breakers) {
      stats.set(provider, breaker.getStats());
    }
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

/**
 * Create a new circuit breaker
 */
export function createCircuitBreaker(config?: CircuitBreakerConfig): CircuitBreaker {
  return new CircuitBreaker(config);
}

/**
 * Create a new circuit breaker registry
 */
export function createCircuitBreakerRegistry(
  config?: CircuitBreakerConfig,
): CircuitBreakerRegistry {
  return new CircuitBreakerRegistry(config);
}
