// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {data as auctionWorkletsData} from './AuctionWorkletsHandler.js';
import {data as metaHandlerData, type FrameProcessData} from './MetaHandler.js';
import {data as samplesHandlerData} from './SamplesHandler.js';
import {HandlerState, type TraceEventHandlerName} from './types.js';

/**
 * This handler builds the hierarchy of trace events and profile calls
 * on each thread on each process.
 *
 * Throughout the code, trace events and profile calls are referred to
 * as "entries", but note they are different types of data. Trace events
 * come directly from the backend and it's the type the engine commonly
 * refers to. Profile calls on the other hand are built in the frontend,
 * and, for compatibility purposes, typed as an extension to the trace
 * event type.
 */

const processes = new Map<Types.TraceEvents.ProcessID, RendererProcess>();

// We track the compositor tile worker thread name events so that at the end we
// can return these keyed by the process ID. These are used in the frontend to
// show the user the rasterization thread(s) on the main frame as tracks.
const compositorTileWorkers = Array<{
  pid: Types.TraceEvents.ProcessID,
  tid: Types.TraceEvents.ThreadID,
}>();
const entryToNode = new Map<Types.TraceEvents.RendererEntry, RendererEntryNode>();
const allRendererEvents: Types.TraceEvents.TraceEventRendererEvent[] = [];
let nodeIdCount = 0;
const makeRendererEntrytNodeId = (): RendererEntryNodeId => (++nodeIdCount) as RendererEntryNodeId;
const completeEventStack: (Types.TraceEvents.TraceEventSyntheticCompleteEvent)[] = [];

let handlerState = HandlerState.UNINITIALIZED;
let config: Types.Configuration.Configuration = Types.Configuration.DEFAULT;

const makeRendererProcess = (): RendererProcess => ({
  url: null,
  isOnMainFrame: false,
  threads: new Map(),
});

const makeRendererThread = (): RendererThread => ({
  name: null,
  entries: [],
});

const makeEmptyRendererTree = (): RendererTree => ({
  nodes: new Map(),
  roots: new Set(),
  maxDepth: 0,
});

const makeEmptyRendererEventNode =
    (entry: Types.TraceEvents.RendererEntry, id: RendererEntryNodeId): RendererEntryNode => ({
      entry,
      id,
      parentId: null,
      children: new Set(),
      depth: 0,
    });

const getOrCreateRendererProcess =
    (processes: Map<Types.TraceEvents.ProcessID, RendererProcess>, pid: Types.TraceEvents.ProcessID):
        RendererProcess => {
          return Platform.MapUtilities.getWithDefault(processes, pid, makeRendererProcess);
        };

const getOrCreateRendererThread = (process: RendererProcess, tid: Types.TraceEvents.ThreadID): RendererThread => {
  return Platform.MapUtilities.getWithDefault(process.threads, tid, makeRendererThread);
};

export function handleUserConfig(userConfig: Types.Configuration.Configuration): void {
  config = userConfig;
}

export function reset(): void {
  processes.clear();
  entryToNode.clear();
  allRendererEvents.length = 0;
  completeEventStack.length = 0;
  compositorTileWorkers.length = 0;
  nodeIdCount = -1;
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

  if (Types.TraceEvents.isThreadName(event) && event.args.name?.startsWith('CompositorTileWorker')) {
    compositorTileWorkers.push({
      pid: event.pid,
      tid: event.tid,
    });
  }

  if (Types.TraceEvents.isTraceEventBegin(event) || Types.TraceEvents.isTraceEventEnd(event)) {
    const process = getOrCreateRendererProcess(processes, event.pid);
    const thread = getOrCreateRendererThread(process, event.tid);
    const completeEvent = makeCompleteEvent(event);
    if (!completeEvent) {
      return;
    }
    thread.entries.push(completeEvent);
    allRendererEvents.push(completeEvent);
    return;
  }

  if (Types.TraceEvents.isTraceEventInstant(event) || Types.TraceEvents.isTraceEventComplete(event)) {
    const process = getOrCreateRendererProcess(processes, event.pid);
    const thread = getOrCreateRendererThread(process, event.tid);
    thread.entries.push(event);
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
  buildHierarchy(processes);
  sanitizeThreads(processes);

  handlerState = HandlerState.FINALIZED;
}

export function data(): RendererHandlerData {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('Renderer Handler is not finalized');
  }

  return {
    processes: new Map(processes),
    compositorTileWorkers: new Map(gatherCompositorThreads()),
    entryToNode: new Map(entryToNode),
    allRendererEvents: [...allRendererEvents],
  };
}

