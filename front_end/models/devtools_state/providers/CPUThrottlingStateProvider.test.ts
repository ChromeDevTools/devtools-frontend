// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import * as DevToolsState from '../devtools_state.js';

describe('CPUThrottlingStateProvider', () => {
  setupRuntimeHooks();

  it('reports CPU throttling rate changes, including back to default', () => {
    const manager = new TestUniverse().cpuThrottlingManager;
    const provider = new DevToolsState.CPUThrottlingStateProvider.CPUThrottlingStateProvider(manager);
    const listener = sinon.spy();
    provider.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);

    manager.setCPUThrottlingRate(4);
    manager.setCPUThrottlingRate(1);

    sinon.assert.calledTwice(listener);
    assert.deepEqual(listener.firstCall.args[0].data, {
      kind: DevToolsState.State.StateKind.CPU_THROTTLING,
      value: 4,
      isDefault: false,
    });
    assert.deepEqual(listener.secondCall.args[0].data, {
      kind: DevToolsState.State.StateKind.CPU_THROTTLING,
      value: 1,
      isDefault: true,
    });
  });

  it('lists CPU throttling state', () => {
    const manager = new TestUniverse().cpuThrottlingManager;
    const provider = new DevToolsState.CPUThrottlingStateProvider.CPUThrottlingStateProvider(manager);

    assert.deepEqual(provider.allStates(), [
      {kind: DevToolsState.State.StateKind.CPU_THROTTLING, value: 1, isDefault: true},
    ]);

    manager.setCPUThrottlingRate(4);

    assert.deepEqual(provider.allStates(), [
      {kind: DevToolsState.State.StateKind.CPU_THROTTLING, value: 4, isDefault: false},
    ]);
  });

  it('resets CPU throttling only for StateKind.CPU_THROTTLING', () => {
    const manager = new TestUniverse().cpuThrottlingManager;
    const provider = new DevToolsState.CPUThrottlingStateProvider.CPUThrottlingStateProvider(manager);
    manager.setCPUThrottlingRate(4);

    provider.reset(DevToolsState.State.StateKind.CACHE_DISABLED);
    assert.strictEqual(manager.cpuThrottlingRate(), 4);

    provider.reset(DevToolsState.State.StateKind.CPU_THROTTLING);

    assert.strictEqual(manager.cpuThrottlingRate(), 1);
    assert.deepEqual(provider.allStates(), [
      {kind: DevToolsState.State.StateKind.CPU_THROTTLING, value: 1, isDefault: true},
    ]);
  });

  it('skips reset when CPU throttling already has its default rate', () => {
    const manager = new TestUniverse().cpuThrottlingManager;
    const provider = new DevToolsState.CPUThrottlingStateProvider.CPUThrottlingStateProvider(manager);
    const listener = sinon.spy();
    provider.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);

    provider.reset(DevToolsState.State.StateKind.CPU_THROTTLING);

    sinon.assert.notCalled(listener);
  });

  it('stops reporting rate changes after dispose', () => {
    const manager = new TestUniverse().cpuThrottlingManager;
    const provider = new DevToolsState.CPUThrottlingStateProvider.CPUThrottlingStateProvider(manager);
    const listener = sinon.spy();
    provider.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);

    provider.dispose();
    manager.setCPUThrottlingRate(4);

    sinon.assert.notCalled(listener);
  });
});
