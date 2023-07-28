// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';
const {assert} = chai;

describeWithEnvironment('TraceEvent types', function() {
  const {Phase, isNestableAsyncPhase, isAsyncPhase, isFlowPhase} = TraceEngine.Types.TraceEvents;
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
    assert.isTrue(isAsyncPhase(Phase.ASYNC_NESTABLE_START));
    assert.isTrue(isAsyncPhase(Phase.ASYNC_NESTABLE_END));
    assert.isTrue(isAsyncPhase(Phase.ASYNC_NESTABLE_INSTANT));
    assert.isTrue(isAsyncPhase(Phase.ASYNC_BEGIN));
    assert.isTrue(isAsyncPhase(Phase.ASYNC_STEP_INTO));
    assert.isTrue(isAsyncPhase(Phase.ASYNC_STEP_PAST));
    assert.isTrue(isAsyncPhase(Phase.ASYNC_END));
  });

  it('is able to determine if a phase is not an async phase', function() {
    assert.isFalse(isAsyncPhase(Phase.BEGIN));
    assert.isFalse(isAsyncPhase(Phase.METADATA));
    assert.isFalse(isAsyncPhase(Phase.OBJECT_CREATED));
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
    const traceParsedData = await TraceLoader.traceEngine(this, 'timings-track.json.gz');
    const timingEvent = traceParsedData.UserTimings.performanceMeasures[0];
    assert.isTrue(TraceEngine.Types.TraceEvents.isSyntheticUserTimingTraceEvent(timingEvent));
    const consoleEvent = traceParsedData.UserTimings.consoleTimings[0];
    assert.isFalse(TraceEngine.Types.TraceEvents.isSyntheticUserTimingTraceEvent(consoleEvent));
  });

  it('is able to determine that an event is a synthetic console event', async function() {
    const traceParsedData = await TraceLoader.traceEngine(this, 'timings-track.json.gz');
    const consoleEvent = traceParsedData.UserTimings.consoleTimings[0];
    assert.isTrue(TraceEngine.Types.TraceEvents.isSyntheticConsoleTimingTraceEvent(consoleEvent));
    const timingEvent = traceParsedData.UserTimings.performanceMeasures[0];
    assert.isFalse(TraceEngine.Types.TraceEvents.isSyntheticConsoleTimingTraceEvent(timingEvent));
  });

  it('is able to detemrine that an event is a synthetic network request event', async function() {
    const traceParsedData = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    const networkEvent = traceParsedData.NetworkRequests.byTime[0];
    assert.isTrue(TraceEngine.Types.TraceEvents.isSyntheticNetworkRequestDetailsEvent(networkEvent));
    const otherEvent = traceParsedData.Renderer.allRendererEvents[0];
    assert.isFalse(TraceEngine.Types.TraceEvents.isSyntheticNetworkRequestDetailsEvent(otherEvent));
  });

  it('is able to determine that an event is a synthetic layout shift event', async function() {
    const traceParsedData = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
    const syntheticLayoutShift = traceParsedData.LayoutShifts.clusters[0].events[0];
    assert.isTrue(TraceEngine.Types.TraceEvents.isSyntheticLayoutShift(syntheticLayoutShift));
  });
});
