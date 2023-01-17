// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {loadEventsFromTraceFile, defaultTraceEvent, setTraceModelTimeout} from '../../../helpers/TraceHelpers.js';

describe('ScreenshotHandler', function() {
  setTraceModelTimeout(this);
  const baseEvent = {
    ...defaultTraceEvent,
    name: 'Screenshot',
    // Ensure that the screenshots are held against the pid & tid values
    // that match the Browser process and CrBrowserMain in defaultTraceEvents.
    pid: TraceModel.Types.TraceEvents.ProcessID(8017),
    tid: TraceModel.Types.TraceEvents.ThreadID(775),
    ts: TraceModel.Types.Timing.MicroSeconds(0),
    args: {},
    cat: 'test',
    ph: TraceModel.Types.TraceEvents.TraceEventPhase.OBJECT_SNAPSHOT,
  };

  let baseEvents: readonly TraceModel.Types.TraceEvents.TraceEventData[];

  beforeEach(async () => {
    const defaultTraceEvents = await loadEventsFromTraceFile('basic.json.gz');

    baseEvents = [
      ...defaultTraceEvents,
      {...baseEvent, ts: TraceModel.Types.Timing.MicroSeconds(100)},
      {...baseEvent, ts: TraceModel.Types.Timing.MicroSeconds(200)},
    ];

    // The screenshot handler requires the meta handler because it needs
    // to know the browser process and thread IDs. Here, then, we reset
    // and later we will pass events to the meta handler, otherwise the
    // screenshots handler will fail.
    TraceModel.Handlers.ModelHandlers.Meta.reset();
    TraceModel.Handlers.ModelHandlers.Meta.initialize();

    TraceModel.Handlers.ModelHandlers.Screenshots.reset();
  });

  describe('frames', () => {
    it('obtains them if present', async () => {
      for (const event of baseEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
        TraceModel.Handlers.ModelHandlers.Screenshots.handleEvent(event);
      }

      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      await TraceModel.Handlers.ModelHandlers.Screenshots.finalize();

      const data = TraceModel.Handlers.ModelHandlers.Screenshots.data();
      assert.strictEqual(data.length, 2);
    });
  });
});
