import type { Span } from '@opentelemetry/api';
import type { LLMRequest, LLMResponse } from '@reaatech/otel-genai-semconv-core';

export interface HookContext {
  span: Span;
  provider: string;
  model: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
}

export interface RequestHookContext extends HookContext {
  request: LLMRequest;
}

export interface ResponseHookContext extends HookContext {
  response: LLMResponse;
}

export interface ErrorHookContext extends HookContext {
  error: Error;
  errorType?: string;
}

export type OnStartHook = (context: RequestHookContext) => void;
export type OnEndHook = (context: ResponseHookContext) => void;
export type OnErrorHook = (context: ErrorHookContext) => void;

export interface HookRegistration {
  id: string;
  type: 'onStart' | 'onEnd' | 'onError';
  fn: OnStartHook | OnEndHook | OnErrorHook;
  priority?: number;
}

export class HookManager {
  private readonly hooks: Map<string, HookRegistration[]> = new Map();
  private hookCounter = 0;

  constructor() {
    this.hooks.set('onStart', []);
    this.hooks.set('onEnd', []);
    this.hooks.set('onError', []);
  }

  onStart(fn: OnStartHook, options?: { id?: string; priority?: number }): string {
    return this.register('onStart', fn, options);
  }

  onEnd(fn: OnEndHook, options?: { id?: string; priority?: number }): string {
    return this.register('onEnd', fn, options);
  }

  onError(fn: OnErrorHook, options?: { id?: string; priority?: number }): string {
    return this.register('onError', fn, options);
  }

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

    hooks.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    this.hooks.set(type, hooks);

    return id;
  }

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

  executeOnStart(context: RequestHookContext): void {
    const hooks = this.hooks.get('onStart') ?? [];
    for (const hook of hooks) {
      try {
        (hook.fn as OnStartHook)(context);
      } catch (error) {
        process.stderr.write(`Error in onStart hook ${hook.id}: ${error}\n`);
      }
    }
  }

  executeOnEnd(context: ResponseHookContext): void {
    const hooks = this.hooks.get('onEnd') ?? [];
    for (const hook of hooks) {
      try {
        (hook.fn as OnEndHook)(context);
      } catch (error) {
        process.stderr.write(`Error in onEnd hook ${hook.id}: ${error}\n`);
      }
    }
  }

  executeOnError(context: ErrorHookContext): void {
    const hooks = this.hooks.get('onError') ?? [];
    for (const hook of hooks) {
      try {
        (hook.fn as OnErrorHook)(context);
      } catch (error) {
        process.stderr.write(`Error in onError hook ${hook.id}: ${error}\n`);
      }
    }
  }

  clear(): void {
    this.hooks.get('onStart')?.splice(0);
    this.hooks.get('onEnd')?.splice(0);
    this.hooks.get('onError')?.splice(0);
    this.hookCounter = 0;
  }

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

let defaultHookManager: HookManager | null = null;

export function getDefaultHookManager(): HookManager {
  defaultHookManager ??= new HookManager();
  return defaultHookManager;
}
