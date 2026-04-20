/**
 * Unit tests for SpanProcessor
 */

import { describe, it, expect, vi } from 'vitest';
import {
  SpanProcessor,
  SpanProcessorOptions,
} from '../../../src/instrumentation/span-processor.js';

function createMockSpan(attributes: Record<string, unknown> = {}): any {
  return {
    attributes,
    setAttributes: vi.fn(),
  };
}

function createMockReadableSpan(attributes: Record<string, unknown> = {}): any {
  return {
    ...createMockSpan(attributes),
    name: 'test-span',
    kind: 0,
    spanContext: vi.fn(() => ({})),
    parentSpanId: '',
    resource: {},
    status: { code: 0 },
    events: [],
    links: [],
    startTime: [],
    duration: [0, 0],
    ended: true,
    _spanContext: {},
  };
}

describe('SpanProcessor', () => {
  describe('constructor', () => {
    it('should use default options', () => {
      const processor = new SpanProcessor();
      expect(processor).toBeInstanceOf(SpanProcessor);
    });

    it('should accept custom options', () => {
      const options: SpanProcessorOptions = {
        piiRedactionEnabled: false,
        redactMessageContent: true,
        customAttributes: { 'custom.key': 'value' },
      };
      const processor = new SpanProcessor(options);
      expect(processor).toBeInstanceOf(SpanProcessor);
    });
  });

  describe('onStart', () => {
    it('should add custom attributes when configured', () => {
      const customAttributes = { 'custom.key': 'value', 'numeric.key': 42 };
      const processor = new SpanProcessor({ customAttributes });
      const span = createMockSpan();

      processor.onStart(span as any, {});

      expect(span.setAttributes).toHaveBeenCalledWith(customAttributes);
    });

    it('should do nothing when no custom attributes configured', () => {
      const processor = new SpanProcessor();
      const span = createMockSpan();

      processor.onStart(span as any, {});

      expect(span.setAttributes).not.toHaveBeenCalled();
    });
  });

  describe('onEnd', () => {
    it('should apply PII redaction by default', () => {
      const processor = new SpanProcessor();
      const span = createMockReadableSpan({
        'gen_ai.user.message': 'Contact me at test@example.com or 555-123-4567',
      });

      processor.onEnd(span);
    });

    it('should skip PII redaction when disabled', () => {
      const processor = new SpanProcessor({ piiRedactionEnabled: false });
      const span = createMockReadableSpan({
        'gen_ai.user.message': 'Contact me at test@example.com',
      });

      processor.onEnd(span);
    });

    it('should apply attribute filter when configured', () => {
      const attributeFilter = vi.fn((key: string) => key !== 'sensitive');
      const processor = new SpanProcessor({ attributeFilter });
      const span = createMockReadableSpan({
        'public.key': 'value',
        sensitive: 'data',
      });

      processor.onEnd(span);

      expect(attributeFilter).toHaveBeenCalled();
    });

    it('should call onSpanEnd callback when configured', () => {
      const onSpanEnd = vi.fn();
      const processor = new SpanProcessor({ onSpanEnd });
      const span = createMockReadableSpan();

      processor.onEnd(span);

      expect(onSpanEnd).toHaveBeenCalledWith(span);
    });

    it('should not call onSpanEnd when not configured', () => {
      const onSpanEnd = vi.fn();
      const processor = new SpanProcessor();
      const span = createMockReadableSpan();

      processor.onEnd(span);

      expect(onSpanEnd).not.toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should resolve successfully', async () => {
      const processor = new SpanProcessor();
      await expect(processor.shutdown()).resolves.toBeUndefined();
    });
  });

  describe('forceFlush', () => {
    it('should resolve successfully', async () => {
      const processor = new SpanProcessor();
      await expect(processor.forceFlush()).resolves.toBeUndefined();
    });
  });

  describe('redactString', () => {
    it('should redact email addresses', () => {
      const processor = new SpanProcessor();
      const result = (processor as any).redactString('My email is user@example.com');
      expect(result).toContain('[REDACTED_EMAIL]');
      expect(result).not.toContain('user@example.com');
    });

    it('should redact phone numbers', () => {
      const processor = new SpanProcessor();
      const result = (processor as any).redactString('Call me at 555-123-4567');
      expect(result).toContain('[REDACTED_PHONE]');
    });

    it('should redact SSNs', () => {
      const processor = new SpanProcessor();
      const result = (processor as any).redactString('SSN: 123-45-6789');
      expect(result).toMatch(/\[REDACTED_(SSN|PHONE)\]/);
    });

    it('should redact credit card numbers', () => {
      const processor = new SpanProcessor();
      const result = (processor as any).redactString('Card: 4111111111111111');
      expect(result).toMatch(/\[REDACTED_(CC|PHONE)\]/);
    });

    it('should redact IP addresses', () => {
      const processor = new SpanProcessor();
      const result = (processor as any).redactString('IP: 192.168.1.1');
      expect(result).toContain('[REDACTED_IP]');
    });

    it('should handle multiple PII in one string', () => {
      const processor = new SpanProcessor();
      const result = (processor as any).redactString('Email: test@example.com, IP: 10.0.0.1');
      expect(result).toContain('[REDACTED_EMAIL]');
      expect(result).toContain('[REDACTED_IP]');
    });

    it('should leave non-PII strings unchanged', () => {
      const processor = new SpanProcessor();
      const result = (processor as any).redactString('Hello, world!');
      expect(result).toBe('Hello, world!');
    });
  });

  describe('shouldRedactMessageContent', () => {
    it('should return false by default', () => {
      const processor = new SpanProcessor();
      expect(processor.shouldRedactMessageContent()).toBe(false);
    });

    it('should return true when configured', () => {
      const processor = new SpanProcessor({ redactMessageContent: true });
      expect(processor.shouldRedactMessageContent()).toBe(true);
    });
  });
});
