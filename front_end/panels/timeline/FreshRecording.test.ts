// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('FreshRecordingTracker', () => {
  it('knows that a recording has been registered as fresh', async function() {
    const instance = Timeline.FreshRecording.Tracker.instance({forceNew: true});
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    instance.registerFreshRecording(parsedTrace);
    assert.isTrue(instance.recordingIsFresh(parsedTrace));
  });

  it('knows that un-registered recordings are not fresh', async function() {
    const instance = Timeline.FreshRecording.Tracker.instance({forceNew: true});
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    assert.isFalse(instance.recordingIsFresh(parsedTrace));
  });
});
