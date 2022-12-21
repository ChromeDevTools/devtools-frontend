// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

interface PromiseInfo<T> {
  promise: Promise<T>;
  resolve: (obj: T) => void;
  reject: (error: Error) => void;
}

/**
 * A class that facilitates resolving a id to an object of type T. If the id does not yet resolve, a promise
 * is created that gets resolved once `onResolve` is called with the corresponding id.
 *
 * This class enables clients to control the duration of the wait and the lifetime of the associated
 * promises by using the `clear` method on this class.
 */
export abstract class ResolverBase<Id, T> {
  #unresolvedIds: Map<Id, PromiseInfo<T>> = new Map();

  protected abstract getForId(id: Id): T|null;
  protected abstract startListening(): void;
  protected abstract stopListening(): void;

  /**
   * Returns a promise that resolves once the `id` can be resolved to an object.
   */
  async waitFor(id: Id): Promise<T> {
    const obj = this.getForId(id);
    if (!obj) {
      return this.getOrCreatePromise(id);
    }
    return obj;
  }

  /**
   * Resolve the `id`. Returns the object immediatelly if it can be resolved,
   * and otherwise waits for the object to appear and calls `callback` once
   * it is resolved.
   */
  tryGet(id: Id, callback: (t: T) => void): T|null {
    const obj = this.getForId(id);
    if (!obj) {
      const swallowTheError = (): void => {};
      void this.getOrCreatePromise(id).catch(swallowTheError).then(obj => {
        if (obj) {
          callback(obj);
        }
      });
      return null;
    }
    return obj;
  }

  /**
   * Aborts all waiting and rejects all unresolved promises.
   */
  clear(): void {
    this.stopListening();
    for (const [id, {reject}] of this.#unresolvedIds.entries()) {
      reject(new Error(`Object with ${id} never resolved.`));
    }
    this.#unresolvedIds.clear();
  }

  private getOrCreatePromise(id: Id): Promise<T> {
    const promiseInfo = this.#unresolvedIds.get(id);
    if (promiseInfo) {
      return promiseInfo.promise;
    }
    let resolve: (value: T) => void = () => {};
    let reject: (error: Error) => void = () => {};
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.#unresolvedIds.set(id, {promise, resolve, reject});
    this.startListening();
    return promise;
  }

  protected onResolve(id: Id, t: T): void {
    const promiseInfo = this.#unresolvedIds.get(id);
    this.#unresolvedIds.delete(id);
    if (this.#unresolvedIds.size === 0) {
      this.stopListening();
    }
    promiseInfo?.resolve(t);
  }
}
