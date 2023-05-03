// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';

type Awaitable<T> = Promise<T>|T;

export type ReleaseFunction = () => Promise<void>;

/**
 * SharedObject is similar to a C++ shared pointer, i.e. a reference counted
 * object.
 *
 * A object is "created" whenever there are no acquirers and it's then acquired.
 * Subsequent acquirers use the same object. Only until all acquirers release
 * will the object be "destroyed".
 *
 * Using an object after it's destroyed is undefined behavior.
 *
 * The definition of "created" and "destroyed" is dependent on the functions
 * passed into the constructor.
 */
export class SharedObject<T> {
  #mutex = new Common.Mutex.Mutex();
  #counter = 0;
  #value: T|undefined;

  #create: () => Awaitable<T>;
  #destroy: (value: T) => Awaitable<void>;

  constructor(create: () => Awaitable<T>, destroy: (value: T) => Awaitable<void>) {
    this.#create = create;
    this.#destroy = destroy;
  }

  /**
   * @returns The shared object and a release function. If the release function
   * throws, you may attempt to call it again (however this probably implies
   * your destroy function is bad).
   */
  async acquire(): Promise<[T, ReleaseFunction]> {
    await this.#mutex.run(async () => {
      if (this.#counter === 0) {
        this.#value = await this.#create();
      }
      ++this.#counter;
    });
    return [this.#value as T, this.#release.bind(this, {released: false})];
  }

  /**
   * Automatically perform an acquire and release.
   *
   * **If the release fails**, then this will throw and the object will be
   * permanently alive. This is expected to be a fatal error and you should
   * debug your destroy function.
   */
  async run<U>(action: (value: T) => Awaitable<U>): Promise<U> {
    const [value, release] = await this.acquire();
    try {
      const result = await action(value);
      return result;
    } finally {
      await release();
    }
  }

  async #release(state: {released: boolean}): Promise<void> {
    if (state.released) {
      throw new Error('Attempted to release object multiple times.');
    }
    try {
      state.released = true;
      await this.#mutex.run(async () => {
        if (this.#counter === 1) {
          await this.#destroy(this.#value as T);
          this.#value = undefined;
        }
        --this.#counter;
      });
    } catch (error) {
      state.released = false;
      throw error;
    }
  }
}
