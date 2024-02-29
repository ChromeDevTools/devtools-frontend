// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {assertNotNullOrUndefined} from '../../core/platform/platform.js';
import * as TraceEngine from '../../models/trace/trace.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as Timeline from './timeline.js';

describe('Initiators', () => {
  it('returns the pair of initiators', async function() {
    const traceData = await TraceLoader.traceEngine(this, 'set-timeout-long-task.json.gz');

    const timerFireEvent = Array.from(traceData.Initiators.eventToInitiator.keys())
                               .find(TraceEngine.Types.TraceEvents.isTraceEventTimerFire);
    assertNotNullOrUndefined(timerFireEvent);
    const timerInstallEvent = traceData.Initiators.eventToInitiator.get(timerFireEvent);
    assertNotNullOrUndefined(timerInstallEvent);
    const initiatorPairs = Timeline.Initiators.eventInitiatorPairsToDraw(traceData, timerFireEvent, [], []);

    assert.deepEqual(initiatorPairs, [{
                       event: timerFireEvent,
                       initiator: timerInstallEvent,
                     }]);
  });

  it('can walk up the tree to find the first parent with an initiator', async function() {
    const traceData = await TraceLoader.traceEngine(this, 'set-timeout-long-task.json.gz');

    // Find any of the fibonnaci() calls; they have a parent
    // event (TimerFire) that has an initiator.
    const fibonacciCall = traceData.Renderer.allTraceEntries.find(entry => {
      return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'fibonacci';
    });
    assertNotNullOrUndefined(fibonacciCall);

    const timerFireEvent = Array.from(traceData.Initiators.eventToInitiator.keys())
                               .find(TraceEngine.Types.TraceEvents.isTraceEventTimerFire);
    assertNotNullOrUndefined(timerFireEvent);
    const timerInstallEvent = traceData.Initiators.eventToInitiator.get(timerFireEvent);
    assertNotNullOrUndefined(timerInstallEvent);

    // Find the initator pairs but starting at the fibonacci()
    // call.
    const initiatorPairs = Timeline.Initiators.eventInitiatorPairsToDraw(traceData, fibonacciCall, [], []);

    assert.deepEqual(initiatorPairs, [{
                       event: timerFireEvent,
                       initiator: timerInstallEvent,
                     }]);
  });

  it('will walk back through the initiators to find the entire chain', async function() {
    const traceData = await TraceLoader.traceEngine(this, 'nested-initiators.json.gz');

    // Find any of the fibonnaci() calls; they have a parent
    // event (TimerFire) that has an initiator.
    const fibonacciCall = traceData.Renderer.allTraceEntries.find(entry => {
      return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'fibonacci';
    });
    assertNotNullOrUndefined(fibonacciCall);

    // Find the initator pairs but starting at the fibonacci()
    // call. We expect to find two pairs here:
    // 1. fibonacci() ===> TimerFire caused by TimerInstall
    // 2. The TimerInstall from (1), caused by a prior TimerInstall.
    const initiatorPairs = Timeline.Initiators.eventInitiatorPairsToDraw(traceData, fibonacciCall, [], []);

    assert.lengthOf(initiatorPairs, 2);
    for (const pair of initiatorPairs) {
      // Ensure each pair is a TimerInstall>TimerFire pair.
      assert.strictEqual(pair.event.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerFire);
      assert.strictEqual(pair.initiator.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerInstall);
    }
  });

  it('will walk forward to find the events initiated by the selected entry', async function() {
    const traceData = await TraceLoader.traceEngine(this, 'nested-initiators.json.gz');

    // Find any of the InstallTimer calls; they initiate other events.
    const timerInstall = traceData.Renderer.allTraceEntries.find(entry => {
      return entry.name === TraceEngine.Types.TraceEvents.KnownEventName.TimerInstall;
    });
    assertNotNullOrUndefined(timerInstall);

    // Find the initator pairs starting at the TimerInstall
    // call. We expect to find one pair here:
    // TimerFire that was initiated by the entry we found - TimerInstall

    const initiatorPairs = Timeline.Initiators.eventInitiatorPairsToDraw(traceData, timerInstall, [], []);

    assert.lengthOf(initiatorPairs, 1);
    for (const pair of initiatorPairs) {
      // Ensure the pair is a TimerInstall>TimerFire pair.
      assert.strictEqual(pair.event.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerFire);
      assert.strictEqual(pair.initiator.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerInstall);
    }
  });

  it('will return the closest modified ancestor as an initiator in a pair if the initiator itself is hidden',
     async function() {
       const traceData = await TraceLoader.traceEngine(this, 'nested-initiators.json.gz');

       // Find any of the InstallTimer calls; they initiate other events.
       const timerInstall = traceData.Renderer.allTraceEntries.find(entry => {
         return entry.name === TraceEngine.Types.TraceEvents.KnownEventName.TimerInstall;
       });
       assertNotNullOrUndefined(timerInstall);
       // Get the parent of InstallTimer to add to the modified events array.
       // When we add TimerInstall to hidden entries list, it will be the closest modified parent and the initiator should point to it.
       const timerInstallParent = traceData.Renderer.entryToNode.get(timerInstall)?.parent;
       assertNotNullOrUndefined(timerInstallParent);

       // Find the initator pairs starting at the TimerInstall
       // call. We expect to find one pair here:
       // TimerFire that was initiated by the entry we found - Parent of TimerInstall because TimerInstall is hidden
       const initiatorPairs = Timeline.Initiators.eventInitiatorPairsToDraw(
           traceData, timerInstall, [timerInstall], [timerInstallParent?.entry]);

       assert.lengthOf(initiatorPairs, 1);
       // Ensure the pair is a TimerInstall>TimerFire parent pair.
       for (const pair of initiatorPairs) {
         assert.strictEqual(pair.event.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerFire);
         assert.strictEqual(pair.initiator, timerInstallParent.entry);
         // Ensure the modified entry is marked as hidden
         assert.strictEqual(pair.isInitiatorHidden, true);
       }

     });

  it('will return the closest modified ancestor as an initiated event in a pair if the event itself is hidden',
     async function() {
       const traceData = await TraceLoader.traceEngine(this, 'nested-initiators.json.gz');

       // Find any of the fibonnaci() calls; they have a parent
       // event (TimerFire) that has an initiator.
       const fibonacciCall = traceData.Renderer.allTraceEntries.find(entry => {
         return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'fibonacci';
       });
       assertNotNullOrUndefined(fibonacciCall);

       // Find the initator pairs but starting at the fibonacci()
       // call. We expect to find two pairs here:
       // 1. fibonacci() ===> TimerFire caused by TimerInstall
       // 2. The TimerInstall from (1), caused by a prior TimerInstall.
       let initiatorPairs = Timeline.Initiators.eventInitiatorPairsToDraw(traceData, fibonacciCall, [], []);

       assert.lengthOf(initiatorPairs, 2);
       // Save the parents of initiated events and the events themselves to get initiators again with those as modified and hidden
       const timerFireParents: TraceEngine.Types.TraceEvents.TraceEventData[] = [];
       const initiatedEvents: TraceEngine.Types.TraceEvents.TraceEventData[] = [];

       for (const pair of initiatorPairs) {
         // Ensure each pair is a TimerInstall>TimerFire pair.
         assert.strictEqual(pair.event.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerFire);
         assert.strictEqual(pair.initiator.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerInstall);
         const parentEvent = traceData.Renderer.entryToNode.get(pair.event)?.parent?.entry;
         if (parentEvent) {
           timerFireParents.push(parentEvent);
           initiatedEvents.push(pair.event);
         }
       }

       // Get initiator pair again, now with the previously initiated events hidden and parents marked as modified
       initiatorPairs =
           Timeline.Initiators.eventInitiatorPairsToDraw(traceData, fibonacciCall, initiatedEvents, timerFireParents);
       // The length should not change, just the inititated events.
       assert.lengthOf(initiatorPairs, 2);
       for (let i = 0; i < initiatorPairs.length; i++) {
         const pair = initiatorPairs[i];
         // Ensure each pair is a TimerInstall>TimerFire parent pair.
         assert.strictEqual(pair.event, timerFireParents[i]);
         assert.strictEqual(pair.initiator.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerInstall);
         // Ensure the modified entry is marked as hidden
         assert.strictEqual(pair.isEntryHidden, true);
       }
     });
});
