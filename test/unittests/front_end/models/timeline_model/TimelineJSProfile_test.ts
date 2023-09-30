// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';

describe('TimelineJSProfile', () => {
  let tracingModel: TraceEngine.Legacy.TracingModel;
  let process: TraceEngine.Legacy.Process;
  let thread: TraceEngine.Legacy.Thread;

  const config = {
    showAllEvents: false,
    showRuntimeCallStats: false,
    showNativeFunctions: false,
    isDataOriginCpuProfile: false,
  };

  before(() => {
    tracingModel = new TraceEngine.Legacy.TracingModel();
    process = new TraceEngine.Legacy.Process(tracingModel, 1);
    thread = new TraceEngine.Legacy.Thread(process, 1);
  });

  it('generateJSFrameEvents returns an empty array for an empty input', () => {
    const events: TraceEngine.Legacy.Event[] = [];
    const returnedEvents =
        TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.generateJSFrameEvents(events, config);
    assert.deepEqual(returnedEvents, []);
  });

  it('generateJSFrameEvents creates JS frame events with a top-level V8 invocation', () => {
    const callEvent = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'FunctionCall', TraceEngine.Types.TraceEvents.Phase.COMPLETE, 10, thread);
    callEvent.setEndTime(20);
    const sampleEvent = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'JSSample', TraceEngine.Types.TraceEvents.Phase.INSTANT, 5, thread);
    sampleEvent.addArgs({data: {stackTrace: [{callFrame: {}}]}});
    const events = [callEvent, sampleEvent];

    const returnedEvents =
        TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.generateJSFrameEvents(events, config);
    assert.strictEqual(returnedEvents.length, 1);
    assert.strictEqual(returnedEvents[0].name, 'JSFrame');
    assert.strictEqual(returnedEvents[0].startTime, 5);
    assert.strictEqual(returnedEvents[0].endTime, 20);
  });

  it('generateJSFrameEvents creates JS frame events without a top-level V8 invocation', () => {
    const sampleEvent = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'JSSample', TraceEngine.Types.TraceEvents.Phase.INSTANT, 5, thread);
    sampleEvent.addArgs({data: {stackTrace: [{callFrame: {}}]}});
    const events = [sampleEvent];

    const returnedEvents =
        TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.generateJSFrameEvents(events, config);
    assert.strictEqual(returnedEvents.length, 1);
    assert.strictEqual(returnedEvents[0].name, 'JSFrame');
    assert.strictEqual(returnedEvents[0].startTime, 5);
    assert.strictEqual(returnedEvents[0].endTime, 5);
  });

  it('generateJSFrameEvents creates JS frame events for mixed with/without top-level events', () => {
    const sampleEvent1 = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'JSSample', TraceEngine.Types.TraceEvents.Phase.INSTANT, 5, thread);
    sampleEvent1.addArgs({data: {stackTrace: [{'functionName': 'a', 'callUID': 'a', 'scriptId': 1}]}});
    const sampleEvent2 = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'JSSample', TraceEngine.Types.TraceEvents.Phase.INSTANT, 6, thread);
    sampleEvent2.addArgs({data: {stackTrace: [{'functionName': 'a', 'callUID': 'a', 'scriptId': 1}]}});
    const sampleEvent3 = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'JSSample', TraceEngine.Types.TraceEvents.Phase.INSTANT, 7, thread);
    sampleEvent3.addArgs({data: {stackTrace: [{'functionName': 'a', 'callUID': 'a', 'scriptId': 1}]}});
    const callEvent = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'FunctionCall', TraceEngine.Types.TraceEvents.Phase.COMPLETE, 8, thread);
    callEvent.setEndTime(15);
    const sampleEvent4 = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'JSSample', TraceEngine.Types.TraceEvents.Phase.INSTANT, 9, thread);
    sampleEvent4.addArgs({data: {stackTrace: [{'functionName': 'a', 'callUID': 'a', 'scriptId': 1}]}});
    const sampleEvent5 = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'JSSample', TraceEngine.Types.TraceEvents.Phase.INSTANT, 10, thread);
    sampleEvent5.addArgs({data: {stackTrace: [{'functionName': 'a', 'callUID': 'a', 'scriptId': 1}]}});
    const events = [sampleEvent1, sampleEvent2, sampleEvent3, callEvent, sampleEvent4, sampleEvent5];

    const returnedEvents =
        TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.generateJSFrameEvents(events, config);
    assert.strictEqual(returnedEvents.length, 2);
    assert.strictEqual(returnedEvents[0].name, 'JSFrame');
    assert.strictEqual(returnedEvents[0].startTime, 5);
    assert.strictEqual(returnedEvents[0].endTime, 8);
    assert.strictEqual(returnedEvents[1].name, 'JSFrame');
    assert.strictEqual(returnedEvents[1].startTime, 9);
    assert.strictEqual(returnedEvents[1].endTime, 15);
  });

  // EvaluateScript and FunctionCall are two obvious "invocation events", but there are others (and sometimes none)
  // We must ensure we get reasonable JSFrames even when the invocation events are unexpected.
  // http://crbug.com/1384182
  it('generateJSFrameEvents creates JS frame events with v8.run trace event as parent', () => {
    const evaluateEvent = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'EvaluateScript', TraceEngine.Types.TraceEvents.Phase.COMPLETE, 5, thread);
    evaluateEvent.setEndTime(25);

    const v8RunEvent = new TraceEngine.Legacy.ConstructedEvent(
        'v8', 'v8.run', TraceEngine.Types.TraceEvents.Phase.COMPLETE, 10, thread);
    v8RunEvent.addArgs({data: {fileName: 'bundle.js'}});
    v8RunEvent.setEndTime(20);

    const sampleEvent3 = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'JSSample', TraceEngine.Types.TraceEvents.Phase.INSTANT, 12, thread);
    sampleEvent3.addArgs({data: {stackTrace: [{'functionName': 'a', 'callUID': 'a', 'scriptId': 1}]}});

    // The presence of this (unshown) event once incorrectedly triggered an early truncateJSStack
    const v8ParseFnEvent = new TraceEngine.Legacy.ConstructedEvent(
        'disabled-by-default-v8.compile', 'V8.ParseFunction', TraceEngine.Types.TraceEvents.Phase.COMPLETE, 10, thread);
    v8ParseFnEvent.setEndTime(11);

    const sampleEvent4 = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'JSSample', TraceEngine.Types.TraceEvents.Phase.INSTANT, 14, thread);
    sampleEvent4.addArgs({data: {stackTrace: [{'functionName': 'a', 'callUID': 'a', 'scriptId': 1}]}});
    const sampleEvent5 = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'JSSample', TraceEngine.Types.TraceEvents.Phase.INSTANT, 16, thread);
    sampleEvent5.addArgs({data: {stackTrace: [{'functionName': 'a', 'callUID': 'a', 'scriptId': 1}]}});
    const events = [evaluateEvent, v8RunEvent, sampleEvent3, v8ParseFnEvent, sampleEvent4, sampleEvent5];

    const returnedEvents =
        TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.generateJSFrameEvents(events, config);

    assert.strictEqual(returnedEvents.length, 1);
    assert.strictEqual(returnedEvents[0].name, 'JSFrame');
    assert.strictEqual(returnedEvents[0].startTime, 12);
    assert.strictEqual(returnedEvents[0].endTime, 20);
  });
  it('generateJSFrameEvents restarts the call frame stack when a new top level event is encountered', () => {
    function createEvent(
        name: string, tsMs: number, durMs: number,
        ph: TraceEngine.Types.TraceEvents.Phase = TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        cat = 'devtools.timeline'): TraceEngine.Legacy.PayloadEvent {
      // timestamps are assumed to come in microseconds in raw
      // event payloads, but after the event is created the rest of the
      // processing is done in milliseconds.
      const ts = tsMs * 1000;
      const dur = durMs * 1000;
      return TraceEngine.Legacy.PayloadEvent.fromPayload(
          {cat, name, ph, ts, dur} as unknown as TraceEngine.TracingManager.EventPayload, thread);
    }
    function createSample(ts: number): TraceEngine.Legacy.ConstructedEvent {
      return new TraceEngine.Legacy.ConstructedEvent(
          'devtools.timeline', 'JSSample', TraceEngine.Types.TraceEvents.Phase.INSTANT, ts, thread);
    }
    const runTask = createEvent(TraceEngine.Types.TraceEvents.KnownEventName.RunTask, 0, 100);
    const evaluateScript = createEvent(TraceEngine.Types.TraceEvents.KnownEventName.EvaluateScript, 0, 100);
    const runMicroTasks = createEvent(TraceEngine.Types.TraceEvents.KnownEventName.RunMicrotasks, 50, 100);

    const sampleEvent1 = createSample(20);
    sampleEvent1.addArgs({data: {stackTrace: [{'functionName': 'A', 'callUID': 'A', 'scriptId': 1}]}});

    const sampleEvent2 = createSample(40);
    sampleEvent2.addArgs({data: {stackTrace: [{'functionName': 'A', 'callUID': 'A', 'scriptId': 1}]}});

    // The following two samples start after the RunMicrotasks event, so
    // they cannot be merged with the samples above.
    const sampleEvent3 = createSample(60);
    sampleEvent3.addArgs({
      data: {
        stackTrace: [
          {'functionName': 'A', 'callUID': 'A', 'scriptId': 1},
          {'functionName': 'B', 'callUID': 'B', 'scriptId': 1},
        ],
      },
    });

    const sampleEvent4 = createSample(80);
    sampleEvent4.addArgs({
      data: {
        stackTrace: [
          {'functionName': 'A', 'callUID': 'A', 'scriptId': 1},
          {'functionName': 'B', 'callUID': 'B', 'scriptId': 1},
        ],
      },
    });

    const events = [
      runTask,
      evaluateScript,
      runMicroTasks,
      sampleEvent1,
      sampleEvent2,
      sampleEvent3,
      sampleEvent4,
    ].sort((a, b) => a.startTime - b.startTime);

    const returnedEvents =
        TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.generateJSFrameEvents(events, config);

    assert.strictEqual(returnedEvents.length, 3);
    const framesForFunctionA = returnedEvents.filter(e => e.args.data.functionName === 'A');
    assert.strictEqual(framesForFunctionA.length, 2);
    assert.strictEqual(framesForFunctionA[0].startTime, sampleEvent1.startTime);
    // First frame for function A should be finished when the
    // RunMicrotasks event started.
    assert.strictEqual(framesForFunctionA[0].duration, runMicroTasks.startTime - sampleEvent1.startTime);

    assert.strictEqual(framesForFunctionA[1].startTime, sampleEvent3.startTime);
    assert.strictEqual(framesForFunctionA[1].duration, (runMicroTasks.endTime || 0) - sampleEvent3.startTime);

    const framesForFunctionB = returnedEvents.filter(e => e.args.data.functionName === 'B');
    assert.strictEqual(framesForFunctionB.length, 1);
    assert.strictEqual(framesForFunctionB[0].startTime, sampleEvent3.startTime);
    assert.strictEqual(framesForFunctionB[0].duration, (runMicroTasks.endTime || 0) - sampleEvent3.startTime);
  });
});
