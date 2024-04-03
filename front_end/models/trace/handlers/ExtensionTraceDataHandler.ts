// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {HandlerState, type TraceEventHandlerName} from './types.js';
import {data as userTimingsData} from './UserTimingsHandler.js';

const extensionFlameChartEntries: Types.Extensions.SyntheticExtensionFlameChartEntry[] = [];
const extensionTrackData: Types.Extensions.ExtensionTrackData[] = [];
const extensionMarkers: Types.Extensions.SyntheticExtensionMarker[] = [];

export interface ExtensionTraceData {
  extensionTrackData: readonly Types.Extensions.ExtensionTrackData[];
  extensionMarkers: readonly Types.Extensions.SyntheticExtensionMarker[];
}
let handlerState = HandlerState.UNINITIALIZED;

export function handleEvent(_event: Types.TraceEvents.TraceEventData): void {
  // Implementation not needed because data is sourced from UserTimingsHandler
}

export function reset(): void {
  handlerState = HandlerState.INITIALIZED;
  extensionFlameChartEntries.length = 0;
  extensionTrackData.length = 0;
  extensionMarkers.length = 0;
}

export async function finalize(): Promise<void> {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('ExtensionTraceData handler is not initialized');
  }
  createExtensionFlameChartEntries();
  handlerState = HandlerState.FINALIZED;
}

function createExtensionFlameChartEntries(): void {
  const pairedMeasures: readonly Types.TraceEvents.SyntheticUserTimingPair[] = userTimingsData().performanceMeasures;
  const marks: readonly Types.TraceEvents.TraceEventPerformanceMark[] = userTimingsData().performanceMarks;
  const mergedRawExtensionEvents = Helpers.Trace.mergeEventsInOrder(pairedMeasures, marks);

  extractExtensionEntries(mergedRawExtensionEvents);
  Helpers.Extensions.buildTrackDataFromExtensionEntries(extensionFlameChartEntries, extensionTrackData);
}

export function extractExtensionEntries(
    timings: (Types.TraceEvents.SyntheticUserTimingPair|Types.TraceEvents.TraceEventPerformanceMark)[]): void {
  for (const timing of timings) {
    const extensionPayload = extensionDataInTiming(timing);
    if (!extensionPayload) {
      // Not an extension user timing.
      continue;
    }
    const extensionName = extensionPayload.metadata.extensionName;
    if (!extensionName) {
      continue;
    }
    const extensionSyntheticEntry = {
      ...Helpers.Trace.makeSyntheticTraceEntry(
          timing.name, timing.ts, Types.TraceEvents.ProcessID(0), Types.TraceEvents.ThreadID(0)),
      dur: timing.dur as Types.Timing.MicroSeconds,
      cat: 'timeline-extension',
      args: extensionPayload,
    };
    if (Types.Extensions.isExtensionPayloadMarker(extensionPayload)) {
      extensionMarkers.push(extensionSyntheticEntry as Types.Extensions.SyntheticExtensionMarker);
      continue;
    }
    if (Types.Extensions.isExtensionPayloadFlameChartEntry(extensionPayload)) {
      extensionFlameChartEntries.push(extensionSyntheticEntry as Types.Extensions.SyntheticExtensionFlameChartEntry);
      continue;
    }
  }
}

export function extensionDataInTiming(timing: Types.TraceEvents.SyntheticUserTimingPair|
                                      Types.TraceEvents.TraceEventPerformanceMark):
    Types.Extensions.ExtensionDataPayload|null {
  const timingDetail = Types.TraceEvents.isTraceEventPerformanceMark(timing) ? timing.args.data?.detail :
                                                                               timing.args.data.beginEvent.args.detail;
  if (!timingDetail) {
    return null;
  }
  const detailObj = JSON.parse(timingDetail);
  if (!('devtools' in detailObj)) {
    return null;
  }
  if (!('metadata' in detailObj['devtools'])) {
    return null;
  }
  return detailObj.devtools;
}

export function data(): ExtensionTraceData {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('ExtensionTraceData handler is not finalized');
  }

  return {
    extensionTrackData: [...extensionTrackData],
    extensionMarkers: [...extensionMarkers],
  };
}

export function deps(): TraceEventHandlerName[] {
  return ['UserTimings'];
}
