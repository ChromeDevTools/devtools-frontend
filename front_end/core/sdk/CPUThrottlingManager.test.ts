// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Protocol from '../../generated/protocol.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as SDK from './sdk.js';

const {CPUPerformanceTier, tierToNumber} = SDK.CPUThrottlingManager;
type CPUPerformanceTier = SDK.CPUThrottlingManager.CPUPerformanceTier;

describe('CPUThrottlingManager', () => {
  setupSettingsHooks();  // For the MultitargetNetworkManager.
  setupRuntimeHooks();

  it('can get the current hardwareConcurrency.', async () => {
    const universe = new TestUniverse();
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('Runtime.evaluate', ({expression}) => {
      assert.strictEqual(expression, 'navigator.hardwareConcurrency');
      return {result: {value: 42, type: Protocol.Runtime.RemoteObjectType.Number}};
    });
    universe.createTarget({connection});

    const manager = universe.cpuThrottlingManager;
    const concurrency = await manager.getHardwareConcurrency();
    assert.strictEqual(concurrency, 42);
  });

  it('can set the current hardwareConcurrency', async () => {
    const universe = new TestUniverse();
    const cdpStub =
        sinon.stub(universe.createTarget().emulationAgent(), 'invoke_setHardwareConcurrencyOverride').resolves();

    const manager = universe.cpuThrottlingManager;
    manager.setHardwareConcurrency(5);

    sinon.assert.calledOnce(cdpStub);
    sinon.assert.calledWithExactly(cdpStub, {hardwareConcurrency: 5});
  });

  it('does not set concurrency to 0 or negative numbers', async () => {
    const universe = new TestUniverse();
    const cdpStub =
        sinon.stub(universe.createTarget().emulationAgent(), 'invoke_setHardwareConcurrencyOverride').resolves();

    const manager = universe.cpuThrottlingManager;
    manager.setHardwareConcurrency(0);
    sinon.assert.notCalled(cdpStub);

    manager.setHardwareConcurrency(-1);
    sinon.assert.notCalled(cdpStub);
  });

  async function createManagerWithHostTier(
      universe: TestUniverse, hostTier: CPUPerformanceTier): Promise<SDK.CPUThrottlingManager.CPUThrottlingManager> {
    const connection = new MockCDPConnection();
    const tierValue = tierToNumber(hostTier);
    connection.setSuccessHandler('Runtime.evaluate', ({expression}) => {
      assert.strictEqual(expression, 'navigator.cpuPerformance');
      return {result: {value: tierValue, type: Protocol.Runtime.RemoteObjectType.Number}};
    });
    universe.createTarget({connection});
    const manager = universe.cpuThrottlingManager;
    manager.initialize();
    await manager.updateHostDefaultCPUPerformanceTier();
    return manager;
  }

  it('can set and clear the current CPU performance tier', async () => {
    const universe = new TestUniverse();
    const cdpSpy = sinon.spy(universe.createTarget().emulationAgent(), 'invoke_setCPUPerformanceOverride');

    const manager = universe.cpuThrottlingManager;
    manager.initialize();

    // Default startup dispatches a clear command.
    sinon.assert.calledOnce(cdpSpy);
    sinon.assert.calledWithExactly(cdpSpy, {performanceTier: undefined});
    cdpSpy.resetHistory();

    // Setting a tier dispatches the override.
    manager.setCPUPerformanceTier(CPUPerformanceTier.Low);
    sinon.assert.calledOnce(cdpSpy);
    sinon.assert.calledWithExactly(cdpSpy, {performanceTier: CPUPerformanceTier.Low});

    cdpSpy.resetHistory();

    // Changing the tier dispatches the new override.
    manager.setCPUPerformanceTier(CPUPerformanceTier.Mid);
    sinon.assert.calledOnce(cdpSpy);
    sinon.assert.calledWithExactly(cdpSpy, {performanceTier: CPUPerformanceTier.Mid});

    cdpSpy.resetHistory();

    // Setting back to undefined (no override) dispatches clear command.
    manager.setCPUPerformanceTier(undefined);
    sinon.assert.calledOnce(cdpSpy);
    sinon.assert.calledWithExactly(cdpSpy, {performanceTier: undefined});
  });

  it('dispatches CPU performance tier when throttling rate changes', async () => {
    const universe = new TestUniverse();
    const manager = await createManagerWithHostTier(universe, CPUPerformanceTier.Ultra);
    const target = universe.targetManager.primaryPageTarget();
    assert.exists(target);
    const cdpSpy = sinon.spy(target.emulationAgent(), 'invoke_setCPUPerformanceOverride');

    // Setting throttling rate to 4x (Mid tier) dispatches the override.
    manager.setCPUThrottlingRate(4);
    sinon.assert.calledWith(cdpSpy, {performanceTier: CPUPerformanceTier.Mid});

    cdpSpy.resetHistory();

    // Setting throttling rate back to 1x clears the override.
    manager.setCPUThrottlingRate(1);
    sinon.assert.calledOnce(cdpSpy);
    sinon.assert.calledWithExactly(cdpSpy, {performanceTier: undefined});
  });

  it('listens to changes in CPU performance setting and dispatches events', () => {
    const universe = new TestUniverse();
    const manager = universe.cpuThrottlingManager;
    manager.initialize();

    const spy = sinon.spy();
    manager.addEventListener(SDK.CPUThrottlingManager.Events.CPU_PERFORMANCE_TIER_CHANGED, spy);

    assert.isUndefined(manager.effectiveCPUPerformanceTier());

    manager.setCPUPerformanceTier(CPUPerformanceTier.Low);
    sinon.assert.calledWith(spy, sinon.match({data: CPUPerformanceTier.Low}));
    assert.strictEqual(manager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);

    manager.setCPUPerformanceTier(CPUPerformanceTier.High);
    sinon.assert.calledWith(spy, sinon.match({data: CPUPerformanceTier.High}));
    assert.strictEqual(manager.effectiveCPUPerformanceTier(), CPUPerformanceTier.High);

    manager.setCPUPerformanceTier(undefined);
    sinon.assert.calledWith(spy, sinon.match({data: undefined}));
    assert.isUndefined(manager.effectiveCPUPerformanceTier());
  });

  it('calculates effective CPU performance tier based on throttling rate (uncalibrated)', async () => {
    const universe = new TestUniverse();
    const manager = await createManagerWithHostTier(universe, CPUPerformanceTier.Ultra);
    const spy = sinon.spy();
    manager.addEventListener(SDK.CPUThrottlingManager.Events.CPU_PERFORMANCE_TIER_CHANGED, spy);

    const checkTier = (rate: number) => {
      manager.setCPUThrottlingRate(rate);
      return manager.effectiveCPUPerformanceTier();
    };

    assert.strictEqual(checkTier(1), CPUPerformanceTier.Ultra);
    assert.strictEqual(checkTier(2), CPUPerformanceTier.Mid);
    assert.strictEqual(checkTier(4), CPUPerformanceTier.Mid);
    assert.strictEqual(checkTier(6), CPUPerformanceTier.Low);
    assert.strictEqual(checkTier(20), CPUPerformanceTier.Low);

    sinon.assert.calledWith(spy, sinon.match({data: CPUPerformanceTier.Low}));
  });

  it('calculates effective CPU performance tier when both low and mid calibration options are valid', async () => {
    const universe = new TestUniverse();
    const manager = await createManagerWithHostTier(universe, CPUPerformanceTier.High);
    const spy = sinon.spy();
    manager.addEventListener(SDK.CPUThrottlingManager.Events.CPU_PERFORMANCE_TIER_CHANGED, spy);

    const setting = universe.settings.createSetting('calibrated-cpu-throttling', {});
    setting.set({
      low: 4.5,
      mid: 1.2,
      actualScore: 1200,
    });

    manager.setCPUThrottlingRate(4);
    sinon.assert.calledWith(spy, sinon.match({data: CPUPerformanceTier.Low}));
    assert.strictEqual(manager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);
  });

  it('calculates effective CPU performance tier when only low calibration option is valid (mid is DEVICE_TOO_WEAK)',
     async () => {
       const universe = new TestUniverse();
       const manager = await createManagerWithHostTier(universe, CPUPerformanceTier.Mid);
       const spy = sinon.spy();
       manager.addEventListener(SDK.CPUThrottlingManager.Events.CPU_PERFORMANCE_TIER_CHANGED, spy);

       const setting = universe.settings.createSetting('calibrated-cpu-throttling', {});
       setting.set({
         low: 1.8,
         mid: 'DEVICE_TOO_WEAK',
         actualScore: 480,
       });

       manager.setCPUThrottlingRate(2);
       sinon.assert.calledWith(spy, sinon.match({data: CPUPerformanceTier.Low}));
       assert.strictEqual(manager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);
     });

  it('calculates effective CPU performance tier when neither low nor mid calibration options are valid (both DEVICE_TOO_WEAK)',
     async () => {
       const universe = new TestUniverse();
       const manager = await createManagerWithHostTier(universe, CPUPerformanceTier.Low);
       const spy = sinon.spy();
       manager.addEventListener(SDK.CPUThrottlingManager.Events.CPU_PERFORMANCE_TIER_CHANGED, spy);

       const setting = universe.settings.createSetting('calibrated-cpu-throttling', {});
       setting.set({
         low: 'DEVICE_TOO_WEAK',
         mid: 'DEVICE_TOO_WEAK',
         actualScore: 180,
       });

       manager.setCPUThrottlingRate(2);
       sinon.assert.calledWith(spy, sinon.match({data: CPUPerformanceTier.Low}));
       assert.strictEqual(manager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);
     });

  it('prioritizes manual CPU performance override over throttling rate', async () => {
    const universe = new TestUniverse();
    const manager = await createManagerWithHostTier(universe, CPUPerformanceTier.Ultra);

    // Apply manual override to Low.
    manager.setCPUPerformanceTier(CPUPerformanceTier.Low);
    assert.strictEqual(manager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);

    // Enable 4x throttling (which would normally calculate to Mid).
    manager.setCPUThrottlingRate(4);
    assert.strictEqual(manager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);

    // Clear manual override -> should fall back to Mid (from 4x throttling).
    manager.setCPUPerformanceTier(undefined);
    assert.strictEqual(manager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Mid);
  });

  it('applies active CPU performance override to newly attached targets', async () => {
    const universe = new TestUniverse();
    const manager = await createManagerWithHostTier(universe, CPUPerformanceTier.Ultra);

    manager.setCPUPerformanceTier(CPUPerformanceTier.Low);

    // Attach a second target (e.g. iframe or worker)
    const secondTarget = universe.createTarget();
    const emulationModel = secondTarget.model(SDK.EmulationModel.EmulationModel);
    assert.exists(emulationModel);

    const cdpSpy = sinon.spy(secondTarget.emulationAgent(), 'invoke_setCPUPerformanceOverride');

    // Trigger modelAdded for the new target
    manager.modelAdded(emulationModel);

    sinon.assert.calledOnce(cdpSpy);
    sinon.assert.calledWithExactly(cdpSpy, {performanceTier: CPUPerformanceTier.Low});
  });

  it('exhaustively covers all protocol CPUPerformanceTier enum variants', () => {
    // Compile-time check: fails build if a new tier is added to Emulation.pdl
    const allTiers: Record<CPUPerformanceTier, true> = {
      [CPUPerformanceTier.Unknown]: true,
      [CPUPerformanceTier.Low]: true,
      [CPUPerformanceTier.Mid]: true,
      [CPUPerformanceTier.High]: true,
      [CPUPerformanceTier.Ultra]: true,
    };
    assert.exists(allTiers);
  });
});
