// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {allThreadEntriesInTrace} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('Initiators', () => {
  describe('initiator-initiated event relationships', () => {
    let requestIdleCallbackCall: Trace.Types.Events.SyntheticProfileCall;
    let functionCallByrequestIdleCallback: Trace.Types.Events.Event;
    let setTimeoutCall: Trace.Types.Events.SyntheticProfileCall;
    let functionCallBySetTimeout: Trace.Types.Events.Event;
    let rAFCall: Trace.Types.Events.SyntheticProfileCall;
    let functionCallByRAF: Trace.Types.Events.Event;

    let parsedTrace: Trace.Handlers.Types.ParsedTrace;
    beforeEach(async function() {
      parsedTrace = (await TraceLoader.traceEngine(this, 'async-js-calls.json.gz')).parsedTrace;
      setTimeoutCall =
          allThreadEntriesInTrace(parsedTrace)
              .filter(e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'setTimeout')
              .at(-1) as Trace.Types.Events.SyntheticProfileCall;
      assert.exists(setTimeoutCall);
      assert.isTrue(Trace.Types.Events.isProfileCall(setTimeoutCall));

      functionCallBySetTimeout =
          allThreadEntriesInTrace(parsedTrace)
              .find(e => Trace.Types.Events.isFunctionCall(e) && e.ts > setTimeoutCall.ts) as Trace.Types.Events.Event;
      assert.exists(functionCallBySetTimeout);

      rAFCall =
          allThreadEntriesInTrace(parsedTrace)
              .filter(e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'requestAnimationFrame')
              .at(-1) as Trace.Types.Events.SyntheticProfileCall;
      assert.exists(rAFCall);
      assert.isTrue(Trace.Types.Events.isProfileCall(rAFCall));

      functionCallByRAF =
          allThreadEntriesInTrace(parsedTrace).find(e => Trace.Types.Events.isFunctionCall(e) && e.ts > rAFCall.ts) as
          Trace.Types.Events.Event;
      assert.exists(functionCallByRAF);

      requestIdleCallbackCall =
          allThreadEntriesInTrace(parsedTrace)
              .filter(e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'requestIdleCallback')
              .at(-1) as Trace.Types.Events.SyntheticProfileCall;
      assert.exists(requestIdleCallbackCall);
      assert.isTrue(Trace.Types.Events.isProfileCall(requestIdleCallbackCall));

      functionCallByrequestIdleCallback =
          allThreadEntriesInTrace(parsedTrace)
              .find(e => Trace.Types.Events.isFunctionCall(e) && e.ts > requestIdleCallbackCall.ts) as
          Trace.Types.Events.Event;
      assert.exists(functionCallByrequestIdleCallback);
    });

    it('returns the initiator data', async function() {
      const initiatorData = Timeline.Initiators.initiatorsDataToDraw(parsedTrace, functionCallBySetTimeout, [], []);
      assert.deepEqual(initiatorData[0], {
        event: functionCallBySetTimeout,
        initiator: setTimeoutCall,
      });
    });

    it('can walk up the tree to find the first parent with an initiator', async function() {
      // Find any of the bar() calls; they have a parent event
      // (FunctionCall) that has an initiator.
      const barCall = allThreadEntriesInTrace(parsedTrace)
                          .find(e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'bar');
      assert.exists(barCall);

      // Find the initator data but starting at the fibonacci()
      // call.
      const initiatorsData = Timeline.Initiators.initiatorsDataToDraw(parsedTrace, barCall, [], []);

      assert.deepEqual(initiatorsData[0], {
        event: functionCallBySetTimeout,
        initiator: setTimeoutCall,
      });
    });

    it('will walk back through the initiators to find the entire chain', async function() {
      // Find any of the baz() calls; they have a parent event
      // (FunctionCall) that has an initiator.
      const bazCall = allThreadEntriesInTrace(parsedTrace)
                          .find(e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'baz');
      assert.exists(bazCall);

      // Find the initators data but starting at the baz()
      // call. We expect to find 3 initiatorData objects here:
      // 1. baz() ===> FunctionCall caused by requestIdleCallback
      // 2. The requestIdleCallback from (1), caused by a prior setTimeout.
      // 3. The setTimeout from (2), caused by a prior requestAnimationFrame.
      const initiatorsData = Timeline.Initiators.initiatorsDataToDraw(parsedTrace, bazCall, [], []);

      assert.deepEqual(initiatorsData, [
        {
          event: functionCallByrequestIdleCallback,
          initiator: requestIdleCallbackCall,
        },
        {
          event: functionCallBySetTimeout,
          initiator: setTimeoutCall,
        },
        {
          event: functionCallByRAF,
          initiator: rAFCall,
        },
      ]);
    });

    it('will walk forward to find the events initiated by the selected entry', async function() {
      const initiatorsData = Timeline.Initiators.initiatorsDataToDraw(parsedTrace, rAFCall, [], []);
      assert.lengthOf(initiatorsData, 1);
      assert.strictEqual(initiatorsData[0].event, functionCallByRAF);
      assert.strictEqual(initiatorsData[0].initiator, rAFCall);
    });

    it('will return the closest expandable ancestor as an initiator in a pair if the initiator itself is hidden',
       async function() {
         // Get the parent of rAF to add to the expandable events array.
         // When we add rAF to hidden entries list, it will be the
         // closest expandable parent and the initiator should point to it.
         const rAFParent = parsedTrace.Renderer.entryToNode.get(rAFCall)?.parent;
         assert.exists(rAFParent);

         // Find the initiatorData objects starting at the rAF
         // call. We expect to find one initiatorData here:
         // rAF callback initiated by rAF -> Parent of rAF because rAF is hidden
         const initiatorsData =
             Timeline.Initiators.initiatorsDataToDraw(parsedTrace, rAFCall, [rAFCall], [rAFParent?.entry]);

         assert.lengthOf(initiatorsData, 1);
         assert.strictEqual(initiatorsData[0].event, functionCallByRAF);
         assert.strictEqual(initiatorsData[0].initiator, rAFParent.entry);
         // Ensure the expandable entry is marked as hidden
         assert.isTrue(initiatorsData[0].isInitiatorHidden);
       });

    it('will return the closest expandable ancestor as an initiated event in a pair if the event itself is hidden',
       async function() {
         const functionCallByRAFParent = parsedTrace.Renderer.entryToNode.get(functionCallByRAF)?.parent;
         assert.exists(functionCallByRAFParent);

         const initiatorsData = Timeline.Initiators.initiatorsDataToDraw(
             parsedTrace, rAFCall, [functionCallByRAF], [functionCallByRAFParent?.entry]);

         assert.lengthOf(initiatorsData, 1);
         assert.strictEqual(initiatorsData[0].event, functionCallByRAFParent?.entry);
         assert.strictEqual(initiatorsData[0].initiator, rAFCall);
         // Ensure the expandable entry is marked as hidden
         assert.isTrue(initiatorsData[0].isEntryHidden);
       });
  });

  describe('Network Requests', function() {
    it('returns the initiator data for network requests', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'network-requests-initiators.json.gz');

      // Find the network request to test, it is initiated by `youtube.com`.
      const event = parsedTrace.NetworkRequests.byTime.find(event => event.ts === 1491680762420);
      assert.exists(event);
      // Find the `youtube.com` network request.
      const initiator = parsedTrace.NetworkRequests.byTime.find(event => event.ts === 1491680629144);
      assert.exists(initiator);
      const initiatorData = Timeline.Initiators.initiatorsDataToDrawForNetwork(parsedTrace, event);

      assert.deepEqual(initiatorData, [{event, initiator}]);
    });
  });
});
