// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {
  getBaseTraceParseModelData,
  makeCompleteEvent,
  makeInstantEvent,
  makeMockRendererHandlerData,
  makeProfileCall
} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

function shapeStackTraceAsArray(stackTrace: Protocol.Runtime.StackTrace):
    Array<{callFrames: Protocol.Runtime.CallFrame[], description?: string}> {
  const stackTraceAsArray: Array<{callFrames: Protocol.Runtime.CallFrame[], description?: string}> = [];
  let currentStackTrace: Protocol.Runtime.StackTrace|undefined = stackTrace;
  while (currentStackTrace) {
    // @ts-expect-error `codeType` is not included in the protocol types but
    // occasionally present
    currentStackTrace.callFrames.forEach(callFrame => delete callFrame.codeType);
    stackTraceAsArray.push({callFrames: currentStackTrace.callFrames, description: currentStackTrace.description});
    currentStackTrace = currentStackTrace.parent;
  }

  return stackTraceAsArray;
}

function parsedTraceFromEvents(events: Trace.Types.Events.Event[]): Trace.Handlers.Types.ParsedTrace {
  return getBaseTraceParseModelData({Renderer: makeMockRendererHandlerData(events)});
}
describeWithEnvironment('StackTraceForTraceEvent', function() {
  let parsedTrace: Trace.Handlers.Types.ParsedTrace;
  beforeEach(async function() {
    const traceEngineData = await TraceLoader.traceEngine(this, 'async-js-calls.json.gz');
    parsedTrace = traceEngineData.parsedTrace;
    Trace.Extras.StackTraceForEvent.clearCacheForTrace(parsedTrace);
  });
  afterEach(async () => {
    Trace.Extras.StackTraceForEvent.clearCacheForTrace(parsedTrace);
  });

  it('correctly builds the stack trace of a profile call when it only has a synchronous stack trace.',
     async function() {
       const jsCall = parsedTrace.Renderer.allTraceEntries.find(
           e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'startExample');
       assert.exists(jsCall);
       const stackTrace = Trace.Extras.StackTraceForEvent.get(jsCall, parsedTrace);
       assert.exists(stackTrace);
       const stackTraceArray = shapeStackTraceAsArray(stackTrace);
       assert.lengthOf(stackTraceArray, 1);
       const callFrames = stackTraceArray[0].callFrames;
       assert.deepEqual(callFrames, [
         {
           columnNumber: 21,
           functionName: 'startExample',
           lineNumber: 25,
           scriptId: '53' as Protocol.Runtime.ScriptId,
           url: '',
         },
         {columnNumber: 0, functionName: '', lineNumber: 0, scriptId: '53' as Protocol.Runtime.ScriptId, url: ''},
       ]);
     });

  it('correctly builds the stack trace of a profile call when it only has an asynchronous stack trace.',
     async function() {
       const jsCall = parsedTrace.Renderer.allTraceEntries.find(
           e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'baz');
       assert.exists(jsCall);
       const stackTrace = Trace.Extras.StackTraceForEvent.get(jsCall, parsedTrace);
       assert.exists(stackTrace);
       const stackTraceArray = shapeStackTraceAsArray(stackTrace);
       assert.lengthOf(stackTraceArray, 4);

       assert.deepEqual(stackTraceArray, [
         {
           callFrames: [{
             columnNumber: 12,
             functionName: 'baz',
             lineNumber: 13,
             scriptId: '53' as Protocol.Runtime.ScriptId,
             url: '',
           }],
           description: undefined,
         },
         {
           callFrames: [{
             columnNumber: 12,
             functionName: 'bar',
             lineNumber: 6,
             scriptId: '53' as Protocol.Runtime.ScriptId,
             url: '',
           }],
           description: 'requestIdleCallback',
         },
         {
           callFrames: [{
             columnNumber: 12,
             functionName: 'foo',
             lineNumber: 0,
             scriptId: '53' as Protocol.Runtime.ScriptId,
             url: '',
           }],
           description: 'setTimeout',
         },
         {
           callFrames: [
             {
               columnNumber: 21,
               functionName: 'startExample',
               lineNumber: 25,
               scriptId: '53' as Protocol.Runtime.ScriptId,
               url: '',
             },
             {columnNumber: 0, functionName: '', lineNumber: 0, scriptId: '53', url: ''},
           ],
           description: 'requestAnimationFrame',
         },
       ]);
     });
  it('uses cached data correctly.', async function() {
    const fooCall = parsedTrace.Renderer.allTraceEntries.find(
        e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'foo');
    assert.exists(fooCall);
    const result =
        parsedTrace.AsyncJSCalls.asyncCallToScheduler.get(fooCall as Trace.Types.Events.SyntheticProfileCall);
    assert.exists(result);
    const {scheduler: parentOfFoo} = result;

    // Compute stack trace of foo's parent
    const stackTraceOfParent = Trace.Extras.StackTraceForEvent.get(parentOfFoo, parsedTrace);
    assert.exists(stackTraceOfParent);
    const stackTraceArray = shapeStackTraceAsArray(stackTraceOfParent);
    assert.lengthOf(stackTraceArray, 1);

    // Modify the cache, to check it's used when possible
    const bottomFrame = stackTraceOfParent.callFrames.at(-1);
    assert.exists(bottomFrame);
    const originalName = bottomFrame.functionName;
    bottomFrame.functionName = 'Overriden name';

    // Compute stack trace of foo, ensure the cache calculated with
    // its parent is used.
    const stackTraceOfFoo = Trace.Extras.StackTraceForEvent.get(fooCall, parsedTrace);
    assert.exists(stackTraceOfFoo);
    const stackTraceArray2 = shapeStackTraceAsArray(stackTraceOfFoo);
    assert.deepEqual(stackTraceArray2, [
      {
        callFrames: [
          {columnNumber: 12, functionName: 'foo', lineNumber: 0, scriptId: '53' as Protocol.Runtime.ScriptId, url: ''},
        ],
        description: undefined,
      },
      {
        callFrames: [
          {
            columnNumber: 21,
            functionName: 'startExample',
            lineNumber: 25,
            scriptId: '53' as Protocol.Runtime.ScriptId,
            url: '',
          },
          {
            columnNumber: 0,
            functionName: bottomFrame.functionName,
            lineNumber: 0,
            scriptId: '53' as Protocol.Runtime.ScriptId,
            url: '',
          },
        ],
        description: 'requestAnimationFrame',
      },
    ]);
    bottomFrame.functionName = originalName;
  });
  it('uses the stack trace of the profile call that contains the raw trace event of the extension entry call',
     async function() {
       const jsCall = parsedTrace.Renderer.allTraceEntries.find(
                          e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'baz') as
               Trace.Types.Events.SyntheticProfileCall |
           undefined;
       assert.exists(jsCall);
       const stackTraceForExtensionProfileCall = Trace.Extras.StackTraceForEvent.get(jsCall, parsedTrace);
       const measureTraceId = [...parsedTrace.UserTimings.measureTraceByTraceId.keys()].at(0);
       if (!measureTraceId) {
         throw new Error('Performance measure trace was not found');
       }

       assert.exists(stackTraceForExtensionProfileCall);

       // Create an extension entry right next to our profile call (based
       // on its callTime property).
       // Test the profile call's stack strace is returned as the
       // extension entry's stack trace.
       const mockExtensionEntry = {
         cat: 'devtools.extension',
         ts: jsCall.ts,
         pid: jsCall.pid,
         tid: jsCall.tid,
         rawSourceEvent: {
           cat: 'blink.user_timing',
           args: {stackTrace: [{functionName: jsCall.callFrame.functionName}], traceId: measureTraceId},
           ph: Trace.Types.Events.Phase.ASYNC_NESTABLE_START,
         },
       } as Trace.Types.Extensions.SyntheticExtensionEntry;
       const stackTraceForExtensionEntry = Trace.Extras.StackTraceForEvent.get(mockExtensionEntry, parsedTrace);
       assert.exists(stackTraceForExtensionEntry);
       assert.deepEqual(
           shapeStackTraceAsArray(stackTraceForExtensionEntry),
           shapeStackTraceAsArray(stackTraceForExtensionProfileCall));
     });
  it('extracts the correct stack trace for a console timestamp extension entry', () => {
    const pid = 0;
    const tid = 0;
    const profileCall = makeProfileCall('myFunction', 0, 200, pid, tid);
    // Override the default -1 values to ensure the callframe is not
    // discarded as a native frame (which we ignore).
    profileCall.callFrame.columnNumber = 0;
    profileCall.callFrame.lineNumber = 0;
    const extensionEntryStart = 0;
    const extensionEntryEnd = 100;
    const entryName = 'Entry';
    const timestamp = makeInstantEvent(Trace.Types.Events.Name.TIME_STAMP, extensionEntryEnd, '', pid, tid);
    const extensionData = {
      color: 'tertiary-dark',
      frame: 'frame',
      message: entryName,
      name: entryName,
      sampleTraceId: 0,
      start: extensionEntryStart,
      track: 'track',
    };
    timestamp.args = {data: extensionData};
    const trace = parsedTraceFromEvents([profileCall, timestamp]);

    const mockExtensionEntry = {
      ts: timestamp.ts,
      name: 'Entry',
      cat: 'devtools.extension',
      args: extensionData,
      rawSourceEvent: timestamp,
      dur: Trace.Types.Timing.Micro(extensionEntryEnd - extensionEntryStart),
      ph: Trace.Types.Events.Phase.COMPLETE,
      pid,
      tid,
    } as unknown as Trace.Types.Extensions.SyntheticExtensionTrackEntry;
    const stackTraceForExtensionEntry = Trace.Extras.StackTraceForEvent.get(mockExtensionEntry, trace);
    assert.exists(stackTraceForExtensionEntry);
    assert.deepEqual(shapeStackTraceAsArray(stackTraceForExtensionEntry), [
      {callFrames: [profileCall.callFrame], description: undefined},
    ]);
  });

  it('returns the right stack for a trace event that contains a stack trace in its payload', () => {
    const pid = 0;
    const tid = 0;
    const payloadLineNumber = 10;
    const payloadColumnNumber = 3;
    const profileCall1 = makeProfileCall('foo', 0, 200, pid, tid);
    const profileCall2 = makeProfileCall('bar', 0, 200, pid, tid);
    // Override the default -1 values to ensure the callframe is not
    // discarded as a native frame (which we ignore).
    profileCall1.callFrame.columnNumber = 0;
    profileCall1.callFrame.lineNumber = 0;
    profileCall2.callFrame.columnNumber = 0;
    profileCall2.callFrame.lineNumber = 0;
    const traceEvent = makeCompleteEvent(Trace.Types.Events.Name.UPDATE_LAYOUT_TREE, 100, 10, '', pid, tid) as
        Trace.Types.Events.UpdateLayoutTree;
    const payloadCallFrame = {
      columnNumber: payloadColumnNumber,
      functionName: 'bar',
      lineNumber: payloadLineNumber,
      scriptId: '115',
      url: ''
    };
    traceEvent.args = {elementCount: 1, beginData: {frame: '', stackTrace: [payloadCallFrame]}};
    const trace = parsedTraceFromEvents([profileCall1, profileCall2, traceEvent]);

    const stackTraceForExtensionEntry = Trace.Extras.StackTraceForEvent.get(traceEvent, trace);
    assert.exists(stackTraceForExtensionEntry);
    assert.deepEqual(shapeStackTraceAsArray(stackTraceForExtensionEntry) as unknown[], [
      {
        callFrames: [
          {...payloadCallFrame, lineNumber: payloadLineNumber - 1, columnNumber: payloadColumnNumber - 1},
          profileCall1.callFrame
        ],
        description: undefined
      },
    ]);
  });
});
