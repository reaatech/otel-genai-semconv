import { describe, it, expect } from 'vitest';
import { createLogger } from '../src/index.js';

describe('createLogger', () => {
  it('should create a logger with defaults', () => {
    const logger = createLogger({ level: 'error' });
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });
});
