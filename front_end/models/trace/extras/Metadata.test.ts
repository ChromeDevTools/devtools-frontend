// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Trace from '../trace.js';

describeWithEnvironment('Trace Metadata', () => {
  it('returns the associated metadata', async () => {
    const cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
    sinon.stub(cpuThrottlingManager, 'hasPrimaryPageTargetSet').returns(true);
    sinon.stub(cpuThrottlingManager, 'getHardwareConcurrency').returns(Promise.resolve(1));
    sinon.stub(cpuThrottlingManager, 'cpuThrottlingRate').returns(2);
    const networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
    sinon.stub(networkManager, 'networkConditions').returns({
      title: 'Slow 3G',
      download: 1,
      upload: 1,
      latency: 1,
    });
    const metadata = await Trace.Extras.Metadata.forNewRecording(/* isCpuProfile= */ false);
    assert.deepEqual(metadata, {
      source: 'DevTools',
      startTime: undefined,
      cpuThrottling: 2,
      networkThrottling: 'Slow 3G',
      dataOrigin: Trace.Types.File.DataOrigin.TRACE_EVENTS,
      hardwareConcurrency: 1,
    });
  });

  it('calls the title function if the network condition title is a function', async () => {
    const cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
    sinon.stub(cpuThrottlingManager, 'hasPrimaryPageTargetSet').returns(true);
    sinon.stub(cpuThrottlingManager, 'getHardwareConcurrency').returns(Promise.resolve(1));
    sinon.stub(cpuThrottlingManager, 'cpuThrottlingRate').returns(2);
    const networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
    sinon.stub(networkManager, 'networkConditions').returns({
      title: () => 'Slow 3G',
      download: 1,
      upload: 1,
      latency: 1,
    });
    const metadata = await Trace.Extras.Metadata.forNewRecording(/* isCpuProfile= */ false);
    assert.deepEqual(metadata, {
      source: 'DevTools',
      startTime: undefined,
      cpuThrottling: 2,
      networkThrottling: 'Slow 3G',
      dataOrigin: Trace.Types.File.DataOrigin.TRACE_EVENTS,
      hardwareConcurrency: 1,
    });
  });

  it('does not return hardware concurrency if the manager has no target', async () => {
    const cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
    sinon.stub(cpuThrottlingManager, 'hasPrimaryPageTargetSet').returns(false);
    const getHardwareConcurrencyStub = sinon.stub(cpuThrottlingManager, 'getHardwareConcurrency');
    sinon.stub(cpuThrottlingManager, 'cpuThrottlingRate').returns(2);
    const networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
    sinon.stub(networkManager, 'networkConditions').returns({
      title: () => 'Slow 3G',
      download: 1,
      upload: 1,
      latency: 1,
    });
    const metadata = await Trace.Extras.Metadata.forNewRecording(/* isCpuProfile= */ false);
    assert.deepEqual(metadata, {
      source: 'DevTools',
      startTime: undefined,
      cpuThrottling: 2,
      networkThrottling: 'Slow 3G',
      dataOrigin: Trace.Types.File.DataOrigin.TRACE_EVENTS,
      hardwareConcurrency: undefined,
    });
    assert.strictEqual(getHardwareConcurrencyStub.callCount, 0);
  });
});
