// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../../test/api/mocha-interface.js';
import * as Protocol from '../../generated/protocol.js';
import type * as Common from '../common/common.js';

import * as SDK from './sdk.js';

describe('NetworkManager API Test', () => {
  it('disables cache when request interception is enabled', async ({universe}) => {
    const multitargetNetworkManager = universe.get(SDK.NetworkManager.MultitargetNetworkManager);
    const cacheDisabledSetting = universe.settings.resolve(SDK.SDKSettings.cacheDisabledSettingDescriptor);
    assert.isFalse(cacheDisabledSetting.get());
    assert.isFalse(multitargetNetworkManager.isIntercepting());

    const events: string[] = [];
    const onCacheDisabledChanged = ({data: enabled}: Common.EventTarget.EventTargetEvent<boolean>): void => {
      assert.strictEqual(enabled, cacheDisabledSetting.get());
      events.push(`Cache Settings changed to: ${cacheDisabledSetting.get()}`);
    };
    cacheDisabledSetting.addChangeListener(onCacheDisabledChanged);

    try {
      events.push('Enabling Interception');
      await multitargetNetworkManager.setInterceptionHandlerForPatterns(
          [{urlPattern: '*', requestStage: Protocol.Fetch.RequestStage.Request}],
          () => Promise.resolve(),
      );
      events.push('Interception Enabled');

      assert.deepEqual(events, [
        'Enabling Interception',
        'Cache Settings changed to: true',
        'Interception Enabled',
      ]);
      assert.isTrue(cacheDisabledSetting.get());
      assert.isTrue(multitargetNetworkManager.isIntercepting());
    } finally {
      cacheDisabledSetting.removeChangeListener(onCacheDisabledChanged);
    }
  });
});
