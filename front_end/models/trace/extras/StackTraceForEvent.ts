// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
  if (Types.Extensions.isSyntheticExtensionEntry(event)) {
    result = getForExtensionEntry(event, parsedTrace);
  } else if (Types.Events.isPerformanceMeasureBegin(event)) {
    result = getForPerformanceMeasure(event, parsedTrace);
  } else {
    result = getForEvent(event, parsedTrace);
    const payloadCallFrames =
        getTraceEventPayloadStackAsProtocolCallFrame(event).filter(callFrame => !isNativeJSFunction(callFrame));
    // If the event has a payload stack trace, replace the synchronous
    // portion of the calculated stack with the payload's call frames.
    // We do this because trace payload call frames contain call
    // locations, unlike profile call frames obtained with getForEvent
    // (which contain function declaration locations).
    // This way the user knows which exact JS location triggered an
    // event.
    if (!result.callFrames.length) {
      result.callFrames = payloadCallFrames;
    } else {
      for (let i = 0; i < payloadCallFrames.length && i < result.callFrames.length; i++) {
        result.callFrames[i] = payloadCallFrames[i];
      }
    }
  }
  if (result) {
    cacheForTrace.set(event, result);
  }
  return result;
}

/**
 * Fallback method to obtain a stack trace using the parsed event tree
 * hierarchy. This shouldn't be called outside of this file, use `get`
 * instead to ensure the correct event in the tree hierarchy is used.
 */
function getForEvent(event: Types.Events.Event, parsedTrace: Handlers.Types.ParsedTrace): Protocol.Runtime.StackTrace {
  // When working with a CPU profile the renderer handler won't have
  // entries in its tree.
  const entryToNode =
      parsedTrace.Renderer.entryToNode.size > 0 ? parsedTrace.Renderer.entryToNode : parsedTrace.Samples.entryToNode;
  const topStackTrace: Protocol.Runtime.StackTrace = {callFrames: []};
  let stackTrace: Protocol.Runtime.StackTrace = topStackTrace;
  let currentEntry: Types.Events.SyntheticProfileCall;
  let node: Helpers.TreeHelpers.TraceEntryNode|null|undefined = entryToNode.get(event);
  const traceCache =
      stackTraceForEventInTrace.get(parsedTrace) || new Map<Types.Events.Event, Protocol.Runtime.StackTrace>();
  stackTraceForEventInTrace.set(parsedTrace, traceCache);
  // Move up this node's ancestor tree appending JS frames to its
  // stack trace. If an async caller is detected, move up in the async
  // stack instead.
  while (node) {
    if (!Types.Events.isProfileCall(node.entry)) {
      const maybeAsyncParent = parsedTrace.AsyncJSCalls.runEntryPointToScheduler.get(node.entry);
      if (!maybeAsyncParent) {
        node = node.parent;
        continue;
      }
      const maybeAsyncParentNode = maybeAsyncParent && entryToNode.get(maybeAsyncParent.scheduler);
      if (maybeAsyncParentNode) {
        stackTrace = addAsyncParentToStack(stackTrace, maybeAsyncParent.taskName);
        node = maybeAsyncParentNode;
      }
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
      stackTrace = addAsyncParentToStack(stackTrace, maybeAsyncParentEvent.taskName);
      node = maybeAsyncParentNode;
      continue;
    }
    node = node.parent;
  }
  return topStackTrace;
}

function addAsyncParentToStack(stackTrace: Protocol.Runtime.StackTrace, taskName: string): Protocol.Runtime.StackTrace {
  const parent: Protocol.Runtime.StackTrace = {callFrames: []};
  // The Protocol.Runtime.StackTrace type is recursive, so we
  // move one level deeper in it as we walk up the ancestor tree.
  stackTrace.parent = parent;
  // Note: this description effectively corresponds to the name
  // of the task that scheduled the stack trace we are jumping
  // FROM, so it would make sense that it was set to that stack
  // trace instead of the one we are jumping TO. However, the
  // JS presentation utils we use to present async stack traces
  // assume the description is added to the stack trace that
  // scheduled the async task, so we build the data that way.
  parent.description = taskName;
  return parent;
}

/**
 * Finds the JS call in which an extension entry was injected (the
 * code location that called the extension API), and returns its stack
 * trace.
 */
function getForExtensionEntry(event: Types.Extensions.SyntheticExtensionEntry, parsedTrace: Handlers.Types.ParsedTrace):
    Protocol.Runtime.StackTrace|null {
  const rawEvent: Types.Events.Event = event.rawSourceEvent;
  if (Types.Events.isPerformanceMeasureBegin(rawEvent)) {
    return getForPerformanceMeasure(rawEvent, parsedTrace);
  }
  if (!rawEvent) {
    return null;
  }
  return get(rawEvent, parsedTrace);
}

/**
 * Gets the raw event for a user timing and obtains its stack trace.
 */
function getForPerformanceMeasure(event: Types.Events.PerformanceMeasureBegin, parsedTrace: Handlers.Types.ParsedTrace):
    Protocol.Runtime.StackTrace|null {
  let rawEvent: Types.Events.Event|undefined = event;
  if (event.args.traceId === undefined) {
    return null;
  }
  // performance.measure calls dispatch 2 events: one for the call
  // itself and another to represent the measured entry in the trace
  // timeline. They are connected via a common traceId. At this
  // point `rawEvent` corresponds to the second case, we must
  // encounter the event for the call itself to obtain its callstack.
  rawEvent = parsedTrace.UserTimings.measureTraceByTraceId.get(event.args.traceId);
  if (!rawEvent) {
    return null;
  }
  return get(rawEvent, parsedTrace);
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

/**
 * Converts a stack trace from a trace event's payload into an array of
 * Protocol.Runtime.CallFrame.
 */
function getTraceEventPayloadStackAsProtocolCallFrame(event: Types.Events.Event): Protocol.Runtime.CallFrame[] {
  const payloadCallStack = Helpers.Trace.getZeroIndexedStackTraceInEventPayload(event) || [];
  const callFrames: Protocol.Runtime.CallFrame[] = [];
  for (const frame of payloadCallStack) {
    callFrames.push({...frame, scriptId: String(frame.scriptId) as Protocol.Runtime.ScriptId});
  }
  return callFrames;
}
