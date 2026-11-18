// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../../core/sdk/sdk.js';
import {createSettingsForTest} from '../../../testing/SettingsHelpers.js';
import * as DevToolsState from '../devtools_state.js';

describe('SettingsStateProvider', () => {
  it('reports tracked setting changes, including back to default', () => {
    const settings = createSettingsForTest();
    const provider = new DevToolsState.SettingsStateProvider.SettingsStateProvider(settings);
    const listener = sinon.spy();
    provider.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);
    const cacheDisabled = settings.resolve(SDK.SDKSettings.cacheDisabledSettingDescriptor);

    cacheDisabled.set(true);
    cacheDisabled.set(false);

    sinon.assert.calledTwice(listener);
    assert.deepEqual(listener.firstCall.args[0].data, {
      kind: DevToolsState.State.StateKind.CACHE_DISABLED,
      value: true,
      isDefault: false,
    });
    assert.deepEqual(listener.secondCall.args[0].data, {
      kind: DevToolsState.State.StateKind.CACHE_DISABLED,
      value: false,
      isDefault: true,
    });
  });

  it('ignores untracked setting changes', () => {
    const settings = createSettingsForTest();
    const provider = new DevToolsState.SettingsStateProvider.SettingsStateProvider(settings);
    const listener = sinon.spy();
    provider.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);

    settings.createSetting('untracked-setting', false).set(true);

    sinon.assert.notCalled(listener);
  });

  it('lists all tracked settings with their values and default status', () => {
    const settings = createSettingsForTest();
    const provider = new DevToolsState.SettingsStateProvider.SettingsStateProvider(settings);
    const cacheDisabled = settings.resolve(SDK.SDKSettings.cacheDisabledSettingDescriptor);

    assert.deepEqual(provider.allStates(), [
      {kind: DevToolsState.State.StateKind.CACHE_DISABLED, value: false, isDefault: true},
      {kind: DevToolsState.State.StateKind.JAVASCRIPT_DISABLED, value: false, isDefault: true},
    ]);

    cacheDisabled.set(true);

    assert.deepEqual(provider.allStates(), [
      {kind: DevToolsState.State.StateKind.CACHE_DISABLED, value: true, isDefault: false},
      {kind: DevToolsState.State.StateKind.JAVASCRIPT_DISABLED, value: false, isDefault: true},
    ]);
  });

  it('resets a single tracked setting', () => {
    const settings = createSettingsForTest();
    const provider = new DevToolsState.SettingsStateProvider.SettingsStateProvider(settings);
    const cacheDisabled = settings.resolve(SDK.SDKSettings.cacheDisabledSettingDescriptor);
    const jsDisabled = settings.resolve(SDK.SDKSettings.javaScriptDisabledSettingDescriptor);
    cacheDisabled.set(true);
    jsDisabled.set(true);

    provider.reset(DevToolsState.State.StateKind.JAVASCRIPT_DISABLED);

    assert.isFalse(jsDisabled.get());
    assert.isTrue(cacheDisabled.get());
    assert.deepEqual(provider.allStates(), [
      {kind: DevToolsState.State.StateKind.CACHE_DISABLED, value: true, isDefault: false},
      {kind: DevToolsState.State.StateKind.JAVASCRIPT_DISABLED, value: false, isDefault: true},
    ]);
  });

  it('skips reset when the setting already has its default value', () => {
    const settings = createSettingsForTest();
    const provider = new DevToolsState.SettingsStateProvider.SettingsStateProvider(settings);
    const listener = sinon.spy();
    provider.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);

    provider.reset(DevToolsState.State.StateKind.JAVASCRIPT_DISABLED);

    sinon.assert.notCalled(listener);
  });

  it('stops reporting setting changes after dispose', () => {
    const settings = createSettingsForTest();
    const provider = new DevToolsState.SettingsStateProvider.SettingsStateProvider(settings);
    const listener = sinon.spy();
    provider.addEventListener(DevToolsState.State.Events.STATE_CHANGED, listener);

    provider.dispose();
    settings.resolve(SDK.SDKSettings.cacheDisabledSettingDescriptor).set(true);

    sinon.assert.notCalled(listener);
  });
});
