// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../../test/api/mocha-interface.js';
import * as Protocol from '../../generated/protocol.js';

import * as SDK from './sdk.js';

describe('TargetManager API Test', () => {
  it('suspends and resumes all targets and their agents', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget, 'Primary page target should exist');

    await inspectedPage.goToHtml('<h1>TargetManager Suspend Test</h1>');

    const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
    assert.isNotNull(domModel, 'DOMModel should exist');
    await domModel.requestDocument();
    assert.isNotNull(domModel.existingDocument(), 'DOM document should be loaded');

    const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.isNotNull(debuggerModel, 'DebuggerModel should exist');
    assert.isTrue(debuggerModel.debuggerEnabled(), 'Debugger should be enabled initially');

    const cssModel = primaryTarget.model(SDK.CSSModel.CSSModel);
    assert.isNotNull(cssModel, 'CSSModel should exist');
    assert.isTrue(cssModel.isEnabled(), 'CSSModel should be enabled initially');

    assert.isFalse(universe.targetManager.allTargetsSuspended());
    assert.isFalse(primaryTarget.suspended());

    let suspendStateChangedEventsCount = 0;
    const listener = (): void => {
      suspendStateChangedEventsCount++;
    };
    universe.targetManager.addEventListener(SDK.TargetManager.Events.SUSPEND_STATE_CHANGED, listener);

    await universe.targetManager.suspendAllTargets();

    assert.isTrue(universe.targetManager.allTargetsSuspended(), 'All targets should be suspended');
    assert.isTrue(primaryTarget.suspended(), 'Primary target should be suspended');
    assert.isNull(domModel.existingDocument(), 'DOM document should be cleared on suspend');
    assert.isFalse(debuggerModel.debuggerEnabled(), 'Debugger should be disabled after suspend');
    assert.isFalse(cssModel.isEnabled(), 'CSSModel should be disabled after suspend');
    assert.strictEqual(suspendStateChangedEventsCount, 1, 'Suspend state changed event should have fired once');

    await universe.targetManager.resumeAllTargets();

    assert.isFalse(universe.targetManager.allTargetsSuspended(), 'Targets should not be suspended after resume');
    assert.isFalse(primaryTarget.suspended(), 'Primary target should not be suspended after resume');
    assert.isTrue(debuggerModel.debuggerEnabled(), 'Debugger should be re-enabled after resume');
    assert.isTrue(cssModel.isEnabled(), 'CSSModel should be re-enabled after resume');
    assert.strictEqual(suspendStateChangedEventsCount, 2, 'Suspend state changed event should have fired twice');

    universe.targetManager.removeEventListener(SDK.TargetManager.Events.SUSPEND_STATE_CHANGED, listener);
  });

  it('detaches workers on navigation', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget, 'Primary page target should exist');
    // ChildTargetManager.install() does not run in TargetUniverse, so instantiate it on primaryTarget
    // and ensure Target.setAutoAttach is processed on this CDP session before spawning a worker.
    const childTargetManager = new SDK.ChildTargetManager.ChildTargetManager(primaryTarget);
    await childTargetManager.getTargetInfo();

    const events: string[] = [];
    let workerTargetId: string|undefined;
    let navigated = false;
    const {promise: initialWorkerAdded, resolve: initialWorkerAddedCallback} = Promise.withResolvers<void>();
    const {promise: workerRemoved, resolve: workerRemovedCallback} = Promise.withResolvers<void>();
    const {promise: reloadedWorkerAdded, resolve: reloadedWorkerAddedCallback} = Promise.withResolvers<void>();

    const observer: SDK.TargetManager.Observer = {
      targetAdded(target: SDK.Target.Target): void {
        if (target.type() !== SDK.Target.Type.Worker) {
          return;
        }
        events.push('Worker added');
        workerTargetId = target.id();
        if (navigated) {
          reloadedWorkerAddedCallback();
        } else {
          initialWorkerAddedCallback();
        }
      },
      targetRemoved(target: SDK.Target.Target): void {
        if (target.type() !== SDK.Target.Type.Worker) {
          return;
        }
        if (target.id() === workerTargetId) {
          events.push('Worker removed');
          workerTargetId = '';
          workerRemovedCallback();
        } else {
          events.push('Unknown worker removed');
        }
      },
    };

    const startWorker = (): Promise<void> =>
        inspectedPage.evaluate(() => (window as unknown as {startWorker: () => void}).startWorker());

    universe.targetManager.observeTargets(observer);
    try {
      await inspectedPage.goToResource('pages/workers-on-navigation/index.html');
      await Promise.all([
        startWorker(),
        initialWorkerAdded,
      ]);
      assert.isNotEmpty(workerTargetId);
      assert.deepEqual(events, ['Worker added']);

      await inspectedPage.reload();
      await workerRemoved;
      assert.strictEqual(workerTargetId, '');
      assert.deepEqual(events, ['Worker added', 'Worker removed']);

      navigated = true;
      await Promise.all([
        startWorker(),
        reloadedWorkerAdded,
      ]);
      assert.isNotEmpty(workerTargetId);
      assert.deepEqual(events, ['Worker added', 'Worker removed', 'Worker added']);
    } finally {
      universe.targetManager.unobserveTargets(observer);
      childTargetManager.dispose();
    }
  });

  it('pauses on event listener breakpoints after suspending and resuming all targets',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget, 'Primary page target should exist');

       await inspectedPage.goToHtml(`
         <!DOCTYPE html>
         <input type="button" id="test">
         <script>
           function testElementClicked() {
             return 0;
           }

           function addListenerAndClick() {
             const element = document.getElementById('test');
             element.addEventListener('click', testElementClicked, true);
             element.click();
           }
         </script>
       `);

       const domDebuggerModel = primaryTarget.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
       assert.isNotNull(domDebuggerModel, 'DOMDebuggerModel should exist');
       assert.isFalse(domDebuggerModel.suspended, 'DOMDebuggerModel should not be suspended initially');

       const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
       assert.isNotNull(debuggerModel, 'DebuggerModel should exist');
       assert.isTrue(debuggerModel.debuggerEnabled(), 'Debugger should be enabled initially');

       const breakpoint = universe.domDebuggerManager.resolveEventListenerBreakpoint({
         eventName: 'listener:click',
       });
       assert.isNotNull(breakpoint, 'Event listener breakpoint listener:click should exist');
       assert.isFalse(breakpoint.enabled(), 'Event listener breakpoint should start disabled');
       breakpoint.setEnabled(true);
       assert.isTrue(breakpoint.enabled(), 'Event listener breakpoint should be enabled');

       // Flush universe's CDP connection so DOMDebugger.setEventListenerBreakpoint completes
       // before inspectedPage evaluates addListenerAndClick() over Puppeteer's separate session.
       await primaryTarget.runtimeAgent().invoke_evaluate({expression: 'void 0'});

       const pendingEvals: Array<Promise<unknown>> = [];
       const triggerClickAndVerifyPauseAndResume = async(): Promise<void> => {
         const paused = debuggerModel.once(SDK.DebuggerModel.Events.DebuggerPaused);
         const evalPromise = inspectedPage.evaluate(() => {
           (window as unknown as {addListenerAndClick: () => void}).addListenerAndClick();
         });
         void evalPromise.catch(() => {});
         pendingEvals.push(evalPromise);

         await paused;
         const pausedDetails = debuggerModel.debuggerPausedDetails();
         assert.isNotNull(pausedDetails, 'DebuggerPausedDetails should be present when paused');
         assert.isTrue(debuggerModel.isPaused(), 'Script execution should be paused');
         assert.strictEqual(pausedDetails.reason, Protocol.Debugger.PausedEventReason.EventListener);
         assert.strictEqual(pausedDetails.callFrames[0]?.functionName, 'testElementClicked');
         assert.strictEqual(pausedDetails.callFrames[1]?.functionName, 'addListenerAndClick');
         const auxData = pausedDetails.auxData as SDK.DebuggerModel.EventListenerPausedDetailsAuxData | undefined;
         assert.exists(auxData);
         assert.deepEqual(auxData, {
           eventName: 'listener:click',
           targetName: 'INPUT',
         });
         assert.strictEqual(universe.domDebuggerManager.resolveEventListenerBreakpoint(auxData), breakpoint);

         const resumed = debuggerModel.once(SDK.DebuggerModel.Events.DebuggerResumed);
         debuggerModel.resume();
         await Promise.all([resumed, evalPromise]);
         assert.isFalse(debuggerModel.isPaused(), 'Script execution should be resumed');
         assert.isNull(debuggerModel.debuggerPausedDetails());
       };

       let testError: unknown;
       try {
         await triggerClickAndVerifyPauseAndResume();

         await universe.targetManager.suspendAllTargets();
         assert.isTrue(universe.targetManager.allTargetsSuspended());
         assert.isTrue(primaryTarget.suspended());
         assert.isTrue(domDebuggerModel.suspended);
         assert.isFalse(debuggerModel.debuggerEnabled());

         await universe.targetManager.resumeAllTargets();
         assert.isFalse(universe.targetManager.allTargetsSuspended());
         assert.isFalse(primaryTarget.suspended());
         assert.isFalse(domDebuggerModel.suspended);
         assert.isTrue(debuggerModel.debuggerEnabled());
         assert.isTrue(breakpoint.enabled());

         await triggerClickAndVerifyPauseAndResume();
       } catch (err) {
         testError = err;
         throw err;
       } finally {
         const cleanupErrors: unknown[] = [];
         const cleanupSteps: Array<() => Promise<void>> = [
           async () => {
             if (universe.targetManager.allTargetsSuspended()) {
               await universe.targetManager.resumeAllTargets();
             }
           },
           async () => {
             if (debuggerModel.isPaused()) {
               const resumed = debuggerModel.once(SDK.DebuggerModel.Events.DebuggerResumed);
               debuggerModel.resume();
               await resumed;
             }
           },
           async () => {
             breakpoint.setEnabled(false);
           },
           async () => {
             await primaryTarget.runtimeAgent().invoke_evaluate({expression: 'void 0'});
           },
           async () => {
             await Promise.allSettled(pendingEvals);
           },
         ];
         for (const step of cleanupSteps) {
           try {
             await step();
           } catch (err) {
             cleanupErrors.push(err);
           }
         }
         if (!testError && cleanupErrors.length > 0) {
           throw cleanupErrors[0];
         }
       }
     });
});
