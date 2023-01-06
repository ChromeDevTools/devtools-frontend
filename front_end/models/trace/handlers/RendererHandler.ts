// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Helpers from '../helpers/helpers.js';

import {data as metaHandlerData} from './MetaHandler.js';
import {
  buildStackTraceAsCallFramesFromId,
  data as samplesData,
  getAllHotFunctionsBetweenTimestamps,
} from './SamplesHandler.js';

import {KnownEventName, KNOWN_EVENTS, type TraceEventHandlerName, HandlerState} from './types.js';
import * as Types from '../types/types.js';

const processes = new Map<Types.TraceEvents.ProcessID, RendererProcess>();
const traceEventToNode = new Map<RendererEvent, RendererEventNode>();
const allRendererEvents: RendererEvent[] = [];

let handlerState = HandlerState.UNINITIALIZED;

const makeRendererProcess = (): RendererProcess => ({
  url: null,
  isOnMainFrame: false,
  threads: new Map(),
});

const makeRendererThread = (): RendererThread => ({
  name: null,
  events: [],
});

const makeEmptyRendererEventTree = (): RendererEventTree => ({
  nodes: new Map(),
  roots: new Set(),
  maxDepth: 0,
});

const makeEmptyRendererEventNode = (eventIndex: number): RendererEventNode => ({
  eventIndex,
  parentId: null,
  childrenIds: new Set(),
  depth: 0,
});

const makeRendererEventNodeIdGenerator = (): () => RendererEventNodeId => {
  let i = 0;
  return (): RendererEventNodeId => i++ as RendererEventNodeId;
};

const getOrCreateRendererProcess =
    (processes: Map<Types.TraceEvents.ProcessID, RendererProcess>, pid: Types.TraceEvents.ProcessID):
        RendererProcess => {
          return Platform.MapUtilities.getWithDefault(processes, pid, makeRendererProcess);
        };

const getOrCreateRendererThread = (process: RendererProcess, tid: Types.TraceEvents.ThreadID): RendererThread => {
  return Platform.MapUtilities.getWithDefault(process.threads, tid, makeRendererThread);
};

export function reset(): void {
  processes.clear();
  traceEventToNode.clear();
  allRendererEvents.length = 0;
  handlerState = HandlerState.UNINITIALIZED;
}

export function initialize(): void {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error('Renderer Handler was not reset');
  }

  handlerState = HandlerState.INITIALIZED;
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Renderer Handler is not initialized');
  }

  if (Types.TraceEvents.isTraceEventInstant(event) || Types.TraceEvents.isTraceEventComplete(event)) {
    const process = getOrCreateRendererProcess(processes, event.pid);
    const thread = getOrCreateRendererThread(process, event.tid);
    thread.events.push(event);
    allRendererEvents.push(event);
  }
}

export async function finalize(): Promise<void> {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Renderer Handler is not initialized');
  }

  const {mainFrameId, rendererProcessesByFrame, threadsInProcess} = metaHandlerData();
  assignMeta(processes, mainFrameId, rendererProcessesByFrame, threadsInProcess);
  sanitizeProcesses(processes);
  buildHierarchy(processes, {filter: KNOWN_EVENTS});
  sanitizeThreads(processes);

  handlerState = HandlerState.FINALIZED;
}

export function data(): RendererHandlerData {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('Renderer Handler is not finalized');
  }

  return {
    processes: new Map(processes),
    traceEventToNode: new Map(traceEventToNode),
    allRendererEvents: [...allRendererEvents],
  };
}

/**
 * Steps through all the renderer processes we've located so far in the meta
 * handler, obtaining their URL, checking whether they are the main frame, and
 * collecting each one of their threads' name. This meta handler's data is
 * assigned to the renderer handler's data.
 */
export function assignMeta(
    processes: Map<Types.TraceEvents.ProcessID, RendererProcess>, mainFrameId: string,
    rendererProcessesByFrame: Map<string, Map<Types.TraceEvents.ProcessID, {frame: Types.TraceEvents.TraceFrame}>>,
    threadsInProcess:
        Map<Types.TraceEvents.ProcessID, Map<Types.TraceEvents.ThreadID, Types.TraceEvents.TraceEventThreadName>>):
    void {
  assignOrigin(processes, mainFrameId, rendererProcessesByFrame);
  assignIsMainFrame(processes, mainFrameId, rendererProcessesByFrame);
  assignThreadName(processes, rendererProcessesByFrame, threadsInProcess);
}