function gatherCompositorThreads(): Map<Types.TraceEvents.ProcessID, Types.TraceEvents.ThreadID[]> {
  const threadsByProcess = new Map<Types.TraceEvents.ProcessID, Types.TraceEvents.ThreadID[]>();
  for (const worker of compositorTileWorkers) {
    const byProcess = threadsByProcess.get(worker.pid) || [];
    byProcess.push(worker.tid);
    threadsByProcess.set(worker.pid, byProcess);
  }
  return threadsByProcess;
}

/**
 * Steps through all the renderer processes we've located so far in the meta
 * handler, obtaining their URL, checking whether they are the main frame, and
 * collecting each one of their threads' name. This meta handler's data is
 * assigned to the renderer handler's data.
 */
export function assignMeta(
    processes: Map<Types.TraceEvents.ProcessID, RendererProcess>, mainFrameId: string,
    rendererProcessesByFrame: FrameProcessData,
    threadsInProcess:
        Map<Types.TraceEvents.ProcessID, Map<Types.TraceEvents.ThreadID, Types.TraceEvents.TraceEventThreadName>>):
    void {
  assignOrigin(processes, rendererProcessesByFrame);
  assignIsMainFrame(processes, mainFrameId, rendererProcessesByFrame);
  assignThreadName(processes, rendererProcessesByFrame, threadsInProcess);
}

/**
 * Assigns origins to all threads in all processes.
 * @see assignMeta
 */
