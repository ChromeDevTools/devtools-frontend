// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

describe('Debouncer', () => {
  it('debounces correctly', done => {
    let count = 0;
    function increment() {
      count++;
    }

    const debouncedIncrement = Common.Debouncer.debounce(increment, 10);
    // Fire it twice, but we anticipate that it is debounced to firing
    // once after 10ms.
    debouncedIncrement();
    debouncedIncrement();

    // Then wait a while before checking the value.
    setTimeout(() => {
      assert.strictEqual(count, 1);
      done();
    }, 50);
  });
});