/**
 * Assigns origins to all threads in all processes.
 * @see assignMeta
 */
export function assignOrigin(
    processes: Map<Types.TraceEvents.ProcessID, RendererProcess>, mainFrameId: string,
    rendererProcessesByFrame: Map<string, Map<Types.TraceEvents.ProcessID, {frame: Types.TraceEvents.TraceFrame}>>):
    void {
  for (const [frameId, renderProcessesByPid] of rendererProcessesByFrame) {
    for (const [pid, processInfo] of renderProcessesByPid) {
      const process = getOrCreateRendererProcess(processes, pid);
      // Sometimes a single process is responsible with rendering multiple
      // frames at the same time. For example, see https://crbug.com/1334563.
      // When this happens, we'd still like to assign a single url per process
      // so: 1) use the first frame rendered by this process as the url source
      // and 2) if there's a more "important" frame found, us its url instead.
      if (process.url === null /* first frame */ || frameId === mainFrameId /* more important frame */) {
        // If we are here, it's because we care about this process and the URL. But before we store it, we check if it is a valid URL by trying to create a URL object. If it isn't, we won't set it, and this process will be filtered out later.
        try {
          new URL(processInfo.frame.url);
          process.url = processInfo.frame.url;
        } catch (e) {
          process.url = null;
        }
      }
    }
  }
}

/**
 * Assigns whether or not a thread is the main frame to all threads in all processes.
 * @see assignMeta
 */
export function assignIsMainFrame(
    processes: Map<Types.TraceEvents.ProcessID, RendererProcess>, mainFrameId: string,
    rendererProcessesByFrame: Map<string, Map<Types.TraceEvents.ProcessID, {frame: Types.TraceEvents.TraceFrame}>>):
    void {
  for (const [frameId, renderProcessesByPid] of rendererProcessesByFrame) {
    for (const [pid] of renderProcessesByPid) {
      const process = getOrCreateRendererProcess(processes, pid);
      // We have this go in one direction; once a renderer has been flagged as
      // being on the main frame, we don't unset it to false if were to show up
      // in a subframe. Equally, if we already saw this renderer in a subframe,
      // but it becomes the main frame, the flag would get updated.
      if (frameId === mainFrameId) {
        process.isOnMainFrame = true;
      }
    }
  }
}

/**
 * Assigns the thread name to all threads in all processes.
 * @see assignMeta
 */
export function assignThreadName(
    processes: Map<Types.TraceEvents.ProcessID, RendererProcess>,
    rendererProcessesByFrame: Map<string, Map<Types.TraceEvents.ProcessID, {frame: Types.TraceEvents.TraceFrame}>>,
    threadsInProcess:
        Map<Types.TraceEvents.ProcessID, Map<Types.TraceEvents.ThreadID, Types.TraceEvents.TraceEventThreadName>>):
    void {
  for (const [, renderProcessesByPid] of rendererProcessesByFrame) {
    for (const [pid] of renderProcessesByPid) {
      const process = getOrCreateRendererProcess(processes, pid);
      for (const [tid, threadInfo] of threadsInProcess.get(pid) ?? []) {
        const thread = getOrCreateRendererThread(process, tid);
        thread.name = threadInfo?.args.name ?? `${tid}`;
      }
    }
  }
}

/**
 * Removes unneeded trace data opportunistically stored while handling events.
 * This currently does the following:
 *  - Deletes processes with an unkonwn origin.
 */
export function sanitizeProcesses(processes: Map<Types.TraceEvents.ProcessID, RendererProcess>): void {
  for (const [pid, process] of processes) {
    // If the process had no url, or if it had a malformed url that could not be
    // parsed for some reason, or if it's an "about:" origin, delete it.
    // This is done because we don't really care about processes for which we
    // can't provide actionable insights to the user (e.g. about:blank pages).
    if (process.url === null) {
      processes.delete(pid);
      continue;
    }
    const asUrl = new URL(process.url);
    if (asUrl.protocol === 'about:') {
      processes.delete(pid);
    }
  }
}

/**
 * Removes unneeded trace data opportunistically stored while handling events.
 * This currently does the following:
 *  - Deletes threads with no roots.
 */
