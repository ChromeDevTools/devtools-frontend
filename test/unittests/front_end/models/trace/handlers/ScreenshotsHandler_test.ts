// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {defaultTraceEvent} from '../../../helpers/TraceHelpers.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

describe('ScreenshotsHandler', function() {
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
    ph: TraceModel.Types.TraceEvents.Phase.OBJECT_SNAPSHOT,
  };

  let baseEvents: readonly TraceModel.Types.TraceEvents.TraceEventData[];

  beforeEach(async function() {
    // The screenshot handler requires the meta handler because it needs
    // to know the browser process and thread IDs. Here, then, we reset
    // and later we will pass events to the meta handler, otherwise the
    // screenshots handler will fail.
    TraceModel.Handlers.ModelHandlers.Meta.reset();
    TraceModel.Handlers.ModelHandlers.Meta.initialize();

    TraceModel.Handlers.ModelHandlers.Screenshots.reset();
  });

  describe('frames', () => {
    it('obtains them if present', async function() {
      const defaultTraceEvents = await TraceLoader.rawEvents(this, 'basic.json.gz');

      baseEvents = [
        ...defaultTraceEvents,
        {...baseEvent, ts: TraceModel.Types.Timing.MicroSeconds(100)},
        {...baseEvent, ts: TraceModel.Types.Timing.MicroSeconds(200)},
      ];

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

  describe('presentation timestamps', () => {
    function getMsDifferences(
        syntheticScreenshotEvents: TraceModel.Types.TraceEvents.SyntheticScreenshot[],
        originalScreenshotEvents: TraceModel.Types.TraceEvents.TraceEventScreenshot[]): number[] {
      return syntheticScreenshotEvents.map((synEvent, i) => {
        const origEvent = originalScreenshotEvents.at(i) as TraceModel.Types.TraceEvents.TraceEventScreenshot;
        const msDifference = (synEvent.ts - origEvent.ts) / 1000;
        return msDifference;
      });
    }
    it('are corrected if frame sequence number is present', async function() {
      // This trace was collected after https://crrev.com/c/4957973 landed.
      const events = await TraceLoader.rawEvents(this, 'about-blank-first.json.gz');
      for (const event of events) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
        TraceModel.Handlers.ModelHandlers.Screenshots.handleEvent(event);
      }
      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      await TraceModel.Handlers.ModelHandlers.Screenshots.finalize();

      const syntheticScreenshotEvents = TraceModel.Handlers.ModelHandlers.Screenshots.data();
      const originalScreenshotEvents = events.filter(TraceModel.Types.TraceEvents.isTraceEventScreenshot);
      assert.strictEqual(syntheticScreenshotEvents.length, originalScreenshotEvents.length);

      for (const oEvent of originalScreenshotEvents) {
        assert.notStrictEqual(oEvent.id, '0x1');  // The id (frame sequence) shouldn't be the old default of 1.
      }

      const msDifferences = getMsDifferences(syntheticScreenshotEvents, originalScreenshotEvents);
      // These values indicate all the screenshots true timings are a tad more to the left.
      assert.deepStrictEqual(msDifferences, [
        -13.079, -16.381, -12.503, -5.405,  -14.108, -14.661, -11.944, -14.322, -3.532, -15.821, 0.254,
        -32.22,  -15.156, -13.219, -14.464, -16.135, -16.501, -33.165, -15.71,  -32.39, -32.445, -30.512,
      ]);
    });

    it('remain the same with older traces', async function() {
      // Any trace captured before  121.0.6156.3 doesn't have the extra data to correct the timestamps.
      const events = await TraceLoader.rawEvents(this, 'web-dev.json.gz');
      for (const event of events) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
        TraceModel.Handlers.ModelHandlers.Screenshots.handleEvent(event);
      }
      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      await TraceModel.Handlers.ModelHandlers.Screenshots.finalize();

      const syntheticScreenshotEvents = TraceModel.Handlers.ModelHandlers.Screenshots.data();
      const originalScreenshotEvents = events.filter(TraceModel.Types.TraceEvents.isTraceEventScreenshot);
      assert.strictEqual(syntheticScreenshotEvents.length, originalScreenshotEvents.length);

      for (const oEvent of originalScreenshotEvents) {
        assert.strictEqual(oEvent.id, '0x1');  // The ids here aren't the new frame sequence, but the hardcoded 1.
      }

      const msDifferences = getMsDifferences(syntheticScreenshotEvents, originalScreenshotEvents);
      // No adjustment made.
      assert.deepStrictEqual(msDifferences, [
        0,
        0,
        0,
        0,
        0,
      ]);
    });
  });

});
