// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../../test/api/mocha-interface.js';

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
});
