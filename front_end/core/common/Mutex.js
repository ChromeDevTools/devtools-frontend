"use strict";
export class Mutex {
  #locked = false;
  #acquirers = [];
  // This is FIFO.
  acquire() {
    const state = { resolved: false };
    if (this.#locked) {
      return new Promise((resolve) => {
        this.#acquirers.push(() => resolve(this.#release.bind(this, state)));
      });
    }
    this.#locked = true;
    return Promise.resolve(this.#release.bind(this, state));
  }
  #release(state) {
    if (state.resolved) {
      throw new Error("Cannot release more than once.");
    }
    state.resolved = true;
    const resolve = this.#acquirers.shift();
    if (!resolve) {
      this.#locked = false;
      return;
    }
    resolve();
  }
  async run(action) {
    const release = await this.acquire();
    try {
      const result = await action();
      return result;
    } finally {
      release();
    }
  }
}
//# sourceMappingURL=Mutex.js.map
