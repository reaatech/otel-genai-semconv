/**
 * Hook system for instrumentation lifecycle events
 */

import type { Span } from '@opentelemetry/api';
import type { LLMRequest, LLMResponse } from '../types/domain.js';

/**
 * Hook context passed to callbacks
 */
export interface HookContext {
  /** The span being instrumented */
  span: Span;
  /** The provider type */
  provider: string;
  /** The model being used */
  model: string;
  /** Request ID if available */
  requestId?: string;
  /** Trace ID */
  traceId?: string;
  /** Span ID */
  spanId?: string;
}

/**
 * Request hook context
 */
export interface RequestHookContext extends HookContext {
  /** The LLM request */
  request: LLMRequest;
}

/**
 * Response hook context
 */
export interface ResponseHookContext extends HookContext {
  /** The LLM response */
  response: LLMResponse;
}

/**
 * Error hook context
 */
export interface ErrorHookContext extends HookContext {
  /** The error that occurred */
  error: Error;
  /** Error type */
  errorType?: string;
}

/**
 * Hook function types
 */
export type OnStartHook = (context: RequestHookContext) => void;
export type OnEndHook = (context: ResponseHookContext) => void;
export type OnErrorHook = (context: ErrorHookContext) => void;

/**
 * Hook registration
 */
export interface HookRegistration {
  /** Unique identifier for this hook */
  id: string;
  /** Hook type */
  type: 'onStart' | 'onEnd' | 'onError';
  /** The hook function */
  fn: OnStartHook | OnEndHook | OnErrorHook;
  /** Priority (higher = runs first) */
  priority?: number;
}

/**
 * Hook manager for managing instrumentation lifecycle hooks
 */
export class HookManager {
  private readonly hooks: Map<string, HookRegistration[]> = new Map();
  private hookCounter = 0;

  constructor() {
    // Initialize hook arrays for each type
    this.hooks.set('onStart', []);
    this.hooks.set('onEnd', []);
    this.hooks.set('onError', []);
  }

  /**
   * Register an onStart hook
   */
  onStart(fn: OnStartHook, options?: { id?: string; priority?: number }): string {
    return this.register('onStart', fn, options);
  }

  /**
   * Register an onEnd hook
   */
  onEnd(fn: OnEndHook, options?: { id?: string; priority?: number }): string {
    return this.register('onEnd', fn, options);
  }

  /**
   * Register an onError hook
   */
  onError(fn: OnErrorHook, options?: { id?: string; priority?: number }): string {
    return this.register('onError', fn, options);
  }

  /**
   * Register a hook
   */
  private register(
    type: 'onStart' | 'onEnd' | 'onError',
    fn: OnStartHook | OnEndHook | OnErrorHook,
    options?: { id?: string; priority?: number },
  ): string {
    const id = options?.id ?? `hook-${this.hookCounter++}`;

    const registration: HookRegistration = {
      id,
      type,
      fn,
      priority: options?.priority ?? 0,
    };

    const hooks = this.hooks.get(type) ?? [];
    hooks.push(registration);

    // Sort by priority (higher first)
    hooks.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    this.hooks.set(type, hooks);

    return id;
  }

  /**
   * Unregister a hook by ID
   */
  unregister(id: string): boolean {
    for (const [type, hooks] of this.hooks.entries()) {
      const index = hooks.findIndex((h) => h.id === id);
      if (index !== -1) {
        hooks.splice(index, 1);
        this.hooks.set(type, hooks);
        return true;
      }
    }
    return false;
  }

  /**
   * Execute all onStart hooks
   */
  executeOnStart(context: RequestHookContext): void {
    const hooks = this.hooks.get('onStart') ?? [];
    for (const hook of hooks) {
      try {
        (hook.fn as OnStartHook)(context);
      } catch (error) {
        // Log error but don't fail the request
        process.stderr.write(`Error in onStart hook ${hook.id}: ${error}\n`);
      }
    }
  }

  /**
   * Execute all onEnd hooks
   */
  executeOnEnd(context: ResponseHookContext): void {
    const hooks = this.hooks.get('onEnd') ?? [];
    for (const hook of hooks) {
      try {
        (hook.fn as OnEndHook)(context);
      } catch (error) {
        // Log error but don't fail the response
        process.stderr.write(`Error in onEnd hook ${hook.id}: ${error}\n`);
      }
    }
  }

  /**
   * Execute all onError hooks
   */
  executeOnError(context: ErrorHookContext): void {
    const hooks = this.hooks.get('onError') ?? [];
    for (const hook of hooks) {
      try {
        (hook.fn as OnErrorHook)(context);
      } catch (error) {
        // Log error but don't fail the error handling
        process.stderr.write(`Error in onError hook ${hook.id}: ${error}\n`);
      }
    }
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.get('onStart')?.splice(0);
    this.hooks.get('onEnd')?.splice(0);
    this.hooks.get('onError')?.splice(0);
    this.hookCounter = 0;
  }

  /**
   * Get the number of registered hooks
   */
  getHookCount(type?: 'onStart' | 'onEnd' | 'onError'): number {
    if (type) {
      return (this.hooks.get(type) ?? []).length;
    }
    let total = 0;
    for (const hooks of this.hooks.values()) {
      total += hooks.length;
    }
    return total;
  }

  /**
   * List all registered hook IDs
   */
  listHooks(type?: 'onStart' | 'onEnd' | 'onError'): string[] {
    if (type) {
      return (this.hooks.get(type) ?? []).map((h) => h.id);
    }

    const allIds: string[] = [];
    for (const hooks of this.hooks.values()) {
      allIds.push(...hooks.map((h) => h.id));
    }
    return allIds;
  }
}

// Singleton instance
let defaultHookManager: HookManager | null = null;

/**
 * Get the default hook manager instance
 */
export function getDefaultHookManager(): HookManager {
  if (!defaultHookManager) {
    defaultHookManager = new HookManager();
  }
  return defaultHookManager;
}
