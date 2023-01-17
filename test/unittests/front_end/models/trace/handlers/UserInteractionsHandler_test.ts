// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {loadEventsFromTraceFile, setTraceModelTimeout} from '../../../helpers/TraceHelpers.js';

describe('UserInteractions', function() {
  setTraceModelTimeout(this);
  beforeEach(async () => {
    TraceModel.Handlers.ModelHandlers.UserInteractions.reset();
  });

  describe('error handling', () => {
    it('throws if not initialized', async () => {
      // Finalize the handler by calling data and then finalize on it.
      TraceModel.Handlers.ModelHandlers.UserInteractions.data();
      await TraceModel.Handlers.ModelHandlers.UserInteractions.finalize();

      assert.throws(() => {
        const fakeEvent = {} as TraceModel.Types.TraceEvents.TraceEventData;
        TraceModel.Handlers.ModelHandlers.UserInteractions.handleEvent(fakeEvent);
      }, 'Handler is not initialized');
    });
  });

  describe('parsing', () => {
    it('returns all user interactions', async () => {
      const traceEvents = await loadEventsFromTraceFile('slow-interaction-button-click.json.gz');
      for (const event of traceEvents) {
        TraceModel.Handlers.ModelHandlers.UserInteractions.handleEvent(event);
      }

      const data = TraceModel.Handlers.ModelHandlers.UserInteractions.data();
      const clicks = data.allEvents.filter(event => {
        if (!event.args.data) {
          return false;
        }

        return event.args.data.type === 'click';
      });

      assert.strictEqual(data.allEvents.length, 58);
      assert.strictEqual(clicks.length, 1);
    });
  });

  describe('interactions', () => {
    async function processTrace(path: string): Promise<void> {
      const traceEvents = await loadEventsFromTraceFile(path);
      for (const event of traceEvents) {
        TraceModel.Handlers.ModelHandlers.UserInteractions.handleEvent(event);
      }
      await TraceModel.Handlers.ModelHandlers.UserInteractions.finalize();
    }

    it('returns all interaction events', async () => {
      await processTrace('slow-interaction-button-click.json.gz');
      const data = TraceModel.Handlers.ModelHandlers.UserInteractions.data();
      // There are three inct interactions:
      // pointerdown on the button (start of the click)
      // pointerup & click on the button (end of the click)
      assert.strictEqual(data.interactionEvents.length, 3);
    });

    it('sets the `dur` key on each event', async () => {
      await processTrace('slow-interaction-button-click.json.gz');
      const data = TraceModel.Handlers.ModelHandlers.UserInteractions.data();
      assert.deepEqual(data.interactionEvents.map(i => i.dur), [
        // pointerdown
        TraceModel.Helpers.Timing.millisecondsToMicroseconds(TraceModel.Types.Timing.MilliSeconds(32)),
        // pointerup
        TraceModel.Helpers.Timing.millisecondsToMicroseconds(TraceModel.Types.Timing.MilliSeconds(136)),
        // click
        TraceModel.Helpers.Timing.millisecondsToMicroseconds(TraceModel.Types.Timing.MilliSeconds(136)),
      ]);
    });

    it('gets the right interaction IDs for each interaction', async () => {
      await processTrace('slow-interaction-button-click.json.gz');
      const data = TraceModel.Handlers.ModelHandlers.UserInteractions.data();
      assert.deepEqual(data.interactionEvents.map(i => i.interactionId), [
        // pointerdown, pointerup and click are all from the same interaction
        1540,
        1540,
        1540,
      ]);
    });

    it('gets the right interaction IDs for a keypress interaction', async () => {
      await processTrace('slow-interaction-keydown.json.gz');
      const data = TraceModel.Handlers.ModelHandlers.UserInteractions.data();
      assert.deepEqual(data.interactionEvents.map(i => i.interactionId), [
        // pointerdown from clicking on the input
        7371,
        // pointerup from clicking on the input
        7371,
        // click from clicking on the input
        7371,
        // keydown from typing character
        7378,
        // keyup from typing character
        7378,
      ]);
      assert.deepEqual(data.interactionEvents.map(i => i.dur), [
        // pointerdown
        TraceModel.Helpers.Timing.millisecondsToMicroseconds(TraceModel.Types.Timing.MilliSeconds(16)),
        // pointerup
        TraceModel.Helpers.Timing.millisecondsToMicroseconds(TraceModel.Types.Timing.MilliSeconds(8)),
        // click
        TraceModel.Helpers.Timing.millisecondsToMicroseconds(TraceModel.Types.Timing.MilliSeconds(8)),
        // keydown
        TraceModel.Helpers.Timing.millisecondsToMicroseconds(TraceModel.Types.Timing.MilliSeconds(160)),
        // keyup
        TraceModel.Helpers.Timing.millisecondsToMicroseconds(TraceModel.Types.Timing.MilliSeconds(32)),
      ]);
    });
  });
});
