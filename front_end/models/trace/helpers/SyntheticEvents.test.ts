// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describe('SyntheticEvents', function() {
  beforeEach(() => {
    Trace.Helpers.SyntheticEvents.SyntheticEventsManager.reset();
  });

  afterEach(() => {
    Trace.Helpers.SyntheticEvents.SyntheticEventsManager.reset();
  });

  describe('Initialization', function() {
    it('does not throw when invoking getActiveManager after executing the trace engine', async function() {
      const events = await TraceLoader.fixtureContents(this, 'basic.json.gz');
      await TraceLoader.executeTraceEngineOnFileContents(events);
      assert.doesNotThrow(Trace.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager);
    });

    it('activates the latest trace manager but can then activate an alternative manager', async function() {
      // Exact traces do not matter, as long as they are different
      const events1 = await TraceLoader.rawEvents(this, 'basic.json.gz');
      const events2 = await TraceLoader.rawEvents(this, 'basic-stack.json.gz');

      const manager1 = Trace.Helpers.SyntheticEvents.SyntheticEventsManager.createAndActivate(events1);
      const manager2 = Trace.Helpers.SyntheticEvents.SyntheticEventsManager.createAndActivate(events2);

      // Manager2 is active as it was the last one to be initialized
      assert.strictEqual(Trace.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager(), manager2);
      Trace.Helpers.SyntheticEvents.SyntheticEventsManager.activate(manager1);
      assert.strictEqual(Trace.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager(), manager1);
    });
  });

  describe('SyntheticBased registration', () => {
    it('stores synthetic based events at the same index as their corresponding raw event in the source array',
       async function() {
         const contents = await TraceLoader.fixtureContents(this, 'web-dev.json.gz');
         const rawEvents = 'traceEvents' in contents ? contents.traceEvents as Trace.Types.Events.Event[] : contents;
         const {parsedTrace} = await TraceLoader.executeTraceEngineOnFileContents(rawEvents);
         const allSyntheticEvents = [
           ...parsedTrace.Animations.animations,
           ...parsedTrace.NetworkRequests.byTime,
           ...parsedTrace.Screenshots.all,
         ];
         const syntheticEventsManager = Trace.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager();
         for (const syntheticEvent of allSyntheticEvents) {
           const rawEventIndex = rawEvents.indexOf(syntheticEvent.rawSourceEvent);
           // Test synthetic events are stored in the correct position.
           assert.strictEqual(syntheticEventsManager.syntheticEventForRawEventIndex(rawEventIndex), syntheticEvent);
         }
         const allSyntheticEventsInManagerCount = syntheticEventsManager.getSyntheticTraces().reduce(
             (count, event) => event !== undefined ? (count + 1) : 0, 0);
         // Test synthetic events are stored only once.
         assert.strictEqual(allSyntheticEventsInManagerCount, allSyntheticEvents.length);
       });
  });
});
