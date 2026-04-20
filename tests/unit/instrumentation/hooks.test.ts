/**
 * Unit tests for HookManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookManager, getDefaultHookManager } from '../../../src/instrumentation/hooks.js';

describe('HookManager', () => {
  let manager: HookManager;
  let mockSpan: any;

  beforeEach(() => {
    manager = new HookManager();
    mockSpan = {
      setAttribute: vi.fn(),
      setAttributes: vi.fn(),
    };
  });

  describe('onStart', () => {
    it('should register onStart hook', () => {
      const id = manager.onStart(() => {});
      expect(id).toBeDefined();
      expect(manager.getHookCount('onStart')).toBe(1);
    });

    it('should use provided id', () => {
      const id = manager.onStart(() => {}, { id: 'my-hook' });
      expect(id).toBe('my-hook');
    });

    it('should execute hooks in priority order', () => {
      const order: string[] = [];
      manager.onStart(() => order.push('low'), { priority: 1 });
      manager.onStart(() => order.push('high'), { priority: 10 });
      manager.onStart(() => order.push('medium'), { priority: 5 });

      manager.executeOnStart({
        span: mockSpan,
        provider: 'openai',
        model: 'gpt-4',
        request: { model: 'gpt-4', messages: [] },
      });

      expect(order).toEqual(['high', 'medium', 'low']);
    });
  });

  describe('onEnd', () => {
    it('should register onEnd hook', () => {
      const id = manager.onEnd(() => {});
      expect(id).toBeDefined();
      expect(manager.getHookCount('onEnd')).toBe(1);
    });

    it('should execute onEnd hooks', () => {
      const fn = vi.fn();
      manager.onEnd(fn);

      manager.executeOnEnd({
        span: mockSpan,
        provider: 'openai',
        model: 'gpt-4',
        response: {
          id: 'test',
          model: 'gpt-4',
          choices: [],
          finishReasons: ['stop'],
          usage: { inputTokens: 10, outputTokens: 20 },
        },
      });

      expect(fn).toHaveBeenCalled();
    });
  });

  describe('onError', () => {
    it('should register onError hook', () => {
      const id = manager.onError(() => {});
      expect(id).toBeDefined();
      expect(manager.getHookCount('onError')).toBe(1);
    });

    it('should execute onError hooks', () => {
      const fn = vi.fn();
      manager.onError(fn);

      manager.executeOnError({
        span: mockSpan,
        provider: 'openai',
        model: 'gpt-4',
        error: new Error('test error'),
      });

      expect(fn).toHaveBeenCalled();
    });
  });

  describe('unregister', () => {
    it('should remove hook by id', () => {
      const id = manager.onStart(() => {});
      expect(manager.getHookCount('onStart')).toBe(1);

      const result = manager.unregister(id);
      expect(result).toBe(true);
      expect(manager.getHookCount('onStart')).toBe(0);
    });

    it('should return false for unknown id', () => {
      expect(manager.unregister('unknown')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all hooks', () => {
      manager.onStart(() => {});
      manager.onEnd(() => {});
      manager.onError(() => {});

      expect(manager.getHookCount()).toBe(3);

      manager.clear();

      expect(manager.getHookCount()).toBe(0);
    });
  });

  describe('listHooks', () => {
    it('should list all hook ids', () => {
      manager.onStart(() => {}, { id: 'hook1' });
      manager.onEnd(() => {}, { id: 'hook2' });

      const all = manager.listHooks();
      expect(all).toContain('hook1');
      expect(all).toContain('hook2');
    });

    it('should list hooks by type', () => {
      manager.clear();
      manager.onStart(() => {}, { id: 'start1' });
      manager.onStart(() => {}, { id: 'start2' });
      manager.onEnd(() => {}, { id: 'end1' });

      expect(manager.listHooks('onStart')).toEqual(['start1', 'start2']);
      expect(manager.listHooks('onEnd')).toEqual(['end1']);
    });
  });

  describe('error handling', () => {
    it('should not fail if hook throws', () => {
      manager.onStart(() => {
        throw new Error('Hook error');
      });

      expect(() => {
        manager.executeOnStart({
          span: mockSpan,
          provider: 'openai',
          model: 'gpt-4',
          request: { model: 'gpt-4', messages: [] },
        });
      }).not.toThrow();
    });
  });
});

describe('getDefaultHookManager', () => {
  it('should return a HookManager instance', () => {
    const manager = getDefaultHookManager();
    expect(manager).toBeInstanceOf(HookManager);
  });

  it('should return the same instance', () => {
    const m1 = getDefaultHookManager();
    const m2 = getDefaultHookManager();
    expect(m1).toBe(m2);
  });
});
