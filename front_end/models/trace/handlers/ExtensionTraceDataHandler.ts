// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import type {HandlerName} from './types.js';
import {data as userTimingsData} from './UserTimingsHandler.js';

const extensionFlameChartEntries: Types.Extensions.SyntheticExtensionTrackEntry[] = [];
const extensionTrackData: Types.Extensions.ExtensionTrackData[] = [];
const extensionMarkers: Types.Extensions.SyntheticExtensionMarker[] = [];
const entryToNode: Map<Types.Events.Event, Helpers.TreeHelpers.TraceEntryNode> = new Map();

export interface ExtensionTraceData {
  extensionTrackData: readonly Types.Extensions.ExtensionTrackData[];
  extensionMarkers: readonly Types.Extensions.SyntheticExtensionMarker[];
  entryToNode: Map<Types.Events.Event, Helpers.TreeHelpers.TraceEntryNode>;
}

export function handleEvent(_event: Types.Events.Event): void {
  // Implementation not needed because data is sourced from UserTimingsHandler
}

export function reset(): void {
  extensionFlameChartEntries.length = 0;
  extensionTrackData.length = 0;
  extensionMarkers.length = 0;
  entryToNode.clear();
}

export async function finalize(): Promise<void> {
  createExtensionFlameChartEntries();
}

function createExtensionFlameChartEntries(): void {
  const pairedMeasures: readonly Types.Events.SyntheticUserTimingPair[] = userTimingsData().performanceMeasures;
  const marks: readonly Types.Events.PerformanceMark[] = userTimingsData().performanceMarks;
  const mergedRawExtensionEvents = Helpers.Trace.mergeEventsInOrder(pairedMeasures, marks);

  extractExtensionEntries(mergedRawExtensionEvents);
  Helpers.Extensions.buildTrackDataFromExtensionEntries(extensionFlameChartEntries, extensionTrackData, entryToNode);
}

export function extractExtensionEntries(timings: (Types.Events.SyntheticUserTimingPair|Types.Events.PerformanceMark)[]):
    void {
  for (const timing of timings) {
    const extensionPayload = extensionDataInTiming(timing);
    if (!extensionPayload) {
      // Not an extension user timing.
      continue;
    }

    const extensionSyntheticEntry = {
      name: timing.name,
      ph: Types.Events.Phase.COMPLETE,
      pid: Types.Events.ProcessID(0),
      tid: Types.Events.ThreadID(0),
      ts: timing.ts,
      dur: timing.dur as Types.Timing.MicroSeconds,
      cat: 'devtools.extension',
      args: extensionPayload,
      rawSourceEvent: Types.Events.isSyntheticUserTiming(timing) ? timing.rawSourceEvent : timing,
    };

    if (Types.Extensions.isExtensionPayloadMarker(extensionPayload)) {
      const extensionMarker =
          Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager()
              .registerSyntheticEvent<Types.Extensions.SyntheticExtensionMarker>(
                  extensionSyntheticEntry as Omit<Types.Extensions.SyntheticExtensionMarker, '_tag'>);
      extensionMarkers.push(extensionMarker);
      continue;
    }

    if (Types.Extensions.isExtensionPayloadTrackEntry(extensionSyntheticEntry.args)) {
      const extensionTrackEntry =
          Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager()
              .registerSyntheticEvent<Types.Extensions.SyntheticExtensionTrackEntry>(
                  extensionSyntheticEntry as Omit<Types.Extensions.SyntheticExtensionTrackEntry, '_tag'>);
      extensionFlameChartEntries.push(extensionTrackEntry);
      continue;
    }
  }
}

export function extensionDataInTiming(timing: Types.Events.SyntheticUserTimingPair|
                                      Types.Events.PerformanceMark): Types.Extensions.ExtensionDataPayload|null {
  const timingDetail =
      Types.Events.isPerformanceMark(timing) ? timing.args.data?.detail : timing.args.data.beginEvent.args.detail;
  if (!timingDetail) {
    return null;
  }
  try {
    // Attempt to parse the detail as an object that might be coming from a
    // DevTools Perf extension.
    // Wrapped in a try-catch because timingDetail might either:
    // 1. Not be `json.parse`-able (it should, but just in case...)
    // 2.Not be an object - in which case the `in` check will error.
    // If we hit either of these cases, we just ignore this mark and move on.
    const detailObj = JSON.parse(timingDetail);
    if (!('devtools' in detailObj)) {
      return null;
    }
    if (!Types.Extensions.isValidExtensionPayload(detailObj.devtools)) {
      return null;
    }
    return detailObj.devtools;
  } catch (e) {
    // No need to worry about this error, just discard this event and don't
    // treat it as having any useful information for the purposes of extensions
    return null;
  }
}

export function data(): ExtensionTraceData {
  return {
    entryToNode,
    extensionTrackData: [...extensionTrackData],
    extensionMarkers: [...extensionMarkers],
  };
}

export function deps(): HandlerName[] {
  return ['UserTimings'];
}
