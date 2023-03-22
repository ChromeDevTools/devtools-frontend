// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../../../front_end/core/common/common.js';
import * as Network from '../../../../../front_end/panels/network/network.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

describeWithMockConnection('BlockedURLsPane', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    target = createTarget();
  });

  const updatesOnEvent = (inScope: boolean) => async () => {
    const updateThrottler = {schedule: sinon.stub()};
    Network.BlockedURLsPane.BlockedURLsPane.instance(
        {forceNew: true, updateThrottler: updateThrottler as unknown as Common.Throttler.Throttler});
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assertNotNullOrUndefined(networkManager);
    assert.isFalse(updateThrottler.schedule.called);
    networkManager.dispatchEventToListeners(
        SDK.NetworkManager.Events.RequestFinished,
        {wasBlocked: () => true, url: () => 'http://example.com'} as SDK.NetworkRequest.NetworkRequest);
    assert.strictEqual(updateThrottler.schedule.called, inScope);
  };

  it('updates on in scope request', updatesOnEvent(true));
  it('does not update on out of scope request', updatesOnEvent(false));
});
