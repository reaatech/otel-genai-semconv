/**
 * Structured logging for GenAI instrumentation
 */

import pino from 'pino';
import type { Logger, LoggerOptions } from 'pino';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Log level */
  level?: string;
  /** Pretty print */
  prettyPrint?: boolean;
  /** Service name */
  serviceName?: string;
}

/**
 * Create a structured logger for GenAI instrumentation
 */
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

/**
 * Log context for GenAI events
 */
export interface LogContext {
  /** Trace ID */
  traceId?: string;
  /** Span ID */
  spanId?: string;
  /** Provider */
  provider?: string;
  /** Model */
  model?: string;
  /** Input tokens */
  inputTokens?: number;
  /** Output tokens */
  outputTokens?: number;
  /** Cost in USD */
  costUsd?: number;
  /** Duration in ms */
  durationMs?: number;
  /** Error message */
  error?: string;
  /** Additional context */
  [key: string]: unknown;
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Log a GenAI event with context
 */
export function logGenAIEvent(
  logger: Logger,
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  context: LogContext = {},
): void {
  const logFn = logger[level] || logger.info;
  logFn(context, message);
}
