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
async function buildAsyncCallStacksHandlerData(events: Trace.Types.Events.Event[]):
    Promise<ReturnType<typeof Trace.Handlers.ModelHandlers.AsyncCallStacks.data>> {
  Trace.Handlers.ModelHandlers.Renderer.reset();
  Trace.Handlers.ModelHandlers.Flows.reset();
  Trace.Handlers.ModelHandlers.Flows.reset();
  for (const event of events) {
    Trace.Handlers.ModelHandlers.Renderer.handleEvent(event);
    Trace.Handlers.ModelHandlers.Flows.handleEvent(event);
  }
  await Trace.Handlers.ModelHandlers.Renderer.finalize();
  await Trace.Handlers.ModelHandlers.Flows.finalize();
  await Trace.Handlers.ModelHandlers.AsyncCallStacks.finalize();
  return Trace.Handlers.ModelHandlers.AsyncCallStacks.data();
}
describe('AsyncCallStacksHandler', function() {
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

      const asyncCallStacksData = await buildAsyncCallStacksHandlerData(allEvents);
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

      const asyncCallStacksData = await buildAsyncCallStacksHandlerData(allEvents);
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

      const asyncCallStacksData = await buildAsyncCallStacksHandlerData(allEvents);
      const testRunEntryPoints = asyncCallStacksData.schedulerToRunEntryPoints.get(jsTaskScheduler);
      assert.strictEqual(testRunEntryPoints?.length, 1);
      assert.strictEqual(testRunEntryPoints?.[0], jsTaskRunEntryPoint);
    });
    it('returns multiple JS entry point descendants of a debuggerTaskRun when they are not in the same subtree',
       async function() {
         const jsTaskScheduler = makeProfileCall('setTimeout', 0, 30, pid, tid);
         const asyncTaskScheduled =
             makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_SCHEDULED, 0, 0, cat, pid, tid);

         const asyncTaskRun =
             makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_RUN, 60, 100, cat, tid, pid);

         // Two JS entry points belonging to different subtrees are
         // descendants to the debuggerTaskRun event. Test both are
         // used.
         const firstJSTaskRunEntryPoint =
             makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 70, 20, cat, tid, pid);
         const secondJSTaskRunEntryPoint =
             makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 90, 10, cat, tid, pid);

         const flowEvents = makeFlowEvents([asyncTaskScheduled, asyncTaskRun]);
         const rendererEvents =
             [jsTaskScheduler, asyncTaskScheduled, asyncTaskRun, firstJSTaskRunEntryPoint, secondJSTaskRunEntryPoint];
         const allEvents = [...rendererEvents, ...flowEvents];

         const asyncCallStacksData = await buildAsyncCallStacksHandlerData(allEvents);
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
          makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_SCHEDULED, 0, 0, cat, pid, tid);

      const asyncTaskRun = makeCompleteEvent(Trace.Types.Events.Name.DEBUGGER_ASYNC_TASK_RUN, 60, 100, cat, tid, pid);
      const jsTaskRunEntryPoint = makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, 70, 20, cat, tid, pid);
      const asyncJSTask1 = makeProfileCall('scheduledFunction', 71, 10, pid, tid);
      const asyncJSTask2 = makeProfileCall('scheduledFunction', 81, 5, pid, tid);

      const flowEvents = makeFlowEvents([asyncTaskScheduled, asyncTaskRun]);
      const rendererEvents =
          [jsTaskScheduler, asyncTaskScheduled, asyncTaskRun, jsTaskRunEntryPoint, asyncJSTask1, asyncJSTask2];
      const allEvents = [...rendererEvents, ...flowEvents];

      const asyncCallStacksData = await buildAsyncCallStacksHandlerData(allEvents);
      let testScheduler = asyncCallStacksData.asyncCallToScheduler.get(asyncJSTask1);
      assert.strictEqual(testScheduler, jsTaskScheduler);

      testScheduler = asyncCallStacksData.asyncCallToScheduler.get(asyncJSTask2);
      assert.strictEqual(testScheduler, jsTaskScheduler);
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

      const asyncCallStacksData = await buildAsyncCallStacksHandlerData(allEvents);
      let testScheduler = asyncCallStacksData.asyncCallToScheduler.get(asyncJSTask1);
      assert.strictEqual(testScheduler, jsTaskScheduler);

      testScheduler = asyncCallStacksData.asyncCallToScheduler.get(asyncJSTask2);
      assert.isUndefined(testScheduler);
    });
  });
});
