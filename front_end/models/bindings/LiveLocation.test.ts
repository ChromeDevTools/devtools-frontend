// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from './bindings.js';

const LiveLocationPool = Bindings.LiveLocation.LiveLocationPool;
const LiveLocationWithPool = Bindings.LiveLocation.LiveLocationWithPool;

describe('LiveLocation', () => {
  it('executes updates atomically', async () => {
    const pool = new LiveLocationPool();

    // Create a promise that our async update is blocked on. The test then becomes:
    //   1. schedule two updates to the live location
    //   2. resolve the blocking promise
    //   3. schedule a third update
    //   4. check that all actions were still executed atomically.
    let fulfillBlockingPromise = (_: unknown) => {};
    const blockingPromise = new Promise(fulfill => {
      fulfillBlockingPromise = fulfill;
    });

    const updateDelegateLog: string[] = [];
    const liveLocation = new LiveLocationWithPool(async () => {
      updateDelegateLog.push('enter');
      await blockingPromise;
      updateDelegateLog.push('exit');
    }, pool);

    void liveLocation.update();
    void liveLocation.update();
    fulfillBlockingPromise(undefined);
    await liveLocation.update();

    assert.deepEqual(updateDelegateLog, ['enter', 'exit', 'enter', 'exit', 'enter', 'exit']);
  });

  it('isDisposed returns true after locationPool.disposeAll', () => {
    const pool = new LiveLocationPool();
    const liveLocation = new LiveLocationWithPool(async () => {}, pool);

    assert.isFalse(liveLocation.isDisposed());
    pool.disposeAll();
    assert.isTrue(liveLocation.isDisposed());
  });
});
