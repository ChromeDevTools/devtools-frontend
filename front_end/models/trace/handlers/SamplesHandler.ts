// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {HandlerState, EventCategory, KNOWN_EVENTS, type KnownEventName} from './types.js';

/**
 * Sorts samples in place, in order, by their start time.
 */
export function sortProfileSamples(samples: ProfileSample[]): void {
  samples.sort((a, b) => {
    const aBeginTime = a.ts;
    const bBeginTime = b.ts;
    if (aBeginTime < bBeginTime) {
      return -1;
    }
    if (aBeginTime > bBeginTime) {
      return 1;
    }
    return 0;
  });
}

const KNOWN_BOUNDARIES = new Set([
  EventCategory.Other,
  EventCategory.V8,
  EventCategory.Js,
  EventCategory.Gc,
]);

const ALLOWED_CALL_FRAME_CODE_TYPES = new Set([undefined, 'JS']);
const BANNED_CALL_FRAME_URL_REGS = [/^chrome-extension:\/\//, /^extensions::/];

const SAMPLING_INTERVAL = Types.Timing.MicroSeconds(200);

const events =
    new Map<Types.TraceEvents.ProcessID, Map<Types.TraceEvents.ThreadID, Types.TraceEvents.TraceEventComplete[]>>();
const profiles = new Map<Types.TraceEvents.ProfileID, Partial<SamplesProfile>>();
const processes = new Map<Types.TraceEvents.ProcessID, SamplesProcess>();

let handlerState = HandlerState.UNINITIALIZED;

const makeSamplesProcess = (): SamplesProcess => ({
  threads: new Map(),
});

const makeSamplesThread = (profile: SamplesProfile): SamplesThread => ({
  profile,
});

const makeEmptyProfileTree = (): ProfileTree => ({
  nodes: new Map(),
});

const makeEmptyProfileNode = (callFrame: Types.TraceEvents.TraceEventCallFrame): ProfileNode => ({
  callFrame,
  parentId: null,
  childrenIds: new Set(),
});

const makeProfileSample =
    (nodeId: Types.TraceEvents.CallFrameID, pid: Types.TraceEvents.ProcessID, tid: Types.TraceEvents.ThreadID,
     ts: Types.Timing.MicroSeconds): ProfileSample => ({
      topmostStackFrame: {nodeId},
      tid,
      pid,
      ts,
    });

const makeProfileCall = (nodeId: Types.TraceEvents.CallFrameID, sample: ProfileSample): ProfileCall => ({
  stackFrame: {nodeId},
  tid: sample.tid,
  pid: sample.pid,
  ts: sample.ts,
  dur: Types.Timing.MicroSeconds(0),
  selfDur: Types.Timing.MicroSeconds(0),
  children: [],
});

const makeEmptyProfileFunction = (nodeId: Types.TraceEvents.CallFrameID): ProfileFunction => ({
  stackFrame: {nodeId},
  calls: [],
  durPercent: 0,
  selfDurPercent: 0,
});

const getOrCreateSamplesProcess =
    (processes: Map<Types.TraceEvents.ProcessID, SamplesProcess>, pid: Types.TraceEvents.ProcessID): SamplesProcess => {
      return Platform.MapUtilities.getWithDefault(processes, pid, makeSamplesProcess);
    };

const getOrCreateSamplesThread =
    (process: SamplesProcess, tid: Types.TraceEvents.ThreadID, profile: SamplesProfile): SamplesThread => {
      return Platform.MapUtilities.getWithDefault(process.threads, tid, () => makeSamplesThread(profile));
    };

export function reset(): void {
  events.clear();
  profiles.clear();
  processes.clear();

  handlerState = HandlerState.UNINITIALIZED;
}

export function initialize(): void {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error('Samples Handler was not reset');
  }

  handlerState = HandlerState.INITIALIZED;
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Samples Handler is not initialized');
  }

  if (Types.TraceEvents.isTraceEventProfile(event)) {
    const profile = Platform.MapUtilities.getWithDefault(profiles, event.id, (): Partial<SamplesProfile> => ({}));
    profile.head = event;
    return;
  }
  if (Types.TraceEvents.isTraceEventProfileChunk(event)) {
    const profile = Platform.MapUtilities.getWithDefault(profiles, event.id, (): Partial<SamplesProfile> => ({}));
    profile.chunks = profile.chunks ?? [];
    profile.chunks.push(event);
    return;
  }
  if (Types.TraceEvents.isTraceEventComplete(event)) {
    const process = Platform.MapUtilities.getWithDefault(events, event.pid, () => new Map());
    const thread = Platform.MapUtilities.getWithDefault(process, event.tid, () => []);
    thread.push(event);
    return;
  }
}

