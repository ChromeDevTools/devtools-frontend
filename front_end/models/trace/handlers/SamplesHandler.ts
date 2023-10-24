// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as CPUProfile from '../../cpu_profile/cpu_profile.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {HandlerState} from './types.js';

const events =
    new Map<Types.TraceEvents.ProcessID, Map<Types.TraceEvents.ThreadID, Types.TraceEvents.TraceEventComplete[]>>();

const profilesInProcess = new Map<Types.TraceEvents.ProcessID, Map<Types.TraceEvents.ThreadID, ProfileData>>();
const entryToNode = new Map<Types.TraceEvents.TraceEntry, Helpers.TreeHelpers.TraceEntryNode>();

// The profile head, containing its metadata like its start
// time, comes in a "Profile" event. The sample data comes in
// "ProfileChunk" events. We match these ProfileChunks with their head
// using process and profile ids. However, in order to integrate sample
// data with trace data, we need the thread id that owns each profile.
// This thread id is extracted from the head event.
// For this reason, we have a preprocessed data structure, where events
// are matched by profile id, which we then finish processing to export
// events matched by thread id.
const preprocessedData = new Map<Types.TraceEvents.ProcessID, Map<Types.TraceEvents.ProfileID, PreprocessedData>>();

let handlerState = HandlerState.UNINITIALIZED;

function buildProfileCalls(): void {
  for (const [processId, profiles] of preprocessedData) {
    for (const [profileId, preProcessedData] of profiles) {
      const threadId = preProcessedData.threadId;
      if (!preProcessedData.rawProfile.nodes.length || threadId === undefined) {
        continue;
      }
      const indexStack: number[] = [];

      const profileModel = new CPUProfile.CPUProfileDataModel.CPUProfileDataModel(preProcessedData.rawProfile);
      const profileTree = Helpers.TreeHelpers.makeEmptyTraceEntryTree();
      profileTree.maxDepth = profileModel.maxDepth;

      const finalizedData: ProfileData =
          {rawProfile: preProcessedData.rawProfile, parsedProfile: profileModel, profileCalls: [], profileTree};

      const dataByThread = Platform.MapUtilities.getWithDefault(profilesInProcess, processId, () => new Map());
      profileModel.forEachFrame(openFrameCallback, closeFrameCallback);
      dataByThread.set(threadId, finalizedData);

      function openFrameCallback(
          depth: number, node: CPUProfile.ProfileTreeModel.ProfileNode, timeStampMs: number): void {
        if (threadId === undefined) {
          return;
        }
        const ts = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(timeStampMs));
        const nodeId = node.id as Helpers.TreeHelpers.TraceEntryNodeId;

        const profileCall = Helpers.Trace.makeProfileCall(node, ts, processId, threadId);
        finalizedData.profileCalls.push(profileCall);
        indexStack.push(finalizedData.profileCalls.length - 1);
        const traceEntryNode = Helpers.TreeHelpers.makeEmptyTraceEntryNode(profileCall, nodeId);
        finalizedData.profileTree?.nodes.set(nodeId, traceEntryNode);
        entryToNode.set(profileCall, traceEntryNode);
        traceEntryNode.depth = depth;
        if (indexStack.length === 1) {
          // First call in the stack is a root call.
          finalizedData.profileTree?.roots.add(traceEntryNode);
        }
      }
      function closeFrameCallback(
          _depth: number, node: CPUProfile.ProfileTreeModel.ProfileNode, _timeStamp: number, durMs: number,
          selfTimeMs: number): void {
        const profileCallIndex = indexStack.pop();
        const profileCall = profileCallIndex !== undefined && finalizedData.profileCalls[profileCallIndex];
        if (!profileCall) {
          return;
        }
        const {callFrame, ts, pid, tid} = profileCall;
        const traceEntryNode = entryToNode.get(profileCall);
        if (callFrame === undefined || ts === undefined || pid === undefined || profileId === undefined ||
            tid === undefined || traceEntryNode === undefined) {
          return;
        }
        const dur = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(durMs));
        const selfTime = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(selfTimeMs));
        profileCall.dur = dur;
        profileCall.selfTime = selfTime;

        const parentIndex = indexStack.at(-1);
        const parent = parentIndex !== undefined && finalizedData.profileCalls.at(parentIndex);
        const parentNode = parent && entryToNode.get(parent);
        if (!parentNode) {
          return;
        }
        traceEntryNode.parentId = parentNode.id;
        parentNode.children.add(traceEntryNode);
      }
    }
  }
}

