// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Trace from '../../models/trace/trace.js';

const WORKER_TARGET_TYPES = new Set<SDK.Target.Type>([
  SDK.Target.Type.Worker,
  SDK.Target.Type.SHARED_WORKER,
  SDK.Target.Type.ServiceWorker,
  SDK.Target.Type.WORKLET,
  SDK.Target.Type.AUCTION_WORKLET,
  SDK.Target.Type.NODE_WORKER,
]);

/**
 * The TracingSessionIdForWorker -> workerId mapping comes straight from trace
 * events, i.e. from an untrusted producer (any renderer in the recording, or a
 * trace file). Only honour it when it actually names a worker target that
 * belongs to the inspected page; never let it select an arbitrary attached
 * target such as a cross-site iframe.
 *
 * The walk starts at the target itself: when DevTools inspects a worker
 * directly (e.g. from chrome://inspect/#workers), the worker is the root target
 * and has no parent.
 */
function isWorkerTargetOfInspectedPage(target: SDK.Target.Target,
                                       targetManager: SDK.TargetManager.TargetManager): boolean {
  if (!WORKER_TARGET_TYPES.has(target.type())) {
    return false;
  }
  const primaryPage = targetManager.primaryPageTarget();
  for (let t: SDK.Target.Target|null = target; t; t = t.parentTarget()) {
    if (t === primaryPage || t === targetManager.rootTarget()) {
      return true;
    }
  }
  return false;
}

/**
 * If the event's thread was identified as belonging to a worker, this will
 * return the target representing that worker. Otherwise, we return the primary
 * page's target.
 **/
export function targetForEvent(
    parsedTrace: Trace.TraceModel.ParsedTrace, event: Trace.Types.Events.Event): SDK.Target.Target|null {
  const targetManager = SDK.TargetManager.TargetManager.instance();
  const workerId = parsedTrace.data.Workers.workerIdByThread.get(event.tid);
  if (workerId) {
    const target = targetManager.targetById(workerId);
    if (target && isWorkerTargetOfInspectedPage(target, targetManager)) {
      return target;
    }
    // Producer-asserted worker id does not resolve to a worker of this page:
    // do not route anything (in particular no LayerTree.loadSnapshot) for it.
    return null;
  }

  return targetManager.primaryPageTarget();
}
