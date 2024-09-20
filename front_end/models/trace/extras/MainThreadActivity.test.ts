// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  makeCompleteEvent,
} from '../../../testing/TraceHelpers.js';
import * as Trace from '../trace.js';

const DEVTOOLS_CATEGORY = 'disabled-by-default-devtools.timeline';
function milliToMicro(x: number): Trace.Types.Timing.MicroSeconds {
  return Trace.Helpers.Timing.millisecondsToMicroseconds(Trace.Types.Timing.MilliSeconds(x));
}

function makeFakeBounds(min: number, max: number): Trace.Types.Timing.TraceWindowMicroSeconds {
  return {
    min: Trace.Types.Timing.MicroSeconds(min),
    max: Trace.Types.Timing.MicroSeconds(max),
    range: Trace.Types.Timing.MicroSeconds(max - min),
  };
}

describe('MainThreadActivity', function() {
  it('will use the trace bounds if there is no period of low utilitisation', async () => {
    const events = [
      makeCompleteEvent('Program', milliToMicro(100), milliToMicro(50), DEVTOOLS_CATEGORY),
      makeCompleteEvent('Program', milliToMicro(200), milliToMicro(50), DEVTOOLS_CATEGORY),
      makeCompleteEvent('Program', milliToMicro(300), milliToMicro(50), DEVTOOLS_CATEGORY),
      makeCompleteEvent('Program', milliToMicro(400), milliToMicro(50), DEVTOOLS_CATEGORY),
    ];
    const bounds = makeFakeBounds(milliToMicro(100), milliToMicro(450));
    const win = Trace.Extras.MainThreadActivity.calculateWindow(bounds, events);
    assert.strictEqual(win.min, bounds.min);
    assert.strictEqual(win.max, bounds.max);
  });

  it('focuses the window to avoid periods of low utilisation', async () => {
    const events = [
      makeCompleteEvent('Program', milliToMicro(1), milliToMicro(50), DEVTOOLS_CATEGORY),
      makeCompleteEvent('Program', milliToMicro(200), milliToMicro(50), DEVTOOLS_CATEGORY),
      makeCompleteEvent('Program', milliToMicro(210), milliToMicro(50), DEVTOOLS_CATEGORY),
      makeCompleteEvent('Program', milliToMicro(240), milliToMicro(50), DEVTOOLS_CATEGORY),
      makeCompleteEvent('Program', milliToMicro(230), milliToMicro(50), DEVTOOLS_CATEGORY),
      makeCompleteEvent('Program', milliToMicro(1_000), milliToMicro(50), DEVTOOLS_CATEGORY),
    ];
    const bounds = makeFakeBounds(milliToMicro(1), milliToMicro(1_050));
    const win = Trace.Extras.MainThreadActivity.calculateWindow(bounds, events);
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
      makeCompleteEvent('Program', milliToMicro(100), milliToMicro(50), DEVTOOLS_CATEGORY),
      makeCompleteEvent('Program', milliToMicro(200_000), milliToMicro(50_000), DEVTOOLS_CATEGORY),
      makeCompleteEvent('Program', milliToMicro(300_000), milliToMicro(50_000), DEVTOOLS_CATEGORY),
      makeCompleteEvent('Program', milliToMicro(400_000), milliToMicro(50_000), DEVTOOLS_CATEGORY),
      makeCompleteEvent('Program', milliToMicro(4_000_000), milliToMicro(50_000), DEVTOOLS_CATEGORY),
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
    const win = Trace.Extras.MainThreadActivity.calculateWindow(bounds, events);
    // We expect the window to equal the entire trace bounds.
    assert.deepEqual(win, bounds);
  });
});
