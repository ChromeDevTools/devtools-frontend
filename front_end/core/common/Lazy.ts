// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const UNINITIALIZED = Symbol('uninitialized');
const ERROR_STATE = Symbol('error');

/**
 * Very basic memoizer. Will only invoke its callback the first time, returning the cached value all subsequent calls.
 */
export function lazy<T, A extends unknown[] = []>(producer: (...args: A) => T): (...args: A) => T {
  let value: T|typeof ERROR_STATE|typeof UNINITIALIZED = UNINITIALIZED;
  let error: Error = new Error('Initial');

  return (...args: A): T => {
    if (value === ERROR_STATE) {
      throw error;
    } else if (value !== UNINITIALIZED) {
      return value;
    }

    try {
      value = producer(...args);
      return value;
    } catch (err) {
      error = err instanceof Error ? err : new Error(err);
      value = ERROR_STATE;
      throw error;
    }
  };
}
