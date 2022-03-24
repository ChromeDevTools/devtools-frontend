// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import type * as Profiler from '../../../../../front_end/panels/profiler/profiler.js';

describeWithRealConnection('CPUProfileView test', () => {
  it('reads registered console profile messages from the model', async () => {
    const Profiler = await import('../../../../../front_end/panels/profiler/profiler.js');
    const target = createTarget();
    const model = target.model(SDK.CPUProfilerModel.CPUProfilerModel) as SDK.CPUProfilerModel.CPUProfilerModel;
    const scriptId = 'bar' as Protocol.Runtime.ScriptId;
    const lineNumber = 42;
    const cpuProfile = {
      nodes: [{
        id: 1,
        callFrame: {functionName: 'fun', scriptId, lineNumber, url: 'http://foo', columnNumber: 1},
        hitCount: 42,
      }],
      startTime: 1,
      endTime: 2,
    };
    model.consoleProfileFinished({
      id: 'foo',
      location: {scriptId, lineNumber},
      profile: cpuProfile,
    });
    const profileType = new Profiler.CPUProfileView.CPUProfileType();
    const cpuProfileHeader = profileType.getProfiles()[0] as Profiler.CPUProfileView.CPUProfileHeader;
    assert.deepEqual(cpuProfileHeader?.cpuProfilerModel?.registeredConsoleProfileMessages[0]?.cpuProfile, cpuProfile);
  });
});
