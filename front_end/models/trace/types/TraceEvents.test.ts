// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describeWithEnvironment('TraceEvent types', function() {
  const {Phase, isNestableAsyncPhase, isPhaseAsync, isFlowPhase} = Trace.Types.Events;
  it('is able to determine if a phase is a nestable async phase', function() {
    assert.isTrue(isNestableAsyncPhase(Phase.ASYNC_NESTABLE_START));
    assert.isTrue(isNestableAsyncPhase(Phase.ASYNC_NESTABLE_END));
    assert.isTrue(isNestableAsyncPhase(Phase.ASYNC_NESTABLE_INSTANT));
  });

  it('is able to determine if a phase is not a nestable async phase', function() {
    assert.isFalse(isNestableAsyncPhase(Phase.BEGIN));
    assert.isFalse(isNestableAsyncPhase(Phase.END));
    assert.isFalse(isNestableAsyncPhase(Phase.ASYNC_BEGIN));
  });

  it('is able to determine if a phase is an async phase', function() {
    assert.isTrue(isPhaseAsync(Phase.ASYNC_NESTABLE_START));
    assert.isTrue(isPhaseAsync(Phase.ASYNC_NESTABLE_END));
    assert.isTrue(isPhaseAsync(Phase.ASYNC_NESTABLE_INSTANT));
    assert.isTrue(isPhaseAsync(Phase.ASYNC_BEGIN));
    assert.isTrue(isPhaseAsync(Phase.ASYNC_STEP_INTO));
    assert.isTrue(isPhaseAsync(Phase.ASYNC_STEP_PAST));
    assert.isTrue(isPhaseAsync(Phase.ASYNC_END));
  });

  it('is able to determine if a phase is not an async phase', function() {
    assert.isFalse(isPhaseAsync(Phase.BEGIN));
    assert.isFalse(isPhaseAsync(Phase.METADATA));
    assert.isFalse(isPhaseAsync(Phase.OBJECT_CREATED));
  });

  it('is able to determine if a phase is a flow phase', function() {
    assert.isTrue(isFlowPhase(Phase.FLOW_START));
    assert.isTrue(isFlowPhase(Phase.FLOW_STEP));
    assert.isTrue(isFlowPhase(Phase.FLOW_END));
  });

  it('is able to determine if a phase is not a flow phase', function() {
    assert.isFalse(isFlowPhase(Phase.ASYNC_STEP_INTO));
    assert.isFalse(isFlowPhase(Phase.ASYNC_NESTABLE_START));
    assert.isFalse(isFlowPhase(Phase.BEGIN));
  });

  it('is able to determine that an event is a synthetic user timing event', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'timings-track.json.gz');
    const timingEvent = parsedTrace.UserTimings.performanceMeasures[0];
    assert.isTrue(Trace.Types.Events.isSyntheticUserTiming(timingEvent));
    const consoleEvent = parsedTrace.UserTimings.consoleTimings[0];
    assert.isFalse(Trace.Types.Events.isSyntheticUserTiming(consoleEvent));
  });

  it('is able to determine that an event is a synthetic console event', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'timings-track.json.gz');
    const consoleEvent = parsedTrace.UserTimings.consoleTimings[0];
    assert.isTrue(Trace.Types.Events.isSyntheticConsoleTiming(consoleEvent));
    const timingEvent = parsedTrace.UserTimings.performanceMeasures[0];
    assert.isFalse(Trace.Types.Events.isSyntheticConsoleTiming(timingEvent));
  });

  it('is able to detemrine that an event is a synthetic network request event', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    const networkEvent = parsedTrace.NetworkRequests.byTime[0];
    assert.isTrue(Trace.Types.Events.isSyntheticNetworkRequest(networkEvent));
    const otherEvent = parsedTrace.Renderer.allTraceEntries[0];
    assert.isFalse(Trace.Types.Events.isSyntheticNetworkRequest(otherEvent));
  });

  it('is able to determine that an event is a synthetic layout shift event', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
    const syntheticLayoutShift = parsedTrace.LayoutShifts.clusters[0].events[0];
    assert.isTrue(Trace.Types.Events.isSyntheticLayoutShift(syntheticLayoutShift));
  });

  it('is able to identify that an event is a legacy timeline frame', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const frame = parsedTrace.Frames.frames.at(0);
    assert.isOk(frame);
    assert.isTrue(Trace.Types.Events.isLegacyTimelineFrame(frame));

    const networkEvent = parsedTrace.NetworkRequests.byTime.at(0);
    assert.isOk(networkEvent);
    assert.isFalse(Trace.Types.Events.isLegacyTimelineFrame(networkEvent));
  });
});
