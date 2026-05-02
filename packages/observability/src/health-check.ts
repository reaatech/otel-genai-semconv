import { trace } from '@opentelemetry/api';

export interface HealthCheckResult {
  healthy: boolean;
  components: Record<string, ComponentHealth>;
  timestamp: string;
}

export interface ComponentHealth {
  healthy: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface HealthCheckConfig {
  checkOTelSDK?: boolean;
  checkExporterConnectivity?: boolean;
  memoryThresholdMB?: number;
}

export async function performHealthCheck(
  config: HealthCheckConfig = {},
): Promise<HealthCheckResult> {
  const { checkOTelSDK = true, memoryThresholdMB = 512 } = config;

  const components: Record<string, ComponentHealth> = {};

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

  const healthy = Object.values(components).every((c) => c.healthy);

  return {
    healthy,
    components,
    timestamp: new Date().toISOString(),
  };
}

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
