// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

type ReleaseFunction = () => void;

/**
 * Use Mutex class to coordinate local concurrent operations.
 * Once `acquire` promise resolves, you hold the lock and must
 * call `release` function returned by `acquire` to release the
 * lock. Failing to `release` the lock may lead to deadlocks.
 */
export class Mutex {
  #locked = false;
  #acquirers: Array<() => void> = [];

  // This is FIFO.
  acquire(): Promise<ReleaseFunction> {
    const state = {resolved: false};
    if (this.#locked) {
      return new Promise(resolve => {
        this.#acquirers.push(() => resolve(this.#release.bind(this, state)));
      });
    }
    this.#locked = true;
    return Promise.resolve(this.#release.bind(this, state));
  }

  #release(state: {resolved: boolean}): void {
    if (state.resolved) {
      throw new Error('Cannot release more than once.');
    }
    state.resolved = true;

    const resolve = this.#acquirers.shift();
    if (!resolve) {
      this.#locked = false;
      return;
    }
    resolve();
  }

  async run<T>(action: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      // Note we need to await here because we want the await to release AFTER
      // that await happens. Returning action() will trigger the release
      // immediately which is counter to what we want.
      const result = await action();
      return result;
    } finally {
      release();
    }
  }
}
