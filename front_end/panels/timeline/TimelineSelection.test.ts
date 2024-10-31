// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {microseconds, milliseconds} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('TimelineSelection', function() {
  const {TimelineSelection} = Timeline;
  it('can be created with a frame', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const frame = parsedTrace.Frames.frames.at(0);
    assert.isOk(frame);
    const selection = TimelineSelection.selectionFromEvent(frame);
    assert.strictEqual(selection.event, frame);
    const timings = TimelineSelection.rangeForSelection(selection);
    assert.strictEqual(timings.min, frame.startTime);
    assert.strictEqual(timings.max, frame.endTime);

    assert.isTrue(TimelineSelection.selectionIsEvent(selection));
    assert.isFalse(TimelineSelection.selectionIsRange(selection));
  });

  it('can be created with a network request', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const request = parsedTrace.NetworkRequests.byTime.at(0);
    assert.isOk(request);
    const selection = TimelineSelection.selectionFromEvent(request);
    assert.strictEqual(selection.event, request);
    const timings = TimelineSelection.rangeForSelection(selection);
    assert.strictEqual(timings.min, request.ts);
    assert.strictEqual(timings.max, (request.ts + request.dur as Trace.Types.Timing.MicroSeconds));
    assert.isTrue(TimelineSelection.selectionIsEvent(selection));
    assert.isFalse(TimelineSelection.selectionIsRange(selection));
  });

  it('can be created with a random trace event', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const firstLCPEvent = parsedTrace.PageLoadMetrics.allMarkerEvents.find(event => {
      return event.name === 'largestContentfulPaint::Candidate';
    });
    assert.isOk(firstLCPEvent);
    const selection = TimelineSelection.selectionFromEvent(firstLCPEvent);
    assert.strictEqual(selection.event, firstLCPEvent);
    const timings = TimelineSelection.rangeForSelection(selection);
    assert.strictEqual(timings.min, Trace.Helpers.Timing.eventTimingsMicroSeconds(firstLCPEvent).startTime);
    assert.strictEqual(timings.max, Trace.Helpers.Timing.eventTimingsMicroSeconds(firstLCPEvent).endTime);
    assert.isTrue(TimelineSelection.selectionIsEvent(selection));
    assert.isFalse(TimelineSelection.selectionIsRange(selection));
  });

  it('can be created with a range', function() {
    const selection = TimelineSelection.selectionFromRangeMicroSeconds(microseconds(0), microseconds(10));
    assert.deepEqual(selection.bounds, {
      min: 0,
      max: 10,
      range: 10,
    });
    assert.isTrue(TimelineSelection.selectionIsRange(selection));
    assert.isFalse(TimelineSelection.selectionIsEvent(selection));
  });

  it('can be created with a millisecond range', async () => {
    const selection = TimelineSelection.selectionFromRangeMilliSeconds(milliseconds(1), milliseconds(10));
    assert.deepEqual(selection.bounds, {
      min: 1_000,
      max: 10_000,
      range: 9_000,
    });
    assert.isTrue(TimelineSelection.selectionIsRange(selection));
    assert.isFalse(TimelineSelection.selectionIsEvent(selection));
  });

  it('knows if two event selections are equal if they have the same event', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const firstLCPEvent = parsedTrace.PageLoadMetrics.allMarkerEvents.find(event => {
      return event.name === 'largestContentfulPaint::Candidate';
    });
    assert.isOk(firstLCPEvent);
    const selection1 = TimelineSelection.selectionFromEvent(firstLCPEvent);
    const selection2 = TimelineSelection.selectionFromEvent(firstLCPEvent);
    assert.isTrue(TimelineSelection.selectionsEqual(selection1, selection2));

    const networkEvent = parsedTrace.NetworkRequests.byTime.at(0);
    assert.isOk(networkEvent);
    const selection3 = TimelineSelection.selectionFromEvent(networkEvent);
    assert.isFalse(TimelineSelection.selectionsEqual(selection1, selection3));
  });

  it('knows if two range selections are equal if they have the same range', async () => {
    const selection1 = TimelineSelection.selectionFromRangeMicroSeconds(microseconds(0), microseconds(10));
    const selection2 = TimelineSelection.selectionFromRangeMicroSeconds(microseconds(0), microseconds(10));
    const selection3 = TimelineSelection.selectionFromRangeMicroSeconds(microseconds(20), microseconds(40));
    assert.isTrue(TimelineSelection.selectionsEqual(selection1, selection2));
    assert.isFalse(TimelineSelection.selectionsEqual(selection1, selection3));
  });

  it('knows selections of different types are not equal', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const firstLCPEvent = parsedTrace.PageLoadMetrics.allMarkerEvents.find(event => {
      return event.name === 'largestContentfulPaint::Candidate';
    });
    assert.isOk(firstLCPEvent);
    const selection1 = TimelineSelection.selectionFromEvent(firstLCPEvent);
    const selection2 = TimelineSelection.selectionFromRangeMicroSeconds(microseconds(0), microseconds(10));
    assert.isFalse(TimelineSelection.selectionsEqual(selection1, selection2));
  });
});
