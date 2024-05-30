// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';
import {makeInstantEvent} from '../../testing/TraceHelpers.js';

import * as Timeline from './timeline.js';

describe('Overlays', () => {
  it('can calculate the x position of an event based on the dimensions and its timestamp', async () => {
    const container = document.createElement('div');
    const overlays = new Timeline.Overlays.Overlays({container});

    // Set up the dimensions so it is 100px wide
    overlays.updateChartDimensions('main', {
      widthPixels: 100,
      heightPixels: 50,
      scrollOffsetPixels: 0,
    });
    overlays.updateChartDimensions('network', {
      widthPixels: 100,
      heightPixels: 50,
      scrollOffsetPixels: 0,
    });

    const windowMin = TraceEngine.Types.Timing.MicroSeconds(0);
    const windowMax = TraceEngine.Types.Timing.MicroSeconds(100);
    // Set the visible window to be 0-100 microseconds
    overlays.updateVisibleWindow(TraceEngine.Helpers.Timing.traceWindowFromMicroSeconds(windowMin, windowMax));

    // Now set an event to be at 50 microseconds.
    const event = makeInstantEvent('test-event', 50);

    const xPosition = overlays.xPixelForEventOnChart('main', event);
    assert.strictEqual(xPosition, 50);
  });
});
