// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as TestTeardown from './TestTeardown.js';

describe('TestTeardown', () => {
  it('runs registered teardowns in LIFO order', async () => {
    const executed: number[] = [];
    TestTeardown.registerTestTeardown(() => {
      executed.push(1);
    });
    TestTeardown.registerTestTeardown(async () => {
      executed.push(2);
    });
    TestTeardown.registerTestTeardown(() => {
      executed.push(3);
    });

    assert.isTrue(TestTeardown.hasPendingTestTeardowns());
    await TestTeardown.runTestTeardowns();
    assert.deepEqual(executed, [3, 2, 1]);
    assert.isFalse(TestTeardown.hasPendingTestTeardowns());
  });

  it('runs all teardowns even if one throws and rethrows the first thrown error (last registered)', async () => {
    const executed: number[] = [];
    const error1 = new Error('teardown error 1');
    const error2 = new Error('teardown error 2');

    TestTeardown.registerTestTeardown(() => {
      executed.push(1);
    });
    TestTeardown.registerTestTeardown(() => {
      executed.push(2);
      throw error1;
    });
    TestTeardown.registerTestTeardown(() => {
      executed.push(3);
      throw error2;
    });

    let caughtError: unknown;
    try {
      await TestTeardown.runTestTeardowns();
    } catch (err) {
      caughtError = err;
    }

    assert.strictEqual(caughtError, error2);
    assert.deepEqual(executed, [3, 2, 1]);
    assert.isFalse(TestTeardown.hasPendingTestTeardowns());
  });

  describe('beforeEachWithTeardown', () => {
    const trace: string[] = [];

    TestTeardown.beforeEachWithTeardown(
        () => {
          trace.push('setup');
        },
        () => {
          trace.push('teardown');
        });

    it('executes setup before test and queues teardown for root runner', () => {
      assert.include(trace, 'setup');
      assert.isTrue(TestTeardown.isRootTeardownRunnerRegistered());
      assert.isTrue(TestTeardown.hasPendingTestTeardowns());
    });
  });
});
