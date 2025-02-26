// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../../core/platform/platform.js';
import type * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {data as flowsHandlerData} from './FlowsHandler.js';
import {data as rendererHandlerData} from './RendererHandler.js';

const schedulerToRunEntryPoints = new Map<Types.Events.Event, Types.Events.Event[]>();
const asyncCallToScheduler =
    new Map<Types.Events.SyntheticProfileCall, {taskName: string, scheduler: Types.Events.Event}>();

export function reset(): void {
  schedulerToRunEntryPoints.clear();
  asyncCallToScheduler.clear();
}

export function handleEvent(_: Types.Events.Event): void {
}

export async function finalize(): Promise<void> {
  const {flows} = flowsHandlerData();
  const {entryToNode} = rendererHandlerData();
  // Process async task flows
  for (const flow of flows) {
    const asyncTaskScheduled = flow.at(0);
    if (!asyncTaskScheduled || !Types.Events.isDebuggerAsyncTaskScheduled(asyncTaskScheduled)) {
      continue;
    }
    const taskName = asyncTaskScheduled.args.taskName;
    const asyncTaskRun = flow.at(1);
    if (!asyncTaskRun || !Types.Events.isDebuggerAsyncTaskRun(asyncTaskRun)) {
      // Unexpected flow shape, ignore.
      continue;
    }
    const asyncCaller = findNearestJSAncestor(asyncTaskScheduled, entryToNode);
    if (!asyncCaller) {
      // Unexpected async call trace data shape, ignore.
      continue;
    }
    const asyncEntryPoint = findFirstJsInvocationForAsyncTaskRun(asyncTaskRun, entryToNode);
    if (!asyncEntryPoint) {
      // Unexpected async call trace data shape, ignore.
      continue;
    }
    // Set scheduler -> schedulee mapping.
    // The schedulee being the JS entrypoint
    const entryPoints = Platform.MapUtilities.getWithDefault(schedulerToRunEntryPoints, asyncCaller, () => []);
    entryPoints.push(asyncEntryPoint);

    // Set schedulee -> scheduler mapping.
    // The schedulees being the JS calls (instead of the entrypoints as
    // above, for usage ergonomics).
    const scheduledProfileCalls = findFirstJSCallsForAsyncTaskRun(asyncTaskRun, entryToNode);
    for (const call of scheduledProfileCalls) {
      asyncCallToScheduler.set(call, {taskName, scheduler: asyncCaller});
    }
  }
}
/**
 * Given a DebuggerAsyncTaskScheduled event, returns its closest
 * ProfileCall or JS invocation ancestor, which represents the JS call
 * that scheduled the async task.
 */
function findNearestJSAncestor(
    asyncTaskScheduled: Types.Events.DebuggerAsyncTaskScheduled,
    entryToNode: Map<Types.Events.Event, Helpers.TreeHelpers.TraceEntryNode>): Types.Events.Event|null {
  let node = entryToNode.get(asyncTaskScheduled)?.parent;
  while (node) {
    if (Types.Events.isProfileCall(node.entry) || acceptJSInvocationsPredicate(node.entry)) {
      return node.entry;
    }
    node = node.parent;
  }
  return null;
}
/**
 * Entrypoints to JS execution in the timeline. We ignore those starting
 * with 'v8' because they aren't shown in the timeline, and ultimately
 * this function's output results in "initiated" events, so ideally this
 * returns events that end up in the flame chart.
 */
function acceptJSInvocationsPredicate(event: Types.Events.Event): event is Types.Events.Event {
  const eventIsConsoleRunTask = Types.Events.isConsoleRunTask(event);
  const eventIsV8EntryPoint = event.name.startsWith('v8') || event.name.startsWith('V8');
  return Types.Events.isJSInvocationEvent(event) && (eventIsConsoleRunTask || !eventIsV8EntryPoint);
}

/**
 * Given a DebuggerAsyncTaskRun event, returns its closest JS entry
 * point descendant, which contains the task being scheduled.
 */
