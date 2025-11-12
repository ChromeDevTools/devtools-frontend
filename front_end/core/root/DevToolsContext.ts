// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export type ConstructorT<T> = new (...args: any[]) => T;

/**
 * Container for singletons scoped to a single DevTools universe.
 */
export class DevToolsContext {
  readonly #instances = new Map<ConstructorT<unknown>, unknown>();

  get<T>(ctor: ConstructorT<T>): T {
    const instance = this.#instances.get(ctor) as T | undefined;
    if (!instance) {
      throw new Error(`No instance for ${ctor.name}. Ensure the bootstrapper creates it.`);
    }
    return instance;
  }

  /** @deprecated Should only be used by existing `instance` accessors. */
  has<T>(ctor: ConstructorT<T>): boolean {
    return this.#instances.has(ctor);
  }

  /**
   * @deprecated Should only be used by existing `instance` accessors and the bootstrapper.
   * Exists on the public interface only for migration purposes for now.
   */
  set<T>(ctor: ConstructorT<T>, instance: T): void {
    // TODO(crbug.com/458180550): We need to throw here if an instance was already set!
    this.#instances.set(ctor, instance);
  }

  /** @deprecated Should only be used by existing `removeInstance` static methods. */
  delete<T>(ctor: ConstructorT<T>): void {
    this.#instances.delete(ctor);
  }
}

let gInstance: DevToolsContext|null = null;

/**
 * @deprecated Exists to migrate instance() methods.
 */
export function globalInstance(): DevToolsContext {
  if (!gInstance) {
    // TODO(crbug.com/458180550): This should really throw to prevent side-effects and globals
    //                            from leaking all over the place.
    gInstance = new DevToolsContext();
  }
  return gInstance;
}

/**
 * @deprecated Should only be called by test setup and MainImpl
 */
export function setGlobalInstance(context: DevToolsContext|null): void {
  gInstance = context;
}