export async function finalize(): Promise<void> {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Samples Handler is not initialized');
  }
  buildProcessesAndThreads(profiles, processes);
  buildHierarchy(processes, events);

  handlerState = HandlerState.FINALIZED;
}

export function data(): SamplesHandlerData {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('Samples Handler is not finalized');
  }

  return {
    profiles: new Map(profiles),
    processes: new Map(processes),
  };
}

/**
 * Builds processes and threads from the accumulated profile chunks. This is
 * done during finalize instead of during event handling because profile heads
 * and chunks are sometimes retrieved out of order, or are incomplete.
 */
export function buildProcessesAndThreads(
    profiles: Map<Types.TraceEvents.ProfileID, Partial<SamplesProfile>>,
    processes: Map<Types.TraceEvents.ProcessID, SamplesProcess>): void {
  for (const [, profile] of profiles) {
    // Sometimes the trace includes empty profiles, or orphaned chunks, even
    // after going through all the trace events. Ignore.
    const {head, chunks} = profile;
    if (!head || !chunks?.length) {
      continue;
    }

    // Note: events are collected on a different thread than what's sampled.
    // The correct process and thread ids are specified by the profile.
    const pid = head.pid;
    const tid = head.tid;
    getOrCreateSamplesThread(getOrCreateSamplesProcess(processes, pid), tid, profile as SamplesProfile);
  }
}

/**
 * Converts the raw profile data into hierarchical and ordered structures from
 * the stack traces that were sampled during a recording. Each thread in each
 * process will contribute to their own individual profile.
 *
 * Our V8 profiler is a sampling profiler. This means that it probes the
 * program's call stack at regular intervals defined by the sampling frequency.
 * The raw profile data comes in as multiple events, from which a profile is
 * built.
 *
 * The generated data will be comprised of several parts:
 * 1. "tree": All the complete stack traces, represented by a tree whose roots
 *    are the bottomest stack frames of all stack traces.
 * 2. "samples": All the individual samples, as an ordered list where each item
 *    points to the topmost stack frame at a particular point in time.
 * 3. "calls": A list of profile calls, where each item represents multiple
 *    samples coalesced into a contiguous event. Each item will have a
 *    timestamp, duration, and refer to a stack frame and its child frames
 *    (all together forming multiple stack traces).
 */
export function buildHierarchy(
    processes: Map<Types.TraceEvents.ProcessID, SamplesProcess>,
    events: Map<Types.TraceEvents.ProcessID, Map<Types.TraceEvents.ThreadID, Types.TraceEvents.TraceEventComplete[]>>):
    void {
  for (const [pid, process] of processes) {
    for (const [tid, thread] of process.threads) {
      // Step 1. Massage the data.
      Helpers.Trace.sortTraceEventsInPlace(thread.profile.chunks);
      // ...and collect boundaries.
      const boundariesOptions = {filter: KNOWN_BOUNDARIES};
      const boundaries = thread.boundaries = collectBoundaries(events, pid, tid, boundariesOptions);

      // Step 2. Collect all the complete stack traces into a tree.
      const tree = thread.tree = collectStackTraces(thread.profile.chunks);

      // Step 3. Collect all the individual samples into a list.
      const {startTime} = thread.profile.head.args.data;
      const samplesOptions = {filterCodeTypes: true, filterUrls: true};
      const samples = thread.samples = collectSamples(pid, tid, startTime, tree, thread.profile.chunks, samplesOptions);

      // Step 4. Coalesce samples.
      const merge = mergeCalls(samples.map(sample => buildProfileCallFromSample(tree, sample)), boundaries);
      thread.calls = merge.calls;
      thread.dur = merge.dur;
    }
  }
}

