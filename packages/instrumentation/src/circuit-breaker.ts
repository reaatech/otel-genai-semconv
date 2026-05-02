import type { Span } from '@opentelemetry/api';
import { LLMErrorType } from './error-handler.js';

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface CircuitBreakerConfig {
  failureThreshold?: number;
  successThreshold?: number;
  recoveryTimeoutMs?: number;
  failureErrorTypes?: LLMErrorType[];
  trackPerProvider?: boolean;
}

export interface CircuitStats {
  state: CircuitState;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureAt?: number;
  lastSuccessAt?: number;
  openedAt?: number;
}

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

  getState(): CircuitState {
    if (this.state === CircuitState.OPEN && this.shouldAttemptRecovery()) {
      this.state = CircuitState.HALF_OPEN;
      this.halfOpenSuccesses = 0;
    }
    return this.state;
  }

  canExecute(): boolean {
    const state = this.getState();
    return state !== CircuitState.OPEN;
  }

  recordSuccess(span?: Span): void {
    this.totalRequests++;
    this.totalSuccesses++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessAt = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.successThreshold) {
        this.closeCircuit();
      }
    }

    if (span) {
      this.recordOnSpan(span);
    }
  }

  recordFailure(errorType: LLMErrorType, span?: Span): void {
    this.totalRequests++;

    if (!this.config.failureErrorTypes.includes(errorType)) {
      return;
    }

    this.totalFailures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureAt = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.openCircuit();
    } else if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.openCircuit();
    }

    if (span) {
      this.recordOnSpan(span);
    }
  }

  private openCircuit(): void {
    this.state = CircuitState.OPEN;
    this.openedAt = Date.now();
    this.halfOpenSuccesses = 0;
  }

  private closeCircuit(): void {
    this.state = CircuitState.CLOSED;
    this.openedAt = undefined;
    this.consecutiveFailures = 0;
    this.halfOpenSuccesses = 0;
  }

  private shouldAttemptRecovery(): boolean {
    if (!this.openedAt) {
      return true;
    }
    return Date.now() - this.openedAt >= this.config.recoveryTimeoutMs;
  }

  recordOnSpan(span: Span): void {
    span.setAttribute('gen_ai.circuit.state', this.state);
    span.setAttribute('gen_ai.circuit.total_requests', this.totalRequests);
    span.setAttribute('gen_ai.circuit.total_failures', this.totalFailures);
    span.setAttribute('gen_ai.circuit.total_successes', this.totalSuccesses);
    span.setAttribute('gen_ai.circuit.consecutive_failures', this.consecutiveFailures);
    span.setAttribute('gen_ai.circuit.failure_threshold', this.config.failureThreshold);
  }

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

export class CircuitBreakerRegistry {
  private readonly breakers: Map<string, CircuitBreaker> = new Map();
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = config;
  }

  get(provider: string): CircuitBreaker {
    if (!this.breakers.has(provider)) {
      this.breakers.set(provider, new CircuitBreaker(this.config));
    }
    const breaker = this.breakers.get(provider);
    if (!breaker) {
      const fallback = new CircuitBreaker(this.config);
      this.breakers.set(provider, fallback);
      return fallback;
    }
    return breaker;
  }

  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  getAllStats(): Map<string, CircuitStats> {
    const stats = new Map<string, CircuitStats>();
    for (const [provider, breaker] of this.breakers) {
      stats.set(provider, breaker.getStats());
    }
    return stats;
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

export function createCircuitBreaker(config?: CircuitBreakerConfig): CircuitBreaker {
  return new CircuitBreaker(config);
}

export function createCircuitBreakerRegistry(
  config?: CircuitBreakerConfig,
): CircuitBreakerRegistry {
  return new CircuitBreakerRegistry(config);
}
