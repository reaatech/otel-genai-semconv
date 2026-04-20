/**
 * Unit tests for logger
 */

import { describe, it, expect } from 'vitest';
import {
  createLogger,
  logGenAIEvent,
  logger,
  LogContext,
} from '../../../src/observability/logger.js';

describe('logger singleton', () => {
  it('should have valid logger singleton', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should be able to log with the singleton', () => {
    expect(() => {
      logger.info('test message');
    }).not.toThrow();
  });
});

describe('createLogger', () => {
  it('should create a pino logger', () => {
    const log = createLogger();
    expect(log).toBeDefined();
    expect(typeof log.info).toBe('function');
  });

  it('should accept custom log level', () => {
    const log = createLogger({ level: 'debug' });
    expect(log).toBeDefined();
    expect(typeof log.debug).toBe('function');
  });

  it('should accept custom service name', () => {
    const log = createLogger({ serviceName: 'my-service' });
    expect(log).toBeDefined();
  });
});

describe('logGenAIEvent', () => {
  it('should call logger info when level is info', () => {
    const originalInfo = logger.info.bind(logger);
    let called = false;
    (logger as any).info = (msg: string, ...args: any[]) => {
      called = true;
      return originalInfo(msg, ...args);
    };

    logGenAIEvent(logger, 'info', 'Test message');

    logger.info = originalInfo;
    expect(called).toBe(true);
  });

  it('should call logger warn when level is warn', () => {
    const originalWarn = logger.warn.bind(logger);
    let called = false;
    (logger as any).warn = (msg: string, ...args: any[]) => {
      called = true;
      return originalWarn(msg, ...args);
    };

    logGenAIEvent(logger, 'warn', 'Test warning');

    logger.warn = originalWarn;
    expect(called).toBe(true);
  });

  it('should call logger error when level is error', () => {
    const originalError = logger.error.bind(logger);
    let called = false;
    (logger as any).error = (msg: string, ...args: any[]) => {
      called = true;
      return originalError(msg, ...args);
    };

    logGenAIEvent(logger, 'error', 'Test error');

    logger.error = originalError;
    expect(called).toBe(true);
  });

  it('should call logger debug when level is debug', () => {
    const originalDebug = logger.debug.bind(logger);
    let called = false;
    (logger as any).debug = (msg: string, ...args: any[]) => {
      called = true;
      return originalDebug(msg, ...args);
    };

    logGenAIEvent(logger, 'debug', 'Test debug');

    logger.debug = originalDebug;
    expect(called).toBe(true);
  });

  it('should include context in log', () => {
    const originalInfo = logger.info.bind(logger);
    let capturedContext: any;
    (logger as any).info = (ctx: any, ...args: any[]) => {
      capturedContext = ctx;
      return originalInfo(ctx, ...args);
    };

    const context: LogContext = {
      traceId: 'abc123',
      provider: 'openai',
      model: 'gpt-4',
    };
    logGenAIEvent(logger, 'info', 'LLM request completed', context);

    logger.info = originalInfo;
    expect(capturedContext).toEqual(context);
  });

  it('should work with empty context', () => {
    const originalInfo = logger.info.bind(logger);
    let called = false;
    (logger as any).info = (msg: string, ...args: any[]) => {
      called = true;
      return originalInfo(msg, ...args);
    };

    logGenAIEvent(logger, 'info', 'Test message', {});

    logger.info = originalInfo;
    expect(called).toBe(true);
  });

  it('should include span context', () => {
    const originalInfo = logger.info.bind(logger);
    let capturedContext: any;
    (logger as any).info = (ctx: any, ...args: any[]) => {
      capturedContext = ctx;
      return originalInfo(ctx, ...args);
    };

    const context: LogContext = {
      traceId: 'trace-123',
      spanId: 'span-456',
    };
    logGenAIEvent(logger, 'info', 'Test with span', context);

    logger.info = originalInfo;
    expect(capturedContext).toEqual(context);
  });

  it('should include error message', () => {
    const originalError = logger.error.bind(logger);
    let capturedContext: any;
    (logger as any).error = (ctx: any, ...args: any[]) => {
      capturedContext = ctx;
      return originalError(ctx, ...args);
    };

    logGenAIEvent(logger, 'error', 'Request failed', { error: 'Rate limit exceeded' });

    logger.error = originalError;
    expect(capturedContext).toEqual({ error: 'Rate limit exceeded' });
  });
});
