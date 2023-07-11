// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {getAllTracingModelPayloadEvents} from '../../helpers/TraceHelpers.js';
import {TraceLoader} from '../../helpers/TraceLoader.js';

const {assert} = chai;

describeWithEnvironment('TimelineSelection', function() {
  it('can be created with a frame', function() {
    const frame = new TimelineModel.TimelineFrameModel.TimelineFrame(1, 0);
    const selection = Timeline.TimelineSelection.TimelineSelection.fromFrame(frame);
    assert.strictEqual(selection.object, frame);
    assert.strictEqual(selection.startTime, frame.startTime);
    assert.strictEqual(selection.endTime, frame.endTime);
    assert.isTrue(Timeline.TimelineSelection.TimelineSelection.isFrameObject(selection.object));
  });

  it('can be created with a network request', async function() {
    const data = await TraceLoader.allModels(this, 'web-dev.json.gz');
    const request = data.traceParsedData.NetworkRequests.byTime[0];
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

  it('can be created with an SDK trace event', async function() {
    const data = await TraceLoader.allModels(this, 'web-dev.json.gz');
    const firstLCPEvent = getAllTracingModelPayloadEvents(data.tracingModel).find(event => {
      return event.name === TimelineModel.TimelineModel.RecordType.MarkLCPCandidate;
    });
    if (!firstLCPEvent) {
      throw new Error('Could not find LCP event');
    }
    const selection = Timeline.TimelineSelection.TimelineSelection.fromTraceEvent(firstLCPEvent);
    assert.strictEqual(selection.object, firstLCPEvent);
    assert.strictEqual(selection.startTime, firstLCPEvent.startTime);
    // No end time, so the end time gets set to the start time + 1.
    assert.strictEqual(selection.endTime, firstLCPEvent.startTime + 1);
    assert.isTrue(Timeline.TimelineSelection.TimelineSelection.isTraceEventSelection(selection.object));
  });

  it('can be created with a TraceEngine event', async function() {
    const data = await TraceLoader.allModels(this, 'web-dev.json.gz');
    const firstLCPEvent = data.traceParsedData.PageLoadMetrics.allMarkerEvents.find(event => {
      return event.name === 'largestContentfulPaint::Candidate';
    });
    if (!firstLCPEvent) {
      throw new Error('Could not find LCP event');
    }
    const selection = Timeline.TimelineSelection.TimelineSelection.fromTraceEvent(firstLCPEvent);
    assert.strictEqual(selection.object, firstLCPEvent);
    assert.strictEqual(selection.startTime, TraceEngine.Legacy.timesForEventInMilliseconds(firstLCPEvent).startTime);
    assert.strictEqual(selection.endTime, TraceEngine.Legacy.timesForEventInMilliseconds(firstLCPEvent).endTime);
    assert.isTrue(Timeline.TimelineSelection.TimelineSelection.isTraceEventSelection(selection.object));
  });

  it('can be created with a range', async function() {
    const selection = Timeline.TimelineSelection.TimelineSelection.fromRange(0, 10);
    assert.strictEqual(selection.startTime, 0);
    assert.strictEqual(selection.endTime, 10);
    assert.isTrue(Timeline.TimelineSelection.TimelineSelection.isRangeSelection(selection.object));
  });
});
