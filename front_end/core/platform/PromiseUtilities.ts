// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Returns a new pending promise together with it's resolve and reject functions.
 *
 * Polyfill for https://github.com/tc39/proposal-promise-with-resolvers.
 */
export function promiseWithResolvers<T = unknown>(): {
  promise: Promise<T>,
  resolve: (value: T|PromiseLike<T>) => void,
  reject: (error?: Error) => void,
} {
  let resolve!: (value: T|PromiseLike<T>) => void;
  let reject!: (error?: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
}
