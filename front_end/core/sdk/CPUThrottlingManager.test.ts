// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as SDK from './sdk.js';

describe('CPUThrottlingManager', () => {
  // TODO(crbug.com/490892816): Remove once NetworkManager pulls `Settings` from DevToolsContext
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;
  beforeEach(() => {
    universe = new TestUniverse();
  });

  it('can get the current hardwareConcurrency.', async () => {
    const connection = new MockCDPConnection();
    connection.setHandler('Runtime.evaluate', ({expression}) => {
      assert.strictEqual(expression, 'navigator.hardwareConcurrency');
      return {result: {result: {value: 42, type: Protocol.Runtime.RemoteObjectType.Number}}};
    });
    universe.createTarget({connection});

    const manager = new SDK.CPUThrottlingManager.CPUThrottlingManager(universe.settings, universe.targetManager);
    const concurrency = await manager.getHardwareConcurrency();
    assert.strictEqual(concurrency, 42);
  });

  it('can set the current hardwareConcurrency', async () => {
    const cdpStub =
        sinon.stub(universe.createTarget().emulationAgent(), 'invoke_setHardwareConcurrencyOverride').resolves();

    const manager = new SDK.CPUThrottlingManager.CPUThrottlingManager(universe.settings, universe.targetManager);
    manager.setHardwareConcurrency(5);

    sinon.assert.calledOnce(cdpStub);
    sinon.assert.calledWithExactly(cdpStub, {hardwareConcurrency: 5});
  });

  it('does not set concurrency to 0 or negative numbers', async () => {
    const cdpStub =
        sinon.stub(universe.createTarget().emulationAgent(), 'invoke_setHardwareConcurrencyOverride').resolves();

    const manager = new SDK.CPUThrottlingManager.CPUThrottlingManager(universe.settings, universe.targetManager);
    manager.setHardwareConcurrency(0);
    sinon.assert.notCalled(cdpStub);

    manager.setHardwareConcurrency(-1);
    sinon.assert.notCalled(cdpStub);
  });
});
