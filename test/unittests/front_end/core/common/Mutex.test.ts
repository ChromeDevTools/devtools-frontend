// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';

describe('Mutex', () => {
  async function triggerMicroTaskQueue(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  async function notAcquired(): Promise<'not acquired'> {
    await triggerMicroTaskQueue();
    return 'not acquired';
  }

  it('should acquire the lock immediately if no one is holding it', async () => {
    const mutex = new Common.Mutex.Mutex();
    const release = await mutex.acquire();
    release();
  });

  it('should acquire the lock once another holder releases it', async () => {
    const mutex = new Common.Mutex.Mutex();
    const lock1 = mutex.acquire();
    const lock2 = mutex.acquire();
    const release = await lock1;
    // lock2 should not be resolved set.
    assert.strictEqual(
        await Promise.race([lock2, notAcquired()]),
        'not acquired',
    );
    release();
    await triggerMicroTaskQueue();
    assert.instanceOf(await lock2, Function);
  });

  it('should throw when release is called more than once', async () => {
    const mutex = new Common.Mutex.Mutex();
    const release = await mutex.acquire();
    release();
    assert.throws(() => release());
  });

  it('should work with run', async () => {
    const mutex = new Common.Mutex.Mutex();
    const release = await mutex.acquire();
    const action = mutex.run(async () => {
      return true;
    });
    // lock2 should not be resolved set.
    assert.strictEqual(
        await Promise.race([action, notAcquired()]),
        'not acquired',
    );
    release();
    await triggerMicroTaskQueue();
    assert.isTrue(await action);
  });

  it('should work for two async functions accessing shared state', async () => {
    const mutex = new Common.Mutex.Mutex();
    const shared: string[] = [];
    let action1Resolver = () => {};
    const action1ReadyPromise = new Promise<void>(resolve => {
      action1Resolver = resolve;
    });
    let action2Resolver = () => {};
    const action2ReadyPromise = new Promise<void>(resolve => {
      action2Resolver = resolve;
    });

    async function action1() {
      const release = await mutex.acquire();
      try {
        await action1ReadyPromise;
        shared.push('action1');
      } finally {
        release();
      }
    }

    async function action2() {
      const release = await mutex.acquire();
      try {
        await action2ReadyPromise;
        shared.push('action2');
      } finally {
        release();
      }
    }
    const promises = Promise.all([action1(), action2()]);
    action2Resolver();
    action1Resolver();
    await promises;
    assert.deepEqual(shared, ['action1', 'action2']);
  });
});
