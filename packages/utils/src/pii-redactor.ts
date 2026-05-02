export interface PIIPattern {
  pattern: RegExp;
  replacement: string;
  description?: string;
}

export interface PIIRedactionOptions {
  enabled?: boolean;
  redactMessageContent?: boolean;
  hashInsteadOfRedact?: boolean;
  customPatterns?: PIIPattern[];
  excludePatterns?: string[];
}

const DEFAULT_PATTERNS: PIIPattern[] = [
  {
    pattern: /[\w.-]+@[\w.-]+\.\w+/g,
    replacement: '[REDACTED_EMAIL]',
    description: 'Email addresses',
  },
  {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[REDACTED_SSN]',
    description: 'US Social Security Numbers',
  },
  {
    pattern: /\b\d{13,19}\b/g,
    replacement: '[REDACTED_CC]',
    description: 'Credit card numbers',
  },
  {
    pattern: /\+?[\d\s-()]{10,}/g,
    replacement: '[REDACTED_PHONE]',
    description: 'Phone numbers',
  },
  {
    pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    replacement: '[REDACTED_IP]',
    description: 'IP addresses',
  },
];

export class PIIRedactor {
  private readonly options: PIIRedactionOptions;
  private readonly patterns: PIIPattern[];
  private readonly excludedPatterns: Set<string>;

  constructor(options: PIIRedactionOptions = {}) {
    this.options = {
      enabled: true,
      redactMessageContent: false,
      hashInsteadOfRedact: false,
      ...options,
    };

    this.patterns = [...DEFAULT_PATTERNS];
    if (options.customPatterns) {
      this.patterns.push(...options.customPatterns);
    }

    this.excludedPatterns = new Set(options.excludePatterns ?? []);
  }

  redact(text: string): string {
    if (!this.options.enabled || !text) {
      return text;
    }

    let redacted = text;

    for (const pattern of this.patterns) {
      if (this.excludedPatterns.has(pattern.description ?? '')) {
        continue;
      }

      if (this.options.hashInsteadOfRedact) {
        redacted = redacted.replace(pattern.pattern, (match) => {
          return this.hashValue(match);
        });
      } else {
        redacted = redacted.replace(pattern.pattern, pattern.replacement);
      }
    }

    return redacted;
  }

  redactObject<T>(obj: T): T {
    if (!this.options.enabled || !obj) {
      return obj;
    }

    return this.redactDeep(obj) as T;
  }

  containsPII(text: string): boolean {
    if (!this.options.enabled || !text) {
      return false;
    }

    for (const pattern of this.patterns) {
      if (this.excludedPatterns.has(pattern.description ?? '')) {
        continue;
      }

      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags.replace('g', ''));
      if (regex.test(text)) {
        return true;
      }
    }

    return false;
  }

  detectPIITypes(text: string): string[] {
    if (!this.options.enabled || !text) {
      return [];
    }

    const types: string[] = [];

    for (const pattern of this.patterns) {
      if (this.excludedPatterns.has(pattern.description ?? '')) {
        continue;
      }

      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags.replace('g', ''));
      if (regex.test(text)) {
        types.push(pattern.description ?? 'unknown');
      }
    }

    return types;
  }

  shouldRedactMessageContent(): boolean {
    return this.options.redactMessageContent === true;
  }

  isEnabled(): boolean {
    return this.options.enabled === true;
  }

  addPattern(pattern: PIIPattern): void {
    this.patterns.push(pattern);
  }

  removePattern(description: string): boolean {
    const index = this.patterns.findIndex((p) => p.description === description);
    if (index !== -1) {
      this.patterns.splice(index, 1);
      return true;
    }
    return false;
  }

  excludePattern(description: string): void {
    this.excludedPatterns.add(description);
  }

  includePattern(description: string): void {
    this.excludedPatterns.delete(description);
  }

  private hashValue(value: string): string {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    hash >>>= 0;
    return `[HASHED_${hash.toString(16).padStart(8, '0')}]`;
  }

  private redactDeep(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.redact(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.redactDeep(item));
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        result[key] = this.redactDeep(val);
      }
      return result;
    }

    return value;
  }
}

let defaultPIIRedactor: PIIRedactor | null = null;

export function getDefaultPIIRedactor(): PIIRedactor {
  defaultPIIRedactor ??= new PIIRedactor();
  return defaultPIIRedactor;
}
