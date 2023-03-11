// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

type ReleaseFn = () => void;

/**
 * Use Mutex class to coordinate local concurrent operations.
 * Once `acquire` promise resolves, you hold the lock and must
 * call `release` function returned by `acquire` to release the
 * lock. Failing to `release` the lock may lead to deadlocks.
 */
export class Mutex {
  #locked = false;
  #acquiringQueue: Array<(release: ReleaseFn) => void> = [];

  acquire(): Promise<ReleaseFn> {
    let resolver = (_release: ReleaseFn): void => {};
    const promise = new Promise<ReleaseFn>((resolve): void => {
      resolver = resolve;
    });
    this.#acquiringQueue.push(resolver);
    this.#processAcquiringQueue();
    return promise;
  }

  #processAcquiringQueue(): void {
    if (this.#locked) {
      return;
    }
    const nextAquirePromise = this.#acquiringQueue.shift();
    if (nextAquirePromise) {
      this.#locked = true;
      nextAquirePromise(this.#release.bind(this));
    }
  }

  #release(): void {
    this.#locked = false;
    this.#processAcquiringQueue();
  }
}
