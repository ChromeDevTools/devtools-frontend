// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {type TraceEventHandlerName} from './types.js';

// Each thread contains events. Events indicate the thread and process IDs, which are
// used to store the event in the correct process thread entry below.
const unpairedAsyncEvents: Types.TraceEvents.TraceEventPipelineReporter[] = [];

const snapshotEvents: Types.TraceEvents.TraceEventScreenshot[] = [];
const syntheticScreenshotEvents: Types.TraceEvents.SyntheticScreenshot[] = [];
let frameSequenceToTs: Record<string, Types.Timing.MicroSeconds> = {};

export function reset(): void {
  unpairedAsyncEvents.length = 0;
  snapshotEvents.length = 0;
  syntheticScreenshotEvents.length = 0;
  frameSequenceToTs = {};
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (Types.TraceEvents.isTraceEventScreenshot(event)) {
    snapshotEvents.push(event);
  } else if (Types.TraceEvents.isTraceEventPipelineReporter(event)) {
    unpairedAsyncEvents.push(event);
  }
}

export async function finalize(): Promise<void> {
  const pipelineReporterEvents = Helpers.Trace.createMatchedSortedSyntheticEvents(unpairedAsyncEvents);

  frameSequenceToTs = Object.fromEntries(pipelineReporterEvents.map(evt => {
    const frameSequenceId = evt.args.data.beginEvent.args.chrome_frame_reporter.frame_sequence;
    const presentationTs = Types.Timing.MicroSeconds(evt.ts + evt.dur);
    return [frameSequenceId, presentationTs];
  }));

  for (const snapshotEvent of snapshotEvents) {
    const {cat, name, ph, pid, tid} = snapshotEvent;
    const syntheticEvent: Types.TraceEvents.SyntheticScreenshot = {
      cat,
      name,
      ph,
      pid,
      tid,
      // `getPresentationTimestamp(snapshotEvent) - snapshotEvent.ts` is how many microsec the screenshot was adjusted to the right/later
      ts: getPresentationTimestamp(snapshotEvent),
      args: {
        dataUri: `data:image/jpg;base64,${snapshotEvent.args.snapshot}`,
      },
    };
    syntheticScreenshotEvents.push(syntheticEvent);
  }
}

/**
 * Correct the screenshot timestamps
 * The screenshot 'snapshot object' trace event has the "frame sequence number" attached as an ID.
 * We match that up with the "PipelineReporter" trace events as they terminate at presentation.
 * Presentation == when the pixels hit the screen. AKA Swap on the GPU
 */
function getPresentationTimestamp(screenshotEvent: Types.TraceEvents.TraceEventScreenshot): Types.Timing.MicroSeconds {
  const frameSequence = parseInt(screenshotEvent.id, 16);
  // If it's 1, then it's an old trace (before https://crrev.com/c/4957973) and cannot be corrected.
  if (frameSequence === 1) {
    return screenshotEvent.ts;
  }
  // The screenshot trace event's `ts` reflects the "expected display time" which is ESTIMATE.
  // It is set by the compositor frame sink from the `expected_display_time`, which is based on a previously known
  // frame start PLUS the vsync interval (eg 16.6ms)
  const updatedTs = frameSequenceToTs[frameSequence];
  // Do we always find a match? No...
  // We generally don't match the very first screenshot and, sometimes, the last
  // The very first screenshot is requested immediately (even if nothing is painting). As a result there's no compositor
  // instrumentation running alongside.
  // The last one is sometimes missing as because the trace terminates right before the associated PipelineReporter is emitted.
  return updatedTs ?? screenshotEvent.ts;
}

export function data(): Types.TraceEvents.SyntheticScreenshot[] {
  return [...syntheticScreenshotEvents];
}

export function deps(): TraceEventHandlerName[] {
  return ['Meta'];
}
