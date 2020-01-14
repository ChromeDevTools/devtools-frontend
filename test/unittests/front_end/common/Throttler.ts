// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {Throttler} from '/front_end/common/Throttler.js';

describe('Throttler class', () => {
  it('is able to schedule a process as soon as possible', () => {
    let result = 'original value';

    function assignVar1() {
      result = 'new value';
    }

    const throttler = new Throttler(10);
    const promiseTest = throttler.schedule(assignVar1, true);
    promiseTest.then(() => {
      assert.equal(result, 'new value', 'process was not scheduled correctly');
    });

    assert.equal(result, 'original value', 'process was not scheduled correctly');
  });

  it('is able to schedule two processes as soon as possible', () => {
    let result = 'original value';

    function assignVar1() {
      result = 'new value 1';
    }

    function assignVar2() {
      result = 'new value 2';
    }

    const throttler = new Throttler(10);
    const promiseTest = throttler.schedule(assignVar1, true);
    throttler.schedule(assignVar2, true);
    promiseTest.then(() => {
      assert.equal(result, 'new value 2', 'process was not scheduled correctly');
    });

    assert.equal(result, 'original value', 'process was not scheduled correctly');
  });
});
