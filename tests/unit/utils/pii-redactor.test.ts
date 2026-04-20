/**
 * Unit tests for PIIRedactor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PIIRedactor, getDefaultPIIRedactor } from '../../../src/utils/pii-redactor.js';

describe('PIIRedactor', () => {
  let redactor: PIIRedactor;

  beforeEach(() => {
    redactor = new PIIRedactor();
  });

  describe('redact', () => {
    it('should redact email addresses', () => {
      const result = redactor.redact('Contact me at test@example.com');
      expect(result).toBe('Contact me at [REDACTED_EMAIL]');
    });

    it('should redact phone numbers', () => {
      const result = redactor.redact('Call me at (555) 123-4567');
      expect(result).toContain('[REDACTED_PHONE]');
    });

    it('should redact SSNs', () => {
      const result = redactor.redact('SSN: 000-00-0000');
      expect(result).toBe('SSN: [REDACTED_SSN]');
    });

    it('should redact credit card numbers', () => {
      const result = redactor.redact('Card: 4111111111111111');
      expect(result).toBe('Card: [REDACTED_CC]');
    });

    it('should redact IP addresses', () => {
      const result = redactor.redact('IP: 192.168.1.1');
      expect(result).toBe('IP: [REDACTED_IP]');
    });

    it('should handle text without PII', () => {
      const result = redactor.redact('Hello world');
      expect(result).toBe('Hello world');
    });

    it('should return empty string for empty input', () => {
      expect(redactor.redact('')).toBe('');
    });

    it('should not redact when disabled', () => {
      const disabledRedactor = new PIIRedactor({ enabled: false });
      const result = disabledRedactor.redact('test@example.com');
      expect(result).toBe('test@example.com');
    });
  });

  describe('redactObject', () => {
    it('should redact PII from nested objects', () => {
      const obj = {
        name: 'John',
        email: 'john@example.com',
        address: {
          ip: '192.168.1.1',
        },
      };

      const result = redactor.redactObject(obj);
      expect(result.email).toBe('[REDACTED_EMAIL]');
      expect(result.address.ip).toBe('[REDACTED_IP]');
      expect(result.name).toBe('John');
    });

    it('should redact PII from arrays', () => {
      const obj = {
        emails: ['test1@example.com', 'test2@example.com'],
      };

      const result = redactor.redactObject(obj);
      expect(result.emails).toEqual(['[REDACTED_EMAIL]', '[REDACTED_EMAIL]']);
    });

    it('should return original object when disabled', () => {
      const disabledRedactor = new PIIRedactor({ enabled: false });
      const obj = { email: 'test@example.com' };
      const result = disabledRedactor.redactObject(obj);
      expect(result).toEqual(obj);
    });
  });

  describe('containsPII', () => {
    it('should detect email as PII', () => {
      expect(redactor.containsPII('test@example.com')).toBe(true);
    });

    it('should detect phone as PII', () => {
      expect(redactor.containsPII('(555) 123-4567')).toBe(true);
    });

    it('should return false for non-PII text', () => {
      expect(redactor.containsPII('Hello world')).toBe(false);
    });

    it('should return false when disabled', () => {
      const disabledRedactor = new PIIRedactor({ enabled: false });
      expect(disabledRedactor.containsPII('test@example.com')).toBe(false);
    });
  });

  describe('detectPIITypes', () => {
    it('should detect multiple PII types', () => {
      const types = redactor.detectPIITypes('Email: test@example.com, IP: 192.168.1.1');
      expect(types).toContain('Email addresses');
      expect(types).toContain('IP addresses');
    });

    it('should return empty array for non-PII text', () => {
      const types = redactor.detectPIITypes('Hello world');
      expect(types).toEqual([]);
    });
  });

  describe('shouldRedactMessageContent', () => {
    it('should return false by default', () => {
      expect(redactor.shouldRedactMessageContent()).toBe(false);
    });

    it('should return true when configured', () => {
      const r = new PIIRedactor({ redactMessageContent: true });
      expect(r.shouldRedactMessageContent()).toBe(true);
    });
  });

  describe('isEnabled', () => {
    it('should return true by default', () => {
      expect(redactor.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      const r = new PIIRedactor({ enabled: false });
      expect(r.isEnabled()).toBe(false);
    });
  });

  describe('pattern management', () => {
    it('should add custom pattern', () => {
      redactor.addPattern({
        pattern: /secret-\w+/g,
        replacement: '[SECRET]',
        description: 'Secret keys',
      });

      const result = redactor.redact('key: secret-abc123');
      expect(result).toBe('key: [SECRET]');
    });

    it('should remove pattern by description', () => {
      redactor.removePattern('Email addresses');
      const result = redactor.redact('test@example.com');
      expect(result).toBe('test@example.com');
    });

    it('should exclude pattern', () => {
      redactor.excludePattern('Email addresses');
      const result = redactor.redact('test@example.com');
      expect(result).toBe('test@example.com');
    });

    it('should include previously excluded pattern', () => {
      const r = new PIIRedactor();
      r.excludePattern('Email addresses');
      r.includePattern('Email addresses');
      const result = r.redact('test@example.com');
      expect(result).toBe('[REDACTED_EMAIL]');
    });
  });

  describe('hashInsteadOfRedact', () => {
    it('should hash values instead of redacting', () => {
      const r = new PIIRedactor({ hashInsteadOfRedact: true });
      const result = r.redact('test@example.com');
      expect(result).not.toBe('test@example.com');
      expect(result).toContain('[HASHED_');
    });
  });
});

describe('getDefaultPIIRedactor', () => {
  it('should return a PIIRedactor instance', () => {
    const redactor = getDefaultPIIRedactor();
    expect(redactor).toBeInstanceOf(PIIRedactor);
  });

  it('should return the same instance', () => {
    const r1 = getDefaultPIIRedactor();
    const r2 = getDefaultPIIRedactor();
    expect(r1).toBe(r2);
  });
});
