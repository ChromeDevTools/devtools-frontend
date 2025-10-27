"use strict";
export class ResolverBase {
  #unresolvedIds = /* @__PURE__ */ new Map();
  /**
   * Returns a promise that resolves once the `id` can be resolved to an object.
   */
  async waitFor(id) {
    const obj = this.getForId(id);
    if (!obj) {
      return await this.getOrCreatePromise(id);
    }
    return obj;
  }
  /**
   * Resolve the `id`. Returns the object immediately if it can be resolved,
   * and otherwise waits for the object to appear and calls `callback` once
   * it is resolved.
   */
  tryGet(id, callback) {
    const obj = this.getForId(id);
    if (!obj) {
      const swallowTheError = () => {
      };
      void this.getOrCreatePromise(id).catch(swallowTheError).then((obj2) => {
        if (obj2) {
          callback(obj2);
        }
      });
      return null;
    }
    return obj;
  }
  /**
   * Aborts all waiting and rejects all unresolved promises.
   */
  clear() {
    this.stopListening();
    for (const [id, { reject }] of this.#unresolvedIds.entries()) {
      reject(new Error(`Object with ${id} never resolved.`));
    }
    this.#unresolvedIds.clear();
  }
  getOrCreatePromise(id) {
    const promiseInfo = this.#unresolvedIds.get(id);
    if (promiseInfo) {
      return promiseInfo.promise;
    }
    const { resolve, reject, promise } = Promise.withResolvers();
    this.#unresolvedIds.set(id, { promise, resolve, reject });
    this.startListening();
    return promise;
  }
  onResolve(id, t) {
    const promiseInfo = this.#unresolvedIds.get(id);
    this.#unresolvedIds.delete(id);
    if (this.#unresolvedIds.size === 0) {
      this.stopListening();
    }
    promiseInfo?.resolve(t);
  }
}
//# sourceMappingURL=ResolverBase.js.map
