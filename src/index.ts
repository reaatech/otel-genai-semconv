/**
 * otel-genai-semconv — Reference implementation of OpenTelemetry GenAI semantic conventions
 *
 * @packageDocumentation
 */

export { SpanBuilder } from './semconv/span-builder.js';
export { AttributeMapper } from './semconv/attribute-mapper.js';
export * from './semconv/constants.js';

export { TracerManager } from './instrumentation/tracer.js';
export { SpanProcessor } from './instrumentation/span-processor.js';
export { HookManager } from './instrumentation/hooks.js';

export { TokenCounter } from './utils/token-counter.js';
export { CostCalculator } from './utils/cost-calculator.js';
export { PIIRedactor } from './utils/pii-redactor.js';

export * from './observability/index.js';

export * from './types/index.js';

// Version
export const VERSION = '0.1.0';
