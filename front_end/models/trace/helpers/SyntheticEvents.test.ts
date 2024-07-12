// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TraceModel from '../trace.js';

describe('SyntheticEvents', function() {
  beforeEach(() => {
    TraceModel.Helpers.SyntheticEvents.SyntheticEventsManager.reset();
  });

  afterEach(() => {
    TraceModel.Helpers.SyntheticEvents.SyntheticEventsManager.reset();
  });

  describe('Initialization', function() {
    it('does not throw when invoking getActiveManager after executing the trace engine', async function() {
      const events = await TraceLoader.fixtureContents(this, 'basic.json.gz');
      await TraceLoader.executeTraceEngineOnFileContents(events);
      assert.doesNotThrow(TraceModel.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager);
    });

    it('always returns the manager for the most recent trace and re-uses managers for the same set of input events',
       async function() {
         // Exact traces do not matter, as long as they are different
         const trace1 = await TraceLoader.fixtureContents(this, 'basic.json.gz');
         const trace2 = await TraceLoader.fixtureContents(this, 'basic-stack.json.gz');

         const events1 = Array.isArray(trace1) ? trace1 : trace1.traceEvents;
         const events2 = Array.isArray(trace2) ? trace2 : trace2.traceEvents;

         const manager1 = TraceModel.Helpers.SyntheticEvents.SyntheticEventsManager.initAndActivate(events1);
         const manager2 = TraceModel.Helpers.SyntheticEvents.SyntheticEventsManager.initAndActivate(events2);

         // Manager2 is active as it was the last one to be initialized
         assert.strictEqual(TraceModel.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager(), manager2);
         // Now re-init with events1 (should use the existing manager from the cache)
         TraceModel.Helpers.SyntheticEvents.SyntheticEventsManager.initAndActivate(events1);
         // Now manager1 is active
         assert.strictEqual(TraceModel.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager(), manager1);
       });
  });

  describe('SyntheticBasedEvent registration', () => {
    it('stores synthetic based events at the same index as their corresponding raw event in the source array',
       async function() {
         const contents = await TraceLoader.fixtureContents(this, 'web-dev.json.gz');
         const rawEvents = 'traceEvents' in contents ?
             contents.traceEvents as TraceModel.Types.TraceEvents.TraceEventData[] :
             contents;
         const {traceData} = await TraceLoader.executeTraceEngineOnFileContents(rawEvents);
         const allSyntheticEvents = [
           ...traceData.Animations.animations,
           ...traceData.NetworkRequests.byTime,
           ...traceData.Screenshots,
         ];
         const syntheticEventsManager = TraceModel.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager();
         for (const syntheticEvent of allSyntheticEvents) {
           const rawEventIndex = rawEvents.indexOf(syntheticEvent.rawSourceEvent);
           // Test synthetic events are stored in the correct position.
           assert.strictEqual(syntheticEventsManager.syntheticEventForRawEventIndex(rawEventIndex), syntheticEvent);
         }
         const allSyntheticEventsInManagerCount = syntheticEventsManager.getSyntheticTraceEvents().reduce(
             (count, event) => event !== undefined ? (count + 1) : 0, 0);
         // Test synthetic events are stored only once.
         assert.strictEqual(allSyntheticEventsInManagerCount, allSyntheticEvents.length);
       });
  });
});
