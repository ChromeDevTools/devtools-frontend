// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

const Throttler = Common.Throttler.Throttler;

describe('Throttler class', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    clock.tick(100);
  });

  afterEach(() => {
    clock.restore();
  });

  it('is able to schedule a process as soon as possible', async () => {
    const process = sinon.spy();

    const throttler = new Throttler(10);
    void throttler.schedule(async () => {});
    await clock.tickAsync(10);
    void throttler.schedule(process, true);

    assert.isFalse(process.called);
    await clock.tickAsync(0);
    assert.isTrue(process.calledOnce);
  });

  it('is able to schedule two processes as soon as possible', async () => {
    const process1 = sinon.spy();
    const process2 = sinon.spy();

    const throttler = new Throttler(10);
    void throttler.schedule(async () => {});
    await clock.tickAsync(10);
    const promiseTest = throttler.schedule(process1, true);
    void throttler.schedule(process2, true);

    assert.isFalse(process1.called);
    assert.isFalse(process2.called);
    clock.tickAsync(0);
    await promiseTest;
    assert.isFalse(process1.called);
    assert.isTrue(process2.calledOnce);
  });

  it('by default schedules a process delayed only if another process ran recently', async () => {
    const process = sinon.spy();

    const throttler = new Throttler(10);
    void throttler.schedule(process);

    assert.isFalse(process.called);
    await clock.tickAsync(0);
    assert.isTrue(process.calledOnce);
    process.resetHistory();

    void throttler.schedule(process);
    await clock.tickAsync(0);
    assert.isFalse(process.called);
    await clock.tickAsync(5);
    assert.isFalse(process.called);
    void throttler.schedule(process);
    await clock.tickAsync(5);
    assert.isTrue(process.calledOnce);

    await clock.tickAsync(11);
    process.resetHistory();
    void throttler.schedule(process);
    assert.isFalse(process.called);
    await clock.tickAsync(0);
    assert.isTrue(process.calledOnce);
  });
});
