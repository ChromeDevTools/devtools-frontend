// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

const {Throttler, Scheduling} = Common.Throttler;

describe('Throttler class', () => {
  let consoleStub: sinon.SinonStub;
  let clock: sinon.SinonFakeTimers;
  let throttler: Common.Throttler.Throttler;

  const TIMEOUT = 10;

  beforeEach(async () => {
    consoleStub = sinon.stub(console, 'error');
    clock = sinon.useFakeTimers();
    // When nothing was run, throttler has 0 as the last exectution time.
    // With mock time, current time is also 0 initially. Advance the clock
    // to get more realistic initial state.
    await ensureNoRecentRun();
  });

  afterEach(() => {
    clock.restore();
    consoleStub.restore();
  });

  function ensureNoRecentRun() {
    clock.tick(TIMEOUT + 1);
  }

  async function ensureHasRecentRun() {
    void throttler.schedule(async () => {});
    await clock.tickAsync(TIMEOUT);
  }

  it('is able to schedule a process', async () => {
    const process = sinon.spy();

    throttler = new Throttler(TIMEOUT);
    await ensureHasRecentRun();
    void throttler.schedule(process);

    sinon.assert.notCalled(process);
    await clock.tickAsync(TIMEOUT + 1);
    sinon.assert.calledOnce(process);
  });

  it('is able to schedule a process from process', async () => {
    const process2 = sinon.spy();
    const process1 = sinon.stub().callsFake(() => {
      void throttler.schedule(process2);
    });

    throttler = new Throttler(TIMEOUT);
    await ensureHasRecentRun();
    void throttler.schedule(process1);

    sinon.assert.notCalled(process1);
    assert.isFalse(process2.calledOnce);
    await clock.tickAsync(TIMEOUT + 1);
    sinon.assert.calledOnce(process1);
    assert.isFalse(process2.calledOnce);
    await clock.tickAsync(TIMEOUT + 1);
    sinon.assert.calledOnce(process1);
    sinon.assert.calledOnce(process2);
  });

  it('is able to schedule a process as soon as possible', async () => {
    const process = sinon.spy();

    throttler = new Throttler(TIMEOUT);
    await ensureHasRecentRun();
    void throttler.schedule(process, Scheduling.AS_SOON_AS_POSSIBLE);

    sinon.assert.notCalled(process);
    await clock.tickAsync(0);
    sinon.assert.calledOnce(process);
  });

  it('is able to schedule two processes as soon as possible', async () => {
    const process1 = sinon.spy();
    const process2 = sinon.spy();

    throttler = new Throttler(TIMEOUT);
    await ensureHasRecentRun();
    const promiseTest = throttler.schedule(process1, Scheduling.AS_SOON_AS_POSSIBLE);
    void throttler.schedule(process2, Scheduling.AS_SOON_AS_POSSIBLE);

    sinon.assert.notCalled(process1);
    sinon.assert.notCalled(process2);
    void clock.tickAsync(0);
    await promiseTest;
    sinon.assert.notCalled(process1);
    sinon.assert.calledOnce(process2);
  });

  it('by default schedules a process delayed only if another process ran recently', async () => {
    const process = sinon.spy();

    throttler = new Throttler(TIMEOUT);
    void throttler.schedule(process);

    sinon.assert.notCalled(process);
    await clock.tickAsync(0);
    sinon.assert.calledOnce(process);
    process.resetHistory();

    void throttler.schedule(process);
    await clock.tickAsync(0);
    sinon.assert.notCalled(process);
    await clock.tickAsync(TIMEOUT / 2);
    sinon.assert.notCalled(process);
    void throttler.schedule(process);
    await clock.tickAsync(TIMEOUT / 2);
    sinon.assert.calledOnce(process);

    await ensureNoRecentRun();
    process.resetHistory();
    void throttler.schedule(process);
    sinon.assert.notCalled(process);
    await clock.tickAsync(0);
    sinon.assert.calledOnce(process);
  });

  it('is able to schedule a delayed process', async () => {
    const process = sinon.spy();

    const throttler = new Throttler(TIMEOUT);
    void throttler.schedule(process, Scheduling.DELAYED);

    sinon.assert.notCalled(process);
    await clock.tickAsync(0);
    sinon.assert.notCalled(process);
    await clock.tickAsync(TIMEOUT);
    sinon.assert.calledOnce(process);
  });

  it('runs only one process at a time', async () => {
    throttler = new Throttler(50);

    const {promise: process1Promise, resolve: process1Resolve} = Promise.withResolvers<void>();
    const {promise: process2Promise, resolve: process2Resolve} = Promise.withResolvers<void>();
    const spy1 = sinon.spy();
    const spy2 = sinon.spy();
    const process1 = () => {
      spy1();
      return process1Promise;
    };
    const process2 = () => {
      spy2();
      return process2Promise;
    };

    void throttler.schedule(process1, Scheduling.AS_SOON_AS_POSSIBLE);

    await clock.tickAsync(0);
    sinon.assert.called(spy1);

    void throttler.schedule(process2);
    await clock.tickAsync(100);
    sinon.assert.notCalled(spy2);

    process1Resolve();
    await clock.tickAsync(0);
    sinon.assert.notCalled(spy2);

    await clock.tickAsync(50);
    sinon.assert.called(spy2);

    process2Resolve();  // No pending promises.
  });

  it('is resolve when process throws', async () => {
    const process = sinon.stub().throws(new Error('Process error'));

    const throttler = new Throttler(TIMEOUT);
    const promise = throttler.schedule(process, Scheduling.DELAYED);

    sinon.assert.notCalled(process);
    await clock.tickAsync(TIMEOUT + 1);
    sinon.assert.calledOnce(process);
    const race = await Promise.race([promise, Promise.resolve('pending')]);
    assert.notStrictEqual(race, 'pending');
    sinon.assert.calledOnce(consoleStub);
  });

  it('is resolve promise correctly', async () => {
    const process = sinon.spy();

    const throttler = new Throttler(TIMEOUT);
    const promise = throttler.schedule(process, Scheduling.DELAYED);

    let race = await Promise.race([promise, Promise.resolve('pending')]);
    assert.strictEqual(race, 'pending');
    await clock.tickAsync(0);
    race = await Promise.race([promise, Promise.resolve('pending')]);
    assert.strictEqual(race, 'pending');
    await clock.tickAsync(TIMEOUT + 1);
    race = await Promise.race([promise, Promise.resolve('pending')]);
    assert.notStrictEqual(race, 'pending');
  });

  it('runs the last scheduled', async () => {
    const process1 = sinon.spy();
    const process2 = sinon.spy();
    const process3 = sinon.spy();
    const throttler = new Throttler(TIMEOUT);
    void throttler.schedule(process1, Scheduling.DELAYED);
    void throttler.schedule(process2, Scheduling.DELAYED);
    void throttler.schedule(process3, Scheduling.DELAYED);

    assert.isFalse(process1.calledOnce);
    assert.isFalse(process2.calledOnce);
    assert.isFalse(process3.calledOnce);
    await clock.tickAsync(0);
    assert.isFalse(process1.calledOnce);
    assert.isFalse(process2.calledOnce);
    assert.isFalse(process3.calledOnce);
    await clock.tickAsync(TIMEOUT + 1);
    assert.isFalse(process1.calledOnce);
    assert.isFalse(process2.calledOnce);
    sinon.assert.calledOnce(process3);
  });
});
