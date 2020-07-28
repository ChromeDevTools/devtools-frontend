// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../front_end/common/common.js';

const Throttler = Common.Throttler.Throttler;

describe('Throttler class', () => {
  it('is able to schedule a process as soon as possible', () => {
    let result = 'original value';

    async function assignVar1() {
      result = 'new value';
    }

    const throttler = new Throttler(10);
    const promiseTest = throttler.schedule(assignVar1, true);
    promiseTest.then(() => {
      assert.strictEqual(result, 'new value', 'process was not scheduled correctly');
    });

    assert.strictEqual(result, 'original value', 'process was not scheduled correctly');
  });

  it('is able to schedule two processes as soon as possible', () => {
    let result = 'original value';

    async function assignVar1() {
      result = 'new value 1';
    }

    async function assignVar2() {
      result = 'new value 2';
    }

    const throttler = new Throttler(10);
    const promiseTest = throttler.schedule(assignVar1, true);
    throttler.schedule(assignVar2, true);
    promiseTest.then(() => {
      assert.strictEqual(result, 'new value 2', 'process was not scheduled correctly');
    });

    assert.strictEqual(result, 'original value', 'process was not scheduled correctly');
  });
});