/**
 * Builds an array of timestamps corresponding to the begin and end boundaries
 * of the events on the specified process and thread.
 *
 * Therefore we expect to reformulate a set of events which can be represented
 * hierarchically like:
 *
 * |=========== Task A ===============|== Task E ==|
 *   |=== Task B ===|== Task D ==|
 *     |= Task C =|
 *
 * ...into something ordered like below:
 *
 * | | |          | |                 |            |
 * |=========== Task A ===============|== Task E ==|
 * | |=== Task B ===|== Task D ==|    |            |
 * | | |= Task C =| |            |    |            |
 * | | |          | |            |    |            |
 * X X X          X X            X    X            X (boundaries)
 */
export function collectBoundaries(
    events: Map<Types.TraceEvents.ProcessID, Map<Types.TraceEvents.ThreadID, Types.TraceEvents.TraceEventComplete[]>>,
    pid: Types.TraceEvents.ProcessID, tid: Types.TraceEvents.ThreadID,
    options: {filter: {has: (category: EventCategory) => boolean}}): Types.Timing.MicroSeconds[] {
  const process = events.get(pid);
  if (!process) {
    return [];
  }

  const thread = process.get(tid);
  if (!thread) {
    return [];
  }

  const boundaries = new Set<Types.Timing.MicroSeconds>();

  for (const event of thread) {
    const category = KNOWN_EVENTS.get(event.name as KnownEventName)?.category ?? EventCategory.Other;
    if (!options.filter.has(category)) {
      continue;
    }
    boundaries.add(event.ts);
    boundaries.add(Types.Timing.MicroSeconds(event.ts + event.dur));
  }

  return [...boundaries].sort((a, b) => a < b ? -1 : 1);
}

/**
 * Builds all the complete stack traces that exist in a particular thread of a
 * particular process. They will be stored as a tree. The roots of this tree are
 * the bottomest stack frames of all individual stack traces.
 *
 * The stack traces are retrieved in partial chains, each chain as part of a
 * trace event. This method collects the data into a single tree.
 *
 * Therefore we expect to reformulate something like:
 *
 * Chain 1: [A, B <- A, C <- B]
 * Chain 2: [D <- A, E <- D]
 * Chain 3: [G]
 * Chain 4: [F <- B]
 * Chain 5: [H <- G, I <- H]
 *
 * ...into something hierarchically-arranged like below:
 *
 *     A       G
 *    / \      |
 *   B   D     H
 *  / \   \    |
 * C   F   E   I
 */
export function collectStackTraces(
    chunks: Types.TraceEvents.TraceEventProfileChunk[],
    options?: {filterCodeTypes: boolean, filterUrls: boolean}): ProfileTree {
  const tree = makeEmptyProfileTree();

  for (const chunk of chunks) {
    const cpuProfile = chunk.args.data.cpuProfile;
    if (!cpuProfile) {
      continue;
    }
    const chain = cpuProfile.nodes;
    if (!chain) {
      continue;
    }

    for (const link of chain) {
      const nodeId = link.id;
      const parentNodeId = link.parent;
      const callFrame = link.callFrame;

      // If the current call frame should not be part of the tree, then simply proceed
      // with the next call frame.
      if (!isAllowedCallFrame(callFrame, options)) {
        continue;
      }

      const node = Platform.MapUtilities.getWithDefault(tree.nodes, nodeId, () => makeEmptyProfileNode(callFrame));

      // If the call frame has no parent, then it's the bottomest stack frame of
      // a stack trace (aka a root).
      if (parentNodeId === undefined) {
        continue;
      }

      // Otherwise, this call frame has a parent and threfore it's a stack frame
      // part of a larger stack trace. Each stack frame can only have a single
      // parent (called into by another unique stack frame), with multiple
      // children (calling into multiple unique stack frames). If a codepoint is
      // reached in multiple ways, multiple stack traces are created by V8.
      node.parentId = parentNodeId;
      tree.nodes.get(parentNodeId)?.childrenIds.add(nodeId);
    }
  }

  return tree;
}

