// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {allThreadEntriesInTrace} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describeWithEnvironment('InitiatorsHandler', () => {
  beforeEach(() => {
    Trace.Handlers.ModelHandlers.Initiators.reset();
  });

  it('for an UpdateLayoutTree event it sets the initiator to the previous ScheduledStyleRecalculation event',
     async function() {
       const traceEvents = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
       for (const event of traceEvents) {
         Trace.Handlers.ModelHandlers.Initiators.handleEvent(event);
       }
       await Trace.Handlers.ModelHandlers.Initiators.finalize();
       const data = Trace.Handlers.ModelHandlers.Initiators.data();
       const updateLayoutTreeEvent = traceEvents.find(event => {
         return Trace.Types.Events.isUpdateLayoutTree(event) && event.ts === 122411039965;
       });
       if (!updateLayoutTreeEvent || !Trace.Types.Events.isUpdateLayoutTree(updateLayoutTreeEvent)) {
         throw new Error('Could not find layout tree event.');
       }
       const initiator = data.eventToInitiator.get(updateLayoutTreeEvent);
       if (!initiator) {
         throw new Error('Did not find expected initiator for updateLayoutTreeEvent');
       }
       assert.isTrue(Trace.Types.Events.isScheduleStyleRecalculation(initiator));
       assert.strictEqual(updateLayoutTreeEvent.args.beginData?.frame, '25D2F12F1818C70B5BD4325CC9ACD8FF');
       assert.strictEqual(updateLayoutTreeEvent.args.beginData?.frame, initiator.args?.data?.frame);
     });

  it('for a Layout event it sets the initiator to the last InvalidateLayout event on that frame', async function() {
    const traceEvents = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
    for (const event of traceEvents) {
      Trace.Handlers.ModelHandlers.Initiators.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Initiators.finalize();
    const data = Trace.Handlers.ModelHandlers.Initiators.data();

    const layoutEvent = traceEvents.find(event => {
      return Trace.Types.Events.isLayout(event) && event.ts === 122411039994;
    });
    if (!layoutEvent || !Trace.Types.Events.isLayout(layoutEvent)) {
      throw new Error('Could not find layout event.');
    }
    const initiator = data.eventToInitiator.get(layoutEvent);
    if (!initiator) {
      throw new Error('Did not find expected initiator for LayoutEvent');
    }
    assert.isTrue(Trace.Types.Events.isInvalidateLayout(initiator));
    assert.strictEqual(initiator.ts, 122411036517);
  });

  it('for a Layout event it sets the initiator to the last ScheduledStyleRecalculation if it occurred before the InvalidateLayout event',
     async function() {
       const traceEvents = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
       for (const event of traceEvents) {
         Trace.Handlers.ModelHandlers.Initiators.handleEvent(event);
       }
       await Trace.Handlers.ModelHandlers.Initiators.finalize();
       const data = Trace.Handlers.ModelHandlers.Initiators.data();

       const layoutEvent = traceEvents.find(event => {
         return Trace.Types.Events.isLayout(event) && event.ts === 122411054960;
       });
       if (!layoutEvent || !Trace.Types.Events.isLayout(layoutEvent)) {
         throw new Error('Could not find layout event.');
       }
       const initiator = data.eventToInitiator.get(layoutEvent);
       if (!initiator) {
         throw new Error('Did not find expected initiator for LayoutEvent');
       }
       assert.isTrue(Trace.Types.Events.isScheduleStyleRecalculation(initiator));
       assert.strictEqual(initiator.ts, 122411054482);
     });

  it('sets an initiator relationship between a requestAnimationFrame and the scheduled FunctionCall', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'async-js-calls.json.gz');
    const requestAnimationFrameCall =
        allThreadEntriesInTrace(parsedTrace)
            .find(e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'requestAnimationFrame');
    if (!requestAnimationFrameCall) {
      throw new Error('Could not find requestAnimationFrame call');
    }
    const functionCallEvent =
        allThreadEntriesInTrace(parsedTrace)
            .find(e => Trace.Types.Events.isFunctionCall(e) && e.ts > requestAnimationFrameCall.ts);
    if (!functionCallEvent) {
      throw new Error('Could not find FunctionCall event');
    }

    assert.strictEqual(parsedTrace.Initiators.eventToInitiator.get(functionCallEvent), requestAnimationFrameCall);
    assert.deepEqual(parsedTrace.Initiators.initiatorToEvents.get(requestAnimationFrameCall), [functionCallEvent]);
  });

  it('for a TimerFire event sets the initiator to the TimerInstall', async function() {
    const traceEvents = await TraceLoader.rawEvents(this, 'timer-initiators.json.gz');
    for (const event of traceEvents) {
      Trace.Handlers.ModelHandlers.Initiators.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Initiators.finalize();
    const data = Trace.Handlers.ModelHandlers.Initiators.data();

    const timerFireEvent = traceEvents.find(Trace.Types.Events.isTimerFire);
    if (!timerFireEvent) {
      throw new Error('Could not find TimerFire event');
    }
    const timerInstallEvent = traceEvents.find(Trace.Types.Events.isTimerInstall);
    if (!timerInstallEvent) {
      throw new Error('Could not find TimerInstall event');
    }

    assert.strictEqual(data.eventToInitiator.get(timerFireEvent), timerInstallEvent);
    assert.deepEqual(data.initiatorToEvents.get(timerInstallEvent), [timerFireEvent]);
  });

  it('for a FireIdleCallback event sets the initiator to the RequestIdleCallback', async function() {
    const traceEvents = await TraceLoader.rawEvents(this, 'timer-initiators.json.gz');
    for (const event of traceEvents) {
      Trace.Handlers.ModelHandlers.Initiators.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Initiators.finalize();
    const data = Trace.Handlers.ModelHandlers.Initiators.data();

    const fireIdleCallbackEvent = traceEvents.find(Trace.Types.Events.isFireIdleCallback);
    if (!fireIdleCallbackEvent) {
      throw new Error('Could not find FireIdleCallback event');
    }
    const requestIdleCallbackEvent = traceEvents.find(Trace.Types.Events.isRequestIdleCallback);
    if (!requestIdleCallbackEvent) {
      throw new Error('Could not find RequestIdleCallback event');
    }

    assert.strictEqual(data.eventToInitiator.get(fireIdleCallbackEvent), requestIdleCallbackEvent);
    assert.deepEqual(data.initiatorToEvents.get(requestIdleCallbackEvent), [fireIdleCallbackEvent]);
  });

  it('sets an initiator relationship between a setTimeout and the scheduled FunctionCall', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'async-js-calls.json.gz');
    const setTimeoutCall =
        allThreadEntriesInTrace(parsedTrace)
            .filter(e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'setTimeout')
            .at(-1);
    if (!setTimeoutCall) {
      throw new Error('Could not find setTimeout call');
    }
    const functionCallEvent = allThreadEntriesInTrace(parsedTrace)
                                  .find(e => Trace.Types.Events.isFunctionCall(e) && e.ts > setTimeoutCall.ts);
    if (!functionCallEvent) {
      throw new Error('Could not find FunctionCall event');
    }

    assert.strictEqual(parsedTrace.Initiators.eventToInitiator.get(functionCallEvent), setTimeoutCall);
    assert.deepEqual(parsedTrace.Initiators.initiatorToEvents.get(setTimeoutCall), [functionCallEvent]);
  });

  it('sets an initiator relationship between a requestIdleCallback and the scheduled FunctionCall', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'async-js-calls.json.gz');
    const requestIdleCallback =
        allThreadEntriesInTrace(parsedTrace)
            .find(e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'requestIdleCallback');
    if (!requestIdleCallback) {
      throw new Error('Could not find requestIdleCallback call');
    }
    const functionCallEvent = allThreadEntriesInTrace(parsedTrace)
                                  .find(e => Trace.Types.Events.isFunctionCall(e) && e.ts > requestIdleCallback.ts);
    if (!functionCallEvent) {
      throw new Error('Could not find FunctionCall event');
    }

    assert.strictEqual(parsedTrace.Initiators.eventToInitiator.get(functionCallEvent), requestIdleCallback);
    assert.deepEqual(parsedTrace.Initiators.initiatorToEvents.get(requestIdleCallback), [functionCallEvent]);
  });

  it('sets an initiator relationship between a console.createTask and the scheduled task.run', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'async-js-calls.json.gz');
    const schedulerFuntion =
        allThreadEntriesInTrace(parsedTrace)
            .find(e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'startExample');
    if (!schedulerFuntion) {
      throw new Error('Could not find scheduler function call');
    }
    const consoleRunTask = allThreadEntriesInTrace(parsedTrace)
                               .find(e => Trace.Types.Events.isConsoleRunTask(e) && e.ts > schedulerFuntion.ts);
    assert.exists(consoleRunTask);
    assert.strictEqual(parsedTrace.Initiators.eventToInitiator.get(consoleRunTask), schedulerFuntion);
    assert.deepEqual(parsedTrace.Initiators.initiatorToEvents.get(schedulerFuntion), [consoleRunTask]);
  });

  it('for a WebSocketSendHandshakeRequest the initiator is the WebSocketCreate event', async function() {
    const traceEvents = await TraceLoader.rawEvents(this, 'web-sockets.json.gz');
    for (const event of traceEvents) {
      Trace.Handlers.ModelHandlers.Initiators.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Initiators.finalize();
    const data = Trace.Handlers.ModelHandlers.Initiators.data();

    const webSocketCreateEvent = traceEvents.find(Trace.Types.Events.isWebSocketCreate);
    if (!webSocketCreateEvent) {
      throw new Error('Could not fnd WebSocketCreateEvent');
    }

    const webSocketSendHandshakeRequestEvent = traceEvents.find(Trace.Types.Events.isWebSocketSendHandshakeRequest);
    if (!webSocketSendHandshakeRequestEvent) {
      throw new Error('Could not find WebSocketSendHandshakeRequest');
    }

    assert.strictEqual(data.eventToInitiator.get(webSocketSendHandshakeRequestEvent), webSocketCreateEvent);
  });

  it('for a WebSocketReceiveHandshakeResponse the initiator is the WebSocketCreate event', async function() {
    const traceEvents = await TraceLoader.rawEvents(this, 'web-sockets.json.gz');
    for (const event of traceEvents) {
      Trace.Handlers.ModelHandlers.Initiators.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Initiators.finalize();
    const data = Trace.Handlers.ModelHandlers.Initiators.data();

    const webSocketCreateEvent = traceEvents.find(Trace.Types.Events.isWebSocketCreate);
    if (!webSocketCreateEvent) {
      throw new Error('Could not fnd WebSocketCreateEvent');
    }

    const webSocketReceieveHandshakeResponseEvent =
        traceEvents.find(Trace.Types.Events.isWebSocketReceiveHandshakeResponse);
    if (!webSocketReceieveHandshakeResponseEvent) {
      throw new Error('Could not find WebSocketReceiveHandshakeResponse event');
    }
    const webSocketSendHandshakeRequestEvent = traceEvents.find(Trace.Types.Events.isWebSocketSendHandshakeRequest);
    if (!webSocketSendHandshakeRequestEvent) {
      throw new Error('Could not find WebSocketSendHandshakeRequest');
    }

    assert.strictEqual(data.eventToInitiator.get(webSocketReceieveHandshakeResponseEvent), webSocketCreateEvent);
    assert.deepEqual(
        data.initiatorToEvents.get(webSocketCreateEvent),
        [webSocketSendHandshakeRequestEvent, webSocketReceieveHandshakeResponseEvent]);
  });

  it('for a PostMessage Handler event the initiator is the PostMessage Dispatch event', async function() {
    const traceEvents = await TraceLoader.rawEvents(this, 'postmessage-initiators.json.gz');
    for (const event of traceEvents) {
      Trace.Handlers.ModelHandlers.Flows.handleEvent(event);
      Trace.Handlers.ModelHandlers.Initiators.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Flows.finalize();
    await Trace.Handlers.ModelHandlers.Initiators.finalize();
    const data = Trace.Handlers.ModelHandlers.Initiators.data();

    const schedulePostMessageEvent = traceEvents.find(Trace.Types.Events.isSchedulePostMessage);
    if (!schedulePostMessageEvent) {
      throw new Error('Could not find schedulePostMessageEvent event');
    }

    const handlePostMessageEvent = traceEvents.find(Trace.Types.Events.isHandlePostMessage);
    if (!handlePostMessageEvent) {
      throw new Error('Could not find handlePostMessageEvent event');
    }

    assert.strictEqual(data.eventToInitiator.get(handlePostMessageEvent), schedulePostMessageEvent);
    assert.deepEqual(data.initiatorToEvents.get(schedulePostMessageEvent), [handlePostMessageEvent]);
  });

  it('pairs the postTask-scheduled tasks with their scheduling initiators', async function() {
    const traceEvents = await TraceLoader.rawEvents(this, 'scheduler-post-task.json.gz');
    for (const event of traceEvents) {
      Trace.Handlers.ModelHandlers.Initiators.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Initiators.finalize();
    const data = Trace.Handlers.ModelHandlers.Initiators.data();

    const scheduleEvents = traceEvents.filter(Trace.Types.Events.isSchedulePostTaskCallback);
    assert.isNotEmpty(scheduleEvents, 'Could not find SchedulePostTaskCallback events');
    const runEvents = traceEvents.filter(Trace.Types.Events.isRunPostTaskCallback);
    assert.isNotEmpty(runEvents, 'Could not find RunPostTaskCallback events');
    const cancelEvents = traceEvents.filter(Trace.Types.Events.isAbortPostTaskCallback);
    assert.isNotEmpty(cancelEvents, 'Could not find AbortPostTaskCallback events');

    assert.containsAllKeys(data.initiatorToEvents, scheduleEvents, 'Not all schedule events in initiators');

    // All end events have a SchedulePostTaskCallback initiator.
    for (const endEvent of [...runEvents, ...cancelEvents]) {
      const initiator = data.eventToInitiator.get(endEvent);
      assert.exists(initiator);
      assert(Trace.Types.Events.isSchedulePostTaskCallback(initiator));
      assert.strictEqual(endEvent.args.data.taskId, initiator.args.data.taskId);

      assert(data.initiatorToEvents.get(initiator)?.includes(endEvent));
    }

    // There is one task that cancels itself while running, so it has both run and cancel events.
    const doubleEvents = scheduleEvents.some(scheduleEvent => {
      const endEvents = data.initiatorToEvents.get(scheduleEvent);
      if (!endEvents || endEvents.length < 2) {
        return false;
      }

      return endEvents.some(Trace.Types.Events.isRunPostTaskCallback) &&
          endEvents.some(Trace.Types.Events.isAbortPostTaskCallback);
    });
    assert(doubleEvents, 'initiator with both run and cancel initiated events not found');
  });
});
