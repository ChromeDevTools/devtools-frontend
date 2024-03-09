// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const UNINITIALIZED = Symbol('uninitialized');
const ERROR_STATE = Symbol('error');

/**
 * Very basic memoizer. Will only invoke its callback the first time, returning the cached value all subsequent calls.
 */
export function lazy<T>(producer: () => T): () => symbol | T {
  let value: T|typeof ERROR_STATE|typeof UNINITIALIZED = UNINITIALIZED;
  let error: null = null;

  return (): symbol|T => {
    if (value === ERROR_STATE) {
      throw error;
    } else if (value !== UNINITIALIZED) {
      return value;
    }

    try {
      value = producer();
      return value;
    } catch (err) {
      error = err;
      value = ERROR_STATE;
      throw error;
    }
  };
}