/**
 * Collects all the individual samples that exist in a particular thread of a
 * particular process. They will be stored as an ordered list. Each entry
 * represents a sampled stack trace by pointing to the topmost stack frame at
 * that particular time.
 *
 * The samples are retrieved in buckets, each bucket as part of a trace event,
 * and each sample at a positive or negative delta cumulatively relative to the
 * profile's start time. This method collects the data into a single list.
 *
 * Therefore we expect to reformulate something like:
 *
 * Event 1 at 0µs: [A at Δ+1µs, A at Δ+2µs, B at Δ-1µs, C at Δ+2µs]
 * Event 2 at 9µs: [A at Δ+1µs, D at Δ+9µs, E at Δ-1µs]
 *
 * ...where each sample in each event points to the tompost stack frame at that
 * particular point in time (e.g. the first sample's tompost stack frame is A),
 * into something ordered like below:
 *
 * [A at 1µs, B at 2µs, A at 3µs, C at 4µs, A at 10µs, E at 18µs, D at 19µs]
 *
 * ...where each sample has an absolute timestamp, and the list is ordered.
 */
export function collectSamples(
    pid: Types.TraceEvents.ProcessID, tid: Types.TraceEvents.ThreadID, ts: Types.Timing.MicroSeconds, tree: ProfileTree,
    chunks: Types.TraceEvents.TraceEventProfileChunk[],
    options?: {filterCodeTypes: boolean, filterUrls: boolean}): ProfileSample[] {
  const samples: ProfileSample[] = [];

  for (const chunk of chunks) {
    const {timeDeltas, cpuProfile} = chunk.args.data;
    if (!timeDeltas || !cpuProfile) {
      continue;
    }

    for (let i = 0; i < timeDeltas.length; i++) {
      const timeDelta = timeDeltas[i];
      const nodeId = cpuProfile.samples[i];
      // The timestamp of each sample is at a positive or negative delta,
      // cumulatively relative to the profile's start time.
      ts = Types.Timing.MicroSeconds(ts + timeDelta);

      // The call frame may not have been added to the stack traces tree (e.g.
      // if its code type or url was banned). If there is no allowed stack frame
      // as part of a stack trace, then this sample is dropped.
      const topmostAllowedNodeId = findTopmostAllowedCallFrame(nodeId, tree, options);
      if (topmostAllowedNodeId === null) {
        continue;
      }

      // Otherwise, push the topmost allowed stack frame.
      samples.push(makeProfileSample(topmostAllowedNodeId, pid, tid, ts));
    }
  }

  sortProfileSamples(samples);
  return samples;
}

