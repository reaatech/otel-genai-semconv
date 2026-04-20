/**
 * Core tracer wrapper for managing OTel spans
 */

import { trace, Tracer, Span, context, propagation } from '@opentelemetry/api';
import type { SpanOptions, Context } from '@opentelemetry/api';

/**
 * Tracer manager for OpenTelemetry spans
 */
export class TracerManager {
  private readonly tracerName: string;
  private readonly tracerVersion: string;
  private tracer: Tracer | null = null;

  constructor(options?: { tracerName?: string; tracerVersion?: string }) {
    this.tracerName = options?.tracerName ?? 'otel-genai-semconv';
    this.tracerVersion = options?.tracerVersion ?? '0.1.0';
  }

  /**
   * Get or create the tracer
   */
  getTracer(): Tracer {
    if (!this.tracer) {
      this.tracer = trace.getTracer(this.tracerName, this.tracerVersion);
    }
    return this.tracer;
  }

  /**
   * Start a new span
   */
  startSpan(name: string, options?: SpanOptions): Span {
    return this.getTracer().startSpan(name, options);
  }

  /**
   * Start a span as a child of another span
   */
  startChildSpan(parentSpan: Span, name: string, options?: SpanOptions): Span {
    const ctx = trace.setSpan(context.active(), parentSpan);
    return this.getTracer().startSpan(name, options, ctx);
  }

  /**
   * Execute a function within a span context
   */
  withSpan<T>(span: Span, fn: () => T): T {
    const ctx = trace.setSpan(context.active(), span);
    return context.with(ctx, fn);
  }

  /**
   * Execute an async function within a span context
   */
  async withSpanAsync<T>(span: Span, fn: () => Promise<T>): Promise<T> {
    const ctx = trace.setSpan(context.active(), span);
    return context.with(ctx, fn);
  }

  /**
   * Get the current span from context
   */
  getCurrentSpan(): Span | undefined {
    return trace.getSpan(context.active());
  }

  /**
   * Get the current context
   */
  getCurrentContext(): Context {
    return context.active();
  }

  /**
   * Set a span as the current span in context
   */
  setActiveSpan(span: Span): Context {
    const ctx = trace.setSpan(context.active(), span);
    context.setGlobalContextManager;
    return ctx;
  }

  /**
   * Inject trace context into headers
   */
  inject(headers: Record<string, string>): void {
    propagation.inject(context.active(), headers);
  }

  /**
   * Extract trace context from headers
   */
  extract(headers: Record<string, string>): Context {
    return propagation.extract(context.active(), headers);
  }

  /**
   * Create a span that automatically ends when the promise resolves
   */
  async withAutoEndSpan<T>(name: string, fn: () => Promise<T>, options?: SpanOptions): Promise<T> {
    const span = this.startSpan(name, options);
    try {
      return await this.withSpanAsync(span, fn);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Create a span that automatically ends when the function returns
   */
  withAutoEndSpanSync<T>(name: string, fn: () => T, options?: SpanOptions): T {
    const span = this.startSpan(name, options);
    try {
      return this.withSpan(span, fn);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Reset the tracer (useful for testing)
   */
  reset(): void {
    this.tracer = null;
  }
}

// Singleton instance
let defaultTracerManager: TracerManager | null = null;

/**
 * Get the default tracer manager instance
 */
export function getDefaultTracerManager(): TracerManager {
  if (!defaultTracerManager) {
    defaultTracerManager = new TracerManager();
  }
  return defaultTracerManager;
}
