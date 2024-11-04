// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {data as auctionWorkletsData} from './AuctionWorkletsHandler.js';
import {data as metaHandlerData, type FrameProcessData} from './MetaHandler.js';
import {data as samplesHandlerData} from './SamplesHandler.js';
import type {HandlerName} from './types.js';

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

const processes = new Map<Types.Events.ProcessID, RendererProcess>();

// We track the compositor tile worker thread name events so that at the end we
// can return these keyed by the process ID. These are used in the frontend to
// show the user the rasterization thread(s) on the main frame as tracks.
const compositorTileWorkers = Array<{
  pid: Types.Events.ProcessID,
  tid: Types.Events.ThreadID,
}>();
const entryToNode: Map<Types.Events.Event, Helpers.TreeHelpers.TraceEntryNode> = new Map();
let allTraceEntries: Types.Events.Event[] = [];

const completeEventStack: (Types.Events.SyntheticComplete)[] = [];

let config: Types.Configuration.Configuration = Types.Configuration.defaults();

const makeRendererProcess = (): RendererProcess => ({
  url: null,
  isOnMainFrame: false,
  threads: new Map(),
});

const makeRendererThread = (): RendererThread => ({
  name: null,
  entries: [],
  profileCalls: [],
});

const getOrCreateRendererProcess =
    (processes: Map<Types.Events.ProcessID, RendererProcess>, pid: Types.Events.ProcessID): RendererProcess => {
      return Platform.MapUtilities.getWithDefault(processes, pid, makeRendererProcess);
    };

const getOrCreateRendererThread = (process: RendererProcess, tid: Types.Events.ThreadID): RendererThread => {
  return Platform.MapUtilities.getWithDefault(process.threads, tid, makeRendererThread);
};

export function handleUserConfig(userConfig: Types.Configuration.Configuration): void {
  config = userConfig;
}

export function reset(): void {
  processes.clear();
  entryToNode.clear();
  allTraceEntries.length = 0;
  completeEventStack.length = 0;
  compositorTileWorkers.length = 0;
}

export function handleEvent(event: Types.Events.Event): void {
  if (Types.Events.isThreadName(event) && event.args.name?.startsWith('CompositorTileWorker')) {
    compositorTileWorkers.push({
      pid: event.pid,
      tid: event.tid,
    });
  }

  if (Types.Events.isBegin(event) || Types.Events.isEnd(event)) {
    const process = getOrCreateRendererProcess(processes, event.pid);
    const thread = getOrCreateRendererThread(process, event.tid);
    const completeEvent = makeCompleteEvent(event);
    if (!completeEvent) {
      return;
    }
    thread.entries.push(completeEvent);
    allTraceEntries.push(completeEvent);
    return;
  }

  if (Types.Events.isInstant(event) || Types.Events.isComplete(event)) {
    const process = getOrCreateRendererProcess(processes, event.pid);
    const thread = getOrCreateRendererThread(process, event.tid);
    thread.entries.push(event);
    allTraceEntries.push(event);
  }
}

export async function finalize(): Promise<void> {
  const {mainFrameId, rendererProcessesByFrame, threadsInProcess} = metaHandlerData();
  assignMeta(processes, mainFrameId, rendererProcessesByFrame, threadsInProcess);
  sanitizeProcesses(processes);
  buildHierarchy(processes);
  sanitizeThreads(processes);
  Helpers.Trace.sortTraceEventsInPlace(allTraceEntries);
}

export function data(): RendererHandlerData {
  return {
    processes: new Map(processes),
    compositorTileWorkers: new Map(gatherCompositorThreads()),
    entryToNode: new Map(entryToNode),
    allTraceEntries: [...allTraceEntries],
  };
}

function gatherCompositorThreads(): Map<Types.Events.ProcessID, Types.Events.ThreadID[]> {
  const threadsByProcess = new Map<Types.Events.ProcessID, Types.Events.ThreadID[]>();
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
    processes: Map<Types.Events.ProcessID, RendererProcess>, mainFrameId: string,
    rendererProcessesByFrame: FrameProcessData,
    threadsInProcess: Map<Types.Events.ProcessID, Map<Types.Events.ThreadID, Types.Events.ThreadName>>): void {
  assignOrigin(processes, rendererProcessesByFrame);
  assignIsMainFrame(processes, mainFrameId, rendererProcessesByFrame);
  assignThreadName(processes, rendererProcessesByFrame, threadsInProcess);
}

/**
 * Assigns origins to all threads in all processes.
 * @see assignMeta
 */
