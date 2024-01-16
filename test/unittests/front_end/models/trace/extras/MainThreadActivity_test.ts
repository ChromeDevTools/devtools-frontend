// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';
import {type FakeEventPayload, makeFakeEventPayload} from '../../../helpers/TraceHelpers.js';

const {assert} = chai;

const DEVTOOLS_CATEGORY = 'disabled-by-default-devtools.timeline';
function milliToMicro(x: number): TraceEngine.Types.Timing.MicroSeconds {
  return TraceEngine.Helpers.Timing.millisecondsToMicroseconds(TraceEngine.Types.Timing.MilliSeconds(x));
}

function makeFakeMainThreadTraceEntry(payload: FakeEventPayload): TraceEngine.Types.TraceEvents.SyntheticTraceEntry {
  // It does not technically make a full TraceEntry, but for these tests that
  // need some events to simulate main thread activity, they are good enough.
  return makeFakeEventPayload(payload) as unknown as TraceEngine.Types.TraceEvents.SyntheticTraceEntry;
}

function makeFakeBounds(min: number, max: number): TraceEngine.Types.Timing.TraceWindowMicroSeconds {
  return {
    min: TraceEngine.Types.Timing.MicroSeconds(min),
    max: TraceEngine.Types.Timing.MicroSeconds(max),
    range: TraceEngine.Types.Timing.MicroSeconds(max - min),
  };
}

describe('MainThreadActivity', function() {
  it('will use the trace bounds if there is no period of low utilitisation', async () => {
    const events = [
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(100),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(200),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(300),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(400),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
    ];
    const bounds = makeFakeBounds(milliToMicro(100), milliToMicro(450));
    const win = TraceEngine.Extras.MainThreadActivity.calculateWindow(bounds, events);
    assert.strictEqual(win.min, bounds.min);
    assert.strictEqual(win.max, bounds.max);
  });

  it('focuses the window to avoid periods of low utilisation', async () => {
    const events = [
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(1),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(200),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(210),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(240),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(230),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(1_000),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
    ];
    const bounds = makeFakeBounds(milliToMicro(1), milliToMicro(1_050));
    const win = TraceEngine.Extras.MainThreadActivity.calculateWindow(bounds, events);
    // This trace has:
    // 1 event at 1
    // 4 events between 200 and 230ms
    // 1 event at 1000ms
    // Therefore, the window focuses on the time period of 1 to 280ms (280 is
    // the end time of the event that starts at 230ms).
    // The right number looks odd because when we zoom the window we adjust it
    // postively by 5% for the upper bound to give it some breathing room.
    assert.strictEqual(win.min, milliToMicro(1));
    assert.strictEqual(win.max, milliToMicro(293.95));
  });

  it('uses the entire trace window if the period of low utilisation makes up the majority of the trace', async () => {
    const events = [
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(100),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(200_000),
        dur: milliToMicro(50_000),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(300_000),
        dur: milliToMicro(50_000),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(400_000),
        dur: milliToMicro(50_000),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeMainThreadTraceEntry({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(4_000_000),
        dur: milliToMicro(50_000),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
    ];
    // These events are very spaced out!
    // 1 at 100ms
    // 1 at 200,000ms
    // 1 at 300,000ms
    // 1 at 400,000ms
    // 1 at 4million ms!
    // This means that the area the autozoom picks is less than 10% of the
    // total time span, meaning that we fallback to just showing the entire
    // trace window.
    const bounds = makeFakeBounds(milliToMicro(100), milliToMicro(4_050_000));
    const win = TraceEngine.Extras.MainThreadActivity.calculateWindow(bounds, events);
    // We expect the window to equal the entire trace bounds.
    assert.deepEqual(win, bounds);
  });
});
