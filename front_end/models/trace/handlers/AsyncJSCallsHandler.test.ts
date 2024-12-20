// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  makeCompleteEvent,
  makeFlowEvents,
  makeProfileCall,
} from '../../../testing/TraceHelpers.js';
import * as Trace from '../trace.js';
const cat = 'mewtwo';
const pid = 1;
const tid = 1;
async function buildAsyncJSCallsHandlerData(events: Trace.Types.Events.Event[]):
    Promise<ReturnType<typeof Trace.Handlers.ModelHandlers.AsyncJSCalls.data>> {
  Trace.Handlers.ModelHandlers.Renderer.reset();
  Trace.Handlers.ModelHandlers.Flows.reset();
  Trace.Handlers.ModelHandlers.Flows.reset();
  for (const event of events) {
    Trace.Handlers.ModelHandlers.Renderer.handleEvent(event);
    Trace.Handlers.ModelHandlers.Flows.handleEvent(event);
  }
  await Trace.Handlers.ModelHandlers.Renderer.finalize();
  await Trace.Handlers.ModelHandlers.Flows.finalize();
  await Trace.Handlers.ModelHandlers.AsyncJSCalls.finalize();
  return Trace.Handlers.ModelHandlers.AsyncJSCalls.data();
}
describe('AsyncJSCallsHandler', function() {
  describe('Resolving JS task schedulers to task run entrypoints', function() {
    it('associates a JS task scheduler profile call with the corresponding task run entry point', async function() {
      const jsTaskScheduler = makeProfileCall('setTimeout', 0, 50, pid, tid);
      const asyncTaskScheduled =
          makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_SCHEDULED, 0, 0, cat, pid, tid);

      const asyncTaskRun = makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_RUN, 60, 100, cat, tid, pid);
      const jsTaskRunEntryPoint = makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 70, 20, cat, tid, pid);

      const flowEvents = makeFlowEvents([asyncTaskScheduled, asyncTaskRun]);
      const rendererEvents = [jsTaskScheduler, asyncTaskScheduled, asyncTaskRun, jsTaskRunEntryPoint];
      const allEvents = [...rendererEvents, ...flowEvents];

      const asyncCallStacksData = await buildAsyncJSCallsHandlerData(allEvents);
      const testRunEntryPoints = asyncCallStacksData.schedulerToRunEntryPoints.get(jsTaskScheduler);
      assert.strictEqual(testRunEntryPoints?.length, 1);
      assert.strictEqual(testRunEntryPoints?.[0], jsTaskRunEntryPoint);
    });

    it('uses the nearest profile call ancestor of a debuggerTaskScheduled as JS task scheduler', async function() {
      // Three profile call ancestors to the debuggerTaskScheduled event.
      // Test the one closest to the debuggerTaskScheduled in the tree
      // is picked.
      const foo = makeProfileCall('foo', 0, 50, pid, tid);
      const bar = makeProfileCall('bar', 0, 40, pid, tid);
      const jsTaskScheduler = makeProfileCall('setTimeout', 0, 30, pid, tid);
      const asyncTaskScheduled =
          makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_SCHEDULED, 0, 0, cat, pid, tid);

      const asyncTaskRun = makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_RUN, 60, 100, cat, tid, pid);
      const jsTaskRunEntryPoint = makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 70, 20, cat, tid, pid);

      const flowEvents = makeFlowEvents([asyncTaskScheduled, asyncTaskRun]);
      const rendererEvents = [foo, bar, jsTaskScheduler, asyncTaskScheduled, asyncTaskRun, jsTaskRunEntryPoint];
      const allEvents = [...rendererEvents, ...flowEvents];

      const asyncCallStacksData = await buildAsyncJSCallsHandlerData(allEvents);
      const testRunEntryPoints = asyncCallStacksData.schedulerToRunEntryPoints.get(jsTaskScheduler);
      assert.strictEqual(testRunEntryPoints?.length, 1);
      assert.strictEqual(testRunEntryPoints?.[0], jsTaskRunEntryPoint);
    });

    it('uses the nearest JS entry point descendant of a debuggerTaskRun as async task run', async function() {
      const jsTaskScheduler = makeProfileCall('setTimeout', 0, 30, pid, tid);
      const asyncTaskScheduled =
          makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_SCHEDULED, 0, 0, cat, pid, tid);

      const asyncTaskRun = makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_RUN, 60, 100, cat, tid, pid);

      // Two JS entry points belonging to the same subtree are
      // descendants to the debuggerTaskRun event. Test the one closest
      // to the debuggerTaskRun in the global tree is picked.
      const jsTaskRunEntryPoint = makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 70, 20, cat, tid, pid);
      const secondFakeEntryPoint = makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 71, 10, cat, tid, pid);

      const flowEvents = makeFlowEvents([asyncTaskScheduled, asyncTaskRun]);
      const rendererEvents =
          [jsTaskScheduler, asyncTaskScheduled, asyncTaskRun, jsTaskRunEntryPoint, secondFakeEntryPoint];
      const allEvents = [...rendererEvents, ...flowEvents];

      const asyncCallStacksData = await buildAsyncJSCallsHandlerData(allEvents);
      const testRunEntryPoints = asyncCallStacksData.schedulerToRunEntryPoints.get(jsTaskScheduler);
      assert.strictEqual(testRunEntryPoints?.length, 1);
      assert.strictEqual(testRunEntryPoints?.[0], jsTaskRunEntryPoint);
    });

    it('falls back to a JS invocation as task scheduler if no profile call is found before in the debuggerTaskScheduled ancestors',
       async function() {
         const jsTaskScheduler = makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 0, 30, cat, tid, pid);
         const asyncTaskScheduled =
             makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_SCHEDULED, 5, 0, cat, pid, tid);

         const asyncTaskRun =
             makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_RUN, 60, 100, cat, tid, pid);

         // Two JS entry points belonging to the same subtree are
         // descendants to the debuggerTaskRun event. Test the one closest
         // to the debuggerTaskRun in the global tree is picked.
         const jsTaskRunEntryPoint = makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 70, 20, cat, tid, pid);
         const secondFakeEntryPoint = makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 71, 10, cat, tid, pid);

         const flowEvents = makeFlowEvents([asyncTaskScheduled, asyncTaskRun]);
         const rendererEvents =
             [jsTaskScheduler, asyncTaskScheduled, asyncTaskRun, jsTaskRunEntryPoint, secondFakeEntryPoint];
         const allEvents = [...rendererEvents, ...flowEvents];

         const asyncCallStacksData = await buildAsyncJSCallsHandlerData(allEvents);
         const testRunEntryPoints = asyncCallStacksData.schedulerToRunEntryPoints.get(jsTaskScheduler);
         assert.strictEqual(testRunEntryPoints?.length, 1);
         assert.strictEqual(testRunEntryPoints?.[0], jsTaskRunEntryPoint);
       });

    it('returns multiple JS entry points when scheduled by the same function', async function() {
      const jsTaskScheduler = makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 0, 30, cat, tid, pid);
      // Two asyncTaskScheduled events right under the function call.
      const asyncTaskScheduled1 =
          makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_SCHEDULED, 5, 0, cat, pid, tid);

      const asyncTaskScheduled2 =
          makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_SCHEDULED, 10, 0, cat, pid, tid);

      const asyncTaskRun1 = makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_RUN, 60, 100, cat, tid, pid);

      const asyncTaskRun2 = makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_RUN, 200, 100, cat, tid, pid);

      // Two JS entry points,
      const firstJSTaskRunEntryPoint = makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 70, 20, cat, tid, pid);
      const secondJSTaskRunEntryPoint =
          makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 210, 10, cat, tid, pid);

      const flow1Events = makeFlowEvents([asyncTaskScheduled1, asyncTaskRun1], 1);
      const flow2Events = makeFlowEvents([asyncTaskScheduled2, asyncTaskRun2], 2);
      const flowEvents = [...flow1Events, ...flow2Events].sort((a, b) => a.ts - b.ts);
      const rendererEvents = [
        jsTaskScheduler,
        asyncTaskScheduled1,
        asyncTaskRun1,
        asyncTaskScheduled2,
        firstJSTaskRunEntryPoint,
        asyncTaskRun2,
        secondJSTaskRunEntryPoint,
      ];
      const allEvents = [...rendererEvents, ...flowEvents];

      const asyncCallStacksData = await buildAsyncJSCallsHandlerData(allEvents);

      const testRunEntryPoints = asyncCallStacksData.schedulerToRunEntryPoints.get(jsTaskScheduler);
      assert.strictEqual(testRunEntryPoints?.length, 2);
      assert.strictEqual(testRunEntryPoints?.[0], firstJSTaskRunEntryPoint);
      assert.strictEqual(testRunEntryPoints?.[1], secondJSTaskRunEntryPoint);
    });
  });
  describe('Resolving async JS tasks to schedulers', function() {
    it('associates an async JS task to its scheduler', async function() {
      const jsTaskScheduler = makeProfileCall('setTimeout', 0, 50, pid, tid);
      const asyncTaskScheduled =
          makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_SCHEDULED, 0, 0, cat, pid, tid) as
          Trace.Types.Events.DebuggerAsyncTaskScheduled;
      asyncTaskScheduled.args.taskName = 'A task name';
      const asyncTaskRun = makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_RUN, 60, 100, cat, tid, pid);
      const jsTaskRunEntryPoint = makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 70, 20, cat, tid, pid);
      const asyncJSTask1 = makeProfileCall('scheduledFunction', 71, 10, pid, tid);
      const asyncJSTask2 = makeProfileCall('scheduledFunction', 81, 5, pid, tid);

      const flowEvents = makeFlowEvents([asyncTaskScheduled, asyncTaskRun]);
      const rendererEvents =
          [jsTaskScheduler, asyncTaskScheduled, asyncTaskRun, jsTaskRunEntryPoint, asyncJSTask1, asyncJSTask2];
      const allEvents = [...rendererEvents, ...flowEvents];

      const asyncCallStacksData = await buildAsyncJSCallsHandlerData(allEvents);
      let testScheduler = asyncCallStacksData.asyncCallToScheduler.get(asyncJSTask1);
      assert.strictEqual(testScheduler?.scheduler, jsTaskScheduler);
      assert.strictEqual(testScheduler?.taskName, asyncTaskScheduled.args.taskName);

      testScheduler = asyncCallStacksData.asyncCallToScheduler.get(asyncJSTask2);
      assert.strictEqual(testScheduler?.scheduler, jsTaskScheduler);
      assert.strictEqual(testScheduler?.taskName, asyncTaskScheduled.args.taskName);
    });
    it('only associates the root async JS task in a subtree with the async task scheduler', async function() {
      const jsTaskScheduler = makeProfileCall('setTimeout', 0, 50, pid, tid);
      const asyncTaskScheduled =
          makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_SCHEDULED, 0, 0, cat, pid, tid);

      const asyncTaskRun = makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_RUN, 60, 100, cat, tid, pid);
      const jsTaskRunEntryPoint = makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 70, 20, cat, tid, pid);
      const asyncJSTask1 = makeProfileCall('scheduledFunction', 71, 10, pid, tid);
      // Because of its timings, this profile call will be nested inside the one above.
      const asyncJSTask2 = makeProfileCall('nestedFunction', 72, 5, pid, tid);

      const flowEvents = makeFlowEvents([asyncTaskScheduled, asyncTaskRun]);
      const rendererEvents =
          [jsTaskScheduler, asyncTaskScheduled, asyncTaskRun, jsTaskRunEntryPoint, asyncJSTask1, asyncJSTask2];
      const allEvents = [...rendererEvents, ...flowEvents];

      const asyncCallStacksData = await buildAsyncJSCallsHandlerData(allEvents);
      let testScheduler = asyncCallStacksData.asyncCallToScheduler.get(asyncJSTask1)?.scheduler;
      assert.strictEqual(testScheduler, jsTaskScheduler);

      testScheduler = asyncCallStacksData.asyncCallToScheduler.get(asyncJSTask2)?.scheduler;
      assert.isUndefined(testScheduler);
    });
  });
});