export function sanitizeThreads(processes: Map<Types.TraceEvents.ProcessID, RendererProcess>): void {
  for (const [, process] of processes) {
    for (const [tid, thread] of process.threads) {
      // If the thread has no roots, also delete it. Otherwise, there's going to
      // be space taken, even though nothing is rendered in the track manager.
      if (!thread.tree?.roots.size) {
        process.threads.delete(tid);
      }
    }
  }
}

/**
 * Creates a hierarchical structure from the trace events. Each thread in each
 * process will contribute to their own individual hierarchy.
 *
 * The trace data comes in as a contiguous array of events, against which we
 * make a couple of assumptions:
 *
 *  1. Events are temporally-ordered in terms of start time (though they're
 *     not necessarily ordered as such in the data stream).
 *  2. If event B's start and end times are within event A's time boundaries
 *     we assume that A is the parent of B.
 *
 * Therefore we expect to reformulate something like:
 *
 * [ Task A ][ Task B ][ Task C ][ Task D ][ Task E ]
 *
 * Into something hierarchically-arranged like below:
 *
 * |------------- Task A -------------||-- Task E --|
 *  |-- Task B --||-- Task D --|
 *   |- Task C -|
 */
export function buildHierarchy(
    processes: Map<Types.TraceEvents.ProcessID, RendererProcess>,
    options: {filter: {has: (name: KnownEventName) => boolean}}): void {
  for (const [, process] of processes) {
    for (const [, thread] of process.threads) {
      // Step 1. Massage the data.
      Helpers.Trace.sortTraceEventsInPlace(thread.events);
      // Step 2. Build the tree.
      thread.tree = treify(thread.events, options);
    }
  }
}

/**
 * Builds a hierarchy of the trace events in a particular thread of a
 * particular process, assuming that they're sorted, by iterating through all of
 * the events in order.
 *
 * The approach is analogous to how a parser would be implemented. A stack
 * maintains local context. A scanner peeks and pops from the data stream.
 * Various "tokens" (events) are treated as "whitespace" (ignored).
 *
 * The tree starts out empty and is populated as the hierarchy is built. The
 * nodes are also assumed to be created empty, with no known parent or children.
 *
 * Complexity: O(n), where n = number of events
 */
