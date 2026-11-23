// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';

import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Trace from '../../models/trace/trace.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {getBaseTraceHandlerData, makeCompleteEvent} from '../../testing/TraceHelpersCore.js';

import * as Timeline from './timeline.js';

const WORKER_THREAD_ID = Trace.Types.Events.ThreadID(42);
const OTHER_THREAD_ID = Trace.Types.Events.ThreadID(7);

/**
 * Builds trace data with one worker thread. The map mirrors the
 * `TracingSessionIdForWorker` events, which the trace producer controls.
 */
function parsedTraceWithWorkerId(workerId: string): Trace.TraceModel.ParsedTrace {
  return getBaseTraceHandlerData({
    Workers: {
      workerSessionIdEvents: [],
      workerIdByThread: new Map([[WORKER_THREAD_ID, Trace.Types.Events.WorkerId(workerId)]]),
      workerURLById: new Map(),
    },
  });
}

function eventOnThread(tid: Trace.Types.Events.ThreadID): Trace.Types.Events.Event {
  return makeCompleteEvent('event', 0, 0, '*', 0, tid);
}

describe('TargetForEvent', () => {
  let universe: TestUniverse;
  let previousGlobalContext: Root.DevToolsContext.WritableDevToolsContext|null;

  beforeEach(() => {
    universe = new TestUniverse();
    // `targetForEvent` reads the global `TargetManager`.
    previousGlobalContext = Root.DevToolsContext.globalInstance();
    Root.DevToolsContext.setGlobalInstance(universe.context as Root.DevToolsContext.WritableDevToolsContext);
  });

  afterEach(() => {
    Root.DevToolsContext.setGlobalInstance(previousGlobalContext);
    universe.dispose();
  });

  describe('with a tab root target', () => {
    let tabTarget: SDK.Target.Target;
    let pageTarget: SDK.Target.Target;

    beforeEach(() => {
      tabTarget = universe.createTarget({id: 'tab' as Protocol.Target.TargetID, type: SDK.Target.Type.TAB});
      pageTarget = universe.createTarget({id: 'page' as Protocol.Target.TargetID, parentTarget: tabTarget});
    });

    function createChild(id: string, type: SDK.Target.Type, parentTarget: SDK.Target.Target): SDK.Target.Target {
      return universe.createTarget({id: id as Protocol.Target.TargetID, type, parentTarget});
    }

    it('returns the primary page target for an event on a thread without a worker id', () => {
      createChild('worker', SDK.Target.Type.Worker, pageTarget);
      const target =
          Timeline.TargetForEvent.targetForEvent(parsedTraceWithWorkerId('worker'), eventOnThread(OTHER_THREAD_ID));
      assert.strictEqual(target, pageTarget);
    });

    it('returns the worker target for a worker of the primary page', () => {
      const worker = createChild('worker', SDK.Target.Type.Worker, pageTarget);
      const target =
          Timeline.TargetForEvent.targetForEvent(parsedTraceWithWorkerId('worker'), eventOnThread(WORKER_THREAD_ID));
      assert.strictEqual(target, worker);
    });

    it('returns the worker target for a service worker of the root tab target', () => {
      const serviceWorker = createChild('service-worker', SDK.Target.Type.ServiceWorker, tabTarget);
      const target = Timeline.TargetForEvent.targetForEvent(parsedTraceWithWorkerId('service-worker'),
                                                            eventOnThread(WORKER_THREAD_ID));
      assert.strictEqual(target, serviceWorker);
    });

    it('returns the worker target for a nested worker', () => {
      const worker = createChild('worker', SDK.Target.Type.Worker, pageTarget);
      const nestedWorker = createChild('nested-worker', SDK.Target.Type.Worker, worker);
      const target = Timeline.TargetForEvent.targetForEvent(parsedTraceWithWorkerId('nested-worker'),
                                                            eventOnThread(WORKER_THREAD_ID));
      assert.strictEqual(target, nestedWorker);
    });

    it('returns null when the worker id names an out-of-process iframe target', () => {
      const oopif = createChild('oopif', SDK.Target.Type.FRAME, pageTarget);
      assert.strictEqual(SDK.TargetManager.TargetManager.instance().targetById('oopif'), oopif);
      const target =
          Timeline.TargetForEvent.targetForEvent(parsedTraceWithWorkerId('oopif'), eventOnThread(WORKER_THREAD_ID));
      assert.isNull(target);
    });

    it('returns null when the worker id names the primary page target', () => {
      const target =
          Timeline.TargetForEvent.targetForEvent(parsedTraceWithWorkerId('page'), eventOnThread(WORKER_THREAD_ID));
      assert.isNull(target);
    });

    it('returns null when the worker id names the root tab target', () => {
      const target =
          Timeline.TargetForEvent.targetForEvent(parsedTraceWithWorkerId('tab'), eventOnThread(WORKER_THREAD_ID));
      assert.isNull(target);
    });

    it('returns null when the worker id names a worker without a parent target', () => {
      universe.createTarget({id: 'detached-worker' as Protocol.Target.TargetID, type: SDK.Target.Type.Worker});
      const target = Timeline.TargetForEvent.targetForEvent(parsedTraceWithWorkerId('detached-worker'),
                                                            eventOnThread(WORKER_THREAD_ID));
      assert.isNull(target);
    });

    it('returns null when the worker id names no attached target', () => {
      const target =
          Timeline.TargetForEvent.targetForEvent(parsedTraceWithWorkerId('unknown'), eventOnThread(WORKER_THREAD_ID));
      assert.isNull(target);
    });
  });

  describe('with a worker root target', () => {
    let workerTarget: SDK.Target.Target;

    beforeEach(() => {
      // DevTools inspects the worker directly, for example from chrome://inspect/#workers.
      workerTarget = universe.createTarget({id: 'worker' as Protocol.Target.TargetID, type: SDK.Target.Type.Worker});
    });

    it('returns the root target when the worker id names the root target', () => {
      const target =
          Timeline.TargetForEvent.targetForEvent(parsedTraceWithWorkerId('worker'), eventOnThread(WORKER_THREAD_ID));
      assert.strictEqual(target, workerTarget);
    });

    it('returns null when the worker id names a second worker without a parent target', () => {
      universe.createTarget({id: 'detached-worker' as Protocol.Target.TargetID, type: SDK.Target.Type.Worker});
      const target = Timeline.TargetForEvent.targetForEvent(parsedTraceWithWorkerId('detached-worker'),
                                                            eventOnThread(WORKER_THREAD_ID));
      assert.isNull(target);
    });
  });
});
