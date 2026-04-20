/**
 * Unit tests for ChunkAggregator
 */

import { describe, it, expect } from 'vitest';
import {
  ChunkAggregator,
  createChunkAggregator,
} from '../../../src/instrumentation/chunk-aggregator.js';

describe('ChunkAggregator', () => {
  describe('addText', () => {
    it('should accumulate text chunks', () => {
      const aggregator = new ChunkAggregator();
      aggregator.addText('Hello');
      expect(aggregator.getCurrentContent()).toBe('Hello');

      aggregator.addText(' ');
      expect(aggregator.getCurrentContent()).toBe('Hello ');

      aggregator.addText('World');
      expect(aggregator.getCurrentContent()).toBe('Hello World');
    });

    it('should handle empty string', () => {
      const aggregator = new ChunkAggregator();
      aggregator.addText('Hello');
      aggregator.addText('');
      expect(aggregator.getCurrentContent()).toBe('Hello');
    });
  });

  describe('addToolCallChunk', () => {
    it('should create new tool call with id and name', () => {
      const aggregator = new ChunkAggregator();
      aggregator.addToolCallChunk({ id: 'call_1', name: 'get_weather' });

      const toolCalls = aggregator.getCurrentToolCalls();
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]).toEqual({
        id: 'call_1',
        name: 'get_weather',
        arguments: '',
      });
    });

    it('should accumulate arguments for existing tool call', () => {
      const aggregator = new ChunkAggregator();
      aggregator.addToolCallChunk({ id: 'call_1', name: 'get_weather' });
      aggregator.addToolCallChunk({ id: 'call_1', arguments: '{"loc' });
      aggregator.addToolCallChunk({ id: 'call_1', arguments: 'ation": "SF"}' });

      const toolCalls = aggregator.getCurrentToolCalls();
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]?.arguments).toBe('{"location": "SF"}');
    });

    it('should use last tool call id when id not provided', () => {
      const aggregator = new ChunkAggregator();
      aggregator.addToolCallChunk({ id: 'call_1', name: 'func' });
      aggregator.addToolCallChunk({ arguments: 'arg1' });

      const toolCalls = aggregator.getCurrentToolCalls();
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]?.arguments).toBe('arg1');
    });

    it('should not create tool call when no id and no previous', () => {
      const aggregator = new ChunkAggregator();
      aggregator.addToolCallChunk({ name: 'func' });

      const toolCalls = aggregator.getCurrentToolCalls();
      expect(toolCalls).toHaveLength(0);
    });

    it('should handle multiple tool calls', () => {
      const aggregator = new ChunkAggregator();
      aggregator.addToolCallChunk({ id: 'call_1', name: 'func1' });
      aggregator.addToolCallChunk({ id: 'call_2', name: 'func2' });

      const toolCalls = aggregator.getCurrentToolCalls();
      expect(toolCalls).toHaveLength(2);
    });
  });

  describe('setFinishReason', () => {
    it('should set finish reason', () => {
      const aggregator = new ChunkAggregator();
      aggregator.setFinishReason('stop');
      const response = aggregator.build();
      expect(response.finishReason).toBe('stop');
    });

    it('should overwrite previous finish reason', () => {
      const aggregator = new ChunkAggregator();
      aggregator.setFinishReason('length');
      aggregator.setFinishReason('stop');
      expect(aggregator.build().finishReason).toBe('stop');
    });
  });

  describe('setModel', () => {
    it('should set model', () => {
      const aggregator = new ChunkAggregator();
      aggregator.setModel('gpt-4');
      expect(aggregator.build().model).toBe('gpt-4');
    });
  });

  describe('setTokenUsage', () => {
    it('should set input and output tokens', () => {
      const aggregator = new ChunkAggregator();
      aggregator.setTokenUsage(100, 50);
      const response = aggregator.build();
      expect(response.inputTokens).toBe(100);
      expect(response.outputTokens).toBe(50);
    });
  });

  describe('setTruncated', () => {
    it('should mark response as truncated', () => {
      const aggregator = new ChunkAggregator();
      aggregator.setTruncated();
      expect(aggregator.build().truncated).toBe(true);
    });
  });

  describe('build', () => {
    it('should build complete aggregated response', () => {
      const aggregator = new ChunkAggregator();
      aggregator.addText('Hello');
      aggregator.addText(' World');
      aggregator.addToolCallChunk({
        id: 'call_1',
        name: 'get_weather',
        arguments: '{"city":"SF"}',
      });
      aggregator.setFinishReason('stop');
      aggregator.setModel('gpt-4');
      aggregator.setTokenUsage(10, 20);

      const response = aggregator.build();

      expect(response).toEqual({
        content: 'Hello World',
        toolCalls: [{ id: 'call_1', name: 'get_weather', arguments: '{"city":"SF"}' }],
        finishReason: 'stop',
        model: 'gpt-4',
        inputTokens: 10,
        outputTokens: 20,
        truncated: false,
      });
    });

    it('should build response with empty content', () => {
      const aggregator = new ChunkAggregator();
      const response = aggregator.build();
      expect(response.content).toBe('');
      expect(response.toolCalls).toEqual([]);
      expect(response.finishReason).toBeNull();
      expect(response.model).toBeNull();
      expect(response.inputTokens).toBe(0);
      expect(response.outputTokens).toBe(0);
      expect(response.truncated).toBe(false);
    });

    it('should include truncated flag', () => {
      const aggregator = new ChunkAggregator();
      aggregator.setTruncated();
      expect(aggregator.build().truncated).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const aggregator = new ChunkAggregator();
      aggregator.addText('Hello');
      aggregator.addToolCallChunk({ id: 'call_1', name: 'func' });
      aggregator.setFinishReason('stop');
      aggregator.setModel('gpt-4');
      aggregator.setTokenUsage(10, 20);
      aggregator.setTruncated();

      aggregator.reset();

      const response = aggregator.build();
      expect(response.content).toBe('');
      expect(response.toolCalls).toEqual([]);
      expect(response.finishReason).toBeNull();
      expect(response.model).toBeNull();
      expect(response.inputTokens).toBe(0);
      expect(response.outputTokens).toBe(0);
      expect(response.truncated).toBe(false);
    });
  });

  describe('getCurrentContent', () => {
    it('should return partial content', () => {
      const aggregator = new ChunkAggregator();
      aggregator.addText('Hello');
      expect(aggregator.getCurrentContent()).toBe('Hello');
      aggregator.addText(' World');
      expect(aggregator.getCurrentContent()).toBe('Hello World');
    });
  });

  describe('getCurrentToolCalls', () => {
    it('should return partial tool calls', () => {
      const aggregator = new ChunkAggregator();
      aggregator.addToolCallChunk({ id: 'call_1', name: 'func1' });
      expect(aggregator.getCurrentToolCalls()).toHaveLength(1);

      aggregator.addToolCallChunk({ id: 'call_2', name: 'func2' });
      expect(aggregator.getCurrentToolCalls()).toHaveLength(2);
    });
  });
});

describe('createChunkAggregator', () => {
  it('should create a new ChunkAggregator', () => {
    const aggregator = createChunkAggregator();
    expect(aggregator).toBeInstanceOf(ChunkAggregator);
  });
});
