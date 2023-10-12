// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {
  makeFakeEventPayload,
} from '../../helpers/TraceHelpers.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';

function milliToMicro(x: number): TraceEngine.Types.Timing.MicroSeconds {
  return TraceEngine.Helpers.Timing.millisecondsToMicroseconds(TraceEngine.Types.Timing.MilliSeconds(x));
}

const DEVTOOLS_CATEGORY = 'disabled-by-default-devtools.timeline';
describeWithEnvironment('PerformanceModel', () => {
  it('will use the minimum and max times if there is no period of low utilization ', async () => {
    const events = [
      makeFakeEventPayload({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(100),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeEventPayload({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(200),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeEventPayload({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(300),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeEventPayload({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(400),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
    ];
    const tracingModel = new TraceEngine.Legacy.TracingModel();
    tracingModel.addEvents(events);
    tracingModel.tracingComplete();

    const perfModel = new Timeline.PerformanceModel.PerformanceModel();
    await perfModel.setTracingModel(tracingModel);
    const newWindow = perfModel.calculateWindowForMainThreadActivity();

    assert.deepEqual(newWindow, {
      // Left window = 100ms which is the first timestamp of the first event
      left: 100,
      // Right window = 450ms which is the end of the last event (400ms start, 50ms duration)
      right: 450,
    });
  });

  it('will focus the window in if there is a period of low utilization', async () => {
    const events = [
      makeFakeEventPayload({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(1),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeEventPayload({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(200),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeEventPayload({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(210),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeEventPayload({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(240),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeEventPayload({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(230),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeEventPayload({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(1_000),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
    ];
    const tracingModel = new TraceEngine.Legacy.TracingModel();
    tracingModel.addEvents(events);
    tracingModel.tracingComplete();

    const perfModel = new Timeline.PerformanceModel.PerformanceModel();
    await perfModel.setTracingModel(tracingModel);
    const newWindow = perfModel.calculateWindowForMainThreadActivity();

    assert.deepEqual(newWindow, {
      // This trace has:
      // 1 event at 1
      // 4 events between 200 and 230ms
      // 1 event at 1000ms
      // Therefore, the window focuses on the time period of 1 to 250ms. The
      // right number looks odd because when we zoom the window we adjust it
      // postively by 5% for the upper bound to give it some breathing room.
      left: 1,
      right: 262.45,
    });
  });

  it('uses the entire trace window if the period of low utilization makes up the majority of the trace', async () => {
    const events = [
      makeFakeEventPayload({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(100),
        dur: milliToMicro(50),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeEventPayload({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(200_000),
        dur: milliToMicro(50_000),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeEventPayload({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(300_000),
        dur: milliToMicro(50_000),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeEventPayload({
        name: 'Program',
        categories: [DEVTOOLS_CATEGORY],
        ts: milliToMicro(400_000),
        dur: milliToMicro(50_000),
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
      }),
      makeFakeEventPayload({
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
    const tracingModel = new TraceEngine.Legacy.TracingModel();
    tracingModel.addEvents(events);
    tracingModel.tracingComplete();

    const perfModel = new Timeline.PerformanceModel.PerformanceModel();
    await perfModel.setTracingModel(tracingModel);
    const newWindow = perfModel.calculateWindowForMainThreadActivity();

    assert.deepEqual(newWindow, {
      left: tracingModel.minimumRecordTime(),
      right: tracingModel.maximumRecordTime(),
    });
  });
});
