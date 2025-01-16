// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import type * as Protocol from '../../../generated/protocol.js';
import type * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

export const stackTraceForEventInTrace =
    new Map<Handlers.Types.ParsedTrace, Map<Types.Events.Event, Protocol.Runtime.StackTrace>>();

export function clearCacheForTrace(parsedTrace: Handlers.Types.ParsedTrace): void {
  stackTraceForEventInTrace.delete(parsedTrace);
}
/**
 * This util builds a stack trace that includes async calls for a given
 * event. It leverages data we collect from sampling to deduce sync
 * stacks and trace event instrumentation on the V8 debugger to stitch
 * them together.
 */
export function get(event: Types.Events.Event, parsedTrace: Handlers.Types.ParsedTrace): Protocol.Runtime.StackTrace|
    null {
  let cacheForTrace = stackTraceForEventInTrace.get(parsedTrace);
  if (!cacheForTrace) {
    cacheForTrace = new Map();
    stackTraceForEventInTrace.set(parsedTrace, cacheForTrace);
  }
  const resultFromCache = cacheForTrace.get(event);
  if (resultFromCache) {
    return resultFromCache;
  }
  let result: Protocol.Runtime.StackTrace|null = null;
  if (Types.Events.isProfileCall(event)) {
    result = getForProfileCall(event, parsedTrace);
  } else if (Types.Extensions.isSyntheticExtensionEntry(event)) {
    result = getForExtensionEntry(event, parsedTrace);
  }
  if (result) {
    cacheForTrace.set(event, result);
  }
  return result;
}

function getForProfileCall(
    event: Types.Events.SyntheticProfileCall, parsedTrace: Handlers.Types.ParsedTrace): Protocol.Runtime.StackTrace {
  // When working with a CPU profile the renderer handler won't have
  // entries in its tree.
  const entryToNode =
      parsedTrace.Renderer.entryToNode.size > 0 ? parsedTrace.Renderer.entryToNode : parsedTrace.Samples.entryToNode;
  const topStackTrace: Protocol.Runtime.StackTrace = {callFrames: []};
  let stackTrace: Protocol.Runtime.StackTrace = topStackTrace;
  let currentEntry = event;
  let node: Helpers.TreeHelpers.TraceEntryNode|null|undefined = entryToNode.get(event);
  const traceCache =
      stackTraceForEventInTrace.get(parsedTrace) || new Map<Types.Events.Event, Protocol.Runtime.StackTrace>();
  stackTraceForEventInTrace.set(parsedTrace, traceCache);
  // Move up this node's ancestor tree appending frames to its
  // stack trace.
  while (node) {
    if (!Types.Events.isProfileCall(node.entry)) {
      node = node.parent;
      continue;
    }

    currentEntry = node.entry;
    // First check if this entry was processed before.
    const stackTraceFromCache = traceCache.get(node.entry);
    if (stackTraceFromCache) {
      stackTrace.callFrames.push(...stackTraceFromCache.callFrames.filter(callFrame => !isNativeJSFunction(callFrame)));
      stackTrace.parent = stackTraceFromCache.parent;
      // Only set the description to the cache value if we didn't
      // compute it in the previous iteration, since the async stack
      // trace descriptions / taskNames is only extracted when jumping
      // to the async parent, and that might not have happened when
      // the cached value was computed (e.g. the cached value
      // computation started at some point inside the parent stack
      // trace).
      stackTrace.description = stackTrace.description || stackTraceFromCache.description;
      break;
    }

    if (!isNativeJSFunction(currentEntry.callFrame)) {
      stackTrace.callFrames.push(currentEntry.callFrame);
    }
    const maybeAsyncParentEvent = parsedTrace.AsyncJSCalls.asyncCallToScheduler.get(currentEntry);
    const maybeAsyncParentNode = maybeAsyncParentEvent && entryToNode.get(maybeAsyncParentEvent.scheduler);
    if (maybeAsyncParentNode) {
      // The Protocol.Runtime.StackTrace type is recursive, so we
      // move one level deeper in it as we walk up the ancestor tree.
      stackTrace.parent = {callFrames: []};
      stackTrace = stackTrace.parent;
      // Note: this description effectively corresponds to the name
      // of the task that scheduled the stack trace we are jumping
      // FROM, so it would make sense that it was set to that stack
      // trace instead of the one we are jumping TO. However, the
      // JS presentation utils we use to present async stack traces
      // assume the description is added to the stack trace that
      // scheduled the async task, so we build the data that way.
      stackTrace.description = maybeAsyncParentEvent.taskName;
      node = maybeAsyncParentNode;
      continue;
    }
    node = node.parent;
  }
  return topStackTrace;
}

