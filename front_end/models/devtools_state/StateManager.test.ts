// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';

import * as DevToolsState from './devtools_state.js';

class FakeProvider extends Common.ObjectWrapper.ObjectWrapper<DevToolsState.State.EventTypes> implements
    DevToolsState.State.StateProvider {
  currentStates: DevToolsState.State.State[] = [];
  revealCalls: DevToolsState.State.StateKind[] = [];
  resetCalls: DevToolsState.State.StateKind[] = [];
  disposeCalls = 0;

  allStates(): DevToolsState.State.State[] {
    return this.currentStates;
  }

  async reveal(kind: DevToolsState.State.StateKind): Promise<void> {
    this.revealCalls.push(kind);
  }

  reset(kind: DevToolsState.State.StateKind): void {
    this.resetCalls.push(kind);
  }

  dispose(): void {
    this.disposeCalls++;
  }
}

describe('StateManager', () => {
  it('forwards state changes from all providers', () => {
    const first = new FakeProvider();
    const second = new FakeProvider();
    const manager = new DevToolsState.StateManager.StateManager([first, second]);
    const listener = sinon.spy();
    manager.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);

    first.dispatchEventToListeners(DevToolsState.State.Events.STATE_CHANGED, {
      kind: DevToolsState.State.StateKind.CACHE_DISABLED,
      value: true,
      isDefault: false,
    });
    second.dispatchEventToListeners(DevToolsState.State.Events.STATE_CHANGED, {
      kind: DevToolsState.State.StateKind.JAVASCRIPT_DISABLED,
      value: false,
      isDefault: true,
    });

    sinon.assert.calledTwice(listener);
    assert.deepEqual(listener.firstCall.args[0].data, {
      kind: DevToolsState.State.StateKind.CACHE_DISABLED,
      value: true,
      isDefault: false,
    });
    assert.deepEqual(listener.secondCall.args[0].data, {
      kind: DevToolsState.State.StateKind.JAVASCRIPT_DISABLED,
      value: false,
      isDefault: true,
    });
  });

  it('returns allStates, nonDefaultStates, and state(kind) across providers', () => {
    const first = new FakeProvider();
    const second = new FakeProvider();
    first.currentStates = [
      {kind: DevToolsState.State.StateKind.CACHE_DISABLED, value: true, isDefault: false},
    ];
    second.currentStates = [
      {kind: DevToolsState.State.StateKind.JAVASCRIPT_DISABLED, value: false, isDefault: true},
    ];
    const manager = new DevToolsState.StateManager.StateManager([first, second]);

    assert.deepEqual(manager.allStates(), [
      {kind: DevToolsState.State.StateKind.CACHE_DISABLED, value: true, isDefault: false},
      {kind: DevToolsState.State.StateKind.JAVASCRIPT_DISABLED, value: false, isDefault: true},
    ]);
    assert.deepEqual(manager.nonDefaultStates(), [
      {kind: DevToolsState.State.StateKind.CACHE_DISABLED, value: true, isDefault: false},
    ]);
    assert.deepEqual(manager.state(DevToolsState.State.StateKind.JAVASCRIPT_DISABLED), {
      kind: DevToolsState.State.StateKind.JAVASCRIPT_DISABLED,
      value: false,
      isDefault: true,
    });
  });

  it('returns null from state(kind) when no provider owns the kind', () => {
    const manager = new DevToolsState.StateManager.StateManager([new FakeProvider()]);

    assert.isNull(manager.state(DevToolsState.State.StateKind.CACHE_DISABLED));
  });

  it('delegates reset to all providers', () => {
    const first = new FakeProvider();
    const second = new FakeProvider();
    const manager = new DevToolsState.StateManager.StateManager([first, second]);

    manager.reset(DevToolsState.State.StateKind.CACHE_DISABLED);
    assert.deepEqual(first.resetCalls, [DevToolsState.State.StateKind.CACHE_DISABLED]);
    assert.deepEqual(second.resetCalls, [DevToolsState.State.StateKind.CACHE_DISABLED]);
  });

  it('disposes all providers on dispose', () => {
    const first = new FakeProvider();
    const second = new FakeProvider();
    const manager = new DevToolsState.StateManager.StateManager([first, second]);

    manager.dispose();

    assert.strictEqual(first.disposeCalls, 1);
    assert.strictEqual(second.disposeCalls, 1);
  });

  it('stops forwarding events after dispose', () => {
    const first = new FakeProvider();
    const manager = new DevToolsState.StateManager.StateManager([first]);
    const listener = sinon.spy();
    manager.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);

    manager.dispose();

    first.dispatchEventToListeners(DevToolsState.State.Events.STATE_CHANGED, {
      kind: DevToolsState.State.StateKind.CACHE_DISABLED,
      value: true,
      isDefault: false,
    });
    sinon.assert.notCalled(listener);
  });

  it('delegates reveal to all providers', async () => {
    const first = new FakeProvider();
    const second = new FakeProvider();
    const manager = new DevToolsState.StateManager.StateManager([first, second]);

    await manager.reveal(DevToolsState.State.StateKind.CACHE_DISABLED);

    assert.deepEqual(first.revealCalls, [DevToolsState.State.StateKind.CACHE_DISABLED]);
    assert.deepEqual(second.revealCalls, [DevToolsState.State.StateKind.CACHE_DISABLED]);
  });
});
