import type { Attributes } from '@opentelemetry/api';
import type {
  SpanProcessor as OTelSpanProcessor,
  ReadableSpan,
  Span,
} from '@opentelemetry/sdk-trace-base';

export interface SpanProcessorOptions {
  piiRedactionEnabled?: boolean;
  redactMessageContent?: boolean;
  customAttributes?: Record<string, string | number | boolean>;
  attributeFilter?: (key: string, value: unknown) => boolean;
  onSpanStart?: (span: ReadableSpan) => void;
  onSpanEnd?: (span: ReadableSpan) => void;
}

const PII_PATTERNS = [
  { pattern: /[\w.-]+@[\w.-]+\.\w+/g, replacement: '[REDACTED_EMAIL]' },
  { pattern: /\+?[\d\s-()]{10,}/g, replacement: '[REDACTED_PHONE]' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED_SSN]' },
  { pattern: /\b\d{13,19}\b/g, replacement: '[REDACTED_CC]' },
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[REDACTED_IP]' },
];

export class SpanProcessor implements OTelSpanProcessor {
  private readonly options: SpanProcessorOptions;

  constructor(options: SpanProcessorOptions = {}) {
    this.options = {
      piiRedactionEnabled: true,
      redactMessageContent: false,
      ...options,
    };
  }

  onStart(span: Span, _parentContext: unknown): void {
    if (this.options.customAttributes) {
      span.setAttributes(this.options.customAttributes);
    }
  }

  onEnd(span: ReadableSpan): void {
    if (this.options.attributeFilter) {
      this.filterAttributes(span);
    }

    if (this.options.piiRedactionEnabled) {
      this.redactPII(span);
    }

    if (this.options.onSpanEnd) {
      this.options.onSpanEnd(span);
    }
  }

  async shutdown(): Promise<void> {}

  async forceFlush(): Promise<void> {}

  private filterAttributes(span: ReadableSpan): Attributes {
    const filteredAttributes: Attributes = {};

    for (const [key, value] of Object.entries(span.attributes)) {
      if (this.options.attributeFilter?.(key, value) !== false) {
        filteredAttributes[key] = value;
      }
    }

    return filteredAttributes;
  }

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

  private redactString(text: string): string {
    let redacted = text;

    for (const { pattern, replacement } of PII_PATTERNS) {
      redacted = redacted.replace(pattern, replacement);
    }

    return redacted;
  }

  shouldRedactMessageContent(): boolean {
    return this.options.redactMessageContent === true;
  }
}
