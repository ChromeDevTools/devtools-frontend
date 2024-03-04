// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {assertNotNullOrUndefined} from '../../core/platform/platform.js';
import * as TraceEngine from '../../models/trace/trace.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as Timeline from './timeline.js';

describe('Initiators', () => {
  it('returns the initiator data', async function() {
    const traceData = await TraceLoader.traceEngine(this, 'set-timeout-long-task.json.gz');

    const timerFireEvent = Array.from(traceData.Initiators.eventToInitiator.keys())
                               .find(TraceEngine.Types.TraceEvents.isTraceEventTimerFire);
    assertNotNullOrUndefined(timerFireEvent);
    const timerInstallEvent = traceData.Initiators.eventToInitiator.get(timerFireEvent);
    assertNotNullOrUndefined(timerInstallEvent);
    const initiatorData = Timeline.Initiators.initiatorsDataToDraw(traceData, timerFireEvent, [], []);

    assert.deepEqual(initiatorData, [{
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

    // Find the initator data but starting at the fibonacci()
    // call.
    const initiatorsData = Timeline.Initiators.initiatorsDataToDraw(traceData, fibonacciCall, [], []);

    assert.deepEqual(initiatorsData, [{
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

    // Find the initators data but starting at the fibonacci()
    // call. We expect to find two initiatorData objects here:
    // 1. fibonacci() ===> TimerFire caused by TimerInstall
    // 2. The TimerInstall from (1), caused by a prior TimerInstall.
    const initiatorsData = Timeline.Initiators.initiatorsDataToDraw(traceData, fibonacciCall, [], []);

    assert.lengthOf(initiatorsData, 2);
    for (const initiatorData of initiatorsData) {
      // Ensure each initiatorData object has TimerInstall>TimerFire event to initiator.
      assert.strictEqual(initiatorData.event.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerFire);
      assert.strictEqual(initiatorData.initiator.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerInstall);
    }
  });

  it('will walk forward to find the events initiated by the selected entry', async function() {
    const traceData = await TraceLoader.traceEngine(this, 'nested-initiators.json.gz');

    // Find any of the InstallTimer calls; they initiate other events.
    const timerInstall = traceData.Renderer.allTraceEntries.find(entry => {
      return entry.name === TraceEngine.Types.TraceEvents.KnownEventName.TimerInstall;
    });
    assertNotNullOrUndefined(timerInstall);

    // Find the initatorData objects starting at the TimerInstall
    // call. We expect to find one initatorData here:
    // TimerFire that was initiated by the entry we found - TimerInstall

    const initatorsData = Timeline.Initiators.initiatorsDataToDraw(traceData, timerInstall, [], []);

    assert.lengthOf(initatorsData, 1);
    for (const initatorData of initatorsData) {
      // Ensure each initiatorData object has TimerInstall>TimerFire event to initiator.
      assert.strictEqual(initatorData.event.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerFire);
      assert.strictEqual(initatorData.initiator.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerInstall);
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

       // Find the initatorData objects starting at the TimerInstall
       // call. We expect to find one initatorData here:
       // TimerFire that was initiated by the entry we found - Parent of TimerInstall because TimerInstall is hidden
       const initiatorsData = Timeline.Initiators.initiatorsDataToDraw(
           traceData, timerInstall, [timerInstall], [timerInstallParent?.entry]);

       assert.lengthOf(initiatorsData, 1);
       // Ensure each initiatorData object has TimerInstall>TimerFire event to initiator.
       for (const initiatorData of initiatorsData) {
         assert.strictEqual(initiatorData.event.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerFire);
         assert.strictEqual(initiatorData.initiator, timerInstallParent.entry);
         // Ensure the modified entry is marked as hidden
         assert.strictEqual(initiatorData.isInitiatorHidden, true);
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

       // Find the initatorData objects but starting at the fibonacci()
       // call. We expect to find two initiatorData objects here:
       // 1. fibonacci() ===> TimerFire caused by TimerInstall
       // 2. The TimerInstall from (1), caused by a prior TimerInstall.
       let initiatorsData = Timeline.Initiators.initiatorsDataToDraw(traceData, fibonacciCall, [], []);

       assert.lengthOf(initiatorsData, 2);
       // Save the parents of initiated events and the events themselves to get initiators again with those as modified and hidden
       const timerFireParents: TraceEngine.Types.TraceEvents.TraceEventData[] = [];
       const initiatedEvents: TraceEngine.Types.TraceEvents.TraceEventData[] = [];

       for (const initiatorData of initiatorsData) {
         // Ensure each initiatorData object has TimerInstall>TimerFire event to initiator.
         assert.strictEqual(initiatorData.event.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerFire);
         assert.strictEqual(initiatorData.initiator.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerInstall);
         const parentEvent = traceData.Renderer.entryToNode.get(initiatorData.event)?.parent?.entry;
         if (parentEvent) {
           timerFireParents.push(parentEvent);
           initiatedEvents.push(initiatorData.event);
         }
       }

       // Get initiatorData object again, now with the previously initiated events hidden and parents marked as modified
       initiatorsData =
           Timeline.Initiators.initiatorsDataToDraw(traceData, fibonacciCall, initiatedEvents, timerFireParents);
       // The length should not change, just the inititated events.
       assert.lengthOf(initiatorsData, 2);
       for (let i = 0; i < initiatorsData.length; i++) {
         const initiatorData = initiatorsData[i];
         // Ensure each initiatorData object has TimerInstall>TimerFire event to initiator.
         assert.strictEqual(initiatorData.event, timerFireParents[i]);
         assert.strictEqual(initiatorData.initiator.name, TraceEngine.Types.TraceEvents.KnownEventName.TimerInstall);
         // Ensure the modified entry is marked as hidden
         assert.strictEqual(initiatorData.isEntryHidden, true);
       }
     });
});
