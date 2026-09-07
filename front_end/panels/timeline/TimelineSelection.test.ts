// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Trace from '../../models/trace/trace.js';
import {makeCompleteEvent, makeInstantEvent, microseconds, milliseconds} from '../../testing/TraceHelpers.js';

import * as Timeline from './timeline.js';

describe('TimelineSelection', function() {
  const {TimelineSelection} = Timeline;
  it('can be created with a frame', function() {
    const frame = {
      startTime: microseconds(1000),
      endTime: microseconds(2000),
      ts: microseconds(1000),
      dur: microseconds(1000),
    } as unknown as Trace.Types.Events.LegacyTimelineFrame;
    const selection = TimelineSelection.selectionFromEvent(frame);
    assert.strictEqual(selection.event, frame);
    const timings = TimelineSelection.rangeForSelection(selection);
    assert.strictEqual(timings.min, frame.startTime);
    assert.strictEqual(timings.max, frame.endTime);

    assert.isTrue(TimelineSelection.selectionIsEvent(selection));
    assert.isFalse(TimelineSelection.selectionIsRange(selection));
  });

  it('can be created with a network request', function() {
    const request = makeCompleteEvent(Trace.Types.Events.Name.RESOURCE_SEND_REQUEST, 1000, 2000) as
        Trace.Types.Events.SyntheticNetworkRequest;
    const selection = TimelineSelection.selectionFromEvent(request);
    assert.strictEqual(selection.event, request);
    const timings = TimelineSelection.rangeForSelection(selection);
    assert.strictEqual(timings.min, request.ts);
    assert.strictEqual(timings.max, (request.ts + request.dur as Trace.Types.Timing.Micro));
    assert.isTrue(TimelineSelection.selectionIsEvent(selection));
    assert.isFalse(TimelineSelection.selectionIsRange(selection));
  });

  it('can be created with an LCP event', function() {
    const lcpEvent = makeInstantEvent(Trace.Types.Events.Name.MARK_LCP_CANDIDATE, 1000);
    const selection = TimelineSelection.selectionFromEvent(lcpEvent);
    assert.strictEqual(selection.event, lcpEvent);
    const timings = TimelineSelection.rangeForSelection(selection);
    assert.strictEqual(timings.min, Trace.Helpers.Timing.eventTimingsMicroSeconds(lcpEvent).startTime);
    assert.strictEqual(timings.max, Trace.Helpers.Timing.eventTimingsMicroSeconds(lcpEvent).endTime);
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

  it('can be created with a millisecond range', () => {
    const selection = TimelineSelection.selectionFromRangeMilliSeconds(milliseconds(1), milliseconds(10));
    assert.deepEqual(selection.bounds, {
      min: 1_000,
      max: 10_000,
      range: 9_000,
    });
    assert.isTrue(TimelineSelection.selectionIsRange(selection));
    assert.isFalse(TimelineSelection.selectionIsEvent(selection));
  });

  it('knows if two event selections are equal if they have the same event', function() {
    const lcpEvent = makeInstantEvent(Trace.Types.Events.Name.MARK_LCP_CANDIDATE, 1000);
    const selection1 = TimelineSelection.selectionFromEvent(lcpEvent);
    const selection2 = TimelineSelection.selectionFromEvent(lcpEvent);
    assert.isTrue(TimelineSelection.selectionsEqual(selection1, selection2));

    const networkEvent = makeCompleteEvent(Trace.Types.Events.Name.RESOURCE_SEND_REQUEST, 1000, 2000);
    const selection3 = TimelineSelection.selectionFromEvent(networkEvent);
    assert.isFalse(TimelineSelection.selectionsEqual(selection1, selection3));
  });

  it('knows if two range selections are equal if they have the same range', () => {
    const selection1 = TimelineSelection.selectionFromRangeMicroSeconds(microseconds(0), microseconds(10));
    const selection2 = TimelineSelection.selectionFromRangeMicroSeconds(microseconds(0), microseconds(10));
    const selection3 = TimelineSelection.selectionFromRangeMicroSeconds(microseconds(20), microseconds(40));
    assert.isTrue(TimelineSelection.selectionsEqual(selection1, selection2));
    assert.isFalse(TimelineSelection.selectionsEqual(selection1, selection3));
  });

  it('knows selections of different types are not equal', function() {
    const lcpEvent = makeInstantEvent(Trace.Types.Events.Name.MARK_LCP_CANDIDATE, 1000);
    const selection1 = TimelineSelection.selectionFromEvent(lcpEvent);
    const selection2 = TimelineSelection.selectionFromRangeMicroSeconds(microseconds(0), microseconds(10));
    assert.isFalse(TimelineSelection.selectionsEqual(selection1, selection2));
  });
});
