import pino from 'pino';
import type { Logger, LoggerOptions } from 'pino';

export interface LoggerConfig {
  level?: string;
  prettyPrint?: boolean;
  serviceName?: string;
}

export function createLogger(config: LoggerConfig = {}): Logger {
  const {
    level = process.env.LOG_LEVEL ?? 'info',
    prettyPrint = process.env.NODE_ENV !== 'production',
    serviceName = 'otel-genai-semconv',
  } = config;

  const options: LoggerOptions = {
    level,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    base: {
      service: serviceName,
    },
  };

  if (prettyPrint) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
      },
    };
  }

  return pino(options);
}

export interface LogContext {
  traceId?: string;
  spanId?: string;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  durationMs?: number;
  error?: string;
  [key: string]: unknown;
}

export const logger = createLogger();

export function logGenAIEvent(
  logger: Logger,
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  context: LogContext = {},
): void {
  const logFn = logger[level] || logger.info;
  logFn(context, message);
}
