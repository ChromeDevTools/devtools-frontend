// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';

import * as SDK from './sdk.js';

describeWithMockConnection('CPUThrottlingManager', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    // We need one target since CPUThrottlingManager gets it from TargetManager.
    target = createTarget();
  });

  it('can get the current hardwareConcurrency.', async () => {
    setMockConnectionResponseHandler('Runtime.evaluate', ({expression}) => {
      assert.strictEqual(expression, 'navigator.hardwareConcurrency');
      return ({getError: () => undefined, result: {value: 42}});
    });

    const manager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();
    const concurrency = await manager.getHardwareConcurrency();
    assert.strictEqual(concurrency, 42);
  });

  it('can set the current hardwareConcurrency', async () => {
    const cdpStub = sinon.stub(target.emulationAgent(), 'invoke_setHardwareConcurrencyOverride').resolves();

    const manager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();
    manager.setHardwareConcurrency(5);

    assert.isTrue(cdpStub.calledOnce);
    assert.isTrue(cdpStub.calledWithExactly({hardwareConcurrency: 5}));
  });

  it('does not set concurrency to 0 or negative numbers', async () => {
    const cdpStub = sinon.stub(target.emulationAgent(), 'invoke_setHardwareConcurrencyOverride').resolves();

    const manager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();
    manager.setHardwareConcurrency(0);
    assert.isFalse(cdpStub.called);

    manager.setHardwareConcurrency(-1);
    assert.isFalse(cdpStub.called);
  });
});