/**
 * For a list of samples in a thread in a process, merges together stack frames
 * which have been sampled consecutively and which do not cross boundaries. The
 * samples and boundaries arrays are assumed to be sorted.
 *
 * Therefore, if the previously collected stack traces tree looks like this:
 *
 *   A   E
 *  / \
 * B   D
 * |
 * C
 *
 * ...we expect to reformulate something like:
 *
 * [A, B, C, C .. C, B, A, A .. A, D, D .. D, A, A .. A, E, E .. E]
 *
 * ...where each sample points to the tompost stack frame at that particular
 * point in time (e.g. the first sample's tompost stack frame is A, the last
 * sample's topmost stack frame is E, etc.), and thus the expanded samples array
 * can be represented as:
 *
 * +------------> (sample at time)
 * |
 * |A|A|A|A|A|A|A|A|A|A|A|A|A|A|A|A|A| |E|E|E|E|E|E|
 * | |B|B|B|B|B|B| |D|D|D|D|D|D| | | | | | | | | | |
 * | | |C|C|C|C| | | | | | | | | | | | | | | | | | |
 * |
 * V (stack trace depth)
 *
 * ...into something ordered like below:
 *
 * [ Call A ][ Call E ]
 *
 * ...where the hierarchy of these calls can be represented as:
 *
 * [-------- Call A --------][ Call E ]
 *  [- Call B -][- Call D -]
 *   [ Call C ]
 *
 * ...and where each call has an absolute timestamp and a duration.
 *
 * Considerations:
 *
 * 1. Consecutive stack frames which cross boundaries may not be coalesced.
 * "Boundaries" are an array of timestamps corresponding to the begin and end
 * of certain events (such as "RunTask").
 *
 * For example, we expect to reformulate something like:
 *
 *   (boundary)                                    (boundary)
 *       |                                             |
 * |A|A|A|A|A|A|A|A|A|A|A|A|A|A|A|A|A| |E|E|E|E|E|E|   |
 *       |                                             |
 *
 * ...into something ordered like below:
 *
 * [ Call A ][ Call A ][ Call E ]
 *
 * ... where the first Call A is before the first boundary, second Call A is
 * after the first boundary, and Call E is inbetween boundaries.
 *
 * 2. Consecutive stack frames which are part of different branches (a.k.a part
 * of a different stack trace) must not be coalesced, even if at the same depth.
 *
 * For example, with something like:
 *
 * +------------> (sample at time)
 * |
 * | ... |X|X|X|Z|Z|Z| ...
 * |         |Y|Y|
 * |
 * V (stack trace depth)
 *
 * ...or:
 *
 * +------------> (sample at time)
 * |
 * | ... |X|X|X|Z|X|X|X| ...
 * |         |Y| |Y|
 * |
 * V (stack trace depth)
 *
 * ...the Y stack frames must not be merged even if they have been sampled
 * close together, and even if they do not cross any boundaries (e.g. are part
 * of the same `RunTask`). This is because they are either:
 * - part of separate stack traces (and therefore would have different IDs), or
 * - separated by a different parent frame.
 */
export function mergeCalls(calls: ProfileCall[], boundaries: Types.Timing.MicroSeconds[]): {
  calls: ProfileCall[],
  dur: Types.Timing.MicroSeconds,
} {
  const out = {calls: new Array<ProfileCall>(), dur: Types.Timing.MicroSeconds(0)};
  let boundary = 0;

  for (const call of calls) {
    // When the call crosses a boundary defined by any of the relevant trace
    // events (e.g. `RunTask`), even if the stack frame would be the same, start
    // a new merge with the current call as head, and find the next boundary.
    const isAcrossBoundary = call.ts >= boundary;
    if (isAcrossBoundary) {
      const index = Platform.ArrayUtilities.nearestIndexFromBeginning(boundaries, ts => ts > call.ts) ?? Infinity;
      boundary = boundaries[index];
      out.calls.push(call);
      continue;
    }

    // Otherwise, start a new merge if the call is a different stack frame, or
    // it was sampled too far into the future from the previous call.
    const previous = out.calls[out.calls.length - 1];
    const isSameStackFrame = call.stackFrame.nodeId === previous.stackFrame.nodeId;
    const isSampledConsecutively = call.ts - (previous.ts + previous.dur) < SAMPLING_INTERVAL;
    if (!isSameStackFrame || !isSampledConsecutively) {
      out.calls.push(call);
      continue;
    }

    previous.dur = Types.Timing.MicroSeconds(call.ts - previous.ts);
    previous.children.push(...call.children);
  }

  for (const call of out.calls) {
    const merge = mergeCalls(call.children, boundaries);
    call.children = merge.calls;
    call.selfDur = Types.Timing.MicroSeconds(call.dur - merge.dur);
    out.dur = Types.Timing.MicroSeconds(out.dur + call.dur);
  }

  return out;
}

