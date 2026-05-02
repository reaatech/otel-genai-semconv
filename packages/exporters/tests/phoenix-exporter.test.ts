import { describe, it, expect } from 'vitest';
import { PhoenixExporter } from '../src/index.js';

describe('PhoenixExporter', () => {
  it('should construct with defaults', () => {
    const exporter = new PhoenixExporter();
    expect(exporter).toBeDefined();
  });

  it('should accept configuration', () => {
    const exporter = new PhoenixExporter({ datasetName: 'test-traces', maxSpans: 100 });
    expect(exporter).toBeDefined();
  });
});
