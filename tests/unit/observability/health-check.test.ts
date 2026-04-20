/**
 * Unit tests for health check
 */

import { describe, it, expect, vi } from 'vitest';
import {
  performHealthCheck,
  createHealthCheckHandler,
} from '../../../src/observability/health-check.js';

describe('performHealthCheck', () => {
  it('should return healthy status when all checks pass', async () => {
    const result = await performHealthCheck();

    expect(result.healthy).toBe(true);
    expect(result.timestamp).toBeDefined();
    expect(result.components).toBeDefined();
    expect(result.components.otelSDK).toBeDefined();
    expect(result.components.memory).toBeDefined();
  });

  it('should check OTel SDK health by default', async () => {
    const result = await performHealthCheck();
    const otelSDK = result.components.otelSDK;
    expect(otelSDK?.healthy).toBe(true);
  });

  it('should skip OTel SDK check when disabled', async () => {
    const result = await performHealthCheck({ checkOTelSDK: false });

    expect(result.components.otelSDK).toBeUndefined();
  });

  it('should check memory usage', async () => {
    const result = await performHealthCheck();

    const memory = result.components.memory;
    expect(memory?.healthy).toBe(true);
    expect(memory?.metadata).toBeDefined();
    expect(typeof memory?.metadata?.heapUsed).toBe('number');
    expect(typeof memory?.metadata?.heapTotal).toBe('number');
    expect(typeof memory?.metadata?.rss).toBe('number');
    expect(typeof memory?.metadata?.threshold).toBe('number');
  });

  it('should respect memory threshold', async () => {
    const result = await performHealthCheck({ memoryThresholdMB: 1 });

    const memory = result.components.memory;
    expect(memory?.healthy).toBe(false);
  });

  it('should return unhealthy when any component fails', async () => {
    const result = await performHealthCheck({ memoryThresholdMB: 1 });

    expect(result.healthy).toBe(false);
  });

  it('should return ISO timestamp', async () => {
    const result = await performHealthCheck();

    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should handle OTel SDK errors', async () => {
    const result = await performHealthCheck();

    expect(result.components.otelSDK).toBeDefined();
    const otelSDK = result.components.otelSDK;
    if (otelSDK && !otelSDK.healthy) {
      expect(otelSDK.error).toBeDefined();
    }
  });
});

describe('createHealthCheckHandler', () => {
  it('should create a handler function', () => {
    const handler = createHealthCheckHandler();
    expect(typeof handler).toBe('function');
  });

  it('should return 200 when healthy', async () => {
    const handler = createHealthCheckHandler();
    const res = {
      statusCode: 200,
      end: vi.fn(),
      setHeader: vi.fn(),
    };

    await handler({}, res as any);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.end).toHaveBeenCalled();

    const body = JSON.parse((res.end as any).mock.calls[0][0]);
    expect(body.healthy).toBe(true);
  });

  it('should return 503 when unhealthy', async () => {
    const handler = createHealthCheckHandler({ memoryThresholdMB: 1 });
    const res = {
      statusCode: 200,
      end: vi.fn(),
      setHeader: vi.fn(),
    };

    await handler({}, res as any);

    expect(res.statusCode).toBe(503);
    expect(res.end).toHaveBeenCalled();
  });

  it('should accept custom config', async () => {
    const handler = createHealthCheckHandler({
      checkOTelSDK: false,
      memoryThresholdMB: 1024,
    });
    const res = {
      statusCode: 200,
      end: vi.fn(),
      setHeader: vi.fn(),
    };

    await handler({}, res as any);

    expect(res.statusCode).toBe(200);
  });

  it('should return JSON body with health check result', async () => {
    const handler = createHealthCheckHandler();
    const res = {
      statusCode: 200,
      end: vi.fn(),
      setHeader: vi.fn(),
    };

    await handler({}, res as any);

    const body = JSON.parse((res.end as any).mock.calls[0][0]);
    expect(body).toHaveProperty('healthy');
    expect(body).toHaveProperty('components');
    expect(body).toHaveProperty('timestamp');
  });
});
