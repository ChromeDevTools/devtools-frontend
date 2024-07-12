// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('TimelineSelection', function() {
  it('can be created with a frame', function() {
    const frame = new TraceEngine.Handlers.ModelHandlers.Frames.TimelineFrame(
        /* seqId */ 1, /* startTime */ TraceEngine.Types.Timing.MicroSeconds(1000),
        /* start offset */ TraceEngine.Types.Timing.MicroSeconds(0));
    const selection = Timeline.TimelineSelection.TimelineSelection.fromFrame(frame);
    assert.strictEqual(selection.object, frame);
    assert.strictEqual(selection.startTime, TraceEngine.Helpers.Timing.microSecondsToMilliseconds(frame.startTime));
    assert.strictEqual(selection.endTime, TraceEngine.Helpers.Timing.microSecondsToMilliseconds(frame.endTime));
    assert.isTrue(Timeline.TimelineSelection.TimelineSelection.isFrameObject(selection.object));
  });

  it('can be created with a network request', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const request = traceData.NetworkRequests.byTime[0];
    const selection = Timeline.TimelineSelection.TimelineSelection.fromTraceEvent(request);
    assert.strictEqual(selection.object, request);
    assert.strictEqual(selection.startTime, TraceEngine.Helpers.Timing.microSecondsToMilliseconds(request.ts));
    assert.strictEqual(
        selection.endTime,
        TraceEngine.Helpers.Timing.microSecondsToMilliseconds(
            (request.ts + request.dur) as TraceEngine.Types.Timing.MicroSeconds));
    assert.isTrue(
        Timeline.TimelineSelection.TimelineSelection.isSyntheticNetworkRequestDetailsEventSelection(selection.object));
  });

  it('can be created with a TraceEngine event', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const firstLCPEvent = traceData.PageLoadMetrics.allMarkerEvents.find(event => {
      return event.name === 'largestContentfulPaint::Candidate';
    });
    if (!firstLCPEvent) {
      throw new Error('Could not find LCP event');
    }
    const selection = Timeline.TimelineSelection.TimelineSelection.fromTraceEvent(firstLCPEvent);
    assert.strictEqual(selection.object, firstLCPEvent);
    assert.strictEqual(
        selection.startTime, TraceEngine.Helpers.Timing.eventTimingsMilliSeconds(firstLCPEvent).startTime);
    assert.strictEqual(selection.endTime, TraceEngine.Helpers.Timing.eventTimingsMilliSeconds(firstLCPEvent).endTime);
    assert.isTrue(Timeline.TimelineSelection.TimelineSelection.isTraceEventSelection(selection.object));
  });

  it('can be created with a range', async function() {
    const selection = Timeline.TimelineSelection.TimelineSelection.fromRange(0, 10);
    assert.strictEqual(selection.startTime, 0);
    assert.strictEqual(selection.endTime, 10);
    assert.isTrue(Timeline.TimelineSelection.TimelineSelection.isRangeSelection(selection.object));
  });
});
