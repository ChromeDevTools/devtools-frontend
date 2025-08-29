// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../../core/platform/platform.js';
import type * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {data as flowsHandlerData} from './FlowsHandler.js';
import {data as rendererHandlerData} from './RendererHandler.js';

let schedulerToRunEntryPoints = new Map<Types.Events.Event, Types.Events.Event[]>();

let taskScheduleForTaskRunEvent = new Map<Types.Events.DebuggerAsyncTaskRun, Types.Events.DebuggerAsyncTaskScheduled>();
let asyncCallToScheduler =
    new Map<Types.Events.SyntheticProfileCall, {taskName: string, scheduler: Types.Events.Event}>();

let runEntryPointToScheduler = new Map<Types.Events.Event, {taskName: string, scheduler: Types.Events.Event}>();

export function reset(): void {
  schedulerToRunEntryPoints = new Map();
  asyncCallToScheduler = new Map();
  taskScheduleForTaskRunEvent = new Map();
  runEntryPointToScheduler = new Map();
}

export function handleEvent(_: Types.Events.Event): void {
}

export async function finalize(): Promise<void> {
  const {flows} = flowsHandlerData();
  const {entryToNode} = rendererHandlerData();
  // Process async task flows
  for (const flow of flows) {
    let maybeAsyncTaskScheduled = flow.at(0);
    if (!maybeAsyncTaskScheduled) {
      continue;
    }
    if (Types.Events.isDebuggerAsyncTaskRun(maybeAsyncTaskScheduled)) {
      // Sometimes a AsyncTaskRun event run can incorrectly appear as
      // initiated by another AsyncTaskRun from Perfetto's flows
      // perspective.
      // For example, in this snippet:
      //
      // const myTask = console.createTask('hola'); // creates an AsyncTaskSchedule
      // myTask.run(something); // creates an AsyncTaskRun
      // myTask.run(somethingElse); // creates an AsyncTaskRun
      //
      // or also in this one
      //
      // setInterval(something); // creates multiple connected AsyncTaskRun.
      //
      // Because the flow id is created based on the task's memory address,
      // the three events will end up belonging to the same flow (even if
      // in the frontend we receive it as pairs), and elements in a flow
      // are connected to their immediately consecutive neighbor.
      //
      // To ensure we use the right Schedule event, if the "initiating"
      // portion of the flow is a Run event, we look for any corresponding
      // Schedule event that we might have found before.
      maybeAsyncTaskScheduled = taskScheduleForTaskRunEvent.get(maybeAsyncTaskScheduled);
    }
    if (!maybeAsyncTaskScheduled || !Types.Events.isDebuggerAsyncTaskScheduled(maybeAsyncTaskScheduled)) {
      continue;
    }
    const taskName = maybeAsyncTaskScheduled.args.taskName;
    const asyncTaskRun = flow.at(1);
    if (!asyncTaskRun || !Types.Events.isDebuggerAsyncTaskRun(asyncTaskRun)) {
      // Unexpected flow shape, ignore.
      continue;
    }
    // Cache the Schedule event for this Run for future reference.
    taskScheduleForTaskRunEvent.set(asyncTaskRun, maybeAsyncTaskScheduled);

    // Get the JS call scheduled the task.
    const asyncCaller = findNearestJSAncestor(maybeAsyncTaskScheduled, entryToNode);

    // Get the trace entrypoint for the scheduled task (e.g. FunctionCall, etc.).
    const asyncEntryPoint = findFirstJsInvocationForAsyncTaskRun(asyncTaskRun, entryToNode);

    // Store the async relationship between traces to be shown with initiator arrows.
    // Default to the AsyncTask events in case the JS entrypoints aren't found.
    runEntryPointToScheduler.set(
        asyncEntryPoint || asyncTaskRun, {taskName, scheduler: asyncCaller || maybeAsyncTaskScheduled});
    if (!asyncCaller || !asyncEntryPoint) {
      // Unexpected async call trace data shape, ignore.
      continue;
    }
    // Set scheduler -> scheduled mapping.
    // The scheduled being the JS entrypoint
    const entryPoints = Platform.MapUtilities.getWithDefault(schedulerToRunEntryPoints, asyncCaller, () => []);
    entryPoints.push(asyncEntryPoint);

    // Set scheduled -> scheduler mapping.
    // The scheduled being the JS calls (instead of the entrypoints as
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
  // Given a trace event, returns its corresponding async parent trace
  // event caused by an async js call. This can be used as a fallback
  // for cases where a corresponding JS call is not found at either
  // end of the async task scheduling pair (e.g. due to sampling data
  // incompleteness).
  // In the StackTraceForEvent helper, as we move up the call tree,
  // this is used to jump to an async parent stack from a
  // non-profile call trace event in cases where a profile call wasn't
  // found before. In theory we should make the jump from the scheduled
  // profile  call using `asyncCallToScheduler`, but its possible that
  // the the call information isn't available to us as a consequence of
  // missing samples.
  runEntryPointToScheduler: typeof runEntryPointToScheduler,
} {
  return {
    schedulerToRunEntryPoints,
    asyncCallToScheduler,
    runEntryPointToScheduler,
  };
}

export function deps(): ['Renderer', 'Flows'] {
  return ['Renderer', 'Flows'];
}
