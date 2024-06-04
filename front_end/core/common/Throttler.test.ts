// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

const {Throttler, Scheduling} = Common.Throttler;

describe('Throttler class', () => {
  let clock: sinon.SinonFakeTimers;
  let throttler: Common.Throttler.Throttler;

  const TIMEOUT = 10;

  beforeEach(async () => {
    clock = sinon.useFakeTimers();
    // When nothing was run, throttler has 0 as the last exectution time.
    // With mock time, current time is also 0 initially. Advance the clock
    // to get more realistic initial state.
    await ensureNoRecentRun();
  });

  afterEach(() => {
    clock.restore();
  });

  function ensureNoRecentRun() {
    clock.tick(TIMEOUT + 1);
  }

  async function ensureHasRecentRun() {
    void throttler.schedule(async () => {});
    await clock.tickAsync(TIMEOUT);
  }

  it('is able to schedule a process as soon as possible', async () => {
    const process = sinon.spy();

    throttler = new Throttler(TIMEOUT);
    await ensureHasRecentRun();
    void throttler.schedule(process, Scheduling.AsSoonAsPossible);

    assert.isFalse(process.called);
    await clock.tickAsync(0);
    assert.isTrue(process.calledOnce);
  });

  it('is able to schedule two processes as soon as possible', async () => {
    const process1 = sinon.spy();
    const process2 = sinon.spy();

    throttler = new Throttler(TIMEOUT);
    await ensureHasRecentRun();
    const promiseTest = throttler.schedule(process1, Scheduling.AsSoonAsPossible);
    void throttler.schedule(process2, Scheduling.AsSoonAsPossible);

    assert.isFalse(process1.called);
    assert.isFalse(process2.called);
    clock.tickAsync(0);
    await promiseTest;
    assert.isFalse(process1.called);
    assert.isTrue(process2.calledOnce);
  });

  it('by default schedules a process delayed only if another process ran recently', async () => {
    const process = sinon.spy();

    throttler = new Throttler(TIMEOUT);
    void throttler.schedule(process);

    assert.isFalse(process.called);
    await clock.tickAsync(0);
    assert.isTrue(process.calledOnce);
    process.resetHistory();

    void throttler.schedule(process);
    await clock.tickAsync(0);
    assert.isFalse(process.called);
    await clock.tickAsync(TIMEOUT / 2);
    assert.isFalse(process.called);
    void throttler.schedule(process);
    await clock.tickAsync(TIMEOUT / 2);
    assert.isTrue(process.calledOnce);

    await ensureNoRecentRun();
    process.resetHistory();
    void throttler.schedule(process);
    assert.isFalse(process.called);
    await clock.tickAsync(0);
    assert.isTrue(process.calledOnce);
  });

  it('is able to schedule a delayed process', async () => {
    const process = sinon.spy();

    const throttler = new Throttler(10);
    void throttler.schedule(process, Scheduling.Delayed);

    assert.isFalse(process.called);
    await clock.tickAsync(0);
    assert.isFalse(process.called);
    await clock.tickAsync(10);
    assert.isTrue(process.calledOnce);
  });
});
