// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import * as DevToolsState from '../devtools_state.js';

describe('NetworkStateProvider', () => {
  setupRuntimeHooks();

  afterEach(() => {
    Common.Revealer.RevealerRegistry.removeInstance();
  });

  it('reports custom user agent changes, including back to default', () => {
    const networkManager = new TestUniverse().multitargetNetworkManager;
    const provider = new DevToolsState.NetworkStateProvider.NetworkStateProvider(networkManager);
    const listener = sinon.spy();
    provider.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);

    networkManager.setCustomUserAgentOverride('CustomAgent');
    networkManager.setCustomUserAgentOverride('');

    sinon.assert.calledTwice(listener);
    assert.deepEqual(listener.firstCall.args[0].data, {
      kind: DevToolsState.State.StateKind.USER_AGENT,
      value: 'CustomAgent',
      isDefault: false,
    });
    assert.deepEqual(listener.secondCall.args[0].data, {
      kind: DevToolsState.State.StateKind.USER_AGENT,
      value: '',
      isDefault: true,
    });
  });

  it('ignores emulated user agent changes', () => {
    const networkManager = new TestUniverse().multitargetNetworkManager;
    const provider = new DevToolsState.NetworkStateProvider.NetworkStateProvider(networkManager);
    const listener = sinon.spy();
    provider.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);

    networkManager.setUserAgentOverride('MobileBot', null);
    networkManager.setUserAgentOverride('', null);

    sinon.assert.notCalled(listener);
  });

  it('ignores enabling custom user agent when value stays empty', () => {
    const networkManager = new TestUniverse().multitargetNetworkManager;
    const provider = new DevToolsState.NetworkStateProvider.NetworkStateProvider(networkManager);
    const listener = sinon.spy();
    provider.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);

    networkManager.setCustomUserAgentEnabled(true);

    sinon.assert.notCalled(listener);
  });

  it('ignores resetting custom user agent when value is already empty', () => {
    const networkManager = new TestUniverse().multitargetNetworkManager;
    const provider = new DevToolsState.NetworkStateProvider.NetworkStateProvider(networkManager);
    const listener = sinon.spy();
    provider.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);

    networkManager.setCustomUserAgentOverride('CustomAgent');
    networkManager.setCustomUserAgentOverride('');
    listener.resetHistory();

    provider.reset(DevToolsState.State.StateKind.USER_AGENT);

    sinon.assert.notCalled(listener);
  });

  it('lists user agent state', () => {
    const networkManager = new TestUniverse().multitargetNetworkManager;
    const provider = new DevToolsState.NetworkStateProvider.NetworkStateProvider(networkManager);

    assert.deepEqual(provider.allStates(), [
      {kind: DevToolsState.State.StateKind.USER_AGENT, value: '', isDefault: true},
    ]);

    networkManager.setCustomUserAgentOverride('CustomAgent');

    assert.deepEqual(provider.allStates(), [
      {kind: DevToolsState.State.StateKind.USER_AGENT, value: 'CustomAgent', isDefault: false},
    ]);
  });

  it('resets custom user agent only for StateKind.USER_AGENT', () => {
    const networkManager = new TestUniverse().multitargetNetworkManager;
    const provider = new DevToolsState.NetworkStateProvider.NetworkStateProvider(networkManager);
    networkManager.setCustomUserAgentOverride('CustomAgent');

    provider.reset(DevToolsState.State.StateKind.CPU_THROTTLING);
    assert.strictEqual(networkManager.currentUserAgent(), 'CustomAgent');

    provider.reset(DevToolsState.State.StateKind.USER_AGENT);

    assert.isFalse(networkManager.customUserAgentEnabled());
    assert.strictEqual(networkManager.currentUserAgent(), '');
    assert.deepEqual(provider.allStates(), [
      {kind: DevToolsState.State.StateKind.USER_AGENT, value: '', isDefault: true},
    ]);
  });

  it('does not reset emulated user agent override', () => {
    const networkManager = new TestUniverse().multitargetNetworkManager;
    const provider = new DevToolsState.NetworkStateProvider.NetworkStateProvider(networkManager);
    networkManager.setUserAgentOverride('MobileBot', null);

    provider.reset(DevToolsState.State.StateKind.USER_AGENT);

    assert.strictEqual(networkManager.currentUserAgent(), 'MobileBot');
    assert.deepEqual(provider.allStates(), [
      {kind: DevToolsState.State.StateKind.USER_AGENT, value: '', isDefault: true},
    ]);
  });

  it('skips reset when user agent already has its default value', () => {
    const networkManager = new TestUniverse().multitargetNetworkManager;
    const provider = new DevToolsState.NetworkStateProvider.NetworkStateProvider(networkManager);
    const listener = sinon.spy();
    provider.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);

    provider.reset(DevToolsState.State.StateKind.USER_AGENT);

    sinon.assert.notCalled(listener);
  });

  it('stops reporting user agent changes after dispose', () => {
    const networkManager = new TestUniverse().multitargetNetworkManager;
    const provider = new DevToolsState.NetworkStateProvider.NetworkStateProvider(networkManager);
    const listener = sinon.spy();
    provider.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);

    provider.dispose();
    networkManager.setCustomUserAgentOverride('CustomAgent');

    sinon.assert.notCalled(listener);
  });

  it('reveals user agent override and ignores other state kinds', async () => {
    const networkManager = new TestUniverse().multitargetNetworkManager;
    const provider = new DevToolsState.NetworkStateProvider.NetworkStateProvider(networkManager);
    const reveal = sinon.stub().resolves();
    Common.Revealer.registerRevealer({
      contextTypes() {
        return [SDK.NetworkManager.RevealableCustomUserAgent];
      },
      async loadRevealer() {
        return {reveal};
      },
    });

    await provider.reveal(DevToolsState.State.StateKind.USER_AGENT);
    await provider.reveal(DevToolsState.State.StateKind.CPU_THROTTLING);

    sinon.assert.calledOnceWithExactly(reveal, sinon.match.instanceOf(SDK.NetworkManager.RevealableCustomUserAgent),
                                       false);
  });
});