function findFirstJsInvocationForAsyncTaskRun(
    asyncTaskRun: Types.Events.DebuggerAsyncTaskRun,
    entryToNode: Map<Types.Events.Event, Helpers.TreeHelpers.TraceEntryNode>): Types.Events.Event|undefined {
  // Ignore descendants of other DebuggerAsyncTaskRuns since they
  // are part of another async task and have to be handled separately
  return findFirstDescendantsOfType(
             asyncTaskRun, entryToNode, acceptJSInvocationsPredicate, Types.Events.isDebuggerAsyncTaskRun)
      .at(0);
}

/**
 * Given an async task run event, returns the top level call frames
 * (profile calls) directly called by the async task. This implies that
 * any profile calls under another async task run event are ignored.
 * These profile calls represent the JS task being scheduled, AKA
 * the other part of the async stack.
 *
 * For example, here the profile calls "js 1", "js 2" and "js 4" would
 * be returned:
 *
 * |------------------Async Task Run------------------|
 * |--FunctionCall--|    |--FunctionCall--|
 * |-js 1-||-js 2-|        |-js 4-|
 * |-js 3-|
 *
 * But here, only "js 1" and "js 2" would be returned:
 *
 * |------------------Async Task Run------------------|
 * |--FunctionCall--|    |------------------------|
 * |-js 1-||-js 2-|       |---Async Task Run--|
 * |-js 3-|                |--FunctionCall--|
 *                          |-js 4-|
 */
function findFirstJSCallsForAsyncTaskRun(
    asyncTaskRun: Types.Events.DebuggerAsyncTaskRun,
    entryToNode: Map<Types.Events.Event, Helpers.TreeHelpers.TraceEntryNode>): Types.Events.SyntheticProfileCall[] {
  // Ignore descendants of other DebuggerAsyncTaskRuns since they
  // are part of another async task and have to be handled separately
  return findFirstDescendantsOfType(
      asyncTaskRun, entryToNode, Types.Events.isProfileCall, Types.Events.isDebuggerAsyncTaskRun);
}

/**
 * Given a root event returns all the first descendants that meet a
 * predicate condition (predicateAccept) while ignoring subtrees whose
 * top event meets an ignore condition (predicateIgnore).
 */
function findFirstDescendantsOfType<T extends Types.Events.Event>(
    root: Types.Events.Event, entryToNode: Map<Types.Events.Event, Helpers.TreeHelpers.TraceEntryNode>,
    predicateAccept: (event: Types.Events.Event) => event is T,
    predicateIgnore: (event: Types.Events.Event) => boolean): T[] {
  const node = entryToNode.get(root);
  if (!node) {
    return [];
  }
  const childrenGroups = [[...node.children]];
  const firstDescendants = [];
  for (let i = 0; i < childrenGroups.length; i++) {
    const siblings = childrenGroups[i];
    for (let j = 0; j < siblings.length; j++) {
      const node = siblings[j];
      if (predicateAccept(node.entry)) {
        firstDescendants.push(node.entry);
      } else if (!predicateIgnore(node.entry)) {
        childrenGroups.push([...node.children]);
      }
    }
  }
  return firstDescendants;
}

export function data(): {
  // Given a profile call, returns the JS entrypoint it scheduled (if any).
  // For example, given a setTimeout call, returns the JS entry point
  // trace event for the timeout callback run event (usually a
  // FunctionCall event).
  schedulerToRunEntryPoints: typeof schedulerToRunEntryPoints,
  // Given a profile call, returns the profile call that scheduled it.
  // For example given a timeout callback run event, returns its
  // setTimeout call event.
  asyncCallToScheduler: typeof asyncCallToScheduler,
} {
  return {
    schedulerToRunEntryPoints,
    asyncCallToScheduler,
  };
}

export function deps(): ['Renderer', 'Flows'] {
  return ['Renderer', 'Flows'];
}
