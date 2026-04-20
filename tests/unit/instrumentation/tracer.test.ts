/**
 * Unit tests for TracerManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { trace, context, propagation } from '@opentelemetry/api';
import { TracerManager, getDefaultTracerManager } from '../../../src/instrumentation/tracer.js';

vi.mock('@opentelemetry/api', async () => {
  const actual = await vi.importActual('@opentelemetry/api');
  const mockContext = {
    getValue: vi.fn(),
    setValue: vi.fn(),
    deleteValue: vi.fn(),
  };
  return {
    ...(actual as object),
    trace: {
      getTracer: vi.fn(),
      setSpan: vi.fn(() => mockContext),
      getSpan: vi.fn(),
    },
    context: {
      active: vi.fn(() => mockContext),
      with: vi.fn((_ctx, fn) => fn()),
      setGlobalContextManager: vi.fn(),
    },
    propagation: {
      inject: vi.fn(),
      extract: vi.fn(() => mockContext),
    },
  };
});

describe('TracerManager', () => {
  const mockTracer = {
    startSpan: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(trace.getTracer).mockReturnValue(
      mockTracer as unknown as ReturnType<typeof trace.getTracer>,
    );
  });

  describe('constructor', () => {
    it('should use default tracer name and version', () => {
      const manager = new TracerManager();
      expect(manager).toBeInstanceOf(TracerManager);
    });

    it('should accept custom tracer name and version', () => {
      const manager = new TracerManager({ tracerName: 'custom', tracerVersion: '2.0.0' });
      expect(manager).toBeInstanceOf(TracerManager);
    });
  });

  describe('getTracer', () => {
    it('should create tracer on first call', () => {
      const manager = new TracerManager();
      const tracer = manager.getTracer();

      expect(trace.getTracer).toHaveBeenCalled();
      expect(tracer).toBe(mockTracer);
    });

    it('should return cached tracer on subsequent calls', () => {
      const manager = new TracerManager();
      manager.getTracer();
      const countAfterFirst = vi.mocked(trace.getTracer).mock.calls.length;
      manager.getTracer();
      const countAfterSecond = vi.mocked(trace.getTracer).mock.calls.length;

      expect(countAfterFirst).toBe(countAfterSecond);
    });
  });

  describe('startSpan', () => {
    it('should start a span with the tracer', () => {
      const mockSpan = {} as ReturnType<typeof mockTracer.startSpan>;
      vi.mocked(mockTracer.startSpan).mockReturnValue(mockSpan);

      const manager = new TracerManager();
      const span = manager.startSpan('test-span');

      expect(mockTracer.startSpan).toHaveBeenCalledWith('test-span', undefined);
      expect(span).toBe(mockSpan);
    });

    it('should pass options to startSpan', () => {
      const mockSpan = {} as ReturnType<typeof mockTracer.startSpan>;
      vi.mocked(mockTracer.startSpan).mockReturnValue(mockSpan);
      const options = { attributes: { key: 'value' } };

      const manager = new TracerManager();
      manager.startSpan('test-span', options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith('test-span', options);
    });
  });

  describe('startChildSpan', () => {
    it('should start a child span with parent context', () => {
      const mockSpan = {} as ReturnType<typeof mockTracer.startSpan>;
      vi.mocked(mockTracer.startSpan).mockReturnValue(mockSpan);
      const parentSpan = {} as any;
      vi.mocked(context.active).mockClear();
      vi.mocked(trace.setSpan).mockClear();

      const manager = new TracerManager();
      manager.startChildSpan(parentSpan, 'child-span');

      expect(trace.setSpan).toHaveBeenCalled();
      expect(mockTracer.startSpan).toHaveBeenCalledWith('child-span', undefined, expect.anything());
    });
  });

  describe('withSpan', () => {
    it('should execute function within span context', () => {
      const span = {} as any;
      vi.mocked(context.active).mockClear();
      vi.mocked(trace.setSpan).mockClear();
      const fn = vi.fn(() => 'result');

      const manager = new TracerManager();
      const result = manager.withSpan(span, fn);

      expect(context.with).toHaveBeenCalled();
      expect(fn).toHaveBeenCalled();
      expect(result).toBe('result');
    });
  });

  describe('withSpanAsync', () => {
    it('should execute async function within span context', async () => {
      const span = {} as any;
      vi.mocked(context.active).mockClear();
      vi.mocked(trace.setSpan).mockClear();
      const fn = vi.fn(async () => 'async-result');

      const manager = new TracerManager();
      const result = await manager.withSpanAsync(span, fn);

      expect(context.with).toHaveBeenCalled();
      expect(result).toBe('async-result');
    });
  });

  describe('getCurrentSpan', () => {
    it('should return current span from context', () => {
      const mockSpan = {} as any;
      vi.mocked(trace.getSpan).mockReturnValue(mockSpan);
      vi.mocked(context.active).mockClear();

      const manager = new TracerManager();
      const span = manager.getCurrentSpan();

      expect(trace.getSpan).toHaveBeenCalled();
      expect(span).toBe(mockSpan);
    });

    it('should return undefined when no span in context', () => {
      vi.mocked(trace.getSpan).mockReturnValue(undefined);
      vi.mocked(context.active).mockClear();

      const manager = new TracerManager();
      const span = manager.getCurrentSpan();

      expect(span).toBeUndefined();
    });
  });

  describe('getCurrentContext', () => {
    it('should return active context', () => {
      const mockContext = { key: 'value' } as any;
      vi.mocked(context.active).mockReturnValue(mockContext);

      const manager = new TracerManager();
      const ctx = manager.getCurrentContext();

      expect(ctx).toBe(mockContext);
    });
  });

  describe('setActiveSpan', () => {
    it('should set span as active and return context', () => {
      const span = {} as any;
      vi.mocked(context.active).mockClear();
      vi.mocked(trace.setSpan).mockReturnValue({ key: 'ctx' } as any);

      const manager = new TracerManager();
      const ctx = manager.setActiveSpan(span);

      expect(trace.setSpan).toHaveBeenCalled();
      expect(ctx).toEqual({ key: 'ctx' });
    });
  });

  describe('inject', () => {
    it('should inject trace context into headers', () => {
      const headers: Record<string, string> = {};
      vi.mocked(context.active).mockClear();

      const manager = new TracerManager();
      manager.inject(headers);

      expect(propagation.inject).toHaveBeenCalled();
    });
  });

  describe('extract', () => {
    it('should extract trace context from headers', () => {
      const headers = { traceparent: '00-abc-def-01' };
      vi.mocked(context.active).mockClear();
      vi.mocked(propagation.extract).mockReturnValue({ extracted: true } as any);

      const manager = new TracerManager();
      const ctx = manager.extract(headers);

      expect(propagation.extract).toHaveBeenCalled();
      expect(ctx).toEqual({ extracted: true });
    });
  });

  describe('withAutoEndSpan', () => {
    it('should create span, execute function, and end span on success', async () => {
      const mockSpan = {
        end: vi.fn(),
        recordException: vi.fn(),
        setStatus: vi.fn(),
      } as any;
      vi.mocked(mockTracer.startSpan).mockReturnValue(mockSpan);
      vi.mocked(context.active).mockClear();
      vi.mocked(trace.setSpan).mockClear();
      const fn = vi.fn(async () => 'success');

      const manager = new TracerManager();
      const result = await manager.withAutoEndSpan('test-span', fn);

      expect(mockTracer.startSpan).toHaveBeenCalledWith('test-span', undefined);
      expect(fn).toHaveBeenCalled();
      expect(result).toBe('success');
      expect(mockSpan.end).toHaveBeenCalled();
      expect(mockSpan.recordException).not.toHaveBeenCalled();
    });

    it('should record exception and end span on error', async () => {
      const mockSpan = {
        end: vi.fn(),
        recordException: vi.fn(),
        setStatus: vi.fn(),
      } as any;
      vi.mocked(mockTracer.startSpan).mockReturnValue(mockSpan);
      vi.mocked(context.active).mockClear();
      vi.mocked(trace.setSpan).mockClear();
      const error = new Error('test error');
      const fn = vi.fn(async () => {
        throw error;
      });

      const manager = new TracerManager();

      await expect(manager.withAutoEndSpan('test-span', fn)).rejects.toThrow('test error');
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 2, message: 'test error' });
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('withAutoEndSpanSync', () => {
    it('should create span, execute function, and end span on success', () => {
      const mockSpan = {
        end: vi.fn(),
        recordException: vi.fn(),
        setStatus: vi.fn(),
      } as any;
      vi.mocked(mockTracer.startSpan).mockReturnValue(mockSpan);
      vi.mocked(context.active).mockClear();
      vi.mocked(trace.setSpan).mockClear();
      const fn = vi.fn(() => 'success');

      const manager = new TracerManager();
      const result = manager.withAutoEndSpanSync('test-span', fn);

      expect(result).toBe('success');
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should record exception and end span on error', () => {
      const mockSpan = {
        end: vi.fn(),
        recordException: vi.fn(),
        setStatus: vi.fn(),
      } as any;
      vi.mocked(mockTracer.startSpan).mockReturnValue(mockSpan);
      vi.mocked(context.active).mockClear();
      vi.mocked(trace.setSpan).mockClear();
      const error = new Error('sync error');
      const fn = vi.fn(() => {
        throw error;
      });

      const manager = new TracerManager();

      expect(() => manager.withAutoEndSpanSync('test-span', fn)).toThrow('sync error');
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset the tracer', () => {
      const manager = new TracerManager();
      manager.getTracer();
      manager.reset();
      manager.getTracer();

      expect(trace.getTracer).toHaveBeenCalledTimes(2);
    });
  });
});

describe('getDefaultTracerManager', () => {
  it('should return singleton instance', () => {
    const instance1 = getDefaultTracerManager();
    const instance2 = getDefaultTracerManager();

    expect(instance1).toBe(instance2);
  });

  it('should create instance on first call', () => {
    const instance = getDefaultTracerManager();
    expect(instance).toBeInstanceOf(TracerManager);
  });
});
