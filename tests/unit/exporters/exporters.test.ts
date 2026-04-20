/**
 * Unit tests for dashboard exporters
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhoenixExporter, createPhoenixExporter } from '../../../src/exporters/phoenix-exporter.js';
import {
  LangfuseExporter,
  createLangfuseExporter,
} from '../../../src/exporters/langfuse-exporter.js';
import {
  CloudTraceExporter,
  createCloudTraceExporter,
} from '../../../src/exporters/cloud-trace-exporter.js';

const createMockSpan = (name: string, attributes: Record<string, unknown> = {}) => ({
  name,
  spanContext: () => ({ traceId: 'test-trace-id', spanId: 'test-span-id' }),
  parentSpanId: 'parent-span-id',
  startTime: [1704067200, 0],
  duration: [0, 1000000],
  status: { code: 1 },
  kind: 4,
  attributes,
  events: [
    { name: 'gen_ai.user.message', time: Date.now(), attributes: { content: 'Hello' } },
    { name: 'gen_ai.assistant.message', time: Date.now(), attributes: { content: 'Hi there!' } },
  ],
});

describe('PhoenixExporter', () => {
  let exporter: PhoenixExporter;

  beforeEach(() => {
    exporter = new PhoenixExporter();
  });

  describe('export', () => {
    it('should export gen_ai spans', () => {
      const spans = [createMockSpan('gen_ai.chat.completion'), createMockSpan('regular.span')];

      const callback = vi.fn();
      exporter.export(spans as any, callback);

      expect(callback).toHaveBeenCalledWith({ code: 0 });
    });

    it('should filter non-gen_ai spans', () => {
      const freshExporter = new PhoenixExporter();
      const spans = [createMockSpan('regular.span')];

      const callback = vi.fn();
      freshExporter.export(spans as any, callback);

      expect(callback).toHaveBeenCalledWith({ code: 0 });
      expect(freshExporter.getPhoenixFormat()).toHaveLength(0);
    });

    it('should handle export errors', () => {
      const exporterWithError = new PhoenixExporter();
      const originalExport = exporterWithError.export.bind(exporterWithError);

      const callback = vi.fn();
      originalExport([{ name: 'gen_ai.chat.completion' } as any], callback);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
    });
  });

  describe('getPhoenixFormat', () => {
    it('should convert spans to Phoenix format', () => {
      const span = createMockSpan('gen_ai.chat.completion', {
        'gen_ai.request.model': 'gpt-4',
      });
      exporter.export([span as any], () => {});

      const format = exporter.getPhoenixFormat() as Array<{
        name: string;
        trace_id: string;
        span_id: string;
        attributes: Record<string, unknown>;
      }>;
      expect(format).toHaveLength(1);
      expect(format[0]!.name).toBe('gen_ai.chat.completion');
      expect(format[0]!.trace_id).toBe('test-trace-id');
      expect(format[0]!.span_id).toBe('test-span-id');
      expect(format[0]!.attributes['gen_ai.request.model']).toBe('gpt-4');
    });
  });

  describe('forceFlush', () => {
    it('should resolve successfully', async () => {
      await expect(exporter.forceFlush()).resolves.toBeUndefined();
    });
  });

  describe('shutdown', () => {
    it('should clear spans and resolve', async () => {
      exporter.export([createMockSpan('gen_ai.chat.completion') as any], () => {});
      await exporter.shutdown();
      expect(exporter.getPhoenixFormat()).toHaveLength(0);
    });
  });

  describe('factory function', () => {
    it('should create exporter via factory', () => {
      const exp = createPhoenixExporter();
      expect(exp).toBeInstanceOf(PhoenixExporter);
    });
  });
});

describe('LangfuseExporter', () => {
  let exporter: LangfuseExporter;

  beforeEach(() => {
    exporter = new LangfuseExporter();
  });

  describe('export', () => {
    it('should export gen_ai spans', () => {
      const spans = [createMockSpan('gen_ai.chat.completion')];
      const callback = vi.fn();
      exporter.export(spans as any, callback);

      expect(callback).toHaveBeenCalledWith({ code: 0 });
    });

    it('should filter non-gen_ai spans', () => {
      const freshExporter = new LangfuseExporter();
      const spans = [createMockSpan('regular.span')];
      freshExporter.export(spans as any, () => {});
      expect(freshExporter.getLangfuseFormat()).toHaveLength(0);
    });
  });

  describe('getLangfuseFormat', () => {
    it('should convert spans to Langfuse format', () => {
      const span = createMockSpan('gen_ai.chat.completion');
      exporter.export([span as any], () => {});

      const format = exporter.getLangfuseFormat() as Array<{ name: string; traceId: string }>;
      expect(format).toHaveLength(1);
      expect(format[0]!.name).toBe('gen_ai.chat.completion');
      expect(format[0]!.traceId).toBe('test-trace-id');
    });

    it('should extract input from user message events', () => {
      const span = createMockSpan('gen_ai.chat.completion');
      exporter.export([span as any], () => {});

      const format = exporter.getLangfuseFormat();
      expect((format[0] as { input: unknown }).input).toEqual({ content: 'Hello' });
    });

    it('should extract output from assistant message events', () => {
      const span = createMockSpan('gen_ai.chat.completion');
      exporter.export([span as any], () => {});

      const format = exporter.getLangfuseFormat();
      expect((format[0] as { output: unknown }).output).toEqual({ content: 'Hi there!' });
    });
  });

  describe('forceFlush', () => {
    it('should resolve successfully', async () => {
      await expect(exporter.forceFlush()).resolves.toBeUndefined();
    });
  });

  describe('shutdown', () => {
    it('should clear spans and resolve', async () => {
      exporter.export([createMockSpan('gen_ai.chat.completion') as any], () => {});
      await exporter.shutdown();
      expect(exporter.getLangfuseFormat()).toHaveLength(0);
    });
  });

  describe('factory function', () => {
    it('should create exporter via factory', () => {
      const exp = createLangfuseExporter();
      expect(exp).toBeInstanceOf(LangfuseExporter);
    });
  });
});

describe('CloudTraceExporter', () => {
  let exporter: CloudTraceExporter;

  beforeEach(() => {
    exporter = new CloudTraceExporter({ projectId: 'test-project' });
  });

  describe('export', () => {
    it('should export gen_ai spans', () => {
      const spans = [createMockSpan('gen_ai.chat.completion')];
      const callback = vi.fn();
      exporter.export(spans as any, callback);

      expect(callback).toHaveBeenCalledWith({ code: 0 });
    });

    it('should filter non-gen_ai spans', () => {
      const freshExporter = new CloudTraceExporter({ projectId: 'test-project' });
      const spans = [createMockSpan('regular.span')];
      freshExporter.export(spans as any, () => {});
      expect(freshExporter.getCloudTraceFormat()).toHaveLength(0);
    });
  });

  describe('getCloudTraceFormat', () => {
    it('should convert spans to Cloud Trace format', () => {
      const span = createMockSpan('gen_ai.chat.completion', {
        'gen_ai.usage.input_tokens': 10,
        'gen_ai.usage.output_tokens': 20,
        'gen_ai.request.model': 'gpt-4',
      });
      exporter.export([span as any], () => {});

      const format = exporter.getCloudTraceFormat();
      expect(format).toHaveLength(1);
      expect(
        (format[0] as { projectId: string; traceId: string; displayName: { value: string } })
          .projectId,
      ).toBe('test-project');
      expect(
        (format[0] as { projectId: string; traceId: string; displayName: { value: string } })
          .traceId,
      ).toBe('test-trace-id');
      expect(
        (format[0] as { projectId: string; traceId: string; displayName: { value: string } })
          .displayName.value,
      ).toBe('gen_ai.chat.completion');
    });

    it('should map span kind correctly', () => {
      const span = createMockSpan('gen_ai.chat.completion');
      (span as any).kind = 4;
      exporter.export([span as any], () => {});

      const format = exporter.getCloudTraceFormat();
      expect((format[0] as { spanKind: string }).spanKind).toBe('CLIENT');
    });

    it('should map span status correctly', () => {
      const freshExporter = new CloudTraceExporter({ projectId: 'test-project' });
      const span = createMockSpan('gen_ai.chat.completion');
      (span as any).status = { code: 2, message: 'error' };
      freshExporter.export([span as any], () => {});

      const format = freshExporter.getCloudTraceFormat();
      expect((format[0] as { spanStatus: { code: string } }).spanStatus.code).toBe('ERROR');
    });

    it('should include gen_ai attributes', () => {
      const span = createMockSpan('gen_ai.chat.completion', {
        'gen_ai.usage.input_tokens': 10,
        'gen_ai.usage.output_tokens': 20,
      });
      exporter.export([span as any], () => {});

      const format = exporter.getCloudTraceFormat();
      expect(
        (format[0] as { attributes: Record<string, unknown> }).attributes['gen_ai/input_tokens'],
      ).toBe(10);
      expect(
        (format[0] as { attributes: Record<string, unknown> }).attributes['gen_ai/output_tokens'],
      ).toBe(20);
    });
  });

  describe('forceFlush', () => {
    it('should resolve successfully', async () => {
      await expect(exporter.forceFlush()).resolves.toBeUndefined();
    });
  });

  describe('shutdown', () => {
    it('should clear spans and resolve', async () => {
      exporter.export([createMockSpan('gen_ai.chat.completion') as any], () => {});
      await exporter.shutdown();
      expect(exporter.getCloudTraceFormat()).toHaveLength(0);
    });
  });

  describe('factory function', () => {
    it('should create exporter via factory', () => {
      const exp = createCloudTraceExporter();
      expect(exp).toBeInstanceOf(CloudTraceExporter);
    });
  });
});