export function treify(
    events: RendererEvent[], options: {filter: {has: (name: KnownEventName) => boolean}}): RendererEventTree {
  const stack = [];
  const tree = makeEmptyRendererEventTree();
  const makeRendererEventNodeId = makeRendererEventNodeIdGenerator();
  let lastScheduleStyleRecalcEvent: RendererEvent|null = null;
  let lastInvalidateLayout: RendererEvent|null = null;
  let lastForcedStyleRecalc: RendererEvent|null = null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    buildHotFunctionsStackTracesForTask(event);

    if (event.name === KnownEventName.ScheduleStyleRecalculation) {
      lastScheduleStyleRecalcEvent = event;
    }
    if (event.name === KnownEventName.InvalidateLayout) {
      lastInvalidateLayout = event;
    }
    if (event.name === KnownEventName.RecalculateStyles) {
      lastForcedStyleRecalc = event;
    }
    // If the current event should not be part of the tree, then simply proceed
    // with the next event.
    if (!options.filter.has(event.name as KnownEventName)) {
      continue;
    }

    const duration = Types.TraceEvents.isTraceEventInstant(event) ? 0 : event.dur;

    // If the parent stack is empty, then the current event is a root. Create a
    // node for it, mark it as a root, then proceed with the next event.
    if (stack.length === 0) {
      const node = makeEmptyRendererEventNode(i);
      const nodeId = makeRendererEventNodeId();
      tree.nodes.set(nodeId, node);
      tree.roots.add(nodeId);
      event.totalTime = Types.Timing.MicroSeconds(duration);
      event.selfTime = Types.Timing.MicroSeconds(duration);
      stack.push(nodeId);
      tree.maxDepth = Math.max(tree.maxDepth, stack.length);
      traceEventToNode.set(event, node);
      continue;
    }

    const parentNodeId = stack[stack.length - 1];
    if (parentNodeId === undefined) {
      throw new Error('Impossible: no parent node id found in the stack');
    }

    const parentNode = tree.nodes.get(parentNodeId);
    if (!parentNode) {
      throw new Error('Impossible: no parent node exists for the given id');
    }

    const parentEvent = events[parentNode.eventIndex];
    if (!parentEvent) {
      throw new Error('Impossible: no parent event exists for the given node');
    }

    const begin = event.ts;
    const parentBegin = parentEvent.ts;
    const parentDuration = Types.TraceEvents.isTraceEventInstant(parentEvent) ? 0 : parentEvent.dur;
    const end = begin + duration;
    const parentEnd = parentBegin + parentDuration;
    // Check the relationship between the parent event at the top of the stack,
    // and the current event being processed. There are only 4 distinct
    // possiblities, only 2 of them actually valid, given the assumed sorting:
    // 1. Current event starts before the parent event, ends whenever. (invalid)
    // 2. Current event starts after the parent event, ends whenever. (valid)
    // 3. Current event starts during the parent event, ends after. (invalid)
    // 4. Current event starts and ends during the parent event. (valid)

    // 1. If the current event starts before the parent event, then the data is
    //    not sorted properly, messed up some way, or this logic is incomplete.
    const startsBeforeParent = begin < parentBegin;
    if (startsBeforeParent) {
      throw new Error('Impossible: current event starts before the parent event');
    }

    // 2. If the current event starts after the parent event, then it's a new
    //    parent. Pop, then handle current event again.
    const startsAfterParent = begin >= parentEnd;
    if (startsAfterParent) {
      stack.pop();
      i--;
      continue;
    }

    // 3. If the current event starts during the parent event, but ends after
    //    it, then the data is messed up some way.
    const endsAfterParent = end > parentEnd;
    if (endsAfterParent) {
      throw new Error('Impossible: current event starts during the parent event');
    }

    // 4. The only remaining case is the common case, where the current event is
    //    contained within the parent event. Create a node for the current
    //    event, establish the parent/child relationship, then proceed with the
    //    next event.
    const node = makeEmptyRendererEventNode(i);
    const nodeId = makeRendererEventNodeId();
    tree.nodes.set(nodeId, node);
    node.depth = stack.length;
    node.parentId = parentNodeId;
    parentNode.childrenIds.add(nodeId);
    event.selfTime = Types.Timing.MicroSeconds(duration);
    event.totalTime = Types.Timing.MicroSeconds(duration);
    if (parentEvent.selfTime !== undefined) {
      parentEvent.selfTime = Types.Timing.MicroSeconds(parentEvent.selfTime - event.totalTime);
    }
    stack.push(nodeId);
    tree.maxDepth = Math.max(tree.maxDepth, stack.length);
    traceEventToNode.set(event, node);
    // For checking if an event is a forced layout, this point in the process
    // is the perfect spot.
    // An event is a forced layout if it is in a subset of all events (see
    // EVENTS_THAT_MAY_BE_FORCED_LAYOUTS constant) AND if its parent event is
    // not a RunTask.  Rather than navigate the tree and perform this check
    // later on, we can do this at this point, where we already have done the
    // work to calculate the event and its parent event.
    checkIfEventIsForcedLayoutAndStore(
        event, lastScheduleStyleRecalcEvent, lastInvalidateLayout, lastForcedStyleRecalc);
  }
  return tree;
}

function checkIfEventIsForcedLayoutAndStore(
    event: RendererEvent, lastScheduleStyleRecalcEvent: RendererEvent|null, lastInvalidateLayout: RendererEvent|null,
    lastForcedStyleRecalc: RendererEvent|null): void {
  // Forced re relayout
  if (FORCED_LAYOUT_EVENT_NAMES.has(event.name as KnownEventName)) {
    if (lastInvalidateLayout) {
      // By default, the initiator of a forced re layout is the last InvalidateLayout event.
      event.initiator = lastInvalidateLayout;
    }

    // However if the last InvalidateLayout ended before the last forced styles recalc,
    // set the initiator to be the last ScheduleStylesRecalc.
    const lastForcedStyleEndTime = lastForcedStyleRecalc && lastForcedStyleRecalc.ts + (lastForcedStyleRecalc.dur || 0);
    const hasInitiator = lastScheduleStyleRecalcEvent && lastInvalidateLayout && lastForcedStyleEndTime;
    if (hasInitiator && lastForcedStyleEndTime > lastInvalidateLayout.ts) {
      event.initiator = lastScheduleStyleRecalcEvent;
    }
  }

  // Forced styles recalc
  if (FORCED_RECALC_STYLE_EVENTS.has(event.name as KnownEventName)) {
    lastForcedStyleRecalc = event;
    if (lastScheduleStyleRecalcEvent) {
      // By default, the initiator of a forced styles recalc is the last ScheduleStylesRecalc event.
      event.initiator = lastScheduleStyleRecalcEvent;
    }
  }
}

