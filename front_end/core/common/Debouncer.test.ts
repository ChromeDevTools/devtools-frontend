// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from './common.js';

describe('Debouncer', () => {
  it('debounces correctly', () => {
    const clock = sinon.useFakeTimers();
    let count = 0;
    function increment() {
      count++;
    }

    const debouncedIncrement = Common.Debouncer.debounce(increment, 10);
    // Fire it twice, but we anticipate that it is debounced to firing
    // once after 10ms.
    debouncedIncrement();
    debouncedIncrement();
    assert.strictEqual(count, 0);

    // Then wait a while before checking the value.
    clock.tick(10);
    assert.strictEqual(count, 1);
    clock.restore();
  });

  it('can be cancelled', () => {
    const clock = sinon.useFakeTimers();
    let count = 0;
    function increment() {
      count++;
    }

    const debouncedIncrement = Common.Debouncer.debounce(increment, 10);
    debouncedIncrement();
    debouncedIncrement.cancel();
    assert.strictEqual(count, 0);

    // Then wait a while before checking the value.
    clock.tick(10);
    assert.strictEqual(count, 0);
    clock.restore();
  });
});
