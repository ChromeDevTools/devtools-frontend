
// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('RecordingMetadata', () => {
  it('for a CPU profile it just returns the origin', async () => {
    const result = Timeline.RecordingMetadata.forCPUProfile();
    assert.deepEqual(result, {dataOrigin: Trace.Types.File.DataOrigin.CPU_PROFILE});
  });

  it('returns the associated metadata for a chrome trace', async () => {
    const cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
    sinon.stub(cpuThrottlingManager, 'hasPrimaryPageTargetSet').returns(true);
    sinon.stub(cpuThrottlingManager, 'cpuThrottlingRate').returns(2);
    const networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
    sinon.stub(networkManager, 'isThrottling').returns(true);
    sinon.stub(networkManager, 'networkConditions').returns({
      title: 'Slow 3G',
      key: SDK.NetworkManager.PredefinedThrottlingConditionKey.SPEED_3G,
      download: 1,
      upload: 2,
      latency: 3,
    });
    const metadata = await Timeline.RecordingMetadata.forTrace({recordingStartTime: 1234});
    assert.deepEqual(metadata, {
      source: 'DevTools',
      startTime: new Date(1234).toJSON(),
      cpuThrottling: 2,
      networkThrottling: 'Slow 3G',
      networkThrottlingConditions: {
        download: 1,
        latency: 3,
        key: SDK.NetworkManager.PredefinedThrottlingConditionKey.SPEED_3G,
        upload: 2,
        packetLoss: undefined,
        packetQueueLength: undefined,
        packetReordering: undefined,
        targetLatency: undefined,
      },
      cruxFieldData: undefined,
      dataOrigin: Trace.Types.File.DataOrigin.TRACE_EVENTS,
      emulatedDeviceTitle: undefined,
      hostDPR: 1,
    });
  });

  it('does not store network conditions if the user has not throttled them', async () => {
    const cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
    sinon.stub(cpuThrottlingManager, 'hasPrimaryPageTargetSet').returns(true);
    sinon.stub(cpuThrottlingManager, 'cpuThrottlingRate').returns(2);
    const networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
    sinon.stub(networkManager, 'isThrottling').returns(false);
    const metadata = await Timeline.RecordingMetadata.forTrace({recordingStartTime: 1234});
    assert.deepEqual(metadata, {
      source: 'DevTools',
      startTime: new Date(1234).toJSON(),
      cpuThrottling: 2,
      networkThrottling: undefined,
      networkThrottlingConditions: undefined,
      cruxFieldData: undefined,
      dataOrigin: Trace.Types.File.DataOrigin.TRACE_EVENTS,
      emulatedDeviceTitle: undefined,
      hostDPR: 1,
    });
  });

  it('does not store cpu throttling if there is no throttling', async () => {
    const cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
    sinon.stub(cpuThrottlingManager, 'hasPrimaryPageTargetSet').returns(true);
    // 1 is the equivalent of no throttling
    sinon.stub(cpuThrottlingManager, 'cpuThrottlingRate').returns(1);
    const networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
    sinon.stub(networkManager, 'isThrottling').returns(true);
    sinon.stub(networkManager, 'networkConditions').returns({
      title: 'Slow 3G',
      download: 1,
      upload: 2,
      latency: 3,
      key: SDK.NetworkManager.PredefinedThrottlingConditionKey.SPEED_3G,
    });
    const metadata = await Timeline.RecordingMetadata.forTrace({recordingStartTime: 1234});
    assert.deepEqual(metadata, {
      source: 'DevTools',
      startTime: new Date(1234).toJSON(),
      cpuThrottling: undefined,
      networkThrottling: 'Slow 3G',
      networkThrottlingConditions: {
        download: 1,
        latency: 3,
        key: SDK.NetworkManager.PredefinedThrottlingConditionKey.SPEED_3G,
        upload: 2,
        packetLoss: undefined,
        packetQueueLength: undefined,
        packetReordering: undefined,
        targetLatency: undefined,
      },
      cruxFieldData: undefined,
      dataOrigin: Trace.Types.File.DataOrigin.TRACE_EVENTS,
      emulatedDeviceTitle: undefined,
      hostDPR: 1,
    });
  });

  it('calls the title function if the network condition title is a function', async () => {
    const cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
    sinon.stub(cpuThrottlingManager, 'hasPrimaryPageTargetSet').returns(true);
    sinon.stub(cpuThrottlingManager, 'getHardwareConcurrency').returns(Promise.resolve(1));
    sinon.stub(cpuThrottlingManager, 'cpuThrottlingRate').returns(2);
    const networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
    sinon.stub(networkManager, 'isThrottling').returns(true);
    sinon.stub(networkManager, 'networkConditions').returns({
      title: () => 'Slow 3G',
      download: 1,
      upload: 1,
      key: SDK.NetworkManager.PredefinedThrottlingConditionKey.SPEED_3G,
      latency: 1,
    });
    const metadata = await Timeline.RecordingMetadata.forTrace();
    assert.deepEqual(metadata, {
      source: 'DevTools',
      startTime: undefined,
      cpuThrottling: 2,
      networkThrottling: 'Slow 3G',
      networkThrottlingConditions: {
        download: 1,
        key: SDK.NetworkManager.PredefinedThrottlingConditionKey.SPEED_3G,
        latency: 1,
        upload: 1,
        packetLoss: undefined,
        packetQueueLength: undefined,
        packetReordering: undefined,
        targetLatency: undefined,
      },
      emulatedDeviceTitle: undefined,
      hostDPR: 1,
      cruxFieldData: undefined,
      dataOrigin: Trace.Types.File.DataOrigin.TRACE_EVENTS,
    });
  });
});
