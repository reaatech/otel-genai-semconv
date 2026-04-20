/**
 * Instrumentation module exports
 */

// Core
export { TracerManager, getDefaultTracerManager } from './tracer.js';

export { SpanProcessor } from './span-processor.js';
export type { SpanProcessorOptions } from './span-processor.js';

export { HookManager, getDefaultHookManager } from './hooks.js';
export type {
  HookContext,
  HookRegistration,
  OnStartHook,
  OnEndHook,
  OnErrorHook,
  RequestHookContext,
  ResponseHookContext,
  ErrorHookContext,
} from './hooks.js';

// Streaming
export { StreamingHandler, instrumentStream } from './streaming-handler.js';
export type { StreamingMetrics } from './streaming-handler.js';

export { ChunkAggregator, createChunkAggregator } from './chunk-aggregator.js';
export type { AggregatedResponse, ToolCall } from './chunk-aggregator.js';

export { StreamingEventsManager, createStreamingEventsManager } from './streaming-events.js';
export type { StreamingEvent, StreamingEventsConfig } from './streaming-events.js';

// Error handling
export { ErrorHandler, createErrorHandler, LLMErrorType } from './error-handler.js';
export type { ErrorContext } from './error-handler.js';

// Retry
export { RetryHandler, createRetryHandler } from './retry-handler.js';
export type { RetryConfig, RetryAttempt } from './retry-handler.js';

// Circuit breaker
export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  createCircuitBreaker,
  createCircuitBreakerRegistry,
} from './circuit-breaker.js';
export type { CircuitBreakerConfig, CircuitStats } from './circuit-breaker.js';
export { CircuitState } from './circuit-breaker.js';
