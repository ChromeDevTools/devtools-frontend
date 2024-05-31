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

    it('returns the last active SyntheticEventsManager with getActiveManager', async function() {
      const events = await TraceLoader.fixtureContents(this, 'basic.json.gz');
      await TraceLoader.executeTraceEngineOnFileContents(events);
      const firstActiveManager = TraceModel.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager();
      await TraceLoader.executeTraceEngineOnFileContents(events);
      const secondActiveManager = TraceModel.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager();
      assert.notEqual(firstActiveManager, secondActiveManager);
    });
    it('returns the SyntheticEventsManager for a given trace index with getManagerForTrace', async function() {
      const events = await TraceLoader.fixtureContents(this, 'basic.json.gz');
      await TraceLoader.executeTraceEngineOnFileContents(events);
      const firstActiveManager = TraceModel.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager();
      await TraceLoader.executeTraceEngineOnFileContents(events);
      const testActiveManager = TraceModel.Helpers.SyntheticEvents.SyntheticEventsManager.getManagerForTrace(0);
      assert.strictEqual(testActiveManager, firstActiveManager);
    });
  });

  describe('SyntheticBasedEvent registration', () => {
    it('stores synthetic based events at the same index as their corresponding raw event in the source array',
       async function() {
         const contents = await TraceLoader.fixtureContents(this, 'web-dev.json.gz');
         const rawEvents = 'traceEvents' in contents ?
             contents.traceEvents as TraceModel.Types.TraceEvents.TraceEventData[] :
             contents;
         const {traceParsedData} = await TraceLoader.executeTraceEngineOnFileContents(rawEvents);
         const allSyntheticEvents = [
           ...traceParsedData.Animations.animations,
           ...traceParsedData.NetworkRequests.byTime,
           ...traceParsedData.Screenshots,
         ];
         const syntheticEventsManager = TraceModel.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager();
         for (const syntheticEvent of allSyntheticEvents) {
           const rawEventIndex = rawEvents.indexOf(syntheticEvent.rawSourceEvent);
           // Test synthetic events are stored in the correct position.
           assert.strictEqual(syntheticEventsManager.syntheticEventForRawEventIndex(rawEventIndex), syntheticEvent);
         }
         const allSyntheticEventsInManagerCount = syntheticEventsManager.allSyntheticEvents().reduce(
             (count, event) => event !== undefined ? (count + 1) : 0, 0);
         // Test synthetic events are stored only once.
         assert.strictEqual(allSyntheticEventsInManagerCount, allSyntheticEvents.length);
       });
  });
});
