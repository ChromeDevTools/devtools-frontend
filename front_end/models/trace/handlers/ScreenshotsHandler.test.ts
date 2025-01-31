// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describe('ScreenshotsHandler', function() {
  beforeEach(async function() {
    Trace.Handlers.ModelHandlers.Meta.reset();
    Trace.Handlers.ModelHandlers.Screenshots.reset();
  });
  describe('supporting old and new screenshot formats', () => {
    async function runHandler(events: readonly Trace.Types.Events.Event[]) {
      Trace.Helpers.SyntheticEvents.SyntheticEventsManager.createAndActivate(events);

      for (const event of events) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
        Trace.Handlers.ModelHandlers.Screenshots.handleEvent(event);
      }

      await Trace.Handlers.ModelHandlers.Meta.finalize();
      await Trace.Handlers.ModelHandlers.Screenshots.finalize();
    }

    it('finds the screenshots in traces using the OBJECT_SNAPSHOT screenshot format', async function() {
      const events = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
      await runHandler(events);
      const data = Trace.Handlers.ModelHandlers.Screenshots.data();
      assert.isOk(data.legacySyntheticScreenshots);
      assert.isNull(data.screenshots);
      assert.lengthOf(data.legacySyntheticScreenshots, 18);
    });

    // TODO: leave explainer comment here
    it('finds the screenshots in traces using the new instant event screenshot format', async function() {
      const events = await TraceLoader.rawEvents(this, 'web-dev-screenshot-source-ids.json.gz');
      await runHandler(events);
      const data = Trace.Handlers.ModelHandlers.Screenshots.data();
      assert.isOk(data.screenshots);
      assert.isNull(data.legacySyntheticScreenshots);
      assert.lengthOf(data.screenshots, 20);
    });
  });

  describe('presentation timestamps', () => {
    function getMsDifferences(
        syntheticScreenshots: Trace.Types.Events.LegacySyntheticScreenshot[],
        originalScreenshotEvents: Trace.Types.Events.LegacyScreenshot[]): number[] {
      return syntheticScreenshots.map((synEvent, i) => {
        const origEvent = originalScreenshotEvents.at(i) as Trace.Types.Events.LegacyScreenshot;
        const msDifference = (synEvent.ts - origEvent.ts) / 1000;
        return msDifference;
      });
    }
    // Skip while we resolve the getPresentationTimestamp mystery.
    it.skip('[crbug.com/41363012] are corrected if frame sequence number is present', async function() {
      // This trace was collected after https://crrev.com/c/4957973 landed.
      const events = await TraceLoader.rawEvents(this, 'about-blank-first.json.gz');
      for (const event of events) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
        Trace.Handlers.ModelHandlers.Screenshots.handleEvent(event);
      }
      await Trace.Handlers.ModelHandlers.Meta.finalize();
      await Trace.Handlers.ModelHandlers.Screenshots.finalize();

      const syntheticScreenshots = Trace.Handlers.ModelHandlers.Screenshots.data().legacySyntheticScreenshots;
      assert.isOk(syntheticScreenshots);
      const originalScreenshotEvents = events.filter(Trace.Types.Events.isLegacyScreenshot);
      assert.strictEqual(syntheticScreenshots.length, originalScreenshotEvents.length);

      for (const oEvent of originalScreenshotEvents) {
        assert.notStrictEqual(oEvent.id, '0x1');  // The id (frame sequence) shouldn't be the old default of 1.
      }

      const msDifferences = getMsDifferences(syntheticScreenshots, originalScreenshotEvents);
      // These values indicate all the screenshots true timings are a tad more to the left.
      assert.deepEqual(msDifferences, [
        -13.079, -16.381, -12.503, -5.405,  -14.108, -14.661, -11.944, -14.322, -3.532, -15.821, 0.254,
        -32.22,  -15.156, -13.219, -14.464, -16.135, -16.501, -33.165, -15.71,  -32.39, -32.445, -30.512,
      ]);
    });

    it('remain the same with older traces', async function() {
      // Any trace captured before  121.0.6156.3 doesn't have the extra data to correct the timestamps.
      const events = await TraceLoader.rawEvents(this, 'web-dev.json.gz');
      for (const event of events) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
        Trace.Handlers.ModelHandlers.Screenshots.handleEvent(event);
      }
      await Trace.Handlers.ModelHandlers.Meta.finalize();
      await Trace.Handlers.ModelHandlers.Screenshots.finalize();

      const syntheticScreenshots = Trace.Handlers.ModelHandlers.Screenshots.data().legacySyntheticScreenshots;
      const originalScreenshotEvents = events.filter(Trace.Types.Events.isLegacyScreenshot);
      assert.isOk(syntheticScreenshots);
      assert.strictEqual(syntheticScreenshots.length, originalScreenshotEvents.length);

      for (const oEvent of originalScreenshotEvents) {
        assert.strictEqual(oEvent.id, '0x1');  // The ids here aren't the new frame sequence, but the hardcoded 1.
      }

      const msDifferences = getMsDifferences(syntheticScreenshots, originalScreenshotEvents);
      // No adjustment made.
      assert.deepEqual(msDifferences, [
        0,
        0,
        0,
        0,
        0,
      ]);
    });
  });
});
