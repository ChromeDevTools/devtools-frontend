// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

function shapeStackTraceAsArray(stackTrace: Protocol.Runtime.StackTrace):
    {callFrames: Protocol.Runtime.CallFrame[], description?: string}[] {
  const stackTraceAsArray: {callFrames: Protocol.Runtime.CallFrame[], description?: string}[] = [];
  let currentStackTrace: Protocol.Runtime.StackTrace|undefined = stackTrace;
  while (currentStackTrace) {
    // @ts-ignore `codeType` is not included in the protocol types but
    // occasionally present
    currentStackTrace.callFrames.forEach(callFrame => delete callFrame.codeType);
    stackTraceAsArray.push({callFrames: currentStackTrace.callFrames, description: currentStackTrace.description});
    currentStackTrace = currentStackTrace.parent;
  }

  return stackTraceAsArray;
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
  it('correctly builds the stack trace of an extension entry', async function() {
    const jsCall = parsedTrace.Renderer.allTraceEntries.find(
                       e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'baz') as
            Trace.Types.Events.SyntheticProfileCall |
        undefined;
    assert.exists(jsCall);
    const stackTraceForExtensionProfileCall = Trace.Extras.StackTraceForEvent.get(jsCall, parsedTrace);
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
        args: {stackTrace: [{functionName: jsCall.callFrame.functionName}], callTime: jsCall.ts - 1},
        ph: Trace.Types.Events.Phase.ASYNC_NESTABLE_START,
      },
    } as Trace.Types.Extensions.SyntheticExtensionEntry;
    const stackTraceForExtensionEntry = Trace.Extras.StackTraceForEvent.get(mockExtensionEntry, parsedTrace);
    assert.exists(stackTraceForExtensionEntry);

    assert.strictEqual(stackTraceForExtensionEntry, stackTraceForExtensionProfileCall);
  });
  it('uses the stack trace of the profile call that contains an extension entry call time', async function() {
    const bar = parsedTrace.Renderer.allTraceEntries.find(
                    e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'bar') as
            Trace.Types.Events.SyntheticProfileCall |
        undefined;
    assert.exists(bar);
    const stackTraceForExtensionProfileCall = Trace.Extras.StackTraceForEvent.get(bar, parsedTrace);
    assert.exists(stackTraceForExtensionProfileCall);

    // Create an extension entry contained by the profile call (based on
    // its callTime property).
    // Test the profile call's stack strace is returned as
    // the extension entry's stack trace.
    const mockExtensionEntry = {
      cat: 'devtools.extension',
      ts: bar.ts,
      pid: bar.pid,
      tid: bar.tid,
      rawSourceEvent: {
        cat: 'blink.user_timing',
        args: {stackTrace: [{functionName: bar.callFrame.functionName}], callTime: bar.ts + 1},
        ph: Trace.Types.Events.Phase.ASYNC_NESTABLE_START,
      },
    } as Trace.Types.Extensions.SyntheticExtensionEntry;
    const stackTraceForExtensionEntry = Trace.Extras.StackTraceForEvent.get(mockExtensionEntry, parsedTrace);
    assert.exists(stackTraceForExtensionEntry);

    assert.strictEqual(stackTraceForExtensionEntry, stackTraceForExtensionProfileCall);
  });

  it('picks the stack trace of the closest profile call when no profile call contains the extension entry call time',
     async function() {
       const bazCalls = parsedTrace.Renderer.allTraceEntries.filter(
           e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'baz');
       const firstBaz = bazCalls.at(0);
       assert.exists(firstBaz);
       const secondBaz = bazCalls.at(1) as Trace.Types.Events.SyntheticProfileCall;
       assert.exists(secondBaz);
       const middlePoint = (secondBaz.ts + firstBaz.ts) / 2;

       const stackTraceForSecondBaz = Trace.Extras.StackTraceForEvent.get(secondBaz, parsedTrace);
       assert.exists(stackTraceForSecondBaz);

       // Create an extension entry contained closer to the second
       // baz call (based on its callTime property).
       // Test the stack trace of baz is used for it.
       const mockExtensionEntry = {
         cat: 'devtools.extension',
         ts: middlePoint,
         pid: secondBaz.pid,
         tid: secondBaz.tid,
         rawSourceEvent: {
           cat: 'blink.user_timing',
           args: {stackTrace: [{functionName: secondBaz.callFrame.functionName}], callTime: middlePoint + 1},
           ph: Trace.Types.Events.Phase.ASYNC_NESTABLE_START,
         },
       } as Trace.Types.Extensions.SyntheticExtensionEntry;
       const stackTraceForExtensionEntry = Trace.Extras.StackTraceForEvent.get(mockExtensionEntry, parsedTrace);
       assert.exists(stackTraceForExtensionEntry);

       assert.strictEqual(stackTraceForExtensionEntry, stackTraceForSecondBaz);
     });
});