export function reset(): void {
  events.clear();
  preprocessedData.clear();
  profilesInProcess.clear();
  entryToNode.clear();
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

  /**
   * A fake trace event created to support CDP.Profiler.Profiles in the
   * trace engine.
   */
  if (Types.TraceEvents.isSyntheticTraceEventCpuProfile(event)) {
    // At the moment we are attaching to a single node target so we
    // should only get a single CPU profile. The values of the process
    // id and thread id are not really important, so we use the data
    // in the fake event. Should multi-thread CPU profiling be supported
    // we could use these fields in the event to pass thread info.
    const pid = event.pid;
    const tid = event.tid;
    // Create an arbitrary profile id.
    const profileId = '0x1' as Types.TraceEvents.ProfileID;
    const profileData = getOrCreatePreProcessedData(pid, profileId);
    profileData.rawProfile = event.args.data.cpuProfile;
    profileData.threadId = tid;
    return;
  }

  if (Types.TraceEvents.isTraceEventProfile(event)) {
    // Do not use event.args.data.startTime as it is in CLOCK_MONOTONIC domain,
    // but use profileEvent.ts which has been translated to Perfetto's clock
    // domain. Also convert from ms to us.
    // Note: events are collected on a different thread than what's sampled.
    // The correct process and thread ids are specified by the profile.
    const profileData = getOrCreatePreProcessedData(event.pid, event.id);
    profileData.rawProfile.startTime = event.ts;
    profileData.threadId = event.tid;
    return;
  }
  if (Types.TraceEvents.isTraceEventProfileChunk(event)) {
    const profileData = getOrCreatePreProcessedData(event.pid, event.id);
    const cdpProfile = profileData.rawProfile;
    const nodesAndSamples: Types.TraceEvents.TraceEventPartialProfile|undefined =
        event.args?.data?.cpuProfile || {samples: []};
    const samples = nodesAndSamples?.samples || [];
    const nodes: CPUProfile.CPUProfileDataModel.ExtendedProfileNode[] = [];
    for (const n of nodesAndSamples?.nodes || []) {
      const lineNumber = typeof n.callFrame.lineNumber === 'undefined' ? -1 : n.callFrame.lineNumber;
      const columnNumber = typeof n.callFrame.columnNumber === 'undefined' ? -1 : n.callFrame.columnNumber;

      const scriptId = String(n.callFrame.scriptId) as Protocol.Runtime.ScriptId;
      const url = n.callFrame.url || '';
      const node = {
        ...n,
        callFrame: {
          ...n.callFrame,
          url,
          lineNumber,
          columnNumber,
          scriptId,
        },
      };
      nodes.push(node);
    }

    const timeDeltas = event.args.data?.timeDeltas || [];
    const lines = event.args.data?.lines || Array(samples.length).fill(0);
    cdpProfile.nodes.push(...nodes);
    cdpProfile.samples?.push(...samples);
    cdpProfile.timeDeltas?.push(...timeDeltas);
    cdpProfile.lines?.push(...lines);
    if (cdpProfile.samples && cdpProfile.timeDeltas && cdpProfile.samples.length !== cdpProfile.timeDeltas.length) {
      console.error('Failed to parse CPU profile.');
      return;
    }
    if (!cdpProfile.endTime && cdpProfile.timeDeltas) {
      const timeDeltas: number[] = cdpProfile.timeDeltas;
      cdpProfile.endTime = timeDeltas.reduce((x, y) => x + y, cdpProfile.startTime);
    }
    return;
  }
}

export async function finalize(): Promise<void> {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Samples Handler is not initialized');
  }
  buildProfileCalls();

  handlerState = HandlerState.FINALIZED;
}

export function data(): SamplesHandlerData {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('Samples Handler is not finalized');
  }

  return {
    profilesInProcess: new Map(profilesInProcess),
    entryToNode: new Map(entryToNode),
  };
}

function getOrCreatePreProcessedData(
    processId: Types.TraceEvents.ProcessID, profileId: Types.TraceEvents.ProfileID): PreprocessedData {
  const profileById = Platform.MapUtilities.getWithDefault(preprocessedData, processId, () => new Map());
  return Platform.MapUtilities.getWithDefault<Types.TraceEvents.ProfileID, PreprocessedData>(
      profileById, profileId, () => ({
                                rawProfile: {
                                  startTime: 0,
                                  endTime: 0,
                                  nodes: [],
                                  samples: [],
                                  timeDeltas: [],
                                  lines: [],
                                },
                                profileId,
                              }));
}

export interface SamplesHandlerData {
  profilesInProcess: typeof profilesInProcess;
  entryToNode: typeof entryToNode;
}

export type ProfileData = {
  rawProfile: CPUProfile.CPUProfileDataModel.ExtendedProfile,
  parsedProfile: CPUProfile.CPUProfileDataModel.CPUProfileDataModel,
  /**
   * Contains the calls built from the CPU profile samples.
   * Note: This doesn't contain real trace events coming from the
   * browser, only calls synthetically typed as trace events for
   * compatibility, as such it only makes sense to use them in pure CPU
   * profiles.
   *
   * If you need the profile calls from a CPU profile obtained from a
   * web trace, use the data exported by the RendererHandler instead.
   */
  profileCalls: Types.TraceEvents.TraceEventSyntheticProfileCall[],
  /**
   * Contains the call tree built from the CPU profile samples.
   * Similar to the profileCalls field, this tree does not contain nor
   * take into account trace events, as such it only makes sense to use
   * them in pure CPU profiles.
   */
  profileTree?: Helpers.TreeHelpers.TraceEntryTree,
};

type PreprocessedData = {
  rawProfile: CPUProfile.CPUProfileDataModel.ExtendedProfile,
  threadId?: Types.TraceEvents.ThreadID, profileId: Types.TraceEvents.ProfileID,
};

/**
 * Returns the name of a function for a given synthetic profile call.
 * We first look to find the ProfileNode representing this call, and use its
 * function name. This is preferred (and should always exist) because if we
 * resolve sourcemaps, we will update this name. If that name is not present,
 * we fall back to the function name that was in the callframe that we got
 * when parsing the profile's trace data.
 */
export function getProfileCallFunctionName(
    data: SamplesHandlerData, entry: Types.TraceEvents.TraceEventSyntheticProfileCall): string {
  const profile = data.profilesInProcess.get(entry.pid)?.get(entry.tid);
  const node = profile?.parsedProfile.nodeById(entry.nodeId);
  if (node?.functionName) {
    return node.functionName;
  }
  return entry.callFrame.functionName;
}
