// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Types from '../types/types.js';
import type * as Protocol from '../../../generated/protocol.js';
import {HandlerState} from './types.js';
import * as CPUProfile from '../../cpu_profile/cpu_profile.js';
import * as Helpers from '../helpers/helpers.js';

const events =
    new Map<Types.TraceEvents.ProcessID, Map<Types.TraceEvents.ThreadID, Types.TraceEvents.TraceEventComplete[]>>();

const profilesInProcess = new Map<Types.TraceEvents.ProcessID, Map<Types.TraceEvents.ThreadID, ProfileData>>();

// The profile head, containing the event's metadata like its start
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

export function buildProfileCalls(): void {
  for (const [processId, profiles] of preprocessedData) {
    for (const [profileId, preProcessedData] of profiles) {
      const threadId = preProcessedData.threadId;
      if (!preProcessedData.rawProfile.nodes.length || !threadId) {
        continue;
      }
      const trackingStack: Partial<Types.TraceEvents.TraceEventSyntheticProfileCall>[] = [];

      const profileModel = new CPUProfile.CPUProfileDataModel.CPUProfileDataModel(preProcessedData.rawProfile);

      const finalizedData:
          ProfileData = {rawProfile: preProcessedData.rawProfile, parsedProfile: profileModel, profileCalls: []};

      profileModel.forEachFrame(openFrameCallback, closeFrameCallback);
      Helpers.Trace.sortTraceEventsInPlace(finalizedData.profileCalls);
      const dataByThread = Platform.MapUtilities.getWithDefault(profilesInProcess, processId, () => new Map());
      dataByThread.set(threadId, finalizedData);

      function openFrameCallback(
          _depth: number, node: CPUProfile.ProfileTreeModel.ProfileNode, timeStampMs: number): void {
        const ts = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(timeStampMs));
        trackingStack.push({callFrame: node.callFrame, ts, pid: processId, children: [], tid: threadId});
      }
      function closeFrameCallback(
          depth: number, node: CPUProfile.ProfileTreeModel.ProfileNode, _timeStamp: number, durMs: number,
          selfTimeMs: number): void {
        const partialProfileCall = trackingStack.pop();
        if (!partialProfileCall) {
          return;
        }
        const {callFrame, ts, pid, children, tid} = partialProfileCall;
        if (callFrame === undefined || ts === undefined || pid === undefined || profileId === undefined ||
            children === undefined || tid === undefined) {
          return;
        }
        const dur = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(durMs));
        const selfTime = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(selfTimeMs));
        const completeProfileCall: Types.TraceEvents.TraceEventSyntheticProfileCall = {
          callFrame,
          ts,
          pid,
          dur,
          selfTime,
          children,
          ph: Types.TraceEvents.Phase.COMPLETE,
          cat: '',
          name: 'ProfileCall',
          tid,
          nodeId: node.id,
        };
        const parent = trackingStack.at(-1);
        const calls = finalizedData.profileCalls;
        calls.push(completeProfileCall);
        if (!parent) {
          return;
        }
        parent.children = parent.children || [];
        parent.children.push(completeProfileCall);
        if (parent.selfTime) {
          parent.selfTime = Types.Timing.MicroSeconds(parent.selfTime - dur);
        }
      }
    }
  }
}

export function reset(): void {
  events.clear();
  preprocessedData.clear();
  profilesInProcess.clear();
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
      const lineNumber = n.callFrame.lineNumber || -1;
      const columnNumber = n.callFrame.columnNumber || -1;
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
}

export type ProfileData = {
  rawProfile: CPUProfile.CPUProfileDataModel.ExtendedProfile,
  parsedProfile: CPUProfile.CPUProfileDataModel.CPUProfileDataModel,
  profileCalls: Types.TraceEvents.TraceEventSyntheticProfileCall[],
};

type PreprocessedData = {
  rawProfile: CPUProfile.CPUProfileDataModel.ExtendedProfile,
  threadId?: Types.TraceEvents.ThreadID, profileId: Types.TraceEvents.ProfileID,
};