function eventIsLongTask(event: RendererEvent, mustBeOnMainFrame: boolean): boolean {
  if (event.name !== KnownEventName.RunTask) {
    return false;
  }
  const eventProcess = processes.get(event.pid);
  const isOnMainFrame = Boolean(eventProcess && eventProcess.isOnMainFrame);
  if (!isOnMainFrame && mustBeOnMainFrame) {
    return false;
  }

  const errorTimeThreshold = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(50));
  const eventDuration = Types.TraceEvents.isTraceEventInstant(event) ? 0 : event.dur;
  return eventDuration > errorTimeThreshold;
}

export function buildHotFunctionsStackTracesForTask(task: RendererEvent): void {
  if (!eventIsLongTask(task, true)) {
    // Don't spend time computing this data for tasks that aren't long.
    return;
  }
  const {processes} = samplesData();
  const thread = processes.get(task.pid)?.threads.get(task.tid);
  // This threshold is temporarily set to 0 until so that at the moment
  // we want to always show what functions were executed in a long task.
  // In the future however, as we provide more sophisticated details
  // for long tasks, we should set the threshold to a more valuable value.
  const HOT_FUNCTION_MIN_SELF_PERCENTAGE = 0;
  const calls = thread?.calls;
  const taskStart = task.ts;
  const taskEnd = Types.Timing.MicroSeconds(task.ts + (task.dur || 0));
  const hotFunctions =
      calls && getAllHotFunctionsBetweenTimestamps(calls, taskStart, taskEnd, HOT_FUNCTION_MIN_SELF_PERCENTAGE);
  const tree = thread?.tree;
  if (!hotFunctions || !tree) {
    return;
  }
  // Store the top 10 hot functions.
  const MAX_HOT_FUNCTION_COUNT = 10;
  task.hotFunctionsStackTraces =
      hotFunctions.slice(0, MAX_HOT_FUNCTION_COUNT)
          .map(hotFunction => buildStackTraceAsCallFramesFromId(tree, hotFunction.stackFrame.nodeId).reverse());
}

export const FORCED_LAYOUT_EVENT_NAMES = new Set([
  KnownEventName.Layout,
]);

export const FORCED_RECALC_STYLE_EVENTS = new Set([
  KnownEventName.RecalculateStyles,
  KnownEventName.UpdateLayoutTree,
]);

export function deps(): TraceEventHandlerName[] {
  return ['Meta', 'Samples'];
}

export interface RendererHandlerData {
  processes: Map<Types.TraceEvents.ProcessID, RendererProcess>;
  traceEventToNode: Map<RendererEvent, RendererEventNode>;
  allRendererEvents: RendererEvent[];
}

export interface RendererProcess {
  // In an ideal world this would be modelled as a URL, but URLs cannot be sent
  // between the main thread and workers, so we have to store it as a string.
  url: string|null;
  isOnMainFrame: boolean;
  threads: Map<Types.TraceEvents.ThreadID, RendererThread>;
}

export interface RendererThread {
  name: string|null;
  events: RendererEvent[];
  tree?: RendererEventTree;
}

interface RendererEventData {
  selfTime: Types.Timing.MicroSeconds;
  totalTime: Types.Timing.MicroSeconds;
  initiator: RendererEvent;
  hotFunctionsStackTraces: Types.TraceEvents.TraceEventCallFrame[][];
}

export type RendererEvent = Types.TraceEvents.TraceEventRendererData&Partial<RendererEventData>;

export interface RendererEventTree {
  nodes: Map<RendererEventNodeId, RendererEventNode>;
  roots: Set<RendererEventNodeId>;
  maxDepth: number;
}

export interface RendererEventNode {
  eventIndex: number;
  depth: number;
  parentId?: RendererEventNodeId|null;
  childrenIds: Set<RendererEventNodeId>;
}

class RendererEventNodeIdTag {
  /* eslint-disable-next-line no-unused-private-class-members */
  readonly #tag: (symbol|undefined);
}
export type RendererEventNodeId = number&RendererEventNodeIdTag;
