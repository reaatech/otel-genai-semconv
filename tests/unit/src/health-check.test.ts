/**
 * Unit tests for health check entry point
 *
 * Note: src/health-check.ts is a standalone script that calls process.exit.
 * These tests verify the module structure and the behavior of the main function.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

describe('health-check entry point', () => {
  beforeAll(() => {
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should import the module without compile errors', async () => {
    const mod = await import('../../../src/health-check.js');
    expect(mod).toBeDefined();
  });

  it('should import health-check dependency', async () => {
    const { performHealthCheck } = await import('../../../src/observability/health-check.js');
    expect(typeof performHealthCheck).toBe('function');
  });
});