/**
 * Checks if the call frame is allowed (i.e. it may not be part of the collected
 * stack traces tree).
 */
export function isAllowedCallFrame(
    callFrame: Types.TraceEvents.TraceEventCallFrame,
    options?: {filterCodeTypes: boolean, filterUrls: boolean}): boolean {
  if (options?.filterCodeTypes && !ALLOWED_CALL_FRAME_CODE_TYPES.has(callFrame.codeType)) {
    return false;
  }
  if (options?.filterUrls && BANNED_CALL_FRAME_URL_REGS.some(re => callFrame.url?.match(re))) {
    return false;
  }
  return true;
}

/**
 * Walks the stack traces tree until it finds a call frame that is allowed.
 */
export function findTopmostAllowedCallFrame(
    nodeId: Types.TraceEvents.CallFrameID|null, tree: ProfileTree,
    options?: {filterCodeTypes: boolean, filterUrls: boolean}): Types.TraceEvents.CallFrameID|null {
  if (nodeId === null) {
    return null;
  }
  const node = tree.nodes.get(nodeId);
  const callFrame = node?.callFrame;
  if (!node || !callFrame) {
    return null;
  }
  if (!isAllowedCallFrame(callFrame, options)) {
    return findTopmostAllowedCallFrame(node.parentId, tree, options);
  }
  return nodeId;
}

/**
 * Gets the stack trace associated with a sample. The topmost stack frame will
 * be the last entry of array. Aka the root stack frame will be the first.
 *
 * All the complete stack traces are stored as part of a profile tree. All the
 * samples point to the topmost stack frame. This method walks up the tree to
 * compose a stack trace.
 */
export function buildStackTraceAsCallFrameIdsFromId(
    tree: ProfileTree, nodeId: Types.TraceEvents.CallFrameID): Types.TraceEvents.CallFrameID[] {
  const out = [];

  let currentNodeId: Types.TraceEvents.CallFrameID|null = nodeId;
  let currentNode;

  while (currentNodeId !== null && (currentNode = tree.nodes.get(currentNodeId))) {
    out.push(currentNodeId);
    currentNodeId = currentNode.parentId;
  }

  return out.reverse();
}

/**
 * Just like `buildStackTrace`, but returns an array of call frames instead of ids.
 */
export function buildStackTraceAsCallFramesFromId(
    tree: ProfileTree, nodeId: Types.TraceEvents.CallFrameID): Types.TraceEvents.TraceEventCallFrame[] {
  const trace = buildStackTraceAsCallFrameIdsFromId(tree, nodeId);
  return trace.map(nodeId => {
    const callFrame = tree.nodes.get(nodeId)?.callFrame;
    if (!callFrame) {
      throw new Error();
    }
    return callFrame;
  });
}

/**
 * Just like `buildStackTrace`, but returns a `ProfileCall` instead of an array.
 */
export function buildProfileCallFromSample(tree: ProfileTree, sample: ProfileSample): ProfileCall {
  const trace = buildStackTraceAsCallFrameIdsFromId(tree, sample.topmostStackFrame.nodeId);
  const calls = trace.map(nodeId => makeProfileCall(nodeId, sample));

  for (let i = 1; i < calls.length; i++) {
    const parent = calls[i - 1];
    const current = calls[i];
    parent.children.push(current);
  }

  return calls[0];
}

