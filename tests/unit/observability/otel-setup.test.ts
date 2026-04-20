/**
 * Unit tests for OTel SDK setup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initOTelSDK,
  startOTelSDK,
  shutdownOTelSDK,
} from '../../../src/observability/otel-setup.js';

const mockStart = vi.fn();
const mockShutdown = vi.fn();

vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: vi.fn().mockImplementation(() => ({
    start: mockStart,
    shutdown: mockShutdown,
  })),
}));

const originalEnv = process.env;

describe('initOTelSDK', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should initialize SDK with default config', () => {
    const sdk = initOTelSDK();
    expect(sdk).toBeDefined();
  });

  it('should accept custom service name', () => {
    const sdk = initOTelSDK({ serviceName: 'my-service' });
    expect(sdk).toBeDefined();
  });

  it('should accept custom service version', () => {
    const sdk = initOTelSDK({ serviceVersion: '2.0.0' });
    expect(sdk).toBeDefined();
  });

  it('should accept custom OTLP endpoint', () => {
    const sdk = initOTelSDK({ otlpEndpoint: 'http://collector:4318/v1/traces' });
    expect(sdk).toBeDefined();
  });

  it('should use OTEL_EXPORTER_OTLP_ENDPOINT env var when available', () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://env-collector:4318/v1/traces';
    const sdk = initOTelSDK();
    expect(sdk).toBeDefined();
  });

  it('should accept additional resources', () => {
    const sdk = initOTelSDK({
      additionalResources: {
        'deployment.environment': 'production',
      },
    });
    expect(sdk).toBeDefined();
  });

  it('should return NodeSDK instance', () => {
    const sdk = initOTelSDK();
    expect(sdk.start).toBeDefined();
    expect(sdk.shutdown).toBeDefined();
  });
});

describe('startOTelSDK', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  });

  it('should initialize and start the SDK', async () => {
    mockStart.mockResolvedValue(undefined);

    const sdk = await startOTelSDK();

    expect(sdk).toBeDefined();
    expect(mockStart).toHaveBeenCalled();
  });

  it('should accept custom config', async () => {
    mockStart.mockResolvedValue(undefined);

    const sdk = await startOTelSDK({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
    });

    expect(sdk).toBeDefined();
    expect(mockStart).toHaveBeenCalled();
  });

  it('should throw if start fails', async () => {
    mockStart.mockRejectedValue(new Error('Failed to start'));

    await expect(startOTelSDK()).rejects.toThrow('Failed to start');
  });
});

describe('shutdownOTelSDK', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should shutdown the SDK', async () => {
    mockShutdown.mockResolvedValue(undefined);
    const sdk = initOTelSDK();

    await shutdownOTelSDK(sdk);

    expect(mockShutdown).toHaveBeenCalled();
  });

  it('should throw if shutdown fails', async () => {
    mockShutdown.mockRejectedValue(new Error('Failed to shutdown'));
    const sdk = initOTelSDK();

    await expect(shutdownOTelSDK(sdk)).rejects.toThrow('Failed to shutdown');
  });
});
