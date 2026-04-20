/**
 * Health check for GenAI instrumentation
 */

import { trace } from '@opentelemetry/api';

/**
 * Health check result
 */
export interface HealthCheckResult {
  /** Overall health status */
  healthy: boolean;
  /** Component health status */
  components: Record<string, ComponentHealth>;
  /** Timestamp */
  timestamp: string;
}

/**
 * Component health status
 */
export interface ComponentHealth {
  /** Component is healthy */
  healthy: boolean;
  /** Error message if unhealthy */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Check OTel SDK health */
  checkOTelSDK?: boolean;
  /** Check exporter connectivity */
  checkExporterConnectivity?: boolean;
  /** Memory threshold in MB */
  memoryThresholdMB?: number;
}

/**
 * Perform a health check
 */
export async function performHealthCheck(
  config: HealthCheckConfig = {},
): Promise<HealthCheckResult> {
  const { checkOTelSDK = true, memoryThresholdMB = 512 } = config;

  const components: Record<string, ComponentHealth> = {};

  // Check OTel SDK health
  if (checkOTelSDK) {
    try {
      const tracer = trace.getTracer('health-check');
      const span = tracer.startSpan('health-check');
      span.end();
      components.otelSDK = { healthy: true };
    } catch (error) {
      components.otelSDK = {
        healthy: false,
        error: (error as Error).message,
      };
    }
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
  components.memory = {
    healthy: memoryMB < memoryThresholdMB,
    metadata: {
      heapUsed: Math.round(memoryMB),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      threshold: memoryThresholdMB,
    },
  };

  // Overall health
  const healthy = Object.values(components).every((c) => c.healthy);

  return {
    healthy,
    components,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a health check endpoint handler
 */
export function createHealthCheckHandler(config?: HealthCheckConfig) {
  return async (
    _req: unknown,
    res: {
      statusCode: number;
      end: (body?: string) => void;
      setHeader: (key: string, value: string) => void;
    },
  ) => {
    const result = await performHealthCheck(config);

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = result.healthy ? 200 : 503;
    res.end(JSON.stringify(result, null, 2));
  };
}