/**
 * Gets all functions that have been called between the given timestamps, each
 * with additional information:
 * - the call frame id, which points to a node containing the function name etc.
 * - all individual calls for that function
 * - percentage of time taken, relative to the given timestamps
 * - percentage of self time taken relative to the given timestamps
 */
export function getAllFunctionsBetweenTimestamps(
    calls: ProfileCall[], begin: Types.Timing.MicroSeconds, end: Types.Timing.MicroSeconds,
    out: Map<Types.TraceEvents.CallFrameID, ProfileFunction> = new Map()): IterableIterator<ProfileFunction> {
  for (const call of calls) {
    if (call.ts < begin || call.ts + call.dur > end) {
      continue;
    }
    const func = Platform.MapUtilities.getWithDefault(
        out, call.stackFrame.nodeId, () => makeEmptyProfileFunction(call.stackFrame.nodeId));
    func.calls.push(call);
    func.durPercent += (call.dur / (end - begin)) * 100;
    func.selfDurPercent += (call.selfDur / (end - begin)) * 100;
    getAllFunctionsBetweenTimestamps(call.children, begin, end, out);
  }

  return out.values();
}

/**
 * Gets all the hot functions between timestamps, each with information about
 * the relevant call frame, time, self time, and percentages.
 *
 * The hot functions are sorted by self time.
 */
export function getAllHotFunctionsBetweenTimestamps(
    calls: ProfileCall[], begin: Types.Timing.MicroSeconds, end: Types.Timing.MicroSeconds,
    minSelfPercent: number): ProfileFunction[] {
  const functions = getAllFunctionsBetweenTimestamps(calls, begin, end);
  const hot = [...functions].filter(info => info.selfDurPercent >= minSelfPercent);
  return hot.sort((a, b) => a.selfDurPercent > b.selfDurPercent ? -1 : 1);
}

export interface SamplesHandlerData {
  profiles: Map<Types.TraceEvents.ProfileID, Partial<SamplesProfile>>;
  processes: Map<Types.TraceEvents.ProcessID, SamplesProcess>;
}

export interface SamplesProfile {
  head: Types.TraceEvents.TraceEventProfile;
  chunks: Types.TraceEvents.TraceEventProfileChunk[];
}

export interface SamplesProcess {
  threads: Map<Types.TraceEvents.ThreadID, SamplesThread>;
}

export interface SamplesThread {
  profile: SamplesProfile;
  boundaries?: Types.Timing.MicroSeconds[];
  tree?: ProfileTree;
  samples?: ProfileSample[];
  calls?: ProfileCall[];
  dur?: Types.Timing.MicroSeconds;
}

export interface ProfileTree {
  nodes: Map<Types.TraceEvents.CallFrameID, ProfileNode>;
}

export interface ProfileNode {
  callFrame: Types.TraceEvents.TraceEventCallFrame;
  parentId: Types.TraceEvents.CallFrameID|null;
  childrenIds: Set<Types.TraceEvents.CallFrameID>;
}

export interface ProfileSample {
  topmostStackFrame: {
    nodeId: Types.TraceEvents.CallFrameID,
  };
  pid: Types.TraceEvents.ProcessID;
  tid: Types.TraceEvents.ThreadID;
  ts: Types.Timing.MicroSeconds;
}

export interface ProfileCall {
  stackFrame: {
    nodeId: Types.TraceEvents.CallFrameID,
  };
  pid: Types.TraceEvents.ProcessID;
  tid: Types.TraceEvents.ThreadID;
  ts: Types.Timing.MicroSeconds;
  dur: Types.Timing.MicroSeconds;      // "time"
  selfDur: Types.Timing.MicroSeconds;  // "self time"
  children: ProfileCall[];
}

export interface ProfileFunction {
  stackFrame: {
    nodeId: Types.TraceEvents.CallFrameID,
  };
  calls: ProfileCall[];
  durPercent: number;      // 0 - 100
  selfDurPercent: number;  // 0 - 100
}
