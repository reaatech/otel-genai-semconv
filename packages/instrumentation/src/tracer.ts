import { type Span, type Tracer, context, propagation, trace } from '@opentelemetry/api';
import type { Context, SpanOptions } from '@opentelemetry/api';

export class TracerManager {
  private readonly tracerName: string;
  private readonly tracerVersion: string;
  private tracer: Tracer | null = null;

  constructor(options?: { tracerName?: string; tracerVersion?: string }) {
    this.tracerName = options?.tracerName ?? 'otel-genai-semconv';
    this.tracerVersion = options?.tracerVersion ?? '0.1.0';
  }

  getTracer(): Tracer {
    this.tracer ??= trace.getTracer(this.tracerName, this.tracerVersion);
    return this.tracer;
  }

  startSpan(name: string, options?: SpanOptions): Span {
    return this.getTracer().startSpan(name, options);
  }

  startChildSpan(parentSpan: Span, name: string, options?: SpanOptions): Span {
    const ctx = trace.setSpan(context.active(), parentSpan);
    return this.getTracer().startSpan(name, options, ctx);
  }

  withSpan<T>(span: Span, fn: () => T): T {
    const ctx = trace.setSpan(context.active(), span);
    return context.with(ctx, fn);
  }

  async withSpanAsync<T>(span: Span, fn: () => Promise<T>): Promise<T> {
    const ctx = trace.setSpan(context.active(), span);
    return context.with(ctx, fn);
  }

  getCurrentSpan(): Span | undefined {
    return trace.getSpan(context.active());
  }

  getCurrentContext(): Context {
    return context.active();
  }

  setActiveSpan(span: Span): Context {
    const ctx = trace.setSpan(context.active(), span);
    return ctx;
  }

  inject(headers: Record<string, string>): void {
    propagation.inject(context.active(), headers);
  }

  extract(headers: Record<string, string>): Context {
    return propagation.extract(context.active(), headers);
  }

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

  reset(): void {
    this.tracer = null;
  }
}

let defaultTracerManager: TracerManager | null = null;

export function getDefaultTracerManager(): TracerManager {
  defaultTracerManager ??= new TracerManager();
  return defaultTracerManager;
}
