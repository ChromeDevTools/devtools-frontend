// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';

import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describe('SyntheticEvents', function() {
  setupLocaleHooks();
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
    it('resolves synthetic based events from the index of their corresponding raw event',
       async function() {
         const contents = await TraceLoader.fixtureContents(this, 'web-dev.json.gz');
         const rawEvents = 'traceEvents' in contents ? contents.traceEvents as Trace.Types.Events.Event[] : contents;
         const {parsedTrace} = await TraceLoader.executeTraceEngineOnFileContents(rawEvents);
         const allSyntheticEvents = [
           ...parsedTrace.data.Animations.animations,
           ...parsedTrace.data.NetworkRequests.byTime,
           ...parsedTrace.data.Screenshots.legacySyntheticScreenshots ?? [],
         ];
         const syntheticEventsManager = Trace.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager();
         for (const syntheticEvent of allSyntheticEvents) {
           const rawEventIndex = rawEvents.indexOf(syntheticEvent.rawSourceEvent);
           // Test each synthetic event resolves from its raw event index.
           assert.strictEqual(syntheticEventsManager.syntheticEventForRawEventIndex(rawEventIndex), syntheticEvent);
         }
       });
  });
});
