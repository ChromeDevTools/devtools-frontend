// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';

import * as SDK from './sdk.js';

describeWithEnvironment('CPUThrottlingManager', () => {
  it('can get the current hardwareConcurrency.', async () => {
    const connection = new MockCDPConnection();
    connection.setHandler('Runtime.evaluate', ({expression}) => {
      assert.strictEqual(expression, 'navigator.hardwareConcurrency');
      return {result: {result: {value: 42, type: Protocol.Runtime.RemoteObjectType.Number}}};
    });
    createTarget({connection});

    const manager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
    const concurrency = await manager.getHardwareConcurrency();
    assert.strictEqual(concurrency, 42);
  });

  it('can set the current hardwareConcurrency', async () => {
    const cdpStub = sinon.stub(createTarget().emulationAgent(), 'invoke_setHardwareConcurrencyOverride').resolves();

    const manager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
    manager.setHardwareConcurrency(5);

    sinon.assert.calledOnce(cdpStub);
    sinon.assert.calledWithExactly(cdpStub, {hardwareConcurrency: 5});
  });

  it('does not set concurrency to 0 or negative numbers', async () => {
    const cdpStub = sinon.stub(createTarget().emulationAgent(), 'invoke_setHardwareConcurrencyOverride').resolves();

    const manager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
    manager.setHardwareConcurrency(0);
    sinon.assert.notCalled(cdpStub);

    manager.setHardwareConcurrency(-1);
    sinon.assert.notCalled(cdpStub);
  });
});