/**
 * Finds the JS call in which an extension entry was injected (the
 * code location that called the extension API), and returns its stack
 * trace.
 */
function getForExtensionEntry(event: Types.Extensions.SyntheticExtensionEntry, parsedTrace: Handlers.Types.ParsedTrace):
    Protocol.Runtime.StackTrace|null {
  const eventCallPoint = Helpers.Trace.getZeroIndexedStackTraceForEvent(event)?.[0];
  if (!eventCallPoint) {
    return null;
  }
  const eventCallTime = Types.Events.isPerformanceMeasureBegin(event.rawSourceEvent) ?
      event.rawSourceEvent.args.callTime :
      Types.Events.isPerformanceMark(event.rawSourceEvent) ?
      event.rawSourceEvent.args.data?.callTime :
      // event added with console.timeStamp: take the original event's
      // ts.
      event.rawSourceEvent.ts;
  if (eventCallTime === undefined) {
    return null;
  }
  const callsInThread = parsedTrace.Renderer.processes.get(event.pid)?.threads.get(event.tid)?.profileCalls;
  if (!callsInThread) {
    return null;
  }
  const matchByName = callsInThread.filter(e => {
    return e.callFrame.functionName === eventCallPoint.functionName;
  });

  const lastCallBeforeEventIndex =
      Platform.ArrayUtilities.nearestIndexFromEnd(matchByName, profileCall => profileCall.ts <= eventCallTime);
  const firstCallAfterEventIndex =
      Platform.ArrayUtilities.nearestIndexFromBeginning(matchByName, profileCall => profileCall.ts >= eventCallTime);
  const lastCallBeforeEvent = typeof lastCallBeforeEventIndex === 'number' && matchByName.at(lastCallBeforeEventIndex);
  const firstCallAfterEvent = typeof firstCallAfterEventIndex === 'number' && matchByName.at(firstCallAfterEventIndex);

  let closestMatchingProfileCall: Types.Events.SyntheticProfileCall;
  if (!lastCallBeforeEvent && !firstCallAfterEvent) {
    return null;
  }
  if (!lastCallBeforeEvent) {
    // Per the check above firstCallAfterEvent is guaranteed to exist
    // but ts is unaware, so we cast the type.
    closestMatchingProfileCall = firstCallAfterEvent as Types.Events.SyntheticProfileCall;
  } else if (!firstCallAfterEvent) {
    closestMatchingProfileCall = lastCallBeforeEvent;
  } else if (Helpers.Trace.eventContainsTimestamp(lastCallBeforeEvent, eventCallTime)) {
    closestMatchingProfileCall = lastCallBeforeEvent;
  }  // pick the closest when the choice isn't clear.
  else if (eventCallTime - lastCallBeforeEvent.ts < firstCallAfterEvent.ts - eventCallTime) {
    closestMatchingProfileCall = lastCallBeforeEvent;
  } else {
    closestMatchingProfileCall = firstCallAfterEvent;
  }
  return get(closestMatchingProfileCall, parsedTrace);
}
/**
 * Determines if a function is a native JS API (like setTimeout,
 * requestAnimationFrame, consoleTask.run. etc.). This is useful to
 * discard stack frames corresponding to the JS scheduler function
 * itself, since it's already being used as title of async stack traces
 * taken from the async `taskName`. This is also consistent with the
 * behaviour of the stack trace in the sources
 * panel.
 */
function isNativeJSFunction({columnNumber, lineNumber, url, scriptId}: Protocol.Runtime.CallFrame): boolean {
  return lineNumber === -1 && columnNumber === -1 && url === '' && scriptId === '0';
}