export function assignOrigin(
    processes: Map<Types.TraceEvents.ProcessID, RendererProcess>, rendererProcessesByFrame: FrameProcessData): void {
  for (const renderProcessesByPid of rendererProcessesByFrame.values()) {
    for (const [pid, processWindows] of renderProcessesByPid) {
      for (const processInfo of processWindows.flat()) {
        const process = getOrCreateRendererProcess(processes, pid);
        // Sometimes a single process is responsible with rendering multiple
        // frames at the same time. For example, see https://crbug.com/1334563.
        // When this happens, we'd still like to assign a single url per process
        // so: 1) use the first frame rendered by this process as the url source
        // and 2) if the last url is "about:blank", use the next frame's url,
        // data from about:blank is irrelevant.
        if (process.url === null || process.url === 'about:blank') {
          // If we are here, it's because we care about this process and the URL. But before we store
          // it, we check if it is a valid URL by trying to create a URL object. If it isn't, we won't
          // set it, and this process will be filtered out later.
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
}

/**
 * Assigns whether or not a thread is the main frame to all threads in all processes.
 * @see assignMeta
 */
export function assignIsMainFrame(
    processes: Map<Types.TraceEvents.ProcessID, RendererProcess>, mainFrameId: string,
    rendererProcessesByFrame: FrameProcessData): void {
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
    processes: Map<Types.TraceEvents.ProcessID, RendererProcess>, rendererProcessesByFrame: FrameProcessData,
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
  const auctionWorklets = auctionWorkletsData().worklets;
  for (const [pid, process] of processes) {
    // If the process had no url, or if it had a malformed url that could not be
    // parsed for some reason, or if it's an "about:" origin, delete it.
    // This is done because we don't really care about processes for which we
    // can't provide actionable insights to the user (e.g. about:blank pages).
    //
    // There is one exception; AuctionWorklet processes get parsed in a
    // separate handler, so at this point we check to see if the process has
    // been found by the AuctionWorkletsHandler, and if so we update the URL.
    // This ensures that we keep this process around and do not drop it due to
    // the lack of a URL.
    if (process.url === null) {
      const maybeWorklet = auctionWorklets.get(pid);
      if (maybeWorklet) {
        process.url = maybeWorklet.host;
      } else {
        processes.delete(pid);
      }
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
      // If the thread has no roots, delete it. Otherwise, there's going to
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
    options?: {filter: {has: (name: Types.TraceEvents.KnownEventName) => boolean}}): void {
  for (const [pid, process] of processes) {
    for (const [tid, thread] of process.threads) {
      if (!thread.entries.length) {
        thread.tree = makeEmptyRendererTree();
        continue;
      }
      // Step 1. Massage the data.
      Helpers.Trace.sortTraceEventsInPlace(thread.entries);
      // Step 2. Inject profile calls from samples
      const cpuProfile = samplesHandlerData().profilesInProcess.get(pid)?.get(tid)?.parsedProfile;
      const samplesIntegrator =
          cpuProfile && new Helpers.SamplesIntegrator.SamplesIntegrator(cpuProfile, pid, tid, config);
      const profileCalls = samplesIntegrator?.buildProfileCalls(thread.entries);
      if (profileCalls) {
        thread.entries = Helpers.Trace.mergeEventsInOrder(thread.entries, profileCalls);
      }
      // Step 3. Build the tree.
      thread.tree = treify(thread.entries, options);
    }
  }
}

/**
 * Builds a hierarchy of the entries (trace events and profile calls) in
 * a particular thread of a particular process, assuming that they're
 * sorted, by iterating through all of the events in order.
 *
 * The approach is analogous to how a parser would be implemented. A
 * stack maintains local context. A scanner peeks and pops from the data
 * stream. Various "tokens" (events) are treated as "whitespace"
 * (ignored).
 *
 * The tree starts out empty and is populated as the hierarchy is built.
 * The nodes are also assumed to be created empty, with no known parent
 * or children.
 *
 * Complexity: O(n), where n = number of events
 */
export function treify(
    entries: Types.TraceEvents.RendererEntry[],
    options?: {filter: {has: (name: Types.TraceEvents.KnownEventName) => boolean}}): RendererTree {
  const stack = [];
  // Reset the node id counter for every new renderer.
  nodeIdCount = -1;
  const tree = makeEmptyRendererTree();
  for (let i = 0; i < entries.length; i++) {
    const event = entries[i];
    // If the current event should not be part of the tree, then simply proceed
    // with the next event.
    if (options && !options.filter.has(event.name as Types.TraceEvents.KnownEventName)) {
      continue;
    }

    const duration = event.dur || 0;
    const nodeId = makeRendererEntrytNodeId();
    const node = makeEmptyRendererEventNode(event, nodeId);

    // If the parent stack is empty, then the current event is a root. Create a
    // node for it, mark it as a root, then proceed with the next event.
    if (stack.length === 0) {
      tree.nodes.set(nodeId, node);
      tree.roots.add(node);
      event.selfTime = Types.Timing.MicroSeconds(duration);
      stack.push(node);
      tree.maxDepth = Math.max(tree.maxDepth, stack.length);
      entryToNode.set(event, node);
      continue;
    }

    const parentNode = stack.at(-1);
    if (parentNode === undefined) {
      throw new Error('Impossible: no parent node found in the stack');
    }

    const parentEvent = parentNode.entry;

    const begin = event.ts;
    const parentBegin = parentEvent.ts;
    const parentDuration = parentEvent.dur || 0;
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
      // The last created node has been discarded, so discard this id.
      nodeIdCount--;
      continue;
    }
    // 3. If the current event starts during the parent event, but ends
    //    after it, then the data is messed up some way, for example a
    //    profile call was sampled too late after its start, ignore the
    //    problematic event.
    const endsAfterParent = end > parentEnd;
    if (endsAfterParent) {
      continue;
    }

    // 4. The only remaining case is the common case, where the current event is
    //    contained within the parent event. Create a node for the current
    //    event, establish the parent/child relationship, then proceed with the
    //    next event.
    tree.nodes.set(nodeId, node);
    node.depth = stack.length;
    node.parentId = parentNode.id;
    parentNode.children.add(node);
    event.selfTime = Types.Timing.MicroSeconds(duration);
    if (parentEvent.selfTime !== undefined) {
      parentEvent.selfTime = Types.Timing.MicroSeconds(parentEvent.selfTime - (event.dur || 0));
    }
    stack.push(node);
    tree.maxDepth = Math.max(tree.maxDepth, stack.length);
    entryToNode.set(event, node);
  }
  return tree;
}

export function makeCompleteEvent(event: Types.TraceEvents.TraceEventBegin|Types.TraceEvents.TraceEventEnd):
    Types.TraceEvents.TraceEventSyntheticCompleteEvent|null {
  if (Types.TraceEvents.isTraceEventEnd(event)) {
    // Quietly ignore unbalanced close events, they're legit (we could
    // have missed start one).
    const beginEvent = completeEventStack.pop();
    if (!beginEvent) {
      return null;
    }
    if (beginEvent.name !== event.name || beginEvent.cat !== event.cat) {
      console.error(
          'Begin/End events mismatch at ' + beginEvent.ts + ' (' + beginEvent.name + ') vs. ' + event.ts + ' (' +
          event.name + ')');
      return null;
    }
    // Update the begin event's duration using the timestamp of the end
    // event.
    beginEvent.dur = Types.Timing.MicroSeconds(event.ts - beginEvent.ts);
    return null;
  }

  // Create a synthetic event using the begin event, when we find the
  // matching end event later we will update its duration.
  const syntheticComplete: Types.TraceEvents.TraceEventSyntheticCompleteEvent = {
    ...event,
    ph: Types.TraceEvents.Phase.COMPLETE,
    dur: Types.Timing.MicroSeconds(0),
  };

  completeEventStack.push(syntheticComplete);
  return syntheticComplete;
}

export function deps(): TraceEventHandlerName[] {
  return ['Meta', 'Samples', 'AuctionWorklets'];
}

export interface RendererHandlerData {
  processes: Map<Types.TraceEvents.ProcessID, RendererProcess>;
  /**
   * A map of all compositor workers (which we show in the UI as Rasterizers)
   * by the process ID.
   */
  compositorTileWorkers: Map<Types.TraceEvents.ProcessID, Types.TraceEvents.ThreadID[]>;
  entryToNode: Map<Types.TraceEvents.RendererEntry, RendererEntryNode>;
  /**
   * All trace events and synthetic profile calls made from
   * samples.
   */
  allRendererEvents: Types.TraceEvents.TraceEventRendererEvent[];
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
  /**
   * Contains trace events and synthetic profile calls made from
   * samples.
   */
  entries: Types.TraceEvents.RendererEntry[];
  tree?: RendererTree;
}

export interface RendererTree {
  nodes: Map<RendererEntryNodeId, RendererEntryNode>;
  roots: Set<RendererEntryNode>;
  maxDepth: number;
}

export interface RendererEntryNode {
  entry: Types.TraceEvents.RendererEntry;
  depth: number;
  id: RendererEntryNodeId;
  parentId?: RendererEntryNodeId|null;
  children: Set<RendererEntryNode>;
}

class RendererEventNodeIdTag {
  /* eslint-disable-next-line no-unused-private-class-members */
  readonly #tag: (symbol|undefined);
}
export type RendererEntryNodeId = number&RendererEventNodeIdTag;
