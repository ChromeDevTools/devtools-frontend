// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';

import {
  makeFakeSDKEventFromPayload,
  type FakeEventPayload,
} from '../../helpers/TimelineHelpers.js';
import {defaultTraceEvent} from '../../helpers/TraceHelpers.js';

describe('EventTypeHelpers', () => {
  it('supports SDK events in timesForEventInMilliseconds', () => {
    const payload: FakeEventPayload = {
      name: 'test-event',
      ph: TraceEngine.Types.TraceEvents.Phase.BEGIN,
      categories: ['testing'],
      ts: 10_000,
      dur: 5_000,
    };
    const event = makeFakeSDKEventFromPayload(payload);
    const times = Timeline.EventTypeHelpers.timesForEventInMilliseconds(event);
    assert.deepEqual(times, {
      startTime: TraceEngine.Types.Timing.MilliSeconds(10),
      endTime: TraceEngine.Types.Timing.MilliSeconds(15),
      duration: TraceEngine.Types.Timing.MilliSeconds(5),
    });
  });

  it('sets the duration to 0 if it is not present for SDK events', () => {
    const payload: FakeEventPayload = {
      name: 'test-event',
      ph: TraceEngine.Types.TraceEvents.Phase.BEGIN,
      categories: ['testing'],
      ts: 10_000,
    };
    const event = makeFakeSDKEventFromPayload(payload);
    const times = Timeline.EventTypeHelpers.timesForEventInMilliseconds(event);
    assert.deepEqual(times, {
      startTime: TraceEngine.Types.Timing.MilliSeconds(10),
      endTime: TraceEngine.Types.Timing.MilliSeconds(10),
      duration: TraceEngine.Types.Timing.MilliSeconds(0),
    });
  });

  it('supports new engine events in timesForEventInMilliseconds', () => {
    const event: TraceEngine.Types.TraceEvents.TraceEventData = {
      ...defaultTraceEvent,
      name: 'test-event',
      ph: TraceEngine.Types.TraceEvents.Phase.BEGIN,
      ts: TraceEngine.Types.Timing.MicroSeconds(10_000),
      dur: TraceEngine.Types.Timing.MicroSeconds(5_000),
    };

    const times = Timeline.EventTypeHelpers.timesForEventInMilliseconds(event);
    assert.deepEqual(times, {
      startTime: TraceEngine.Types.Timing.MilliSeconds(10),
      endTime: TraceEngine.Types.Timing.MilliSeconds(15),
      duration: TraceEngine.Types.Timing.MilliSeconds(5),
    });
  });

  it('sets the duration to 0 if it is not prsent', () => {
    const event: TraceEngine.Types.TraceEvents.TraceEventData = {
      ...defaultTraceEvent,
      name: 'test-event',
      ph: TraceEngine.Types.TraceEvents.Phase.INSTANT,
      ts: TraceEngine.Types.Timing.MicroSeconds(10_000),
    };

    const times = Timeline.EventTypeHelpers.timesForEventInMilliseconds(event);
    assert.deepEqual(times, {
      startTime: TraceEngine.Types.Timing.MilliSeconds(10),
      endTime: TraceEngine.Types.Timing.MilliSeconds(10),
      duration: TraceEngine.Types.Timing.MilliSeconds(0),
    });
  });
});
