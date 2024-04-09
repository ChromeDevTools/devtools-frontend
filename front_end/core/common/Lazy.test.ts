// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

const lazy = Common.Lazy.lazy;

describe('lazy', () => {
  it('evaluates callback once', () => {
    const initializeArrayOnce = lazy(() => []);
    const arrayOne = initializeArrayOnce();
    const arrayTwo = initializeArrayOnce();

    assert.strictEqual(arrayOne, arrayTwo);
    assert.notStrictEqual([], arrayOne);
  });
  it('handles callback exceptions', () => {
    let callCount = 0;
    const exceptionCallback = lazy(() => {
      callCount++;
      throw Error();
    });
    assert.throws(exceptionCallback, Error);
    // Subsequent calls of the function should throw an exception without
    // re-evaluation
    assert.throws(exceptionCallback, Error);
    assert.strictEqual(callCount, 1);
  });
});
