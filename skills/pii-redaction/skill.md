# PII Redaction

## Capability
Automatic detection and redaction of Personally Identifiable Information (PII) from LLM telemetry data, provided by `@reaatech/otel-genai-semconv-utils`.

## Usage Examples

### Example 1: Basic Redaction
```typescript
import { PIIRedactor } from '@reaatech/otel-genai-semconv-utils';

const redactor = new PIIRedactor();

const text = "My email is john@example.com and my SSN is 123-45-6789";
const redacted = redactor.redact(text);

console.log(redacted);
// Output: "My email is [REDACTED_EMAIL] and my SSN is [REDACTED_SSN]"
```

### Example 2: Custom Patterns
```typescript
const redactor = new PIIRedactor({
  customPatterns: [
    { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[REDACTED_CC]' },
    { pattern: /\b[A-Z]{1,2}\d{1,2}[A-Z]{1,2}\s?\d[A-Z]{2}\b/gi, replacement: '[REDACTED_POSTAL]' },
  ],
  hashInsteadOfRedact: false,
});
```

## Detected PII Types

| Type | Pattern | Example |
|------|---------|---------|
| Email | `user@domain.com` | `[REDACTED_EMAIL]` |
| Phone | `+1-555-123-4567` | `[REDACTED_PHONE]` |
| SSN | `123-45-6789` | `[REDACTED_SSN]` |
| Credit Card | `4111 1111 1111 1111` | `[REDACTED_CC]` |
| IP Address | `192.168.1.1` | `[REDACTED_IP]` |

## Redaction Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `redactMessageContent` | boolean | false | Redact message content in spans |
| `hashInsteadOfRedact` | boolean | false | Hash PII instead of redacting (for debugging) |
| `customPatterns` | PIIPattern[] | [] | Additional regex patterns |
| `excludePatterns` | string[] | [] | Pattern descriptions to skip |

## Error Handling
- **Invalid regex**: Log error, skip pattern, continue with other patterns
- **Performance timeout**: Skip redaction for that text, log warning
- **Memory pressure**: Process in chunks, release memory between chunks

## Security Considerations
- Redaction happens before data leaves the application
- Patterns are configurable per deployment
- Audit logging for all redaction operations
- Never logs raw PII, only redacted output

## Performance
- Redaction: <1ms per typical message
- Regex patterns compiled and cached
- Parallel processing for large texts

## Related Packages

- [@reaatech/otel-genai-semconv-core](https://www.npmjs.com/package/@reaatech/otel-genai-semconv-core) — Core types
