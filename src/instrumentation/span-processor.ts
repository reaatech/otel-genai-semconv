/**
 * Custom span processor for GenAI spans
 */

import {
  ReadableSpan,
  Span,
  SpanProcessor as OTelSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import type { Attributes } from '@opentelemetry/api';

/**
 * Options for the span processor
 */
export interface SpanProcessorOptions {
  /** Whether to enable PII redaction */
  piiRedactionEnabled?: boolean;
  /** Whether to redact message content */
  redactMessageContent?: boolean;
  /** Custom attributes to add to all spans */
  customAttributes?: Record<string, string | number | boolean>;
  /** Attribute filter function */
  attributeFilter?: (key: string, value: unknown) => boolean;
  /** Callback when span starts */
  onSpanStart?: (span: ReadableSpan) => void;
  /** Callback when span ends */
  onSpanEnd?: (span: ReadableSpan) => void;
}

/**
 * PII patterns to detect and redact
 */
const PII_PATTERNS = [
  // Email addresses
  { pattern: /[\w.-]+@[\w.-]+\.\w+/g, replacement: '[REDACTED_EMAIL]' },
  // Phone numbers (various formats)
  { pattern: /\+?[\d\s-()]{10,}/g, replacement: '[REDACTED_PHONE]' },
  // SSN
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED_SSN]' },
  // Credit card numbers
  { pattern: /\b\d{13,19}\b/g, replacement: '[REDACTED_CC]' },
  // IP addresses
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[REDACTED_IP]' },
];

/**
 * Custom span processor for GenAI instrumentation
 */
export class SpanProcessor implements OTelSpanProcessor {
  private readonly options: SpanProcessorOptions;

  constructor(options: SpanProcessorOptions = {}) {
    this.options = {
      piiRedactionEnabled: true,
      redactMessageContent: false,
      ...options,
    };
  }

  /**
   * Called when a span is started
   */
  onStart(span: Span, _parentContext: unknown): void {
    // Add custom attributes if configured
    if (this.options.customAttributes) {
      span.setAttributes(this.options.customAttributes);
    }
  }

  /**
   * Called when a span ends
   */
  onEnd(span: ReadableSpan): void {
    // Apply attribute filter if configured
    if (this.options.attributeFilter) {
      this.filterAttributes(span);
    }

    // Apply PII redaction if enabled
    if (this.options.piiRedactionEnabled) {
      this.redactPII(span);
    }

    // Call onSpanEnd callback if configured
    if (this.options.onSpanEnd) {
      this.options.onSpanEnd(span);
    }
  }

  /**
   * Shutdown the processor
   */
  async shutdown(): Promise<void> {
    // No cleanup needed
  }

  /**
   * Force flush any pending operations
   */
  async forceFlush(): Promise<void> {
    // No pending operations
  }

  /**
   * Filter attributes based on the configured filter function
   */
  private filterAttributes(span: ReadableSpan): Attributes {
    const filteredAttributes: Attributes = {};

    for (const [key, value] of Object.entries(span.attributes)) {
      if (this.options.attributeFilter?.(key, value) !== false) {
        filteredAttributes[key] = value;
      }
    }

    return filteredAttributes;
  }

  /**
   * Redact PII from span attributes
   */
  private redactPII(span: ReadableSpan): Attributes {
    const redactedAttributes: Attributes = {};

    for (const [key, value] of Object.entries(span.attributes)) {
      if (typeof value === 'string') {
        redactedAttributes[key] = this.redactString(value);
      } else {
        redactedAttributes[key] = value;
      }
    }

    return redactedAttributes;
  }

  /**
   * Redact PII from a string
   */
  private redactString(text: string): string {
    let redacted = text;

    for (const { pattern, replacement } of PII_PATTERNS) {
      redacted = redacted.replace(pattern, replacement);
    }

    return redacted;
  }

  /**
   * Redact message content if configured
   */
  shouldRedactMessageContent(): boolean {
    return this.options.redactMessageContent === true;
  }
}