export function assignOrigin(
    processes: Map<Types.Events.ProcessID, RendererProcess>, rendererProcessesByFrame: FrameProcessData): void {
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
    processes: Map<Types.Events.ProcessID, RendererProcess>, mainFrameId: string,
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
    processes: Map<Types.Events.ProcessID, RendererProcess>, rendererProcessesByFrame: FrameProcessData,
    threadsInProcess: Map<Types.Events.ProcessID, Map<Types.Events.ThreadID, Types.Events.ThreadName>>): void {
  for (const [pid, process] of processes) {
    for (const [tid, threadInfo] of threadsInProcess.get(pid) ?? []) {
      const thread = getOrCreateRendererThread(process, tid);
      thread.name = threadInfo?.args.name ?? `${tid}`;
    }
  }
}

/**
 * Removes unneeded trace data opportunistically stored while handling events.
 * This currently does the following:
 *  - Deletes processes with an unkonwn origin.
 */
export function sanitizeProcesses(processes: Map<Types.Events.ProcessID, RendererProcess>): void {
  const auctionWorklets = auctionWorkletsData().worklets;
  const metaData = metaHandlerData();
  if (metaData.traceIsGeneric) {
    return;
  }
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
  }
}

/**
 * Removes unneeded trace data opportunistically stored while handling events.
 * This currently does the following:
 *  - Deletes threads with no roots.
 */
export function sanitizeThreads(processes: Map<Types.Events.ProcessID, RendererProcess>): void {
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
    processes: Map<Types.Events.ProcessID, RendererProcess>,
    options?: {filter: {has: (name: Types.Events.Name) => boolean}}): void {
  const samplesData = samplesHandlerData();
  for (const [pid, process] of processes) {
    for (const [tid, thread] of process.threads) {
      if (!thread.entries.length) {
        thread.tree = Helpers.TreeHelpers.makeEmptyTraceEntryTree();
        continue;
      }
      // Step 1. Massage the data.
      Helpers.Trace.sortTraceEventsInPlace(thread.entries);
      // Step 2. Inject profile calls from samples
      const samplesDataForThread = samplesData.profilesInProcess.get(pid)?.get(tid);
      if (samplesDataForThread) {
        const cpuProfile = samplesDataForThread.parsedProfile;
        const samplesIntegrator = cpuProfile &&
            new Helpers.SamplesIntegrator.SamplesIntegrator(
                cpuProfile, samplesDataForThread.profileId, pid, tid, config);
        const profileCalls = samplesIntegrator?.buildProfileCalls(thread.entries);
        if (samplesIntegrator && profileCalls) {
          allTraceEntries = [...allTraceEntries, ...profileCalls];
          thread.entries = Helpers.Trace.mergeEventsInOrder(thread.entries, profileCalls);
          thread.profileCalls = profileCalls;
          // We'll also inject the instant JSSample events (in debug mode only)
          const jsSamples = samplesIntegrator.jsSampleEvents;
          if (jsSamples) {
            allTraceEntries = [...allTraceEntries, ...jsSamples];
            thread.entries = Helpers.Trace.mergeEventsInOrder(thread.entries, jsSamples);
          }
        }
      }
      // Step 3. Build the tree.
      const treeData = Helpers.TreeHelpers.treify(thread.entries, options);
      thread.tree = treeData.tree;
      // Update the entryToNode map with the entries from this thread
      for (const [entry, node] of treeData.entryToNode) {
        entryToNode.set(entry, node);
      }
    }
  }
}

export function makeCompleteEvent(event: Types.Events.Begin|Types.Events.End): Types.Events.SyntheticComplete|null {
  if (Types.Events.isEnd(event)) {
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
  const syntheticComplete: Types.Events.SyntheticComplete = {
    ...event,
    ph: Types.Events.Phase.COMPLETE,
    dur: Types.Timing.MicroSeconds(0),
  };

  completeEventStack.push(syntheticComplete);
  return syntheticComplete;
}

export function deps(): HandlerName[] {
  return ['Meta', 'Samples', 'AuctionWorklets'];
}

export interface RendererHandlerData {
  processes: Map<Types.Events.ProcessID, RendererProcess>;
  /**
   * A map of all compositor workers (which we show in the UI as Rasterizers)
   * by the process ID.
   */
  compositorTileWorkers: Map<Types.Events.ProcessID, Types.Events.ThreadID[]>;
  entryToNode: Map<Types.Events.Event, Helpers.TreeHelpers.TraceEntryNode>;
  /**
   * All trace events and synthetic profile calls made from
   * samples.
   */
  allTraceEntries: Types.Events.Event[];
}

export interface RendererProcess {
  // In an ideal world this would be modelled as a URL, but URLs cannot be sent
  // between the main thread and workers, so we have to store it as a string.
  url: string|null;
  isOnMainFrame: boolean;
  threads: Map<Types.Events.ThreadID, RendererThread>;
}

export interface RendererThread {
  name: string|null;
  /**
   * Contains trace events and synthetic profile calls made from
   * samples.
   */
  entries: Types.Events.Event[];
  profileCalls: Types.Events.SyntheticProfileCall[];
  tree?: Helpers.TreeHelpers.TraceEntryTree;
}
